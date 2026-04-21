import TrackPlayer, { Capability, Event, State as TrackPlayerState } from 'react-native-track-player';
import type { AudioPlaybackState, AudioProgress, AudioSubscription, TrackOptions } from './audioEngine.types';

let isSetup = false;

function mapTrackPlayerState(state: TrackPlayerState): AudioPlaybackState {
  switch (state) {
    case TrackPlayerState.Playing:
      return 'playing';
    case TrackPlayerState.Paused:
      return 'paused';
    case TrackPlayerState.Stopped:
      return 'stopped';
    case TrackPlayerState.Loading:
      return 'loading';
    case TrackPlayerState.Buffering:
      return 'buffering';
    case TrackPlayerState.Ended:
      return 'ended';
    case TrackPlayerState.Ready:
      return 'ready';
    case TrackPlayerState.Error:
      return 'error';
    default:
      return 'none';
  }
}

export const audioEngine = {
  async setup() {
    if (isSetup) return;
    try {
      await TrackPlayer.setupPlayer();
      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.Stop,
          Capability.SeekTo,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious],
      });
      isSetup = true;
    } catch (error) {
      isSetup = true;
    }
  },

  async load(track: TrackOptions, autoPlay = true) {
    await this.setup();
    await TrackPlayer.reset();
    await TrackPlayer.add({
      id: track.url,
      url: track.url,
      title: track.title || 'Unknown Title',
      artist: track.artist || 'Unknown Artist',
      artwork: track.artwork,
    });
    if (autoPlay) {
      await TrackPlayer.play();
    }
  },

  async play() {
    await TrackPlayer.play();
  },

  async pause() {
    await TrackPlayer.pause();
  },

  async stop() {
    await TrackPlayer.stop();
  },

  async unload() {
    await TrackPlayer.reset();
  },

  async seek(positionMs: number) {
    await TrackPlayer.seekTo(positionMs / 1000);
  },

  async setVolume(volume: number) {
    await TrackPlayer.setVolume(volume);
  },

  onPlaybackStateChange(callback: (state: AudioPlaybackState) => void): AudioSubscription {
    const subscription = TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
      callback(mapTrackPlayerState(event.state));
    });
    return subscription as AudioSubscription;
  },

  onPlaybackProgressChange(callback: (progress: AudioProgress) => void): AudioSubscription {
    const subscription = TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (event) => {
      callback({
        position: event.position * 1000,
        duration: event.duration * 1000,
      });
    });
    return subscription as AudioSubscription;
  },

  onPlaybackQueueEnded(callback: (event: any) => void): AudioSubscription {
    const subscription = TrackPlayer.addEventListener(Event.PlaybackQueueEnded, callback);
    return subscription as AudioSubscription;
  },
};