export interface TrackOptions {
  url: string;
  title?: string;
  artist?: string;
  artwork?: string;
}

export type AudioPlaybackState = 'none' | 'ready' | 'playing' | 'paused' | 'stopped' | 'loading' | 'buffering' | 'error' | 'ended';

export interface AudioProgress {
  position: number;
  duration: number;
}

export interface AudioSubscription {
  remove: () => void;
}