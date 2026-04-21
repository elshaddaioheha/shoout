import type { AudioPlaybackState, AudioProgress, AudioSubscription, TrackOptions } from './audioEngine.types';

let isSetup = false;
let audioElement: HTMLAudioElement | null = null;
let currentTrack: TrackOptions | null = null;
let currentState: AudioPlaybackState = 'none';
let currentPositionMs = 0;
let currentDurationMs = 0;
let progressTimer: ReturnType<typeof setInterval> | null = null;

const stateListeners = new Set<(state: AudioPlaybackState) => void>();
const progressListeners = new Set<(progress: AudioProgress) => void>();
const queueEndedListeners = new Set<(event: any) => void>();

function emitState(state: AudioPlaybackState) {
  currentState = state;
  stateListeners.forEach((listener) => listener(state));
}

function emitProgress(positionMs = currentPositionMs, durationMs = currentDurationMs) {
  currentPositionMs = Math.max(0, positionMs);
  currentDurationMs = Math.max(0, durationMs);
  progressListeners.forEach((listener) => listener({ position: currentPositionMs, duration: currentDurationMs }));
}

function syncProgressFromElement() {
  if (!audioElement) return;

  const positionMs = Number.isFinite(audioElement.currentTime) ? audioElement.currentTime * 1000 : 0;
  const durationMs = Number.isFinite(audioElement.duration) ? audioElement.duration * 1000 : currentDurationMs;
  emitProgress(positionMs, durationMs);
}

function startProgressTimer() {
  if (progressTimer) return;
  progressTimer = setInterval(syncProgressFromElement, 250);
}

function stopProgressTimer() {
  if (!progressTimer) return;
  clearInterval(progressTimer);
  progressTimer = null;
}

function attachElementListeners(element: HTMLAudioElement) {
  element.addEventListener('loadstart', () => emitState('loading'));
  element.addEventListener('waiting', () => emitState('buffering'));
  element.addEventListener('stalled', () => emitState('buffering'));
  element.addEventListener('playing', () => {
    emitState('playing');
    startProgressTimer();
    syncProgressFromElement();
  });
  element.addEventListener('pause', () => {
    stopProgressTimer();
    syncProgressFromElement();

    if (!element.ended) {
      emitState('paused');
    }
  });
  element.addEventListener('timeupdate', syncProgressFromElement);
  element.addEventListener('loadedmetadata', syncProgressFromElement);
  element.addEventListener('durationchange', syncProgressFromElement);
  element.addEventListener('ended', () => {
    stopProgressTimer();
    syncProgressFromElement();
    emitState('ended');
    queueEndedListeners.forEach((listener) => listener({}));
  });
  element.addEventListener('error', () => {
    stopProgressTimer();
    emitState('error');
  });
}

function ensureAudioElement() {
  if (!audioElement) {
    audioElement = new Audio();
    audioElement.preload = 'auto';
    audioElement.crossOrigin = 'anonymous';
    attachElementListeners(audioElement);
  }

  return audioElement;
}

function clearAudioElementSource() {
  if (!audioElement) return;
  audioElement.pause();
  audioElement.removeAttribute('src');
  audioElement.load();
}

function clampVolume(volume: number) {
  return Math.max(0, Math.min(1, volume));
}

export const audioEngine = {
  async setup() {
    if (isSetup) return;
    ensureAudioElement();
    isSetup = true;
  },

  async load(track: TrackOptions, autoPlay = true) {
    await this.setup();
    const element = ensureAudioElement();

    currentTrack = track;
    currentPositionMs = 0;
    currentDurationMs = 0;

    element.src = track.url;
    element.load();
    emitState('loading');
    emitProgress(0, 0);

    if (autoPlay) {
      try {
        await element.play();
      } catch (error) {
        emitState('paused');
        console.warn('Web audio autoplay failed:', error);
      }
    } else {
      emitState('paused');
    }
  },

  async play() {
    const element = ensureAudioElement();
    if (!currentTrack && !element.src) return;
    await element.play();
  },

  async pause() {
    if (!audioElement) return;
    audioElement.pause();
    emitState('paused');
  },

  async stop() {
    if (!audioElement) return;
    audioElement.pause();
    audioElement.currentTime = 0;
    stopProgressTimer();
    syncProgressFromElement();
    emitState('stopped');
  },

  async unload() {
    if (!audioElement) {
      currentTrack = null;
      emitState('none');
      emitProgress(0, 0);
      return;
    }

    stopProgressTimer();
    clearAudioElementSource();
    currentTrack = null;
    currentPositionMs = 0;
    currentDurationMs = 0;
    emitState('none');
    emitProgress(0, 0);
  },

  async seek(positionMs: number) {
    if (!audioElement || !currentTrack) return;

    const durationMs = Number.isFinite(audioElement.duration) ? audioElement.duration * 1000 : currentDurationMs;
    const nextPositionMs = durationMs > 0 ? Math.min(Math.max(0, positionMs), durationMs) : Math.max(0, positionMs);
    audioElement.currentTime = nextPositionMs / 1000;
    emitProgress(nextPositionMs, durationMs);
  },

  async setVolume(volume: number) {
    if (!audioElement) return;
    audioElement.volume = clampVolume(volume);
  },

  onPlaybackStateChange(callback: (state: AudioPlaybackState) => void): AudioSubscription {
    stateListeners.add(callback);
    callback(currentState);
    return {
      remove: () => {
        stateListeners.delete(callback);
      },
    };
  },

  onPlaybackProgressChange(callback: (progress: AudioProgress) => void): AudioSubscription {
    progressListeners.add(callback);
    callback({ position: currentPositionMs, duration: currentDurationMs });
    return {
      remove: () => {
        progressListeners.delete(callback);
      },
    };
  },

  onPlaybackQueueEnded(callback: (event: any) => void): AudioSubscription {
    queueEndedListeners.add(callback);
    return {
      remove: () => {
        queueEndedListeners.delete(callback);
      },
    };
  },
};