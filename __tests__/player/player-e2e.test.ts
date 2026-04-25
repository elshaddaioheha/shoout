import { act } from 'react';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-audio');

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  documentDirectory: 'file:///tmp/',
  makeDirectoryAsync: jest.fn(async () => undefined),
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn(async () => ({ uri: 'file:///tmp/audio.mp3' })),
  })),
  deleteAsync: jest.fn(async () => undefined),
}));

import { __audioMock } from 'expo-audio';
import { usePlaybackStore } from '@/store/usePlaybackStore';

const mockTracks = [
  {
    id: 'track1',
    title: 'Test Track 1',
    artist: 'Artist A',
    url: 'https://example.com/track1.mp3',
    artworkUrl: 'https://example.com/art1.jpg',
    uploaderId: 'user1',
  },
  {
    id: 'track2',
    title: 'Test Track 2',
    artist: 'Artist B',
    url: 'https://example.com/track2.mp3',
    artworkUrl: 'https://example.com/art2.jpg',
    uploaderId: 'user2',
  },
  {
    id: 'track3',
    title: 'Test Track 3',
    artist: 'Artist C',
    url: 'https://example.com/track3.mp3',
    artworkUrl: 'https://example.com/art3.jpg',
    uploaderId: 'user3',
  },
];

describe('Player E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __audioMock.reset();
    usePlaybackStore.setState({
      currentTrack: null,
      isPlaying: false,
      isBuffering: false,
      position: 0,
      duration: 0,
      volume: 1,
      repeatMode: 'off',
      queue: [],
      currentTrackIndex: -1,
      shuffleActive: false,
      shuffledQueue: [],
    });
  });

  it('loads a playlist and starts playback', async () => {
    await act(async () => {
      await usePlaybackStore.getState().initializePlaylist(mockTracks, 0, false);
    });

    const state = usePlaybackStore.getState();
    expect(state.currentTrack).toEqual(mockTracks[0]);
    expect(state.isPlaying).toBe(true);
    expect(__audioMock.mockPlayer.replace).toHaveBeenCalledWith(mockTracks[0].url);
    expect(__audioMock.mockPlayer.play).toHaveBeenCalled();
  });

  it('updates position from playback status and seeks correctly', async () => {
    await act(async () => {
      await usePlaybackStore.getState().initializePlaylist(mockTracks, 0, false);
      __audioMock.emitPlaybackStatus({
        currentTime: 15,
        didJustFinish: false,
        duration: 180,
        isBuffering: false,
        isLoaded: true,
        playbackState: 'playing',
        playing: true,
        timeControlStatus: 'playing',
      });
      await usePlaybackStore.getState().seekTo(45000);
    });

    const state = usePlaybackStore.getState();
    expect(state.position).toBe(45000);
    expect(__audioMock.mockPlayer.seekTo).toHaveBeenCalledWith(45);
  });

  it('skips forward and backward from the current position', async () => {
    await act(async () => {
      await usePlaybackStore.getState().initializePlaylist(mockTracks, 0, false);
      usePlaybackStore.setState({ position: 30000, duration: 180000 });
      await usePlaybackStore.getState().skipForward(15);
      usePlaybackStore.setState({ position: 30000, duration: 180000 });
      await usePlaybackStore.getState().skipBack(15);
    });

    expect(__audioMock.mockPlayer.seekTo).toHaveBeenNthCalledWith(1, 45);
    expect(__audioMock.mockPlayer.seekTo).toHaveBeenNthCalledWith(2, 15);
  });

  it('restarts the current track when repeat-one finishes', async () => {
    await act(async () => {
      await usePlaybackStore.getState().initializePlaylist(mockTracks, 0, false);
      usePlaybackStore.getState().cycleRepeatMode();
      usePlaybackStore.getState().cycleRepeatMode();
      __audioMock.emitPlaybackStatus({
        currentTime: 180,
        didJustFinish: true,
        duration: 180,
        isBuffering: false,
        isLoaded: true,
        playbackState: 'paused',
        playing: false,
        timeControlStatus: 'paused',
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(usePlaybackStore.getState().repeatMode).toBe('one');
    expect(__audioMock.mockPlayer.seekTo).toHaveBeenCalledWith(0);
    expect(__audioMock.mockPlayer.play).toHaveBeenCalledTimes(2);
  });

  it('advances to the next track when repeat-all finishes', async () => {
    await act(async () => {
      await usePlaybackStore.getState().initializePlaylist(mockTracks, 0, false);
      usePlaybackStore.getState().setRepeatMode('all');
      __audioMock.emitPlaybackStatus({
        currentTime: 180,
        didJustFinish: true,
        duration: 180,
        isBuffering: false,
        isLoaded: true,
        playbackState: 'paused',
        playing: false,
        timeControlStatus: 'paused',
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    const state = usePlaybackStore.getState();
    expect(state.currentTrack?.id).toBe('track2');
    expect(state.currentTrackIndex).toBe(1);
  });

  it('toggles pause and resume from player controls', async () => {
    await act(async () => {
      await usePlaybackStore.getState().initializePlaylist(mockTracks, 0, false);
      await usePlaybackStore.getState().togglePlayPause();
      await usePlaybackStore.getState().togglePlayPause();
    });

    expect(__audioMock.mockPlayer.pause).toHaveBeenCalledTimes(1);
    expect(__audioMock.mockPlayer.play).toHaveBeenCalledTimes(2);
  });
});
