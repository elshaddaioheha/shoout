import { audioEngine } from '@/services/audioEngine';
import { create } from 'zustand';

export interface ExploreTrack {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  url: string;
  uploaderId?: string;
}

interface ExplorePlayerState {
  currentTrack: ExploreTrack | null;
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
let progressListener: any = null;
let stateListener: any = null;

export const useExplorePlayerStore = create<ExplorePlayerState>((set, get) => ({
  currentTrack: null,
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

    try {
      await get().clearTrack();

      set({
        currentTrack: track,
        isBuffering: true,
        isPlaying: false,
        position: 0,
        duration: 0,
      });

      if (currentToken !== playbackLoadToken) return;

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
      }

      await audioEngine.setup();

      if (currentToken !== playbackLoadToken) return;

      await audioEngine.load({
        url: track.url,
        title: track.title,
        artist: track.artist,
        artwork: track.artworkUrl,
      });
      await audioEngine.setVolume(get().volume);

      if (currentToken !== playbackLoadToken) {
        await audioEngine.unload();
        return;
      }
    } catch (error) {
      console.error('Explore player failed to load track:', error);
      if (currentToken === playbackLoadToken) {
        set({ isBuffering: false, isPlaying: false });
      }
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
      console.error('Explore player toggle failed:', error);
    }
  },

  seekTo: async (position) => {
    const { currentTrack } = get();
    if (!currentTrack) return;

    try {
      const clamped = Math.max(0, position);
      await audioEngine.seek(clamped);
      set({ position: clamped });
    } catch (error) {
      console.error('Explore player seek failed:', error);
    }
  },

  clearTrack: async () => {
    const { currentTrack } = get();
    if (currentTrack) {
      try {
        await audioEngine.stop();
        await audioEngine.unload();
      } catch (_) {
        // Best effort cleanup.
      }
    }

    set({
      currentTrack: null,
      isPlaying: false,
      isBuffering: false,
      position: 0,
      duration: 0,
    });
  },
}));
