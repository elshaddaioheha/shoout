import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePlayerControls } from '@/hooks/usePlayerControls';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import React, { memo, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

function ControlsBase() {
  const appTheme = useAppTheme();
  const { handlePrevious } = usePlayerControls();
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const isBuffering = usePlaybackStore((s) => s.isBuffering);
  const togglePlayPause = usePlaybackStore((s) => s.togglePlayPause);
  const playNextTrack = usePlaybackStore((s) => s.playNextTrack);

  const onPrevious = useCallback(() => {
    handlePrevious();
  }, [handlePrevious]);

  const onPlayPause = useCallback(() => {
    void togglePlayPause();
  }, [togglePlayPause]);

  const onNext = useCallback(() => {
    void playNextTrack();
  }, [playNextTrack]);

  return (
    <View style={styles.row}>
      <IconButton onPress={onPrevious} style={styles.sideButton}>
        <Icon name="skip-back" size={26} color={appTheme.colors.textPrimary} fill />
      </IconButton>
      <IconButton onPress={onPlayPause} style={[styles.playButton, { backgroundColor: appTheme.colors.textPrimary }]}>
        {isBuffering ? (
          <ActivityIndicator size="small" color={appTheme.colors.background} />
        ) : isPlaying ? (
          <Icon name="pause" size={30} color={appTheme.colors.background} fill />
        ) : (
          <Icon name="play" size={30} color={appTheme.colors.background} fill />
        )}
      </IconButton>
      <IconButton onPress={onNext} style={styles.sideButton}>
        <Icon name="skip-forward" size={26} color={appTheme.colors.textPrimary} fill />
      </IconButton>
    </View>
  );
}

export const Controls = memo(ControlsBase);

const styles = StyleSheet.create({
  row: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  sideButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
