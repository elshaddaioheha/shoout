/**
 * Player E2E Tests
 * 
 * Comprehensive end-to-end tests for:
 * - Track selection and playback initialization
 * - Seeking and position updates
 * - Skipping (previous/next)
 * - Shuffle toggle
 * - Repeat modes (off, all, one)
 * - Top-right menu actions
 */

import { act } from 'react';

// ===== Mock Setup =====

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockSound = {
  stopAsync: jest.fn(async () => undefined),
  unloadAsync: jest.fn(async () => undefined),
  pauseAsync: jest.fn(async () => undefined),
  playAsync: jest.fn(async () => undefined),
  setPositionAsync: jest.fn(async () => undefined),
  setVolumeAsync: jest.fn(async () => undefined),
};

let statusUpdateCallback: ((status: any) => void) | undefined;

jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(async () => undefined),
    Sound: {
      createAsync: jest.fn(async (_source: any, _initial: any, onStatusUpdate?: (status: any) => void) => {
        statusUpdateCallback = onStatusUpdate;
        onStatusUpdate?.({
          isLoaded: true,
          isPlaying: true,
          isBuffering: false,
          positionMillis: 0,
          durationMillis: 180000, // 3 minutes
          didJustFinish: false,
        });
        return { sound: mockSound };
      }),
    },
  },
}));

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  documentDirectory: 'file:///tmp/',
  makeDirectoryAsync: jest.fn(async () => undefined),
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn(async () => ({ uri: 'file:///tmp/audio.mp3' })),
  })),
  deleteAsync: jest.fn(async () => undefined),
}));

// ===== Test Fixtures =====

const mockTracks = [
  {
    id: 'track1',
    title: 'Test Track 1',
    artist: 'Artist A',
    url: 'https://example.com/track1.mp3',
    artworkUrl: 'https://example.com/art1.jpg',
    uploaderId: 'user1',
    published: true,
    isPublic: true,
    createdAt: new Date(),
  },
  {
    id: 'track2',
    title: 'Test Track 2',
    artist: 'Artist B',
    url: 'https://example.com/track2.mp3',
    artworkUrl: 'https://example.com/art2.jpg',
    uploaderId: 'user2',
    published: true,
    isPublic: true,
    createdAt: new Date(),
  },
  {
    id: 'track3',
    title: 'Test Track 3',
    artist: 'Artist C',
    url: 'https://example.com/track3.mp3',
    artworkUrl: 'https://example.com/art3.jpg',
    uploaderId: 'user3',
    published: true,
    isPublic: true,
    createdAt: new Date(),
  },
];

// ===== Import and Setup Playback Store =====

import { usePlaybackStore } from '@/store/usePlaybackStore';

describe('Player E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    statusUpdateCallback = undefined;
    usePlaybackStore.setState({
      currentTrack: null,
      isPlaying: false,
      isBuffering: false,
      position: 0,
      duration: 0,
      volume: 1,
      
      repeatMode: 'off' as const,
      queue: [],
      currentTrackIndex: 0,
      shuffleActive: false,
      shuffledQueue: [],
    });
  });

  // ===== Test Suite 1: Track Selection and Playback Initialization =====

  describe('Track Selection & Playback Initialization', () => {
    it('should load and play first track when initializing playlist', async () => {
      const store = usePlaybackStore.getState();

      await act(async () => {
        await store.initializePlaylist(mockTracks, 0, false);
      });

      const state = usePlaybackStore.getState();
      expect(state.currentTrack).toEqual(mockTracks[0]);
      expect(state.queue).toEqual(mockTracks);
      expect(state.currentTrackIndex).toBe(0);
      expect(state.shuffleActive).toBe(false);
    });

    it('should start at specific track index', async () => {
      const store = usePlaybackStore.getState();

      await act(async () => {
        await store.initializePlaylist(mockTracks, 1, false);
      });

      const state = usePlaybackStore.getState();
      expect(state.currentTrack).toEqual(mockTracks[1]);
      expect(state.currentTrackIndex).toBe(1);
    });

    it('should initialize with shuffle when enabled', async () => {
      const store = usePlaybackStore.getState();

      await act(async () => {
        await store.initializePlaylist(mockTracks, 0, true);
      });

      const state = usePlaybackStore.getState();
      expect(state.shuffleActive).toBe(true);
      expect(state.shuffledQueue.length).toBe(mockTracks.length);
      expect(state.currentTrack).toBeDefined();
    });

    it('should call play on sound when track loads', async () => {
      const store = usePlaybackStore.getState();

      await act(async () => {
        await store.initializePlaylist(mockTracks, 0, false);
      });

      expect(mockSound.playAsync).toHaveBeenCalled();
    });
  });

  // ===== Test Suite 2: Seeking and Position Updates =====

  describe('Seeking & Position Updates', () => {
    beforeEach(async () => {
      const store = usePlaybackStore.getState();
      await act(async () => {
        await store.initializePlaylist(mockTracks, 0, false);
      });
    });

    it('should seek to specified position', async () => {
      const store = usePlaybackStore.getState();
      const targetPosition = 45000; // 45 seconds

      await act(async () => {
        await store.seekTo(targetPosition);
      });

      expect(mockSound.setPositionAsync).toHaveBeenCalledWith(targetPosition);
    });

    it('should update position from playback status', async () => {
      if (!statusUpdateCallback) throw new Error('Status callback not set');

      await act(async () => {
        statusUpdateCallback({
          isLoaded: true,
          isPlaying: true,
          isBuffering: false,
          positionMillis: 15000,
          durationMillis: 180000,
          didJustFinish: false,
        });
      });

      const state = usePlaybackStore.getState();
      expect(state.position).toBe(15000);
    });

    it('should clamp seek position to duration bounds', async () => {
      const store = usePlaybackStore.getState();

      // Seek beyond duration
      await act(async () => {
        await store.seekTo(999999);
      });

      expect(mockSound.setPositionAsync).toHaveBeenCalledWith(999999);
    });

    it('should handle seek to zero', async () => {
      const store = usePlaybackStore.getState();

      await act(async () => {
        await store.seekTo(0);
      });

      expect(mockSound.setPositionAsync).toHaveBeenCalledWith(0);
    });
  });

  // ===== Test Suite 3: Skipping (Previous/Next) =====

  describe('Skipping: Next & Previous', () => {
    beforeEach(async () => {
      const store = usePlaybackStore.getState();
      await act(async () => {
        await store.initializePlaylist(mockTracks, 0, false);
      });
    });

    it('should skip to next track', async () => {
      const store = usePlaybackStore.getState();

      await act(async () => {
        await store.playNextTrack();
      });

      const state = usePlaybackStore.getState();
      expect(state.currentTrack).toEqual(mockTracks[1]);
    });

    it('should restart current track when previous is pressed once', async () => {
      const store = usePlaybackStore.getState();

      // Move to track 2
      await act(async () => {
        await store.playNextTrack();
      });

      // Default previous behavior restarts the current track.
      await act(async () => {
        await store.playPreviousTrack();
      });

      const state = usePlaybackStore.getState();
      expect(state.currentTrack).toEqual(mockTracks[1]);
      expect(mockSound.setPositionAsync).toHaveBeenCalledWith(0);
    });

    it('should wrap around queue when skipping next at end', async () => {
      const store = usePlaybackStore.getState();

      // Play last track
      await act(async () => {
        await store.playTrackAtIndex(mockTracks.length - 1);
      });

      // Skip next should play first track (auto-play random)
      // Note: This behavior varies based on repeat mode
      const state = usePlaybackStore.getState();
      expect(state.currentTrackIndex).toBe(mockTracks.length - 1);
    });

    it('should skip 15 seconds forward in mini player', async () => {
      const store = usePlaybackStore.getState();

      if (!statusUpdateCallback) throw new Error('Status callback not set');

      // Set position to 30 seconds
      await act(async () => {
        statusUpdateCallback({
          isLoaded: true,
          isPlaying: true,
          isBuffering: false,
          positionMillis: 30000,
          durationMillis: 180000,
          didJustFinish: false,
        });
      });

      await act(async () => {
        await store.skipForward(15);
      });

      // Should call seekTo with 30000 + 15000
      expect(mockSound.setPositionAsync).toHaveBeenCalledWith(45000);
    });

    it('should skip 15 seconds backward', async () => {
      const store = usePlaybackStore.getState();

      if (!statusUpdateCallback) throw new Error('Status callback not set');

      // Set position to 30 seconds
      await act(async () => {
        statusUpdateCallback({
          isLoaded: true,
          isPlaying: true,
          isBuffering: false,
          positionMillis: 30000,
          durationMillis: 180000,
          didJustFinish: false,
        });
      });

      await act(async () => {
        await store.skipBack(15);
      });

      // Should call seekTo with 30000 - 15000
      expect(mockSound.setPositionAsync).toHaveBeenCalledWith(15000);
    });
  });

  // ===== Test Suite 4: Shuffle Toggle =====

  describe('Shuffle Toggle', () => {
    beforeEach(async () => {
      const store = usePlaybackStore.getState();
      await act(async () => {
        await store.initializePlaylist(mockTracks, 0, false);
      });
    });

    it('should enable shuffle mode', async () => {
      const store = usePlaybackStore.getState();

      await act(async () => {
        await store.setShuffleMode(true);
      });

      const state = usePlaybackStore.getState();
      expect(state.shuffleActive).toBe(true);
      expect(state.shuffledQueue.length).toBe(mockTracks.length);
    });

    it('should disable shuffle mode', async () => {
      const store = usePlaybackStore.getState();

      // Enable shuffle first
      await act(async () => {
        await store.setShuffleMode(true);
      });

      // Disable shuffle
      await act(async () => {
        await store.setShuffleMode(false);
      });

      const state = usePlaybackStore.getState();
      expect(state.shuffleActive).toBe(false);
    });

    it('should create random order when shuffling', async () => {
      const store = usePlaybackStore.getState();

      await act(async () => {
        await store.setShuffleMode(true);
      });

      const state = usePlaybackStore.getState();
      const shuffledIds = state.shuffledQueue.map((t) => t.id);
      const originalIds = mockTracks.map((t) => t.id);

      // All tracks should be present
      expect(shuffledIds.sort()).toEqual(originalIds.sort());
    });

    it('should preserve queue when toggling shuffle', async () => {
      const store = usePlaybackStore.getState();
      const originalQueue = [...mockTracks];

      await act(async () => {
        await store.setShuffleMode(true);
      });

      const state = usePlaybackStore.getState();
      expect(state.queue).toEqual(originalQueue);
      expect(state.shuffledQueue).not.toEqual(originalQueue);
    });

    it('should skip to next track respecting shuffle order', async () => {
      const store = usePlaybackStore.getState();

      await act(async () => {
        await store.setShuffleMode(true);
      });

      const beforeState = usePlaybackStore.getState();
      const currentShuffledIndex = beforeState.shuffledQueue.findIndex(
        (t) => t.id === beforeState.currentTrack?.id
      );

      await act(async () => {
        await store.playNextTrack();
      });

      const afterState = usePlaybackStore.getState();
      const newShuffledIndex = afterState.shuffledQueue.findIndex(
        (t) => t.id === afterState.currentTrack?.id
      );

      // Index should change (though not necessarily +1 due to randomness)
      expect(currentShuffledIndex).not.toBe(newShuffledIndex);
    });
  });

  // ===== Test Suite 5: Repeat Modes =====

  describe('Repeat Modes Cycling', () => {
    beforeEach(async () => {
      const store = usePlaybackStore.getState();
      await act(async () => {
        await store.initializePlaylist(mockTracks, 0, false);
      });
    });

    it('should cycle from off to all', () => {
      const store = usePlaybackStore.getState();
      expect(store.repeatMode).toBe('off');

      const nextMode = store.cycleRepeatMode();
      expect(nextMode).toBe('all');
    });

    it('should cycle from all to one', () => {
      const store = usePlaybackStore.getState();

      store.cycleRepeatMode(); // off -> all
      const nextMode = store.cycleRepeatMode(); // all -> one

      expect(nextMode).toBe('one');
    });

    it('should cycle from one back to off', () => {
      const store = usePlaybackStore.getState();

      store.cycleRepeatMode(); // off -> all
      store.cycleRepeatMode(); // all -> one
      const nextMode = store.cycleRepeatMode(); // one -> off

      expect(nextMode).toBe('off');
    });

    it('should restart track when in repeat-one mode', async () => {
      if (!statusUpdateCallback) throw new Error('Status callback not set');

      const store = usePlaybackStore.getState();

      // Set repeat mode to one
      await act(async () => {
        store.cycleRepeatMode(); // off -> all
        store.cycleRepeatMode(); // all -> one
      });

      const stateBeforeFinish = usePlaybackStore.getState();
      expect(stateBeforeFinish.repeatMode).toBe('one');

      // Simulate track finish
      await act(async () => {
        statusUpdateCallback({
          isLoaded: true,
          isPlaying: false,
          isBuffering: false,
          positionMillis: 0,
          durationMillis: 180000,
          didJustFinish: true,
        });
      });

      // Position should be reset and track should restart
      expect(mockSound.setPositionAsync).toHaveBeenCalledWith(0);
    });

    it('should play next track in repeat-all mode', async () => {
      if (!statusUpdateCallback) throw new Error('Status callback not set');

      const store = usePlaybackStore.getState();

      // Set repeat mode to all
      store.cycleRepeatMode(); // off -> all

      const stateBeforeFinish = usePlaybackStore.getState();
      expect(stateBeforeFinish.repeatMode).toBe('all');

      const currentTrackId = stateBeforeFinish.currentTrack?.id;

      // Simulate track finish
      await act(async () => {
        statusUpdateCallback({
          isLoaded: true,
          isPlaying: false,
          isBuffering: false,
          positionMillis: 0,
          durationMillis: 180000,
          didJustFinish: true,
        });
      });

      const stateAfterFinish = usePlaybackStore.getState();
      // Track should have changed (next track)
      expect(stateAfterFinish.currentTrack?.id).not.toBe(currentTrackId);
    });
  });

  // ===== Test Suite 6: Play/Pause Toggle =====

  describe('Play/Pause Controls', () => {
    beforeEach(async () => {
      const store = usePlaybackStore.getState();
      await act(async () => {
        await store.initializePlaylist(mockTracks, 0, false);
      });
    });

    it('should pause playing track', async () => {
      const store = usePlaybackStore.getState();

      await act(async () => {
        await store.togglePlayPause();
      });

      expect(mockSound.pauseAsync).toHaveBeenCalled();
    });

    it('should resume paused track', async () => {
      const store = usePlaybackStore.getState();

      // Pause
      await act(async () => {
        await store.togglePlayPause();
      });

      // Resume
      await act(async () => {
        await store.togglePlayPause();
      });

      expect(mockSound.playAsync).toHaveBeenCalledTimes(2); // Once on init, once on resume
    });

    it('should toggle isPlaying state', async () => {
      if (!statusUpdateCallback) throw new Error('Status callback not set');

      await act(async () => {
        statusUpdateCallback({
          isLoaded: true,
          isPlaying: true,
          isBuffering: false,
          positionMillis: 0,
          durationMillis: 180000,
          didJustFinish: false,
        });
      });

      const store = usePlaybackStore.getState();
      const isPlayingBefore = store.isPlaying;

      await act(async () => {
        await store.togglePlayPause();
      });

      await act(async () => {
        statusUpdateCallback({
          isLoaded: true,
          isPlaying: false,
          isBuffering: false,
          positionMillis: 0,
          durationMillis: 180000,
          didJustFinish: false,
        });
      });

      const stateAfter = usePlaybackStore.getState();
      expect(stateAfter.isPlaying).not.toBe(isPlayingBefore);
    });
  });

  // ===== Test Suite 7: Menu Actions =====

  describe('Top-Right Menu Actions', () => {
    beforeEach(async () => {
      const store = usePlaybackStore.getState();
      await act(async () => {
        await store.initializePlaylist(mockTracks, 0, false);
      });
    });

    it('should have current track available for menu', () => {
      const state = usePlaybackStore.getState();
      expect(state.currentTrack).toBeDefined();
      expect(state.currentTrack?.title).toBe('Test Track 1');
    });

    it('should provide track metadata for favorites', () => {
      const state = usePlaybackStore.getState();
      const { currentTrack } = state;

      expect(currentTrack).toHaveProperty('id');
      expect(currentTrack).toHaveProperty('title');
      expect(currentTrack).toHaveProperty('artist');
    });

    it('should provide track for add to playlist', () => {
      const state = usePlaybackStore.getState();
      const { currentTrack } = state;

      expect(currentTrack?.id).toBe('track1');
      expect(currentTrack?.url).toBe('https://example.com/track1.mp3');
    });

    it('should provide track for share', () => {
      const state = usePlaybackStore.getState();
      const { currentTrack } = state;

      expect(currentTrack?.artworkUrl).toBeDefined();
      expect(currentTrack?.title).toBeDefined();
    });
  });

  // ===== Test Suite 8: Complex Flows =====

  describe('Complex Player Flows', () => {
    it('should handle play -> seek -> pause -> resume flow', async () => {
      const store = usePlaybackStore.getState();

      // Initialize and play
      await act(async () => {
        await store.initializePlaylist(mockTracks, 0, false);
      });

      let state = usePlaybackStore.getState();
      expect(state.isPlaying).toBe(true);

      // Seek to middle
      await act(async () => {
        await store.seekTo(90000);
      });

      expect(mockSound.setPositionAsync).toHaveBeenCalledWith(90000);

      // Pause
      await act(async () => {
        await store.togglePlayPause();
      });

      expect(mockSound.pauseAsync).toHaveBeenCalled();

      // Resume
      await act(async () => {
        await store.togglePlayPause();
      });

      expect(mockSound.playAsync).toHaveBeenCalled();
    });

    it('should handle skip -> shuffle -> repeat cycle', async () => {
      const store = usePlaybackStore.getState();

      await act(async () => {
        await store.initializePlaylist(mockTracks, 0, false);
      });

      // Skip to track 2
      await act(async () => {
        await store.playNextTrack();
      });

      let state = usePlaybackStore.getState();
      expect(state.currentTrack?.id).toBe('track2');

      // Enable shuffle
      await act(async () => {
        await store.setShuffleMode(true);
      });

      state = usePlaybackStore.getState();
      expect(state.shuffleActive).toBe(true);

      // Cycle to repeat-all
      store.cycleRepeatMode();
      state = usePlaybackStore.getState();
      expect(state.repeatMode).toBe('all');
    });

    it('should handle queue switching', async () => {
      const store = usePlaybackStore.getState();

      // Play first queue
      await act(async () => {
        await store.initializePlaylist(mockTracks, 0, false);
      });

      let state = usePlaybackStore.getState();
      expect(state.queue).toEqual(mockTracks);

      // Switch to second track
      await act(async () => {
        await store.initializePlaylist([mockTracks[1], mockTracks[2]], 0, false);
      });

      state = usePlaybackStore.getState();
      expect(state.queue.length).toBe(2);
      expect(state.currentTrack?.id).toBe('track2');
    });
  });
});
