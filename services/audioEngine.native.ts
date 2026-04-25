import type { AudioPlaybackState, AudioProgress, AudioSubscription, TrackOptions } from './audioEngine.types';

type ExpoAudioModule = typeof import('expo-audio');

let isSetup = false;
let resolvedExpoAudioModule: ExpoAudioModule | null | undefined;
let hasLoggedMissingModule = false;
let currentPlayer: any = null;
let currentTrack: TrackOptions | null = null;
let currentState: AudioPlaybackState = 'none';
let currentPositionMs = 0;
let currentDurationMs = 0;
let currentVolume = 1;
let hasEmittedQueueEnded = false;
let playbackStatusSubscription: AudioSubscription | null = null;

const stateListeners = new Set<(state: AudioPlaybackState) => void>();
const progressListeners = new Set<(progress: AudioProgress) => void>();
const queueEndedListeners = new Set<(event: any) => void>();

const noopSubscription: AudioSubscription = {
  remove: () => {
    // no-op
  },
};

function emitState(state: AudioPlaybackState) {
  currentState = state;
  stateListeners.forEach((listener) => listener(state));
}

function emitProgress(positionMs = currentPositionMs, durationMs = currentDurationMs) {
  currentPositionMs = Math.max(0, positionMs);
  currentDurationMs = Math.max(0, durationMs);
  progressListeners.forEach((listener) => listener({ position: currentPositionMs, duration: currentDurationMs }));
}

function clampVolume(volume: number) {
  return Math.max(0, Math.min(1, volume));
}

function createMissingModuleError() {
  return new Error(
    'expo-audio native module is unavailable. Reinstall dependencies and rebuild the development app so Expo Audio is linked.'
  );
}

function getExpoAudioModule(): ExpoAudioModule | null {
  if (resolvedExpoAudioModule !== undefined) {
    return resolvedExpoAudioModule;
  }

  try {
    resolvedExpoAudioModule = require('expo-audio') as ExpoAudioModule;
  } catch (error) {
    resolvedExpoAudioModule = null;

    if (!hasLoggedMissingModule) {
      hasLoggedMissingModule = true;
      console.error('[audioEngine] Failed to load expo-audio:', error);
    }
  }

  return resolvedExpoAudioModule;
}

function requireExpoAudioModule(): ExpoAudioModule {
  const expoAudioModule = getExpoAudioModule();
  if (!expoAudioModule) {
    throw createMissingModuleError();
  }

  return expoAudioModule;
}

function cleanupPlayer() {
  playbackStatusSubscription?.remove();
  playbackStatusSubscription = null;

  if (!currentPlayer) {
    return;
  }

  try {
    currentPlayer.clearLockScreenControls?.();
    currentPlayer.remove?.();
  } catch (error) {
    console.warn('[audioEngine] Failed to clean up audio player:', error);
  } finally {
    currentPlayer = null;
  }
}

function mapAudioStatusToPlaybackState(status: any): AudioPlaybackState {
  if (status?.didJustFinish) {
    return 'ended';
  }

  if (status?.isBuffering || status?.timeControlStatus === 'waiting') {
    return 'buffering';
  }

  if (status?.playing) {
    return 'playing';
  }

  const playbackState = typeof status?.playbackState === 'string' ? status.playbackState.toLowerCase() : '';

  if (playbackState.includes('error')) {
    return 'error';
  }

  if (playbackState.includes('stop')) {
    return 'stopped';
  }

  if (playbackState.includes('load')) {
    return 'loading';
  }

  if (playbackState.includes('pause')) {
    return 'paused';
  }

  if (status?.isLoaded) {
    return 'ready';
  }

  return currentTrack ? 'loading' : 'none';
}

function handlePlaybackStatusUpdate(status: any) {
  const nextDurationMs = Math.round((status?.duration ?? 0) * 1000);
  const nextPositionMs = Math.round((status?.currentTime ?? 0) * 1000);

  emitProgress(nextPositionMs, nextDurationMs);
  emitState(mapAudioStatusToPlaybackState(status));

  if (status?.didJustFinish && !hasEmittedQueueEnded) {
    hasEmittedQueueEnded = true;
    queueEndedListeners.forEach((listener) => listener({}));
    return;
  }

  if (!status?.didJustFinish) {
    hasEmittedQueueEnded = false;
  }
}

async function ensurePlayer() {
  const expoAudioModule = requireExpoAudioModule();

  if (!currentPlayer) {
    currentPlayer = expoAudioModule.createAudioPlayer(undefined, {
      updateInterval: 250,
    });
    currentPlayer.volume = currentVolume;
    playbackStatusSubscription = currentPlayer.addListener?.('playbackStatusUpdate', handlePlaybackStatusUpdate) ?? null;
  }

  return {
    ...expoAudioModule,
    player: currentPlayer,
  };
}

function updateLockScreenMetadata(player: any, track: TrackOptions | null) {
  if (!track?.url) {
    player?.clearLockScreenControls?.();
    return;
  }

  player?.setActiveForLockScreen?.(
    true,
    {
      title: track.title || 'Unknown Title',
      artist: track.artist || 'Unknown Artist',
      artworkUrl: track.artwork,
    },
    {
      showSeekBackward: true,
      showSeekForward: true,
    }
  );
}

export const audioEngine = {
  async setup() {
    if (isSetup) {
      await ensurePlayer();
      return;
    }

    const { setAudioModeAsync } = requireExpoAudioModule();

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
      interruptionModeAndroid: 'duckOthers',
    });

    await ensurePlayer();
    isSetup = true;
  },

  async load(track: TrackOptions, autoPlay = true) {
    await this.setup();
    const { player } = await ensurePlayer();

    currentTrack = track;
    currentPositionMs = 0;
    currentDurationMs = 0;
    hasEmittedQueueEnded = false;

    emitState('loading');
    emitProgress(0, 0);

    player.replace(track.url);
    player.volume = currentVolume;
    updateLockScreenMetadata(player, track);

    if (autoPlay) {
      await Promise.resolve(player.play());
    } else {
      await Promise.resolve(player.pause());
      emitState('paused');
    }
  },

  async play() {
    const { player } = await ensurePlayer();
    updateLockScreenMetadata(player, currentTrack);
    await Promise.resolve(player.play());
  },

  async pause() {
    if (!currentPlayer) {
      return;
    }

    await Promise.resolve(currentPlayer.pause());
    emitState('paused');
  },

  async stop() {
    if (!currentPlayer) {
      return;
    }

    await Promise.resolve(currentPlayer.pause());
    await Promise.resolve(currentPlayer.seekTo(0));
    emitProgress(0, currentDurationMs);
    emitState('stopped');
  },

  async unload() {
    cleanupPlayer();
    currentTrack = null;
    currentPositionMs = 0;
    currentDurationMs = 0;
    hasEmittedQueueEnded = false;
    emitState('none');
    emitProgress(0, 0);
  },

  async seek(positionMs: number) {
    if (!currentPlayer || !currentTrack) {
      return;
    }

    const nextPositionMs = Math.max(0, positionMs);
    await Promise.resolve(currentPlayer.seekTo(nextPositionMs / 1000));
    emitProgress(nextPositionMs, currentDurationMs);
  },

  async setVolume(volume: number) {
    currentVolume = clampVolume(volume);

    if (!currentPlayer) {
      return;
    }

    currentPlayer.volume = currentVolume;
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
