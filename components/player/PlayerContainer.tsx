import { FullPlayerView } from '@/components/player/FullPlayerView';
import { MiniPlayerBar } from '@/components/player/MiniPlayerBar';
import { useLayoutMetricsStore } from '@/store/useLayoutMetricsStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUIStore } from '@/store/useUIStore';
import { useUserStore } from '@/store/useUserStore';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const SPRING_CONFIG = { damping: 22, stiffness: 240, mass: 0.8 };

export default function PlayerContainer() {
  const { height } = useWindowDimensions();
  const bottomTabBarHeight = useLayoutMetricsStore((s) => s.bottomTabBarHeight);
  const activeAppMode = useUserStore((s) => s.activeAppMode);
  const track = usePlaybackStore((s) => s.currentTrack);
  const clearTrack = usePlaybackStore((s) => s.clearTrack);
  const mode = useUIStore((s) => s.playerMode);
  const setMode = useUIStore((s) => s.setPlayerMode);
  const isModeTransitioning = useUIStore((s) => s.isModeTransitioning);
  const isVaultMode = activeAppMode === 'vault' || activeAppMode === 'vault_pro';
  const previousAppModeRef = useRef(activeAppMode);
  const hiddenByModeSwitchTrackIdRef = useRef<string | null>(null);

  const miniHeight = 80;
  const estimatedBottomPillHeight = Math.max(62, bottomTabBarHeight || 0);
  // Keep the mini player floating above bottom controls for pill styling.
  const miniBottom = estimatedBottomPillHeight + 4;
  const hiddenY = height + 80;
  const miniY = height - miniBottom - miniHeight;
  const fullY = 0;
  const translateY = useSharedValue(hiddenY);
  const gestureStartY = useSharedValue(hiddenY);

  useEffect(() => {
    const previousMode = previousAppModeRef.current;
    if (previousMode === activeAppMode) {
      return;
    }

    previousAppModeRef.current = activeAppMode;
    hiddenByModeSwitchTrackIdRef.current = track?.id ?? '__no_track__';

    if (mode !== 'hidden') {
      setMode('hidden');
    }
  }, [activeAppMode, mode, setMode, track]);

  useEffect(() => {
    if (!isModeTransitioning) {
      return;
    }

    hiddenByModeSwitchTrackIdRef.current = track?.id ?? '__no_track__';
    if (mode !== 'hidden') {
      setMode('hidden');
    }
  }, [isModeTransitioning, mode, setMode, track]);

  useEffect(() => {
    if (!track) {
      hiddenByModeSwitchTrackIdRef.current = null;
      if (mode !== 'hidden') {
        setMode('hidden');
      }
      return;
    }

    if (isVaultMode) {
      if (mode !== 'hidden') {
        setMode('hidden');
      }
      return;
    }

    if (mode === 'hidden') {
      if (isModeTransitioning) {
        return;
      }
      if (hiddenByModeSwitchTrackIdRef.current && hiddenByModeSwitchTrackIdRef.current === track.id) {
        return;
      }
      hiddenByModeSwitchTrackIdRef.current = null;
      setMode('mini');
    }
  }, [isModeTransitioning, isVaultMode, mode, setMode, track]);

  useEffect(() => {
    const nextMode = track
      ? (isVaultMode ? 'hidden' : (mode === 'hidden' ? 'mini' : mode))
      : 'hidden';
    const targetY = nextMode === 'full' ? fullY : nextMode === 'mini' ? miniY : hiddenY;
    translateY.value = withSpring(targetY, SPRING_CONFIG);
  }, [fullY, hiddenY, isVaultMode, miniY, mode, track, translateY]);

  const setMini = useCallback(() => {
    if (isVaultMode) {
      setMode('hidden');
      return;
    }
    setMode('mini');
    void Haptics.selectionAsync().catch(() => null);
  }, [isVaultMode, setMode]);
  const setFull = useCallback(() => {
    setMode('full');
    void Haptics.selectionAsync().catch(() => null);
  }, [setMode]);
  const setHidden = useCallback(() => {
    setMode('hidden');
  }, [setMode]);
  const setHiddenAndClear = useCallback(() => {
    setMode('hidden');
    clearTrack().catch(() => null);
  }, [setMode, clearTrack]);

  const fullPan = Gesture.Pan()
    .enabled(mode === 'full')
    .activeOffsetY([-8, 8])
    .failOffsetX([-20, 20])
    .onBegin(() => {
      gestureStartY.value = translateY.value;
    })
    .onUpdate((event) => {
      const next = Math.max(fullY, Math.min(hiddenY, gestureStartY.value + event.translationY));
      translateY.value = next;
    })
    .onEnd((event) => {
      const destination = translateY.value + event.velocityY * 0.12;
      if (isVaultMode) {
        if (destination > miniY + 56) {
          runOnJS(setHidden)();
          return;
        }
        runOnJS(setFull)();
        return;
      }
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
    .enabled(mode !== 'hidden' && !isVaultMode)
    .activeOffsetY([-8, 8])
    .failOffsetX([-20, 20])
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
        runOnJS(setHiddenAndClear)();
        return;
      }
      runOnJS(setMini)();
    });

  const miniStyle = useAnimatedStyle(() => ({
    opacity: isVaultMode ? 0 : interpolate(translateY.value, [fullY, miniY, hiddenY], [0, 1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: (translateY.value - miniY) + interpolate(translateY.value, [fullY, miniY], [12, 0], Extrapolation.CLAMP) },
    ],
  }));

  const fullStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [fullY, miniY], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: translateY.value },
      { scale: interpolate(translateY.value, [fullY, miniY], [1, 0.92], Extrapolation.CLAMP) },
    ],
  }));

  if (isVaultMode) {
    return null;
  }

  return (
    <Animated.View pointerEvents={track ? 'box-none' : 'none'} style={styles.absoluteFill}>
      <GestureDetector gesture={fullPan}>
        <Animated.View pointerEvents={mode === 'full' ? 'auto' : 'none'} style={[styles.fullLayer, fullStyle]}>
          <FullPlayerView onCollapse={setMini} />
        </Animated.View>
      </GestureDetector>
      <GestureDetector gesture={miniPan}>
        <Animated.View pointerEvents={mode === 'mini' && !isVaultMode ? 'auto' : 'none'} style={[styles.miniWrap, { top: miniY, left: 10, right: 10 }, miniStyle]}>
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
