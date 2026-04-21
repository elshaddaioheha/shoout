/**
 * Playback store regression tests.
 *
 * Covers: next/previous behavior, shuffle indexing, repeat looping.
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act } from 'react';

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

jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(async () => undefined),
    Sound: {
      createAsync: jest.fn(async (_source: any, _initial: any, onStatusUpdate?: (status: any) => void) => {
        onStatusUpdate?.({
          isLoaded: true,
          isPlaying: true,
          isBuffering: false,
          positionMillis: 0,
          durationMillis: 180000,
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

jest.mock('firebase/firestore', () => ({
  doc: jest.fn((_db: any, path: string) => ({ path })),
  increment: jest.fn((v: number) => v),
  updateDoc: jest.fn(async () => undefined),
}));

import type { Track } from '../../store/usePlaybackStore';
import { usePlaybackStore } from '../../store/usePlaybackStore';

const TRACKS: Track[] = [
  { id: 't1', title: 'Track 1', artist: 'Artist 1', url: 'https://example.com/t1.mp3', uploaderId: 'u1' },
  { id: 't2', title: 'Track 2', artist: 'Artist 2', url: 'https://example.com/t2.mp3', uploaderId: 'u1' },
  { id: 't3', title: 'Track 3', artist: 'Artist 3', url: 'https://example.com/t3.mp3', uploaderId: 'u1' },
];

beforeEach(() => {
  jest.clearAllMocks();
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
  it('uses a valid shuffled list index when initializing in shuffle mode', async () => {
    await act(async () => {
      await usePlaybackStore.getState().initializePlaylist(TRACKS, 1, true);
    });

    const state = usePlaybackStore.getState();
    expect(state.shuffleActive).toBe(true);
    expect(state.shuffledQueue).toHaveLength(3);
    expect(state.currentTrackIndex).toBe(0);
    expect(state.currentTrack).not.toBeNull();
  });

  it('keeps a playable track on next when at end and repeat is off', async () => {
    await act(async () => {
      await usePlaybackStore.getState().initializePlaylist(TRACKS, 2, false);
    });

    const before = usePlaybackStore.getState().currentTrack;

    await act(async () => {
      await usePlaybackStore.getState().playNextTrack();
    });

    const state = usePlaybackStore.getState();
    expect(state.currentTrack?.id).toBe(before?.id);
    expect(state.isPlaying).toBe(false);
    expect(state.position).toBe(0);
    expect(state.queue).toHaveLength(3);
  });

  it('loops to the first track on next when repeat is on', async () => {
    await act(async () => {
      await usePlaybackStore.getState().initializePlaylist(TRACKS, 2, false);
      usePlaybackStore.getState().setRepeatMode('all');
      await usePlaybackStore.getState().playNextTrack();
    });

    const state = usePlaybackStore.getState();
    expect(state.currentTrackIndex).toBe(0);
    expect(state.currentTrack?.id).toBe('t1');
  });

  it('restarts current track when previous is pressed', async () => {
    await act(async () => {
      await usePlaybackStore.getState().initializePlaylist(TRACKS, 0, false);
      usePlaybackStore.setState({ position: 12000 });
    });

    const before = usePlaybackStore.getState().currentTrack;

    await act(async () => {
      await usePlaybackStore.getState().playPreviousTrack();
    });

    const state = usePlaybackStore.getState();
    expect(state.currentTrack).toEqual(before);
    expect(state.currentTrackIndex).toBe(0);
    expect(mockSound.setPositionAsync).toHaveBeenCalledWith(0);
  });

  it('cycles repeat mode in off -> all -> one -> off order', () => {
    const first = usePlaybackStore.getState().cycleRepeatMode();
    const second = usePlaybackStore.getState().cycleRepeatMode();
    const third = usePlaybackStore.getState().cycleRepeatMode();

    expect(first).toBe('all');
    expect(second).toBe('one');
    expect(third).toBe('off');
    expect(usePlaybackStore.getState().repeatMode).toBe('off');
  });

  it('jumps to previous track when explicit previous-track option is used', async () => {
    await act(async () => {
      await usePlaybackStore.getState().initializePlaylist(TRACKS, 2, false);
      await usePlaybackStore.getState().playPreviousTrack({ goToPreviousTrack: true });
    });

    const state = usePlaybackStore.getState();
    expect(state.currentTrackIndex).toBe(1);
    expect(state.currentTrack?.id).toBe('t2');
  });

  it('keeps next functional when no explicit playlist exists', async () => {
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
    expect(state.isPlaying).toBe(false);
    expect(state.position).toBe(0);
    expect(state.queue.length).toBe(1);
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
    expect(state.shuffledQueue).toEqual([]);
  });
});
