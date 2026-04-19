import { FullPlayerView } from '@/components/player/FullPlayerView';
import { MiniPlayerBar } from '@/components/player/MiniPlayerBar';
import { useUIStore } from '@/store/useUIStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import React, { useCallback, useEffect } from 'react';
import { Platform, StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const SPRING_CONFIG = { damping: 22, stiffness: 240, mass: 0.8 };

export default function PlayerContainer() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const track = usePlaybackStore((s) => s.currentTrack);
  const mode = useUIStore((s) => s.playerMode);
  const setMode = useUIStore((s) => s.setPlayerMode);

  const miniHeight = 68;
  const miniBottom = Platform.OS === 'ios' ? Math.max(90, 70 + insets.bottom) : 72 + insets.bottom;
  const hiddenY = height + 80;
  const miniY = height - miniBottom - miniHeight;
  const fullY = 0;
  const translateY = useSharedValue(hiddenY);
  const gestureStartY = useSharedValue(hiddenY);

  useEffect(() => {
    const nextMode = track ? (mode === 'hidden' ? 'mini' : mode) : 'hidden';
    const targetY = nextMode === 'full' ? fullY : nextMode === 'mini' ? miniY : hiddenY;
    translateY.value = withSpring(targetY, SPRING_CONFIG);
  }, [fullY, hiddenY, miniY, mode, track, translateY]);

  const setMini = useCallback(() => {
    setMode('mini');
    void Haptics.selectionAsync().catch(() => null);
  }, [setMode]);
  const setFull = useCallback(() => {
    setMode('full');
    void Haptics.selectionAsync().catch(() => null);
  }, [setMode]);
  const setHidden = useCallback(() => {
    setMode('hidden');
  }, [setMode]);

  const fullPan = Gesture.Pan()
    .enabled(mode === 'full')
    .onBegin(() => {
      gestureStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      const next = Math.max(fullY, Math.min(hiddenY, gestureStartY.value + event.translationY));
      translateY.value = next;
    })
    .onEnd((event) => {
      const destination = translateY.value + event.velocityY * 0.12;
      const toFull = Math.abs(destination - fullY);
      const toMini = Math.abs(destination - miniY);
      const toHidden = Math.abs(destination - hiddenY);
      if (toFull <= toMini && toFull <= toHidden) {
        runOnJS(setFull)();
      } else if (toMini <= toHidden) {
        runOnJS(setMini)();
      } else {
        runOnJS(setHidden)();
      }
    });
  const miniPan = Gesture.Pan()
    .enabled(mode !== 'hidden')
    .onBegin(() => {
      gestureStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      const next = Math.max(fullY, Math.min(hiddenY, gestureStartY.value + event.translationY));
      translateY.value = next;
    })
    .onEnd((event) => {
      const destination = translateY.value + event.velocityY * 0.12;
      if (destination < miniY - 42) {
        runOnJS(setFull)();
        return;
      }
      if (destination > miniY + 56) {
        runOnJS(setHidden)();
        return;
      }
      runOnJS(setMini)();
    });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const miniStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [fullY, miniY, hiddenY], [0, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(translateY.value, [fullY, miniY], [12, 0], Extrapolation.CLAMP) }],
  }));
  const fullStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [fullY, miniY], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <Animated.View pointerEvents={track ? 'box-none' : 'none'} style={[styles.absoluteFill, containerStyle]}>
      <GestureDetector gesture={fullPan}>
        <Animated.View pointerEvents={mode === 'full' ? 'auto' : 'none'} style={[styles.fullLayer, fullStyle]}>
          <FullPlayerView onCollapse={setMini} />
        </Animated.View>
      </GestureDetector>
      <GestureDetector gesture={miniPan}>
        <Animated.View pointerEvents={mode === 'mini' ? 'auto' : 'none'} style={[styles.miniWrap, { top: miniY, left: 8, right: 8 }, miniStyle]}>
          <MiniPlayerBar onExpand={setFull} />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 240,
  },
  fullLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  miniWrap: {
    position: 'absolute',
  },
});
