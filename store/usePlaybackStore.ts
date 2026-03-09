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

  // Actions
  setTrack: (track: Track) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  skipForward: (seconds?: number) => Promise<void>;
  skipBack: (seconds?: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  clearTrack: () => Promise<void>;
  setRepeat: (value: boolean) => void;
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
            const { repeatActive, sound: s } = get();
            if (repeatActive && s) {
              // Restart from beginning
              s.setPositionAsync(0).then(() => s.playAsync());
            } else {
              // Stop and reset position
              set({ isPlaying: false, position: 0 });
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
}));
