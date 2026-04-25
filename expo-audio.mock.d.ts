declare module 'expo-audio' {
  export const __audioMock: {
    emitPlaybackStatus: (partial?: Partial<{
      currentTime: number;
      didJustFinish: boolean;
      duration: number;
      isBuffering: boolean;
      isLoaded: boolean;
      playbackState: string;
      playing: boolean;
      timeControlStatus: string;
    }>) => void;
    mockPlayer: {
      addListener: (...args: any[]) => any;
      clearLockScreenControls: (...args: any[]) => any;
      pause: (...args: any[]) => any;
      play: (...args: any[]) => any;
      remove: (...args: any[]) => any;
      replace: (...args: any[]) => any;
      seekTo: (seconds: number) => Promise<void>;
      setActiveForLockScreen: (...args: any[]) => any;
      volume: number;
    };
    mockRecorder: {
      prepareToRecordAsync: () => Promise<void>;
      record: () => void;
      stop: () => Promise<void>;
      readonly uri: string | null;
    };
    reset: () => void;
    setRecorderState: (partial: Partial<{
      currentTime: number;
      isRecording: boolean;
    }>) => void;
    setRecorderUri: (uri: string | null) => void;
  };
}
