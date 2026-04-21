/**
 * TrackPreviewModal — Shows track info, artwork, and license options before purchase
 * 
 * Features:
 * - Full track metadata display (title, artist, category, description)
 * - License tier selection with pricing
 * - Audio preview player
 * - Add to cart or proceed to checkout
 */

import LicenseTierPicker from '@/components/LicenseTierPicker';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useCartStore } from '@/store/useCartStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { buildLicenseCartItemId, buildLicenseTierOptions } from '@/utils/licenseTiers';
import React, { useMemo } from 'react';
import {
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface TrackPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmPurchase?: (licenseId: string) => void;
  track: {
    id: string;
    title: string;
    artist: string;
    uploaderName?: string;
    price: number;
    artworkUrl?: string;
    coverUrl?: string;
    description?: string;
    category?: string;
    audioUrl?: string;
    uploaderId?: string;
    url?: string;
  } | null;
}

function useTrackPreviewStyles() {
  const appTheme = useAppTheme();
  return useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function TrackPreviewModal({
  visible,
  onClose,
  onConfirmPurchase,
  track,
}: TrackPreviewModalProps) {
  const appTheme = useAppTheme();
  const styles = useTrackPreviewStyles();
  const { showToast } = useToastStore();
  const { addItem } = useCartStore();
  const { currentTrack: playingTrack, initializePlaylist, togglePlayPause, isPlaying } = usePlaybackStore();

  const [selectedLicenseId, setSelectedLicenseId] = React.useState<'basic' | 'premium' | 'exclusive'>('premium');
  const [shouldRender, setShouldRender] = React.useState(visible);
  const progress = useSharedValue(visible ? 1 : 0);
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: 300 * (1 - progress.value) }],
  }));

  React.useEffect(() => {
    if (visible) {
      setShouldRender(true);
      progress.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    } else {
      progress.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(setShouldRender)(false);
        }
      });
    }
  }, [progress, visible]);

  const licenseOptions = useMemo(() => {
    if (!track) return [];

    const generated = buildLicenseTierOptions();
    if (generated.length > 0) return generated;

    return [
      { id: 'basic', title: 'Basic', price: track.price, summary: 'Best for demos and socials' },
      { id: 'premium', title: 'Premium', price: track.price * 2.5, summary: 'Built for monetized releases', badge: 'Popular' },
      { id: 'exclusive', title: 'Exclusive', price: track.price * 7, summary: 'Highest value tier' }
    ] as any[];
  }, [track]);

  if (!track || !shouldRender) return null;

  const selectedLicense = licenseOptions.find((opt) => opt.id === selectedLicenseId) || licenseOptions[1];
  const trackArtwork = track.artworkUrl || track.coverUrl;
  const trackUrl = track.audioUrl || track.url || '';
  const isCurrentTrack = playingTrack?.id === track.id;
  const displayArtist = track.artist || track.uploaderName || 'Unknown Artist';

  const handleAddToCart = () => {
    const cartItemId = buildLicenseCartItemId(track.id, selectedLicenseId);
    addItem({
      id: cartItemId,
      listingId: track.id,
      title: track.title,
      artist: displayArtist,
      price: selectedLicense.price,
      audioUrl: trackUrl,
      coverUrl: trackArtwork,
      uploaderId: track.uploaderId || '',
      category: track.category || 'Track',
      licenseTierId: selectedLicenseId,
      licenseTierTitle: selectedLicense.name,
      licenseSummary: selectedLicense.summary,
    });
    showToast(`Added to cart with ${selectedLicense.name} license`, 'success');
    onClose();
  };

  const handleProceedToCheckout = () => {
    if (onConfirmPurchase) {
      onConfirmPurchase(selectedLicenseId);
    }
  };

  const handlePlayPreview = async () => {
    if (!trackUrl) {
      showToast('No preview available', 'info');
      return;
    }

    try {
      if (isCurrentTrack && isPlaying) {
        await togglePlayPause();
      } else {
        // Play this track as preview
        await initializePlaylist(
          [track as any],
          0,
          false
        );
      }
    } catch {
      showToast('Could not play preview', 'error');
    }
  };

  return (
    <Modal
      visible={shouldRender}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, backdropStyle]} />

      <Animated.View
        style={[
          styles.container,
          containerStyle,
        ]}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
        >
          {/* Close Button */}
          <IconButton
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
            icon="x"
            size={24}
            color={appTheme.colors.textPrimary}
            accessibilityRole="button"
            accessibilityLabel="Close track preview"
          />

          {/* Artwork */}
          <View style={styles.artworkContainer}>
            {trackArtwork ? (
              <Image
                source={{ uri: trackArtwork }}
                style={styles.artwork}
              />
            ) : (
              <View style={[styles.artwork, styles.artworkPlaceholder]}>
                <Icon name="music" size={64} color={appTheme.colors.textSecondary} />
              </View>
            )}

            {/* Play Preview Button */}
            <IconButton
              style={styles.playButton}
              onPress={handlePlayPreview}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isCurrentTrack && isPlaying ? 'Pause preview' : 'Play preview'}
              accessibilityState={{ selected: isCurrentTrack && isPlaying }}
            >
              {isCurrentTrack && isPlaying ? (
                <Icon name="pause" size={32} color="#FFFFFF" fill />
              ) : (
                <Icon name="play" size={32} color="#FFFFFF" fill />
              )}
            </IconButton>
          </View>

          {/* Track Info */}
          <View style={styles.infoSection}>
            <Text style={styles.title} numberOfLines={2}>
              {track.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {displayArtist}
            </Text>
            {track.category && (
              <Text style={styles.category}>{track.category}</Text>
            )}
            {track.description && (
              <Text style={styles.description} numberOfLines={3}>
                {track.description}
              </Text>
            )}
          </View>

          {/* License Tier Picker */}
          <View style={styles.licenseSection}>
            <Text style={styles.sectionTitle}>Choose License</Text>
            <LicenseTierPicker
              options={licenseOptions}
              selectedId={selectedLicenseId}
              onSelect={setSelectedLicenseId}
            />
            <View style={styles.priceDisplay}>
              <Text style={styles.priceLabel}>Total Price</Text>
              <Text style={styles.price}>
                ${selectedLicense.price.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* License Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>What&apos;s Included</Text>
            {selectedLicense.features && selectedLicense.features.length > 0 ? (
              selectedLicense.features.map((feature, idx) => (
                <Text key={idx} style={styles.featureItem}>
                  • {feature}
                </Text>
              ))
            ) : (
              <Text style={styles.featureItem}>
                Access to {selectedLicense.name} license tier
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.addToCartButton]}
              onPress={handleAddToCart}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Add to cart"
            >
              <Icon name="cart" size={18} color="#FFFFFF" />
              <Text style={styles.addToCartText}>Add to Cart</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.checkoutButton]}
              onPress={handleProceedToCheckout}
              activeOpacity={0.85}
            >
              <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>

          {/* Spacer */}
          <View style={styles.spacer} />
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const legacyStyles = {
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '90%',
    backgroundColor: '#140F10',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingBottom: 32,
  },
  closeButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  artworkContainer: {
    position: 'relative',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  artwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  artworkPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  playButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(216, 74, 40, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    lineHeight: 28,
    marginBottom: 8,
  },
  artist: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    marginBottom: 4,
  },
  category: {
    color: 'rgba(255, 255, 255, 0.56)',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    marginBottom: 12,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.64)',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  licenseSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 20,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    marginBottom: 16,
  },
  priceDisplay: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    color: 'rgba(255, 255, 255, 0.64)',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
  },
  price: {
    color: '#D84A28',
    fontFamily: 'Poppins-Bold',
    fontSize: 18,
  },
  detailsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 20,
  },
  featureItem: {
    color: 'rgba(255, 255, 255, 0.72)',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
  },
  actions: {
    paddingHorizontal: 20,
    gap: 12,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addToCartButton: {
    backgroundColor: 'rgba(216, 74, 40, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(216, 74, 40, 0.3)',
  },
  addToCartText: {
    color: '#EC6B4A',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  checkoutButton: {
    backgroundColor: '#D84A28',
  },
  checkoutText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  spacer: {
    height: 20,
  },
};
