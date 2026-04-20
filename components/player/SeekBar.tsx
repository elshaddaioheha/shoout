import { useAppTheme } from '@/hooks/use-app-theme';
import React, { memo, useCallback } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  SharedValue,
} from 'react-native-reanimated';

type Props = {
  progress: SharedValue<number>;
  position: number;
  duration: number;
  onSeek: (position: number) => void;
};

function formatTime(millis: number) {
  if (!millis || millis < 0) return '0:00';
  const totalSeconds = Math.floor(millis / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function SeekBarBase({ progress, position, duration, onSeek }: Props) {
  const appTheme = useAppTheme();
  const width = useSharedValue(1);
  const knobScale = useSharedValue(1);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    width.value = Math.max(1, event.nativeEvent.layout.width);
  }, [width]);

  const commitSeek = useCallback((nextProgress: number) => {
    onSeek(nextProgress * duration);
  }, [duration, onSeek]);

  const pan = Gesture.Pan()
    .onBegin((event) => {
      knobScale.value = withSpring(1.4, { stiffness: 300, damping: 15 });
      const next = Math.max(0, Math.min(1, event.x / width.value));
      progress.value = next;
    })
    .onUpdate((event) => {
      const next = Math.max(0, Math.min(1, event.x / width.value));
      progress.value = next;
    })
    .onEnd(() => {
      knobScale.value = withSpring(1, { stiffness: 300, damping: 15 });
      runOnJS(commitSeek)(progress.value);
    });

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value)) * 100}%`,
  }));
  const knobStyle = useAnimatedStyle(() => ({
    left: Math.max(0, Math.min(1, progress.value)) * width.value,
    transform: [{ scale: knobScale.value }],
  }));

  const elapsed = position;
  const remaining = Math.max(0, duration - position);

  return (
    <View>
      <GestureDetector gesture={pan}>
        <View onLayout={onLayout} style={styles.touchArea}>
          <View style={[styles.track, { backgroundColor: appTheme.colors.surfaceMuted }]}>
            <Animated.View style={[styles.fill, { backgroundColor: appTheme.colors.primary }, fillStyle]} />
            <Animated.View style={[styles.knob, { backgroundColor: appTheme.colors.textPrimary }, knobStyle]} />
          </View>
        </View>
      </GestureDetector>
      <View style={styles.timeRow}>
        <Text style={[styles.time, { color: appTheme.colors.textSecondary }]}>{formatTime(elapsed)}</Text>
        <Text style={[styles.time, { color: appTheme.colors.textSecondary }]}>-{formatTime(remaining)}</Text>
      </View>
    </View>
  );
}

export const SeekBar = memo(SeekBarBase);

const styles = StyleSheet.create({
  touchArea: {
    height: 32,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 999,
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
  knob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
    top: -6,
    marginLeft: -8,
  },
  timeRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
});
