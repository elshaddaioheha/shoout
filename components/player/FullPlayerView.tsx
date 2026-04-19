import { ArtworkSection } from '@/components/player/ArtworkSection';
import { Controls } from '@/components/player/Controls';
import { SeekBar } from '@/components/player/SeekBar';
import { TrackInfo } from '@/components/player/TrackInfo';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePlayerActions } from '@/hooks/usePlayerActions';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUIStore } from '@/store/useUIStore';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useFrameCallback, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  onCollapse: () => void;
};

function FullPlayerViewBase({ onCollapse }: Props) {
  const appTheme = useAppTheme();
  const insets = useSafeAreaInsets();
  const mode = useUIStore((s) => s.playerMode);
  const currentTrack = usePlaybackStore((s) => s.currentTrack);
  const position = usePlaybackStore((s) => s.position);
  const duration = usePlaybackStore((s) => s.duration);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const repeatMode = usePlaybackStore((s) => s.repeatMode);
  const shuffleActive = usePlaybackStore((s) => s.shuffleActive);
  const queue = usePlaybackStore((s) => s.queue);
  const shuffledQueue = usePlaybackStore((s) => s.shuffledQueue);
  const currentTrackIndex = usePlaybackStore((s) => s.currentTrackIndex);
  const setShuffleMode = usePlaybackStore((s) => s.setShuffleMode);
  const cycleRepeatMode = usePlaybackStore((s) => s.cycleRepeatMode);
  const seekTo = usePlaybackStore((s) => s.seekTo);
  const progress = useSharedValue(0);
  const isPlayingShared = useSharedValue(false);
  const durationShared = useSharedValue(1);
  const revealProgress = useSharedValue(0);
  const { onAddToCart, onShare } = usePlayerActions();

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

  useEffect(() => {
    revealProgress.value = withTiming(mode === 'full' ? 1 : 0, {
      duration: mode === 'full' ? 360 : 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [mode, revealProgress]);

  const handleSeek = useCallback((nextPosition: number) => {
    void seekTo(nextPosition);
  }, [seekTo]);

  const handleShare = useCallback(() => {
    if (!currentTrack) return;
    void onShare(currentTrack);
  }, [currentTrack, onShare]);
  const handlePurchase = useCallback(() => {
    if (!currentTrack) return;
    onAddToCart(currentTrack);
  }, [currentTrack, onAddToCart]);
  const handleShuffle = useCallback(() => {
    void setShuffleMode(!shuffleActive);
  }, [setShuffleMode, shuffleActive]);
  const handleRepeat = useCallback(() => {
    cycleRepeatMode();
  }, [cycleRepeatMode]);

  const activeQueue = shuffleActive ? shuffledQueue : queue;
  const queuePosition = activeQueue.length > 0 && currentTrackIndex >= 0 ? `${currentTrackIndex + 1}/${activeQueue.length}` : '1/1';
  const repeatIconName = repeatMode === 'one' ? 'repeat-one' : 'repeat';
  const repeatLabel = repeatMode === 'off' ? 'Repeat off' : repeatMode === 'all' ? 'Repeat all' : 'Repeat one';

  const trackSeed = currentTrack?.id || currentTrack?.title || 'default-track';
  const seedTotal = trackSeed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const hue = seedTotal % 360;
  const ambientA = `hsla(${hue}, 72%, 58%, 0.28)`;
  const ambientB = `hsla(${(hue + 42) % 360}, 78%, 54%, 0.24)`;
  const ambientC = `hsla(${(hue + 120) % 360}, 62%, 42%, 0.18)`;

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: revealProgress.value,
    transform: [
      { translateY: interpolate(revealProgress.value, [0, 1], [46, 0]) },
      { scale: interpolate(revealProgress.value, [0, 1], [0.98, 1]) },
    ],
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, backgroundColor: appTheme.colors.background }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[ambientA, ambientB, ambientC, 'transparent']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ambience}
      />
      <Animated.View style={animatedContentStyle}>
        <View style={styles.header}>
          <IconButton onPress={onCollapse} style={styles.headerButton}>
            <Icon name="chevron-down" size={24} color={appTheme.colors.textPrimary} />
          </IconButton>
          <View style={styles.headerActions}>
            <Pressable onPress={handlePurchase} style={[styles.actionChip, { borderColor: appTheme.colors.borderStrong }]}>
              <Icon name="cart" size={16} color={appTheme.colors.textPrimary} />
              <Text style={[styles.actionChipText, { color: appTheme.colors.textPrimary }]}>Purchase</Text>
            </Pressable>
            <IconButton onPress={handleShare} style={styles.headerButton}>
              <Icon name="share" size={20} color={appTheme.colors.textPrimary} />
            </IconButton>
          </View>
        </View>

        <ArtworkSection track={currentTrack} />
        <TrackInfo track={currentTrack} />

        <View style={styles.metaRow}>
          <Text style={[styles.metaLabel, { color: appTheme.colors.textSecondary }]}>
            Track {queuePosition}
          </Text>
          <View style={styles.modeButtons}>
            <Pressable
              onPress={handleShuffle}
              style={[
                styles.pillButton,
                { borderColor: shuffleActive ? ambientA : appTheme.colors.borderStrong },
                shuffleActive ? styles.pillButtonActive : null,
              ]}
            >
              <Icon name="shuffle" size={16} color={appTheme.colors.textPrimary} />
              <Text style={[styles.pillLabel, { color: appTheme.colors.textPrimary }]}>Shuffle</Text>
            </Pressable>
            <Pressable
              onPress={handleRepeat}
              style={[
                styles.pillButton,
                { borderColor: repeatMode !== 'off' ? ambientB : appTheme.colors.borderStrong },
                repeatMode !== 'off' ? styles.pillButtonActive : null,
              ]}
            >
              <Icon name={repeatIconName} size={16} color={appTheme.colors.textPrimary} />
              <Text style={[styles.pillLabel, { color: appTheme.colors.textPrimary }]}>{repeatLabel}</Text>
            </Pressable>
          </View>
        </View>

        <SeekBar progress={progress} position={position} duration={duration} onSeek={handleSeek} />
        <Controls />
      </Animated.View>
    </View>
  );
}

export const FullPlayerView = memo(FullPlayerViewBase);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
  },
  ambience: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionChip: {
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionChipText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    marginBottom: 12,
  },
  metaLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    marginBottom: 8,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  pillButton: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pillLabel: {
    fontSize: 11,
    fontFamily: 'Poppins-Medium',
  },
});
