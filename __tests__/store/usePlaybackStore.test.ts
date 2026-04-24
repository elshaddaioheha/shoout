import { beforeEach, describe, expect, it, jest } from '@jest/globals';
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

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: any, path: string) => ({ path })),
  increment: jest.fn((v: number) => v),
  updateDoc: jest.fn(async () => undefined),
}));

import { __audioMock } from 'expo-audio';
import type { Track } from '../../store/usePlaybackStore';
import { usePlaybackStore } from '../../store/usePlaybackStore';

const TRACKS: Track[] = [
  { id: 't1', title: 'Track 1', artist: 'Artist 1', url: 'https://example.com/t1.mp3', uploaderId: 'u1' },
  { id: 't2', title: 'Track 2', artist: 'Artist 2', url: 'https://example.com/t2.mp3', uploaderId: 'u1' },
  { id: 't3', title: 'Track 3', artist: 'Artist 3', url: 'https://example.com/t3.mp3', uploaderId: 'u1' },
];

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

describe('usePlaybackStore playlist navigation', () => {
  it('initializes and plays a shuffled queue', async () => {
    await act(async () => {
      await usePlaybackStore.getState().initializePlaylist(TRACKS, 1, true);
    });

    const state = usePlaybackStore.getState();
    expect(state.shuffleActive).toBe(true);
    expect(state.shuffledQueue).toHaveLength(3);
    expect(state.currentTrack).not.toBeNull();
    expect(state.isPlaying).toBe(true);
  });

  it('loops back to the first track when repeat-all is enabled', async () => {
    await act(async () => {
      await usePlaybackStore.getState().initializePlaylist(TRACKS, 2, false);
      usePlaybackStore.getState().setRepeatMode('all');
      await usePlaybackStore.getState().playNextTrack();
    });

    const state = usePlaybackStore.getState();
    expect(state.currentTrackIndex).toBe(0);
    expect(state.currentTrack?.id).toBe('t1');
  });

  it('restarts the current track when previous is pressed', async () => {
    await act(async () => {
      await usePlaybackStore.getState().initializePlaylist(TRACKS, 0, false);
      usePlaybackStore.setState({ position: 12000 });
      await usePlaybackStore.getState().playPreviousTrack();
    });

    expect(__audioMock.mockPlayer.seekTo).toHaveBeenCalledWith(0);
  });

  it('keeps next functional for a standalone track selection', async () => {
    const standaloneTrack: Track = {
      id: 'solo-1',
      title: 'Standalone 1',
      artist: 'Artist Solo',
      url: 'https://example.com/solo1.mp3',
      uploaderId: 'u-standalone',
    };

    await act(async () => {
      await usePlaybackStore.getState().setTrack(standaloneTrack);
      await usePlaybackStore.getState().playNextTrack();
    });

    const state = usePlaybackStore.getState();
    expect(state.currentTrack?.id).toBe('solo-1');
    expect(state.queue).toHaveLength(1);
  });

  it('clears queue state when clearTrack is called', async () => {
    await act(async () => {
      await usePlaybackStore.getState().initializePlaylist(TRACKS, 1, false);
      await usePlaybackStore.getState().clearTrack();
    });

    const state = usePlaybackStore.getState();
    expect(state.currentTrack).toBeNull();
    expect(state.queue).toEqual([]);
    expect(state.currentTrackIndex).toBe(-1);
    expect(state.shuffleActive).toBe(false);
  });
});
