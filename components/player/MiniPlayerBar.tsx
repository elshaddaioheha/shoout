import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import React, { memo, useCallback, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

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
  const rawProgress = duration > 0 ? Math.max(0, Math.min(1, position / duration)) : 0;
  const progressValue = useSharedValue(rawProgress);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const onPlayPause = useCallback(() => {
    void togglePlayPause();
  }, [togglePlayPause]);
  const onNext = useCallback(() => {
    void playNextTrack();
  }, [playNextTrack]);
  const onExpandPress = useCallback(() => {
    onExpand();
  }, [onExpand]);

  useEffect(() => {
    progressValue.value = withTiming(rawProgress, { duration: 250, easing: Easing.linear });
  }, [rawProgress, progressValue]);

  if (!currentTrack) return null;

  const bgColor = appTheme.isDark ? 'rgba(26, 21, 22, 0.97)' : 'rgba(255, 255, 255, 0.97)';
  const borderColor = appTheme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(20,15,16,0.12)';

  return (
    <View style={[styles.container, { borderColor, backgroundColor: Platform.OS === 'ios' ? 'transparent' : bgColor }]}>
      {Platform.OS === 'ios' && (
        <BlurView intensity={35} tint={appTheme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
      )}
      <View style={styles.content}>
        <IconButton onPress={onExpandPress} style={styles.expandButton}>
          {currentTrack?.artworkUrl ? (
            <Image source={{ uri: currentTrack.artworkUrl }} contentFit="cover" style={styles.artwork} transition={300} />
          ) : (
            <Icon name="music" size={20} color={appTheme.colors.textSecondary} />
          )}
        </IconButton>
        <Pressable style={styles.texts} onPress={onExpandPress} hitSlop={8}>
          <Text style={[styles.title, { color: appTheme.colors.textPrimary }]} numberOfLines={1}>{currentTrack?.title || 'No track selected'}</Text>
          <Text style={[styles.artist, { color: appTheme.colors.textSecondary }]} numberOfLines={1}>{currentTrack?.artist || 'Start playback to continue'}</Text>
        </Pressable>
        <AnimatedBtn
          onPress={onPlayPause}
          style={styles.control}
          pressConfig={{ scaleDown: 0.88 }}
        >
          {isBuffering ? (
            <Icon name="refresh-ccw" size={20} color={appTheme.colors.textPrimary} />
          ) : (
            <Icon
              name={isPlaying ? 'pause' : 'play'}
              size={20}
              color={appTheme.colors.textPrimary}
              fill
            />
          )}
        </AnimatedBtn>
        <AnimatedBtn
          onPress={onNext}
          style={styles.control}
          pressConfig={{ scaleDown: 0.82 }}
        >
          <Icon name="skip-forward" size={20} color={appTheme.colors.textPrimary} fill />
        </AnimatedBtn>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: appTheme.colors.surfaceMuted }]}>
        <Animated.View style={[styles.progressFill, { backgroundColor: appTheme.colors.primary }, progressStyle]} />
      </View>
    </View>
  );
}

export const MiniPlayerBar = memo(MiniPlayerBarBase);

const styles = StyleSheet.create({
  container: {
    height: 68,
    // Rounded top corners, flat bottom so it merges with the tab bar below
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderBottomWidth: 0,
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
