import { audioEngine } from '@/services/audioEngine';
import { captureError } from '@/utils/monitoring';
import * as FileSystem from 'expo-file-system';
import { doc, increment, updateDoc } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '../firebaseConfig';
import { useDownloadQueueStore } from './useDownloadQueueStore';
import { useUserStore } from './useUserStore';

async function resolveTrackUri(track: Track): Promise<string> {
  const cached = useDownloadQueueStore
    .getState()
    .items.find((item) => item.trackId === track.id && item.status === 'completed' && item.localUri);

  if (!cached?.localUri) {
    return track.url;
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(cached.localUri);
    if (fileInfo.exists) {
      return cached.localUri;
    }
  } catch {
    // Fall back to the remote URL when local file checks fail.
  }

  return track.url;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  url: string;
  uploaderId?: string;
}

const TRACK_SWITCH_TRANSITION_MS = 180;

let pendingTrackSwitchTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingTrackSwitchToken = 0;

let progressListener: any = null;
let stateListener: any = null;
let queueEndedListener: any = null;

function clearPendingTrackSwitch() {
  if (pendingTrackSwitchTimeout) {
    clearTimeout(pendingTrackSwitchTimeout);
    pendingTrackSwitchTimeout = null;
  }
}

function invalidatePendingTrackSwitch() {
  clearPendingTrackSwitch();
  pendingTrackSwitchToken += 1;
  return pendingTrackSwitchToken;
}

function isTrackSwitchStale(token: number) {
  return token !== pendingTrackSwitchToken;
}

function buildPlaybackErrorContext(extra?: Record<string, unknown>) {
  const playbackState = usePlaybackStore.getState();
  const userState = useUserStore.getState();

  return {
    scope: 'playback-store',
    activeAppMode: userState.activeAppMode,
    currentTrackId: playbackState.currentTrack?.id ?? null,
    currentTrackIndex: playbackState.currentTrackIndex,
    queueLength: playbackState.queue.length,
    repeatMode: playbackState.repeatMode,
    ...extra,
  };
}

export type RepeatMode = 'off' | 'all' | 'one';

interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  volume: number;
  repeatMode: RepeatMode;
  
  // Playlist queue
  queue: Track[];
  currentTrackIndex: number;
  shuffleActive: boolean;
  shuffledQueue: Track[];

  // Actions
  setTrack: (track: Track, options?: { preserveQueue?: boolean; transitionDelayMs?: number }) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  skipForward: (seconds?: number) => Promise<void>;
  skipBack: (seconds?: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  clearTrack: () => Promise<void>;
  setRepeatMode: (mode: RepeatMode) => void;
  cycleRepeatMode: () => RepeatMode;
  
  // Playlist actions
  initializePlaylist: (tracks: Track[], startIndex?: number, shuffle?: boolean) => Promise<void>;
  playNextTrack: () => Promise<void>;
  playPreviousTrack: (options?: { goToPreviousTrack?: boolean }) => Promise<void>;
  setShuffleMode: (enabled: boolean) => Promise<void>;
  playTrackAtIndex: (index: number, options?: { transitionDelayMs?: number }) => Promise<void>;
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  isBuffering: false,
  position: 0,
  duration: 0,
  volume: 1.0,
  repeatMode: 'off',
  queue: [],
  currentTrackIndex: -1,
  shuffleActive: false,
  shuffledQueue: [],

  setTrack: async (track: Track, options) => {
    const previousState = get();
    const sourceUri = track.url?.trim();
    const transitionDelayMs = Math.max(0, options?.transitionDelayMs ?? 0);
    const switchToken = invalidatePendingTrackSwitch();

    if (!sourceUri) {
      console.warn('setTrack called with an empty audio URL:', track.id);
      return;
    }

    try {
      if (!options?.preserveQueue) {
        const state = get();
        const existingIndex = state.queue.findIndex((queuedTrack) => queuedTrack.id === track.id);

        if (state.queue.length === 0) {
          set({ queue: [track], currentTrackIndex: 0, shuffleActive: false, shuffledQueue: [] });
        } else if (existingIndex >= 0) {
          set({ currentTrackIndex: existingIndex });
        } else {
          const nextQueue = [...state.queue, track];
          set({ queue: nextQueue, currentTrackIndex: nextQueue.length - 1, shuffleActive: false, shuffledQueue: [] });
        }
      }

      set({ isBuffering: true, currentTrack: track, position: 0, duration: 0, isPlaying: false });

      await audioEngine.setup();

      if (!progressListener) {
        progressListener = audioEngine.onPlaybackProgressChange((status) => {
          set({ position: status.position, duration: status.duration });
        });
        stateListener = audioEngine.onPlaybackStateChange((state) => {
          set({
            isPlaying: state === 'playing',
            isBuffering: state === 'buffering' || state === 'loading',
          });
        });
        queueEndedListener = audioEngine.onPlaybackQueueEnded(() => {
          const { repeatMode } = get();
          if (repeatMode === 'one') {
            audioEngine.seek(0).then(() => audioEngine.play()).catch(console.error);
          } else {
            get().playNextTrack().catch(console.error);
          }
        });
      }

      const resolvedUri = await resolveTrackUri(track);
      if (isTrackSwitchStale(switchToken)) {
        return;
      }

      // Log analytics
      if (track.id && track.uploaderId && !track.id.startsWith('lib-')) {
        try {
          const trackRef = doc(db, `users/${track.uploaderId}/uploads/${track.id}`);
          await updateDoc(trackRef, { listenCount: increment(1) });
        } catch (e) {
          console.log('Failed to tally analytics listen:', e);
        }
      }

      if (isTrackSwitchStale(switchToken)) {
        return;
      }

      if (transitionDelayMs > 0) {
        await new Promise<void>((resolve) => {
          pendingTrackSwitchTimeout = setTimeout(() => {
            pendingTrackSwitchTimeout = null;
            resolve();
          }, transitionDelayMs);
        });

        if (switchToken !== pendingTrackSwitchToken) {
          return;
        }
      }

      await audioEngine.load({
        url: resolvedUri,
        title: track.title,
        artist: track.artist,
        artwork: track.artworkUrl,
      });

      if (isTrackSwitchStale(switchToken)) {
        return;
      }

      await audioEngine.setVolume(get().volume);

    } catch (error) {
      console.error('Error loading track:', error);
      clearPendingTrackSwitch();
      captureError(error, buildPlaybackErrorContext({
        action: 'set-track',
        requestedTrackId: track.id,
        preserveQueue: Boolean(options?.preserveQueue),
        transitionDelayMs,
      }));
      set({
        currentTrack: previousState.currentTrack,
        isPlaying: previousState.isPlaying,
        isBuffering: false,
        position: previousState.position,
        duration: previousState.duration,
      });
    }
  },

  togglePlayPause: async () => {
    const { isPlaying, currentTrack } = get();
    if (!currentTrack) return;

    try {
      if (isPlaying) {
        await audioEngine.pause();
        set({ isPlaying: false });
      } else {
        await audioEngine.play();
        set({ isPlaying: true });
      }
    } catch (error) {
      console.error('togglePlayPause error:', error);
      captureError(error, buildPlaybackErrorContext({ action: 'toggle-play-pause' }));
    }
  },

  seekTo: async (position: number) => {
    const { currentTrack } = get();
    if (!currentTrack) return;
    try {
      await audioEngine.seek(Math.max(0, position));
      set({ position: Math.max(0, position) });
    } catch (error) {
      console.error('seekTo error:', error);
      captureError(error, buildPlaybackErrorContext({ action: 'seek', requestedPosition: position }));
    }
  },

  skipForward: async (seconds = 15) => {
    const { position, duration } = get();
    const newPos = Math.min(position + seconds * 1000, duration);
    await get().seekTo(newPos);
  },

  skipBack: async (seconds = 15) => {
    const { position } = get();
    const newPos = position > 3000 ? Math.max(0, position - seconds * 1000) : 0;
    await get().seekTo(newPos);
  },

  setVolume: async (volume: number) => {
    const { currentTrack } = get();
    if (currentTrack) {
      await audioEngine.setVolume(volume);
    }
    set({ volume });
  },

  setRepeatMode: (mode: RepeatMode) => {
    set({ repeatMode: mode });
  },

  cycleRepeatMode: () => {
    const currentMode = get().repeatMode;
    const nextMode: RepeatMode = currentMode === 'off' ? 'all' : currentMode === 'all' ? 'one' : 'off';
    set({ repeatMode: nextMode });
    return nextMode;
  },

  clearTrack: async () => {
    invalidatePendingTrackSwitch();
    try {
      await audioEngine.stop();
      await audioEngine.unload();
    } catch (_) { }
    set({
      currentTrack: null,
      isPlaying: false,
      isBuffering: false,
      position: 0,
      duration: 0,
      queue: [],
      currentTrackIndex: -1,
      shuffleActive: false,
      shuffledQueue: [],
    });
  },

  initializePlaylist: async (tracks: Track[], startIndex = 0, shuffle = false) => {
    if (tracks.length === 0) return;

    let queueToUse = [...tracks];
    let shuffledIndexes: number[] = [];
    const safeStartIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));

    if (shuffle) {
      shuffledIndexes = Array.from({ length: queueToUse.length }, (_, i) => i);
      for (let i = shuffledIndexes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndexes[i], shuffledIndexes[j]] = [shuffledIndexes[j], shuffledIndexes[i]];
      }
      queueToUse = shuffledIndexes.map(idx => tracks[idx]);
    }

    const trackToPlay = shuffle ? queueToUse[0] : queueToUse[safeStartIndex];
    set({
      queue: tracks,
      currentTrackIndex: shuffle ? 0 : safeStartIndex,
      shuffleActive: shuffle,
      shuffledQueue: shuffle ? queueToUse : [],
    });

    await get().setTrack(trackToPlay, { preserveQueue: true, transitionDelayMs: TRACK_SWITCH_TRANSITION_MS });
  },

  playTrackAtIndex: async (index: number, options) => {
    const { queue, shuffleActive, shuffledQueue } = get();
    const trackList = shuffleActive ? shuffledQueue : queue;

    if (index < 0 || index >= trackList.length) return;

    const track = trackList[index];
    if (!track) return;
    set({ currentTrackIndex: index });
    await get().setTrack(track, { preserveQueue: true, transitionDelayMs: options?.transitionDelayMs ?? TRACK_SWITCH_TRANSITION_MS });
  },

  playNextTrack: async () => {
    const { queue, currentTrackIndex, shuffleActive, shuffledQueue, repeatMode } = get();
    const trackList = shuffleActive ? shuffledQueue : queue;

    if (trackList.length === 0) {
      try {
        await audioEngine.stop();
      } catch (_) { }
      set({ isPlaying: false, position: 0, duration: 0 });
      return;
    }

    if (repeatMode === 'one' && currentTrackIndex >= 0) {
      await get().playTrackAtIndex(currentTrackIndex, { transitionDelayMs: TRACK_SWITCH_TRANSITION_MS });
      return;
    }

    let nextIndex = currentTrackIndex + 1;

    if (nextIndex >= trackList.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        try {
          await audioEngine.stop();
        } catch (_) { }
        set({ isPlaying: false, position: 0, duration: 0 });
        return;
      }
    }

    await get().playTrackAtIndex(nextIndex, { transitionDelayMs: TRACK_SWITCH_TRANSITION_MS });
  },

  playPreviousTrack: async (options) => {
    const { currentTrackIndex, shuffleActive, shuffledQueue, queue, repeatMode } = get();
    const trackList = shuffleActive ? shuffledQueue : queue;

    if (trackList.length === 0) return;

    if (options?.goToPreviousTrack) {
      if (currentTrackIndex > 0) {
        await get().playTrackAtIndex(currentTrackIndex - 1, { transitionDelayMs: TRACK_SWITCH_TRANSITION_MS });
        return;
      }

      if (repeatMode === 'all' && trackList.length > 1) {
        await get().playTrackAtIndex(trackList.length - 1, { transitionDelayMs: TRACK_SWITCH_TRANSITION_MS });
        return;
      }
    }

    if (currentTrackIndex >= 0) {
      await get().seekTo(0);
    }
  },

  setShuffleMode: async (enabled: boolean) => {
    const { queue, currentTrack, currentTrackIndex, shuffledQueue } = get();

    if (queue.length === 0) return;

    if (enabled && !shuffledQueue.length) {
      const indexes = Array.from({ length: queue.length }, (_, i) => i);
      for (let i = indexes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
      }
      const newShuffledQueue = indexes.map(idx => queue[idx]);

      let nextShuffleIndex = 0;
      if (currentTrack) {
        const idx = newShuffledQueue.findIndex((track) => track.id === currentTrack.id);
        if (idx >= 0) {
          nextShuffleIndex = idx;
        }
      } else if (currentTrackIndex >= 0 && currentTrackIndex < newShuffledQueue.length) {
        nextShuffleIndex = currentTrackIndex;
      }

      set({ shuffleActive: true, shuffledQueue: newShuffledQueue, currentTrackIndex: nextShuffleIndex });
    } else if (!enabled) {
      const indexInOriginal = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : currentTrackIndex;
      set({
        shuffleActive: false,
        shuffledQueue: [],
        currentTrackIndex: indexInOriginal >= 0 ? indexInOriginal : 0,
      });
    }
  },
}));
