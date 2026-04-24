import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { typography } from '@/constants/typography';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type VaultMiniPlayerProps = {
  onPress?: () => void;
};

function useVaultMiniPlayerStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function VaultMiniPlayer({ onPress }: VaultMiniPlayerProps) {
  const appTheme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const styles = useVaultMiniPlayerStyles();
  const { screenReaderEnabled } = useAccessibilityStore();

  const {
    currentTrack,
    isPlaying,
    isBuffering,
    togglePlayPause,
    clearTrack,
    position,
    duration,
  } = usePlaybackStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  type PressEventWithStop = { stopPropagation?: () => void };

  const handleTogglePlayPause = React.useCallback((e?: PressEventWithStop) => {
    e?.stopPropagation?.();
    if (!reduceMotion) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    togglePlayPause();
  }, [reduceMotion, togglePlayPause]);

  const handleClearTrack = React.useCallback((e?: PressEventWithStop) => {
    e?.stopPropagation?.();
    if (!reduceMotion) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    clearTrack();
  }, [clearTrack, reduceMotion]);

  if (!currentTrack) return null;

  const launcherWidth = Math.min(124, width - 44);
  const maxSafeWidth = Math.floor(width / 2 - launcherWidth / 2 - 24);
  const playerWidth = Math.max(120, Math.min(220, maxSafeWidth));
  const bottomPos = Math.max(insets.bottom, 14) + 16;
  const progress = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  const glassBackground = appTheme.isDark ? 'rgba(20, 15, 16, 0.46)' : 'rgba(255,255,255,0.72)';
  const glassBorder = appTheme.colors.borderStrong;
  const blurIntensity = reduceMotion ? 0 : 34;

  return (
    <Pressable
      style={[
        styles.container,
        {
          bottom: bottomPos,
          width: playerWidth,
          backgroundColor: glassBackground,
          borderColor: glassBorder,
        },
      ]}
      onPress={onPress}
      android_ripple={{ color: appTheme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(23,18,19,0.06)' }}
    >
      <BlurView intensity={blurIntensity} tint={appTheme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />

      <View style={styles.content}>
        <View style={styles.artworkContainer}>
          {currentTrack.artworkUrl ? (
            <Image source={{ uri: currentTrack.artworkUrl }} style={styles.artwork} />
          ) : (
            <Icon name="music" size={16} color={appTheme.colors.primary} />
          )}
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
        </View>

        <View style={styles.controls}>
          <IconButton
            style={styles.controlButton}
            onPress={handleTogglePlayPause}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause playback' : 'Play track'}
            accessibilityState={{ busy: isBuffering }}
            accessibilityHint={screenReaderEnabled ? 'Toggles playback in Vault mini player.' : undefined}
          >
            {isBuffering ? (
              <View style={styles.bufferingDot} />
            ) : isPlaying ? (
              <Icon
                name="pause"
                size={20}
                color={appTheme.colors.textPrimary}
                fill
                iosAnimation={reduceMotion ? undefined : { effect: 'scale', wholeSymbol: true, speed: 1 }}
              />
            ) : (
              <Icon
                name="play"
                size={20}
                color={appTheme.colors.textPrimary}
                fill
                iosAnimation={reduceMotion ? undefined : { effect: 'scale', wholeSymbol: true, speed: 1 }}
              />
            )}
          </IconButton>

          <IconButton
            style={styles.controlButton}
            onPress={handleClearTrack}
            icon="x"
            size={16}
            color={appTheme.colors.textDisabled}
            accessibilityRole="button"
            accessibilityLabel="Clear track"
            accessibilityHint={screenReaderEnabled ? 'Removes the current track from Vault mini player.' : undefined}
            iosAnimation={reduceMotion ? undefined : { effect: 'pulse', wholeSymbol: true, speed: 1.05 }}
          />
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
      </View>
    </Pressable>
  );
}

const legacyStyles = {
  container: {
    position: 'absolute',
    left: 12,
    height: 58,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(26, 21, 24, 0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 42,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    justifyContent: 'space-between',
    paddingBottom: 3,
  },
  artworkContainer: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(236, 92, 57, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 8,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,
    marginRight: 4,
  },
  title: {
    ...typography.chip,
    color: '#FFF',
  },
  artist: {
    ...typography.small,
    color: 'rgba(255,255,255,0.6)',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  controlButton: {
    borderRadius: 18,
  },
  bufferingDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#fff',
    borderTopColor: 'transparent',
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#EC5C39',
    borderRadius: 1,
  },
};
