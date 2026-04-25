import 'expo-router/entry';
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  try {
    const TrackPlayer = require('react-native-track-player');

    TrackPlayer.registerPlaybackService(() => require('./services/playbackService').default);
  } catch (error) {
    console.warn('[track-player] Playback service registration skipped:', error);
  }
}
