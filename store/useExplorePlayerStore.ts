import { Audio } from 'expo-av';
import { create } from 'zustand';

export interface ExploreTrack {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  url: string;
  uploaderId?: string;
}

let isAudioModeConfigured = false;

async function ensureAudioModeConfigured() {
  if (isAudioModeConfigured) return;

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });

  isAudioModeConfigured = true;
}

interface ExplorePlayerState {
  currentTrack: ExploreTrack | null;
  sound: Audio.Sound | null;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  volume: number;
  isImmersiveMode: boolean;

  setImmersiveMode: (active: boolean) => void;
  playTrack: (track: ExploreTrack) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  clearTrack: () => Promise<void>;
}

let playbackLoadToken = 0;

export const useExplorePlayerStore = create<ExplorePlayerState>((set, get) => ({
  currentTrack: null,
  sound: null,
  isPlaying: false,
  isBuffering: false,
  position: 0,
  duration: 0,
  volume: 1,
  isImmersiveMode: false,

  setImmersiveMode: (active) => {
    set({ isImmersiveMode: active });
  },

  playTrack: async (track) => {
    if (!track?.url?.trim()) return;

    playbackLoadToken++;
    const currentToken = playbackLoadToken;

    const previousSound = get().sound;

    try {
      if (previousSound) {
        try {
          await previousSound.stopAsync();
          await previousSound.unloadAsync();
        } catch (_) {
          // Best effort cleanup of prior sound instance.
        }
      }

      set({
        currentTrack: track,
        isBuffering: true,
        isPlaying: false,
        position: 0,
        duration: 0,
        sound: null,
      });

      if (currentToken !== playbackLoadToken) return;

      await ensureAudioModeConfigured();

      if (currentToken !== playbackLoadToken) return;

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: true, volume: get().volume },
        (status) => {
          if (!status.isLoaded) return;

          set({
            isPlaying: status.isPlaying,
            isBuffering: status.isBuffering ?? false,
            position: status.positionMillis ?? 0,
            duration: status.durationMillis ?? 0,
          });
        }
      );

      if (currentToken !== playbackLoadToken) {
        // We swiped away while it was loading. Unload instantly.
        try {
          await sound.unloadAsync();
        } catch (_) {}
        return;
      }

      set({ sound, isBuffering: false, isPlaying: true });
    } catch (error) {
      console.error('Explore player failed to load track:', error);
      if (currentToken === playbackLoadToken) {
        set({ isBuffering: false, isPlaying: false });
      }
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
      console.error('Explore player toggle failed:', error);
    }
  },

  seekTo: async (position) => {
    const { sound } = get();
    if (!sound) return;

    try {
      const clamped = Math.max(0, position);
      await sound.setPositionAsync(clamped);
      set({ position: clamped });
    } catch (error) {
      console.error('Explore player seek failed:', error);
    }
  },

  clearTrack: async () => {
    const { sound } = get();
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (_) {
        // Best effort cleanup.
      }
    }

    set({
      currentTrack: null,
      sound: null,
      isPlaying: false,
      isBuffering: false,
      position: 0,
      duration: 0,
    });
  },
}));
