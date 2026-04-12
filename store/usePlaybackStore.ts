import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { doc, increment, updateDoc } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '../firebaseConfig';
import { useDownloadQueueStore } from './useDownloadQueueStore';
import { FREE_MUSIC, POPULAR_BEATS, TRENDING_SONGS } from '@/constants/homeFeed';

let isAudioModeConfigured = false;

async function ensureAudioModeConfigured() {
  if (isAudioModeConfigured) {
    return;
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });

  isAudioModeConfigured = true;
}

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

const fallbackSourceTracks = [...TRENDING_SONGS, ...FREE_MUSIC, ...POPULAR_BEATS] as Array<any>;

const fallbackTrackPool: Track[] = fallbackSourceTracks.map((track) => ({
  id: track.id,
  title: track.title,
  artist: track.artist,
  artworkUrl: track.artworkUrl,
  url: track.audioUrl,
  uploaderId: track.uploaderId,
}));

const TRACK_SWITCH_TRANSITION_MS = 180;

let pendingTrackSwitchTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingTrackSwitchToken = 0;

function clearPendingTrackSwitch() {
  if (pendingTrackSwitchTimeout) {
    clearTimeout(pendingTrackSwitchTimeout);
    pendingTrackSwitchTimeout = null;
  }
}

function getRandomFallbackTrack(excludeTrackId?: string): Track | null {
  const candidates = fallbackTrackPool.filter((track) => track.id !== excludeTrackId);
  const pool = candidates.length > 0 ? candidates : fallbackTrackPool;
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export type RepeatMode = 'off' | 'all' | 'one';

interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  volume: number;
  sound: Audio.Sound | null;
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
  sound: null,
  repeatMode: 'off',
  queue: [],
  currentTrackIndex: -1,
  shuffleActive: false,
  shuffledQueue: [],

  setTrack: async (track: Track, options) => {
    const previousState = get();
    const sourceUri = track.url?.trim();
    const transitionDelayMs = Math.max(0, options?.transitionDelayMs ?? 0);
    const switchToken = ++pendingTrackSwitchToken;

    clearPendingTrackSwitch();

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

      set({ isBuffering: true, currentTrack: track, position: 0, duration: 0, isPlaying: false, sound: null });

      // 2. Configure Audio Category
      await ensureAudioModeConfigured();

      // 3. Load new sound
      const resolvedUri = await resolveTrackUri(track);
      const { sound } = await Audio.Sound.createAsync(
        { uri: resolvedUri },
        { shouldPlay: false, volume: get().volume },
        (status) => {
          if (!status.isLoaded) return;

          // Always sync play state from the actual audio status
          set({
            isPlaying: status.isPlaying,
            isBuffering: status.isBuffering ?? false,
            position: status.positionMillis ?? 0,
            duration: status.durationMillis ?? 0,
          });

          if (status.didJustFinish) {
            const { queue, repeatMode } = get();

            if (repeatMode === 'one') {
              const currentSound = get().sound;
              if (currentSound) {
                currentSound
                  .setPositionAsync(0)
                  .then(() => currentSound.playAsync())
                  .catch((err) => console.error('Repeat-one restart failed:', err));
              }
              return;
            }

            // Auto-play behavior picks a random next track from the active playlist.
            if (queue.length > 0) {
              const { queue: q, shuffledQueue, shuffleActive, currentTrackIndex } = get();
              const activeList = shuffleActive ? shuffledQueue : q;

              if (activeList.length <= 1) {
                if (repeatMode === 'all' && activeList.length === 1) {
                  get().playTrackAtIndex(0).catch((err) => console.error('Repeat-all single-track restart failed:', err));
                } else {
                  set({ isPlaying: false, position: 0 });
                }
                return;
              }

              const candidateIndexes = activeList
                .map((_, idx) => idx)
                .filter((idx) => idx !== currentTrackIndex);

              const randomIndex = candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)];
              get().playTrackAtIndex(randomIndex).catch((err) => console.error('Auto-play random next failed:', err));
              return;
            }

            set({ isPlaying: false, position: 0 });
          }
        }
      );

      const { sound: currentSound } = previousState;
      if (currentSound) {
        try {
          await currentSound.stopAsync();
          await currentSound.unloadAsync();
        } catch (_) { }
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

      if (transitionDelayMs > 0) {
        await new Promise<void>((resolve) => {
          pendingTrackSwitchTimeout = setTimeout(() => {
            pendingTrackSwitchTimeout = null;
            resolve();
          }, transitionDelayMs);
        });

        if (switchToken !== pendingTrackSwitchToken) {
          try {
            await sound.unloadAsync();
          } catch (_) { }
          return;
        }
      }

      await sound.playAsync();
      set({ sound, isBuffering: false, isPlaying: true });
    } catch (error) {
      console.error('Error loading track:', error);
      clearPendingTrackSwitch();
      set({
        currentTrack: previousState.currentTrack,
        isPlaying: previousState.isPlaying,
        isBuffering: false,
        position: previousState.position,
        duration: previousState.duration,
        sound: previousState.sound,
      });
    }
  },

  togglePlayPause: async () => {
    const { sound, isPlaying } = get();
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
        set({ isPlaying: false });
      } else {
        await sound.playAsync();
        set({ isPlaying: true });
      }
    } catch (error) {
      console.error('togglePlayPause error:', error);
    }
  },

  seekTo: async (position: number) => {
    const { sound } = get();
    if (!sound) return;
    try {
      await sound.setPositionAsync(Math.max(0, position));
      set({ position: Math.max(0, position) });
    } catch (error) {
      console.error('seekTo error:', error);
    }
  },

  skipForward: async (seconds = 15) => {
    const { position, duration } = get();
    const newPos = Math.min(position + seconds * 1000, duration);
    await get().seekTo(newPos);
  },

  skipBack: async (seconds = 15) => {
    const { position } = get();
    // If more than 3 seconds in — restart track; otherwise go back
    const newPos = position > 3000 ? Math.max(0, position - seconds * 1000) : 0;
    await get().seekTo(newPos);
  },

  setVolume: async (volume: number) => {
    const { sound } = get();
    if (sound) {
      await sound.setVolumeAsync(volume);
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
    clearPendingTrackSwitch();
    const { sound } = get();
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (_) { }
    }
    set({ currentTrack: null, sound: null, isPlaying: false, position: 0, duration: 0 });
  },

  // Playlist management
  initializePlaylist: async (tracks: Track[], startIndex = 0, shuffle = false) => {
    if (tracks.length === 0) return;

    let queueToUse = [...tracks];
    let shuffledIndexes: number[] = [];
    const safeStartIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));

    if (shuffle) {
      // Fisher-Yates shuffle for the queue
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
      // currentTrackIndex is always based on the active track list (queue or shuffledQueue).
      currentTrackIndex: shuffle ? 0 : safeStartIndex,
      shuffleActive: shuffle,
      shuffledQueue: shuffle ? queueToUse : [],
    });

    // Play the first track
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
    const { queue, currentTrackIndex, shuffleActive, shuffledQueue, repeatMode, currentTrack } = get();
    const trackList = shuffleActive ? shuffledQueue : queue;

    if (trackList.length === 0) {
      const fallbackTrack = getRandomFallbackTrack(currentTrack?.id);
      if (fallbackTrack) {
        await get().setTrack(fallbackTrack, { preserveQueue: true, transitionDelayMs: TRACK_SWITCH_TRANSITION_MS });
        return;
      }

      if (currentTrack) {
        await get().setTrack(currentTrack, { preserveQueue: true });
      }
      return;
    }

    if (repeatMode === 'one' && currentTrackIndex >= 0) {
      await get().playTrackAtIndex(currentTrackIndex, { transitionDelayMs: TRACK_SWITCH_TRANSITION_MS });
      return;
    }

    let nextIndex = currentTrackIndex + 1;

    // Handle end of playlist
    if (nextIndex >= trackList.length) {
      if (repeatMode === 'all') {
        nextIndex = 0; // Loop back to beginning
      } else {
        const fallbackTrack = getRandomFallbackTrack(currentTrack?.id);
        if (fallbackTrack) {
          await get().setTrack(fallbackTrack, { preserveQueue: true, transitionDelayMs: TRACK_SWITCH_TRANSITION_MS });
          return;
        }

        const { sound } = get();
        if (sound) {
          try {
            await sound.stopAsync();
          } catch (_) { }
        }
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

    // Previous button restarts the current song from the beginning.
    if (currentTrackIndex >= 0) {
      await get().seekTo(0);
    }
  },

  setShuffleMode: async (enabled: boolean) => {
    const { queue, currentTrack, currentTrackIndex, shuffledQueue } = get();

    if (queue.length === 0) return;

    if (enabled && !shuffledQueue.length) {
      // Enable shuffle: create a shuffled queue
      const indexes = Array.from({ length: queue.length }, (_, i) => i);
      for (let i = indexes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
      }
      const newShuffledQueue = indexes.map(idx => queue[idx]);

      // Keep the currently playing track selected when enabling shuffle.
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
      // Disable shuffle: revert to original queue with current track position
      const indexInOriginal = currentTrack ? queue.findIndex(t => t.id === currentTrack.id) : currentTrackIndex;
      set({
        shuffleActive: false,
        shuffledQueue: [],
        currentTrackIndex: indexInOriginal >= 0 ? indexInOriginal : 0,
      });
    }
  },
}));
