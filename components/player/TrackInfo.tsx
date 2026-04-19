import { useAppTheme } from '@/hooks/use-app-theme';
import type { Track } from '@/store/usePlaybackStore';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  track: Track | null;
};

function TrackInfoBase({ track }: Props) {
  const appTheme = useAppTheme();

  return (
    <View style={styles.container}>
      <Text numberOfLines={1} style={[styles.title, { color: appTheme.colors.textPrimary }]}>
        {track?.title || 'No track selected'}
      </Text>
      <Text numberOfLines={1} style={[styles.artist, { color: appTheme.colors.textSecondary }]}>
        {track?.artist || 'Pick a track to start playback'}
      </Text>
    </View>
  );
}

export const TrackInfo = memo(TrackInfoBase);

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-SemiBold',
  },
  artist: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
});
