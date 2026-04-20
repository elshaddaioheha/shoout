import { Icon } from '@/components/ui/Icon';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { Track } from '@/store/usePlaybackStore';
import { Image } from 'expo-image';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  track: Track | null;
};

function ArtworkSectionBase({ track }: Props) {
  const appTheme = useAppTheme();

  return (
    <View style={styles.container}>
      {track?.artworkUrl ? (
        <Image source={{ uri: track.artworkUrl }} contentFit="cover" style={styles.image} />
      ) : (
        <View style={[styles.placeholder, { borderColor: appTheme.colors.borderStrong }]}>
          <Icon name="music" size={54} color={appTheme.colors.textSecondary} />
        </View>
      )}
    </View>
  );
}

export const ArtworkSection = memo(ArtworkSectionBase);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
});
