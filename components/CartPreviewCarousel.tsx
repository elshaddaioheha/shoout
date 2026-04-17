/**
 * CartPreviewCarousel — Shows scrollable preview of multiple tracks in cart
 * 
 * Features:
 * - Horizontal scrolling carousel of track cards
 * - Each card shows: artwork, title, artist, license tier, price
 * - Remove item button
 * - Tap to view full preview modal
 * - Empty state handling
 */

import React, { useMemo } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { Music, X } from 'lucide-react-native';

interface CartPreviewItem {
  id: string;
  title: string;
  artist: string;
  price: number;
  coverUrl?: string;
  licenseTierTitle?: string;
  onRemove?: () => void;
  onTap?: () => void;
}

interface CartPreviewCarouselProps {
  items: CartPreviewItem[];
  onTrackPress?: (item: CartPreviewItem) => void;
}

function useCartPreviewStyles() {
  const appTheme = useAppTheme();
  return useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function CartPreviewCarousel({
  items,
  onTrackPress,
}: CartPreviewCarouselProps) {
  const appTheme = useAppTheme();
  const styles = useCartPreviewStyles();

  const renderCard = ({ item }: { item: CartPreviewItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onTrackPress?.(item)}
      activeOpacity={0.75}
    >
      {/* Artwork */}
      <View style={styles.artworkContainer}>
        {item.coverUrl ? (
          <Image
            source={{ uri: item.coverUrl }}
            style={styles.artwork}
          />
        ) : (
          <View style={[styles.artwork, styles.artworkPlaceholder]}>
            <Music size={32} color={appTheme.colors.textSecondary} />
          </View>
        )}

        {/* Remove Button */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => item.onRemove?.()}
          activeOpacity={0.7}
        >
          <X size={16} color="#FFFFFF" />
        </TouchableOpacity>

        {/* License Badge */}
        {item.licenseTierTitle && (
          <View style={styles.licenseBadge}>
            <Text style={styles.licenseBadgeText}>{item.licenseTierTitle}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {item.artist}
        </Text>
        <Text style={styles.price}>
          ${item.price.toFixed(2)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Your Cart</Text>
      <FlatList
        data={items}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        scrollEventThrottle={16}
      />
    </View>
  );
}

const legacyStyles = {
  container: {
    marginTop: 20,
    marginBottom: 20,
  },
  heading: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    marginBottom: 12,
    marginLeft: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 160,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  artworkContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  artwork: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  licenseBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(216, 74, 40, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  licenseBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 10,
  },
  info: {
    padding: 12,
    gap: 4,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    lineHeight: 16,
  },
  artist: {
    color: 'rgba(255, 255, 255, 0.64)',
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
  },
  price: {
    color: '#D84A28',
    fontFamily: 'Poppins-Bold',
    fontSize: 13,
    marginTop: 4,
  },
};
