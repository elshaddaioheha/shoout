import { Controls } from '@/components/player/Controls';
import { ArtworkSection } from '@/components/player/ArtworkSection';
import { SeekBar } from '@/components/player/SeekBar';
import { TrackInfo } from '@/components/player/TrackInfo';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePlayerActions } from '@/hooks/usePlayerActions';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import React, { memo, useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  onCollapse: () => void;
};

function FullPlayerViewBase({ onCollapse }: Props) {
  const appTheme = useAppTheme();
  const insets = useSafeAreaInsets();
  const currentTrack = usePlaybackStore((s) => s.currentTrack);
  const position = usePlaybackStore((s) => s.position);
  const duration = usePlaybackStore((s) => s.duration);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const seekTo = usePlaybackStore((s) => s.seekTo);
  const progress = useSharedValue(0);
  const isPlayingShared = useSharedValue(false);
  const durationShared = useSharedValue(1);
  const { onShare } = usePlayerActions();

  useEffect(() => {
    isPlayingShared.value = isPlaying;
    durationShared.value = Math.max(duration, 1);
  }, [duration, isPlaying, durationShared, isPlayingShared]);

  useEffect(() => {
    progress.value = duration > 0 ? Math.max(0, Math.min(1, position / duration)) : 0;
  }, [duration, position, progress]);

  useFrameCallback((frame) => {
    if (!isPlayingShared.value) return;
    const deltaMs = frame.timeSincePreviousFrame ?? 16.67;
    progress.value = Math.min(1, progress.value + deltaMs / durationShared.value);
  });

  const handleSeek = useCallback((nextPosition: number) => {
    void seekTo(nextPosition);
  }, [seekTo]);

  const handleShare = useCallback(() => {
    if (!currentTrack) return;
    void onShare(currentTrack);
  }, [currentTrack, onShare]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, backgroundColor: appTheme.colors.background }]}>
      <View style={styles.header}>
        <IconButton onPress={onCollapse} style={styles.headerButton}>
          <Icon name="chevron-down" size={24} color={appTheme.colors.textPrimary} />
        </IconButton>
        <IconButton onPress={handleShare} style={styles.headerButton}>
          <Icon name="share" size={20} color={appTheme.colors.textPrimary} />
        </IconButton>
      </View>

      <ArtworkSection track={currentTrack} />
      <TrackInfo track={currentTrack} />
      <SeekBar progress={progress} position={position} duration={duration} onSeek={handleSeek} />
      <Controls />
      <Animated.View />
    </View>
  );
}

export const FullPlayerView = memo(FullPlayerViewBase);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
