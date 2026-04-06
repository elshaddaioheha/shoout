import { usePlaybackStore } from '@/store/usePlaybackStore';
import { BlurView } from 'expo-blur';
import { Music, Pause, Play, X } from 'lucide-react-native';
import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FullPlayer from './FullPlayer';

export default function VaultMiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    togglePlayPause,
    clearTrack,
    position,
    duration,
  } = usePlaybackStore();
  const [isFullPlayerVisible, setIsFullPlayerVisible] = React.useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  if (!currentTrack) return null;

  const launcherWidth = Math.min(124, width - 44);
  const maxSafeWidth = Math.floor(width / 2 - launcherWidth / 2 - 24);
  const playerWidth = Math.max(120, Math.min(220, maxSafeWidth));
  const bottomPos = Math.max(insets.bottom, 14) + 16;
  const progress = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;

  return (
    <>
      <Pressable
        style={[styles.container, { bottom: bottomPos, width: playerWidth }]}
        onPress={() => setIsFullPlayerVisible(true)}
        android_ripple={{ color: 'rgba(255,255,255,0.05)' }}
      >
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={styles.content}>
          <View style={styles.artworkContainer}>
            {currentTrack.artworkUrl ? (
              <Image source={{ uri: currentTrack.artworkUrl }} style={styles.artwork} />
            ) : (
              <Music size={16} color="#EC5C39" />
            )}
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={(e) => { e.stopPropagation(); togglePlayPause(); }}
            >
              {isBuffering ? (
                <View style={styles.bufferingDot} />
              ) : isPlaying ? (
                <Pause size={20} color="#FFF" fill="#FFF" />
              ) : (
                <Play size={20} color="#FFF" fill="#FFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={(e) => { e.stopPropagation(); clearTrack(); }}
            >
              <X size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
        </View>
      </Pressable>

      <FullPlayer
        visible={isFullPlayerVisible}
        onClose={() => setIsFullPlayerVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    height: 58,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(26, 21, 24, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 42,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    justifyContent: 'space-between',
    paddingBottom: 3,
  },
  artworkContainer: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(236, 92, 57, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 8,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,
    marginRight: 4,
  },
  title: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  artist: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontFamily: 'Poppins-Regular',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  controlButton: {
    padding: 4,
    borderRadius: 18,
  },
  bufferingDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#fff',
    borderTopColor: 'transparent',
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#EC5C39',
    borderRadius: 1,
  },
});
