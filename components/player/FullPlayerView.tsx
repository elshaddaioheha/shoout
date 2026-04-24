import { ArtworkSection } from '@/components/player/ArtworkSection';
import { Controls } from '@/components/player/Controls';
import { PlayerMenuSheet } from '@/components/player/PlayerMenuSheet';
import { SeekBar } from '@/components/player/SeekBar';
import { TrackInfo } from '@/components/player/TrackInfo';
import { Icon } from '@/components/ui/Icon';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUIStore } from '@/store/useUIStore';
import React, { memo, useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Animated press helper ──────────────────────────────────────────────────
type PressConfig = { scaleDown?: number; stiffness?: number; damping?: number };

function useScalePress({ scaleDown = 0.85, stiffness = 280, damping = 14 }: PressConfig = {}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(scaleDown, { stiffness, damping });
  }, [scale, scaleDown, stiffness, damping]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { stiffness: stiffness * 0.8, damping: damping * 1.2 });
  }, [scale, stiffness, damping]);

  return { style, onPressIn, onPressOut };
}

function AnimatedBtn({
  onPress,
  pressConfig,
  style,
  children,
  hitSlop = 10,
}: {
  onPress: () => void;
  pressConfig?: PressConfig;
  style?: object;
  children: React.ReactNode;
  hitSlop?: number;
}) {
  const { style: scaleStyle, onPressIn, onPressOut } = useScalePress(pressConfig ?? {});
  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} hitSlop={hitSlop}>
      <Animated.View style={[style, scaleStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

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

  const [menuVisible, setMenuVisible] = useState(false);

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

  const handleSeek = useCallback(
    (nextPosition: number) => {
      void seekTo(nextPosition);
    },
    [seekTo],
  );

  const handleShuffle = useCallback(() => {
    void setShuffleMode(!shuffleActive);
  }, [setShuffleMode, shuffleActive]);

  const handleRepeat = useCallback(() => {
    cycleRepeatMode();
  }, [cycleRepeatMode]);

  const activeQueue = shuffleActive ? shuffledQueue : queue;
  const queuePosition =
    activeQueue.length > 0 && currentTrackIndex >= 0
      ? `${currentTrackIndex + 1} / ${activeQueue.length}`
      : '1 / 1';

  const playerBg = appTheme.isDark ? '#000000' : '#FFFFFF';

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: revealProgress.value,
    flex: 1,
    transform: [
      { translateY: interpolate(revealProgress.value, [0, 1], [46, 0]) },
      { scale: interpolate(revealProgress.value, [0, 1], [0.98, 1]) },
    ],
  }));

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 20,
          backgroundColor: playerBg,
        },
      ]}
    >
      <Animated.View style={animatedContentStyle}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <AnimatedBtn
            onPress={onCollapse}
            style={styles.headerButton}
            pressConfig={{ scaleDown: 0.82 }}
          >
            <Icon name="chevron-down" size={24} color={appTheme.colors.textPrimary} />
          </AnimatedBtn>

          <Text style={[styles.headerTitle, { color: appTheme.colors.textSecondary }]}>
            Now Playing
          </Text>

          <AnimatedBtn
            onPress={() => setMenuVisible(true)}
            style={styles.headerButton}
            pressConfig={{ scaleDown: 0.82 }}
          >
            <Icon name="more-vertical" size={22} color={appTheme.colors.textPrimary} />
          </AnimatedBtn>
        </View>

        {/* ── Artwork ── */}
        <View style={styles.artworkWrapper}>
          <ArtworkSection track={currentTrack} />
        </View>

        {/* ── Track Info + Queue position ── */}
        <View style={styles.infoRow}>
          <View style={styles.infoText}>
            <TrackInfo track={currentTrack} />
          </View>
          <Text style={[styles.queueLabel, { color: appTheme.colors.textSecondary }]}>
            {queuePosition}
          </Text>
        </View>

        {/* ── Seek Bar ── */}
        <View style={styles.seekWrapper}>
          <SeekBar
            progress={progress}
            position={position}
            duration={duration}
            onSeek={handleSeek}
          />
        </View>

        {/* ── Controls (Shuffle | Prev | Play | Next | Repeat) ── */}
        <View style={styles.controlsWrapper}>
          <Controls
            shuffleActive={shuffleActive}
            repeatMode={repeatMode}
            onShuffle={handleShuffle}
            onRepeat={handleRepeat}
          />
        </View>
      </Animated.View>

      {/* ── Three-dot menu sheet ── */}
      <PlayerMenuSheet
        visible={menuVisible}
        track={currentTrack}
        onClose={() => setMenuVisible(false)}
      />
    </View>
  );
}

export const FullPlayerView = memo(FullPlayerViewBase);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkWrapper: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 0,
    marginVertical: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 4,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    marginRight: 12,
  },
  queueLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    paddingBottom: 6,
  },
  seekWrapper: {
    marginVertical: 8,
  },
  controlsWrapper: {
    marginTop: 12,
    marginBottom: 4,
  },
});
