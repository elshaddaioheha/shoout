import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { typography } from '@/constants/typography';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useAccessibilityStore } from '@/store/useAccessibilityStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MINI_WAVE_BARS = [5, 10, 8, 13, 7, 15, 6, 12, 9, 14, 7, 11, 6, 10, 8, 13];

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
    playNextTrack,
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

  const handleSkipNext = React.useCallback((e?: PressEventWithStop) => {
    e?.stopPropagation?.();
    if (!reduceMotion) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    void playNextTrack();
  }, [playNextTrack, reduceMotion]);

  if (!currentTrack) return null;

  const playerWidth = Math.max(288, width - 20);
  const bottomPos = Math.max(insets.bottom, 14) + 16;
  const progress = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  const glassBackground = '#000000';
  const glassBorder = 'rgba(255,255,255,0.14)';
  const shooutBlue = appTheme.colors.shooutPrimary;
  const primaryControlBg = shooutBlue;
  const activeBars = Math.max(1, Math.round((progress / 100) * MINI_WAVE_BARS.length));
  const inactiveWaveColor = appTheme.isDark ? 'rgba(255,255,255,0.28)' : 'rgba(20,15,16,0.24)';

  return (
    <Pressable
      style={[
        styles.container,
        {
          bottom: bottomPos,
          width: playerWidth,
          left: 10,
          backgroundColor: glassBackground,
          borderColor: glassBorder,
        },
      ]}
      onPress={onPress}
      android_ripple={{ color: appTheme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(23,18,19,0.06)' }}
    >
      <View style={styles.content}>
        <IconButton
          style={[styles.primaryControlButton, { backgroundColor: primaryControlBg }]}
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
              color="#FFFFFF"
              fill
              iosAnimation={reduceMotion ? undefined : { effect: 'scale', wholeSymbol: true, speed: 1 }}
            />
          ) : (
            <Icon
              name="play"
              size={20}
              color="#FFFFFF"
              fill
              iosAnimation={reduceMotion ? undefined : { effect: 'scale', wholeSymbol: true, speed: 1 }}
            />
          )}
        </IconButton>

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: '#FFFFFF' }]} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={[styles.artist, { color: 'rgba(255,255,255,0.72)' }]} numberOfLines={1}>{currentTrack.artist}</Text>
        </View>

        <View style={styles.waveformRow}>
          {MINI_WAVE_BARS.map((barHeight, index) => (
            <View
              key={`vault-mini-wave-${index}`}
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

        <IconButton
          style={[styles.trailingControlButton, { backgroundColor: 'rgba(106,167,255,0.16)' }]}
          onPress={handleSkipNext}
          icon="skip-forward"
          size={20}
          color={shooutBlue}
          accessibilityRole="button"
          accessibilityLabel="Skip to next track"
          accessibilityHint={screenReaderEnabled ? 'Skips to the next track in queue.' : undefined}
          iosAnimation={reduceMotion ? undefined : { effect: 'pulse', wholeSymbol: true, speed: 1.05 }}
        />
      </View>
    </Pressable>
  );
}

const legacyStyles = {
  container: {
    position: 'absolute',
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: 'rgba(26, 21, 24, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 42,
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
    paddingBottom: 6,
  },
  primaryControlButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 2,
  },
  title: {
    ...typography.body,
    color: '#FFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
  },
  artist: {
    ...typography.small,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10.5,
  },
  trailingControlButton: {
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
  bufferingDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#fff',
    borderTopColor: 'transparent',
  },
};
