import { Icon } from '@/components/ui/Icon';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const MINI_WAVE_BARS = [5, 10, 8, 13, 7, 15, 6, 12, 9, 14, 7, 11, 6, 10, 8, 13];

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

  const onPlayPause = useCallback(() => {
    void togglePlayPause();
  }, [togglePlayPause]);
  const onNext = useCallback(() => {
    void playNextTrack();
  }, [playNextTrack]);
  const onExpandPress = useCallback(() => {
    onExpand();
  }, [onExpand]);

  if (!currentTrack) return null;

  const bgColor = '#000000';
  const borderColor = 'rgba(255,255,255,0.14)';
  const shooutBlue = appTheme.colors.shooutPrimary;
  const primaryControlBg = shooutBlue;
  const activeBars = Math.max(1, Math.round(rawProgress * MINI_WAVE_BARS.length));
  const inactiveWaveColor = appTheme.isDark ? 'rgba(255,255,255,0.28)' : 'rgba(20,15,16,0.24)';

  return (
    <View style={[styles.container, { borderColor, backgroundColor: bgColor }]}> 
      <View style={styles.content}>
        <AnimatedBtn
          onPress={onPlayPause}
          style={[styles.primaryControl, { backgroundColor: primaryControlBg }]}
          pressConfig={{ scaleDown: 0.9 }}
          hitSlop={6}
        >
          {isBuffering ? (
            <Icon name="refresh-ccw" size={19} color="#FFFFFF" />
          ) : (
            <Icon
              name={isPlaying ? 'pause' : 'play'}
              size={19}
              color="#FFFFFF"
              fill
            />
          )}
        </AnimatedBtn>
        <Pressable style={styles.texts} onPress={onExpandPress} hitSlop={8}>
          <Text style={[styles.title, { color: '#FFFFFF' }]} numberOfLines={1}>{currentTrack?.title || 'No track selected'}</Text>
          <Text style={[styles.artist, { color: 'rgba(255,255,255,0.72)' }]} numberOfLines={1}>{currentTrack?.artist || 'Start playback to continue'}</Text>
        </Pressable>
        <View style={styles.waveformRow}>
          {MINI_WAVE_BARS.map((barHeight, index) => (
            <View
              key={`mini-wave-${index}`}
              style={[
                styles.waveformBar,
                {
                  height: barHeight,
                  backgroundColor: index < activeBars ? shooutBlue : inactiveWaveColor,
                },
              ]}
            />
          ))}
        </View>
        <AnimatedBtn
          onPress={onNext}
          style={[styles.trailingControl, { backgroundColor: 'rgba(106,167,255,0.16)' }]}
          pressConfig={{ scaleDown: 0.82 }}
        >
          <Icon name="skip-forward" size={20} color={shooutBlue} fill />
        </AnimatedBtn>
      </View>
    </View>
  );
}

export const MiniPlayerBar = memo(MiniPlayerBarBase);

const styles = StyleSheet.create({
  container: {
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  primaryControl: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 13, fontFamily: 'Poppins-SemiBold' },
  artist: { fontSize: 10.5, fontFamily: 'Poppins-Regular' },
  trailingControl: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformRow: {
    width: 56,
    height: 18,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginRight: 2,
  },
  waveformBar: {
    width: 2,
    borderRadius: 1,
  },
});
