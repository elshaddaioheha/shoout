type PlaybackStatus = {
  currentTime: number;
  didJustFinish: boolean;
  duration: number;
  isBuffering: boolean;
  isLoaded: boolean;
  playbackState: string;
  playing: boolean;
  timeControlStatus: string;
};

type RecorderState = {
  currentTime: number;
  isRecording: boolean;
};

const basePlaybackStatus = (): PlaybackStatus => ({
  currentTime: 0,
  didJustFinish: false,
  duration: 180,
  isBuffering: false,
  isLoaded: true,
  playbackState: 'paused',
  playing: false,
  timeControlStatus: 'paused',
});

const playbackListeners = new Set<(status: PlaybackStatus) => void>();
let currentPlaybackStatus = basePlaybackStatus();

function emitPlaybackStatus(partial: Partial<PlaybackStatus> = {}) {
  currentPlaybackStatus = {
    ...currentPlaybackStatus,
    ...partial,
  };
  playbackListeners.forEach((listener) => listener(currentPlaybackStatus));
}

const mockPlayer = {
  addListener: jest.fn((_event: string, listener: (status: PlaybackStatus) => void) => {
    playbackListeners.add(listener);
    listener(currentPlaybackStatus);

    return {
      remove: () => {
        playbackListeners.delete(listener);
      },
    };
  }),
  clearLockScreenControls: jest.fn(),
  pause: jest.fn(() => {
    emitPlaybackStatus({
      didJustFinish: false,
      playbackState: 'paused',
      playing: false,
      timeControlStatus: 'paused',
    });
  }),
  play: jest.fn(() => {
    emitPlaybackStatus({
      didJustFinish: false,
      playbackState: 'playing',
      playing: true,
      timeControlStatus: 'playing',
    });
  }),
  remove: jest.fn(() => {
    playbackListeners.clear();
  }),
  replace: jest.fn((_source: string) => {
    emitPlaybackStatus(basePlaybackStatus());
  }),
  seekTo: jest.fn((seconds: number) => {
    emitPlaybackStatus({
      currentTime: seconds,
      didJustFinish: false,
    });
    return Promise.resolve();
  }),
  setActiveForLockScreen: jest.fn(),
  volume: 1,
};

const currentRecorderState: RecorderState = {
  currentTime: 0,
  isRecording: false,
};

let currentRecorderUri: string | null = null;

const mockRecorder = {
  prepareToRecordAsync: jest.fn(async () => undefined),
  record: jest.fn(() => {
    currentRecorderState.isRecording = true;
    currentRecorderState.currentTime = 0;
  }),
  stop: jest.fn(async () => {
    currentRecorderState.isRecording = false;
    currentRecorderUri = currentRecorderUri || 'file:///tmp/mock-recording.m4a';
  }),
  get uri() {
    return currentRecorderUri;
  },
};

export const __audioMock = {
  emitPlaybackStatus,
  mockPlayer,
  mockRecorder,
  reset() {
    currentPlaybackStatus = basePlaybackStatus();
    currentRecorderState.currentTime = 0;
    currentRecorderState.isRecording = false;
    currentRecorderUri = null;
    Object.values(mockPlayer).forEach((value) => {
      if (typeof value === 'function' && 'mockClear' in value) {
        (value as jest.Mock).mockClear();
      }
    });
    Object.values(mockRecorder).forEach((value) => {
      if (typeof value === 'function' && 'mockClear' in value) {
        (value as jest.Mock).mockClear();
      }
    });
  },
  setRecorderState(partial: Partial<RecorderState>) {
    Object.assign(currentRecorderState, partial);
  },
  setRecorderUri(uri: string | null) {
    currentRecorderUri = uri;
  },
};

export const createAudioPlayer = jest.fn(() => mockPlayer);

export const AudioModule = {
  requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
};

export const RecordingPresets = {
  HIGH_QUALITY: {},
};

export const setAudioModeAsync = jest.fn(async () => undefined);

export const useAudioRecorder = jest.fn(() => mockRecorder);

export const useAudioRecorderState = jest.fn(() => currentRecorderState);
