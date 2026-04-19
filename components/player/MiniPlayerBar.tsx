import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import React, { memo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  onExpand: () => void;
};

function MiniPlayerBarBase({ onExpand }: Props) {
  const appTheme = useAppTheme();
  const currentTrack = usePlaybackStore((s) => s.currentTrack);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const isBuffering = usePlaybackStore((s) => s.isBuffering);
  const position = usePlaybackStore((s) => s.position);
  const duration = usePlaybackStore((s) => s.duration);
  const togglePlayPause = usePlaybackStore((s) => s.togglePlayPause);
  const playNextTrack = usePlaybackStore((s) => s.playNextTrack);

  const onPlayPause = useCallback(() => {
    void togglePlayPause();
  }, [togglePlayPause]);
  const onNext = useCallback(() => {
    void playNextTrack();
  }, [playNextTrack]);

  const progress = duration > 0 ? Math.max(0, Math.min(1, position / duration)) : 0;

  return (
    <View style={[styles.container, { borderColor: appTheme.colors.borderStrong }]}>
      <BlurView intensity={36} tint={appTheme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <IconButton onPress={onExpand} style={styles.expandButton}>
          {currentTrack?.artworkUrl ? (
            <Image source={{ uri: currentTrack.artworkUrl }} contentFit="cover" style={styles.artwork} />
          ) : (
            <Icon name="music" size={20} color={appTheme.colors.textSecondary} />
          )}
        </IconButton>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: appTheme.colors.textPrimary }]} numberOfLines={1}>{currentTrack?.title || 'No track selected'}</Text>
          <Text style={[styles.artist, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>{currentTrack?.artist || 'Start playback to continue'}</Text>
        </View>
        <IconButton onPress={onPlayPause} style={styles.control}>
          {isBuffering ? <Icon name="loader" size={20} color={appTheme.colors.textPrimary} /> : <Icon name={isPlaying ? 'pause' : 'play'} size={20} color={appTheme.colors.textPrimary} fill />}
        </IconButton>
        <IconButton onPress={onNext} style={styles.control}>
          <Icon name="skip-forward" size={20} color={appTheme.colors.textPrimary} fill />
        </IconButton>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: appTheme.colors.surfaceMuted }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: appTheme.colors.primary }]} />
      </View>
    </View>
  );
}

export const MiniPlayerBar = memo(MiniPlayerBarBase);

const styles = StyleSheet.create({
  container: {
    height: 68,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  expandButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artwork: {
    width: 44,
    height: 44,
  },
  texts: { flex: 1 },
  title: { fontSize: 13, fontFamily: 'Poppins-SemiBold' },
  artist: { fontSize: 12, fontFamily: 'Poppins-Regular' },
  control: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: { height: 2 },
  progressFill: { height: '100%' },
});
