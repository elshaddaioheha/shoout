import { Audio } from 'expo-av';
import { doc, increment, updateDoc } from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '../firebaseConfig';

export interface Track {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  url: string;
  uploaderId?: string;
}

interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  volume: number;
  sound: Audio.Sound | null;
  repeatActive: boolean;
  
  // Playlist queue
  queue: Track[];
  currentTrackIndex: number;
  shuffleActive: boolean;
  shuffledQueue: Track[];

  // Actions
  setTrack: (track: Track) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  skipForward: (seconds?: number) => Promise<void>;
  skipBack: (seconds?: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  clearTrack: () => Promise<void>;
  setRepeat: (value: boolean) => void;
  
  // Playlist actions
  initializePlaylist: (tracks: Track[], startIndex?: number, shuffle?: boolean) => Promise<void>;
  playNextTrack: () => Promise<void>;
  playPreviousTrack: () => Promise<void>;
  setShuffleMode: (enabled: boolean) => Promise<void>;
  playTrackAtIndex: (index: number) => Promise<void>;
}

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  isBuffering: false,
  position: 0,
  duration: 0,
  volume: 1.0,
  sound: null,
  repeatActive: false,
  queue: [],
  currentTrackIndex: -1,
  shuffleActive: false,
  shuffledQueue: [],

  setTrack: async (track: Track) => {
    const { sound: currentSound } = get();

    // 1. Clean up existing sound
    if (currentSound) {
      try {
        await currentSound.stopAsync();
        await currentSound.unloadAsync();
      } catch (_) { }
    }

    try {
      set({ isBuffering: true, currentTrack: track, position: 0, duration: 0, isPlaying: false, sound: null });

      // 2. Configure Audio Category
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // 3. Load new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: true, volume: get().volume },
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
            const { queue, repeatActive } = get();
            
            // If we have a playlist queue, play the next track
            if (queue.length > 0) {
              get().playNextTrack().catch(err => console.error('Auto-play next failed:', err));
            } else {
              // No playlist - handle repeat or stop
              if (repeatActive) {
                // Restart from beginning
                const sound = get().sound;
                if (sound) {
                  sound.setPositionAsync(0).then(() => sound.playAsync());
                }
              } else {
                // Stop and reset position
                set({ isPlaying: false, position: 0 });
              }
            }
          }
        }
      );

      // Log analytics
      if (track.id && track.uploaderId && !track.id.startsWith('lib-')) {
        try {
          const trackRef = doc(db, `users/${track.uploaderId}/uploads/${track.id}`);
          await updateDoc(trackRef, { listenCount: increment(1) });
        } catch (e) {
          console.log('Failed to tally analytics listen:', e);
        }
      }

      set({ sound, isBuffering: false, isPlaying: true });
    } catch (error) {
      console.error('Error loading track:', error);
      set({ isBuffering: false, currentTrack: null });
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

  setRepeat: (value: boolean) => {
    set({ repeatActive: value });
  },

  clearTrack: async () => {
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
    let shuffledIndexes = [];

    if (shuffle) {
      // Fisher-Yates shuffle for the queue
      shuffledIndexes = Array.from({ length: queueToUse.length }, (_, i) => i);
      for (let i = shuffledIndexes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledIndexes[i], shuffledIndexes[j]] = [shuffledIndexes[j], shuffledIndexes[i]];
      }
      queueToUse = shuffledIndexes.map(idx => tracks[idx]);
    }

    const trackToPlay = queueToUse[0];
    set({
      queue: tracks,
      currentTrackIndex: shuffle ? shuffledIndexes[0] : startIndex,
      shuffleActive: shuffle,
      shuffledQueue: shuffle ? queueToUse : [],
    });

    // Play the first track
    await get().setTrack(trackToPlay);
  },

  playTrackAtIndex: async (index: number) => {
    const { queue, shuffleActive, shuffledQueue } = get();
    const trackList = shuffleActive ? shuffledQueue : queue;

    if (index < 0 || index >= trackList.length) return;

    const track = trackList[index];
    set({ currentTrackIndex: index });
    await get().setTrack(track);
  },

  playNextTrack: async () => {
    const { queue, currentTrackIndex, shuffleActive, shuffledQueue, repeatActive } = get();
    const trackList = shuffleActive ? shuffledQueue : queue;

    if (trackList.length === 0) return;

    let nextIndex = currentTrackIndex + 1;

    // Handle end of playlist
    if (nextIndex >= trackList.length) {
      if (repeatActive) {
        nextIndex = 0; // Loop back to beginning
      } else {
        // Stop playback at end
        await get().clearTrack();
        set({ currentTrackIndex: -1 });
        return;
      }
    }

    await get().playTrackAtIndex(nextIndex);
  },

  playPreviousTrack: async () => {
    const { currentTrackIndex, position, shuffleActive, shuffledQueue, queue } = get();
    const trackList = shuffleActive ? shuffledQueue : queue;

    if (trackList.length === 0) return;

    // If more than 3 seconds in, restart current track; otherwise go to previous
    if (position > 3000) {
      await get().seekTo(0);
      return;
    }

    if (currentTrackIndex > 0) {
      await get().playTrackAtIndex(currentTrackIndex - 1);
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
      set({ shuffleActive: true, shuffledQueue: newShuffledQueue, currentTrackIndex: 0 });
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
