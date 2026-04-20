import { Icon } from '@/components/ui/Icon';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePlayerControls } from '@/hooks/usePlayerControls';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import React, { memo, useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// ─── Animated press wrapper ───────────────────────────────────────────────────
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

// ─── Reusable animated button ──────────────────────────────────────────────────
type AnimatedBtnProps = {
  onPress: () => void;
  pressConfig?: PressConfig;
  style?: object;
  children: React.ReactNode;
  hitSlop?: number;
};

function AnimatedBtn({ onPress, pressConfig, style, children, hitSlop = 10 }: AnimatedBtnProps) {
  const { style: scaleStyle, onPressIn, onPressOut } = useScalePress(pressConfig ?? {});
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={hitSlop}
    >
      <Animated.View style={[style, scaleStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

// ─── Controls ─────────────────────────────────────────────────────────────────
type Props = {
  shuffleActive: boolean;
  repeatMode: 'off' | 'all' | 'one';
  onShuffle: () => void;
  onRepeat: () => void;
};

function ControlsBase({ shuffleActive, repeatMode, onShuffle, onRepeat }: Props) {
  const appTheme = useAppTheme();
  const { handlePrevious } = usePlayerControls();
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const isBuffering = usePlaybackStore((s) => s.isBuffering);
  const togglePlayPause = usePlaybackStore((s) => s.togglePlayPause);
  const playNextTrack = usePlaybackStore((s) => s.playNextTrack);

  // Play button has its own scale + a subtle bg pulse on toggle
  const playScale = useSharedValue(1);
  const playBgOpacity = useSharedValue(1);

  const onPlayPressIn = useCallback(() => {
    playScale.value = withSpring(0.88, { stiffness: 260, damping: 12 });
  }, [playScale]);

  const onPlayPressOut = useCallback(() => {
    playScale.value = withSpring(1, { stiffness: 200, damping: 16 });
  }, [playScale]);

  const onPlayPress = useCallback(() => {
    // Quick opacity blip for tactile feedback
    playBgOpacity.value = withTiming(0.7, { duration: 60 }, () => {
      playBgOpacity.value = withTiming(1, { duration: 180 });
    });
    void togglePlayPause();
  }, [togglePlayPause, playBgOpacity]);

  const playAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playScale.value }],
    opacity: playBgOpacity.value,
  }));

  const onPrevious = useCallback(() => handlePrevious(), [handlePrevious]);
  const onNext = useCallback(() => void playNextTrack(), [playNextTrack]);

  const repeatIconName = repeatMode === 'one' ? 'repeat-one' : 'repeat';
  const shuffleColor = shuffleActive ? appTheme.colors.shooutPrimary : appTheme.colors.textSecondary;
  const repeatColor = repeatMode !== 'off' ? appTheme.colors.shooutPrimary : appTheme.colors.textSecondary;

  return (
    <View style={styles.row}>

      {/* ── Shuffle ── */}
      <AnimatedBtn
        onPress={onShuffle}
        pressConfig={{ scaleDown: 0.78, stiffness: 320, damping: 13 }}
        style={styles.modeButton}
        hitSlop={14}
      >
        <Icon name="shuffle" size={22} color={shuffleColor} />
        {shuffleActive && (
          <View style={[styles.activeDot, { backgroundColor: appTheme.colors.shooutPrimary }]} />
        )}
      </AnimatedBtn>

      {/* ── Skip back ── */}
      <AnimatedBtn
        onPress={onPrevious}
        pressConfig={{ scaleDown: 0.82, stiffness: 300, damping: 14 }}
        style={styles.sideButton}
        hitSlop={12}
      >
        <Icon name="skip-back" size={28} color={appTheme.colors.textPrimary} fill />
      </AnimatedBtn>

      {/* ── Play / Pause (custom animated) ── */}
      <Pressable onPressIn={onPlayPressIn} onPressOut={onPlayPressOut} onPress={onPlayPress}>
        <Animated.View
          style={[
            styles.playButton,
            { backgroundColor: appTheme.colors.textPrimary },
            playAnimStyle,
          ]}
        >
          {isBuffering ? (
            <ActivityIndicator size="small" color={appTheme.colors.background} />
          ) : isPlaying ? (
            <Icon name="pause" size={32} color={appTheme.colors.background} fill />
          ) : (
            <Icon name="play" size={32} color={appTheme.colors.background} fill />
          )}
        </Animated.View>
      </Pressable>

      {/* ── Skip forward ── */}
      <AnimatedBtn
        onPress={onNext}
        pressConfig={{ scaleDown: 0.82, stiffness: 300, damping: 14 }}
        style={styles.sideButton}
        hitSlop={12}
      >
        <Icon name="skip-forward" size={28} color={appTheme.colors.textPrimary} fill />
      </AnimatedBtn>

      {/* ── Repeat ── */}
      <AnimatedBtn
        onPress={onRepeat}
        pressConfig={{ scaleDown: 0.78, stiffness: 320, damping: 13 }}
        style={styles.modeButton}
        hitSlop={14}
      >
        <Icon name={repeatIconName as any} size={22} color={repeatColor} />
        {repeatMode !== 'off' && (
          <View style={[styles.activeDot, { backgroundColor: appTheme.colors.shooutPrimary }]} />
        )}
      </AnimatedBtn>

    </View>
  );
}

export const Controls = memo(ControlsBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  modeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  },
});
