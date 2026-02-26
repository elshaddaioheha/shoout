import { Audio } from 'expo-av';
import { create } from 'zustand';

export interface Track {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  url: string; // Required for expo-av
}

interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  volume: number;
  sound: Audio.Sound | null;

  // Actions
  setTrack: (track: Track) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  clearTrack: () => Promise<void>;
}

let playbackUpdateInterval: NodeJS.Timeout | null = null;

export const usePlaybackStore = create<PlaybackState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  isBuffering: false,
  position: 0,
  duration: 0,
  volume: 1.0,
  sound: null,

  setTrack: async (track: Track) => {
    const { sound: currentSound } = get();

    // 1. Clean up existing sound
    if (currentSound) {
      await currentSound.unloadAsync();
    }

    try {
      set({ isBuffering: true, currentTrack: track, position: 0 });

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
          if (status.isLoaded) {
            set({
              isPlaying: status.isPlaying,
              isBuffering: status.isBuffering,
              position: status.positionMillis,
              duration: status.durationMillis || 0,
            });

            if (status.didJustFinish) {
              // Handle auto-next logic here if needed
              get().togglePlayPause(); // Stop for now
            }
          }
        }
      );

      set({ sound, isBuffering: false, isPlaying: true });
    } catch (error) {
      console.error('Error loading track:', error);
      set({ isBuffering: false, currentTrack: null });
    }
  },

  togglePlayPause: async () => {
    const { sound, isPlaying } = get();
    if (!sound) return;

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  },

  seekTo: async (position: number) => {
    const { sound } = get();
    if (!sound) return;
    await sound.setPositionAsync(position);
  },

  setVolume: async (volume: number) => {
    const { sound } = get();
    if (sound) {
      await sound.setVolumeAsync(volume);
    }
    set({ volume });
  },

  clearTrack: async () => {
    const { sound } = get();
    if (sound) {
      await sound.unloadAsync();
    }
    set({ currentTrack: null, sound: null, isPlaying: false, position: 0, duration: 0 });
  },
}));
