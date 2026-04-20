import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SharedHeader from '@/components/SharedHeader';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePublishedUploads, type PublishedUpload } from '@/hooks/usePublishedUploads';
import { useCartStore } from '@/store/useCartStore';
import { useExplorePlayerStore } from '@/store/useExplorePlayerStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyColor, adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { formatUsd } from '@/utils/pricing';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Music, Search, ShoppingCart, ThumbsDown } from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  ViewToken,
} from 'react-native';

import { colors } from '@/constants/colors';

type DiscoverItem = PublishedUpload;
type ExploreFeedItem = DiscoverItem & { feedKey: string };

const SHOOUT_BLUE = colors.shooutPrimary;

function useExploreStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function ExploreScreen() {
  const isTabBarFocused = useIsFocused();
  const appTheme = useAppTheme();
  const styles = useExploreStyles();
  const { width, height } = useWindowDimensions();
  const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
  const { showToast } = useToastStore();

  const cartCount = useCartStore((state) => state.items.length);
  const addItem = useCartStore((state) => state.addItem);

  const {
    tracks: items,
    loading,
    error: loadError,
    reload: loadFeed,
  } = usePublishedUploads(180);

  const setTrack = usePlaybackStore((state) => state.setTrack);
  const stockIsPlaying = usePlaybackStore((state) => state.isPlaying);
  const pauseStockPlayback = usePlaybackStore((state) => state.togglePlayPause);

  const exploreCurrentTrack = useExplorePlayerStore((state) => state.currentTrack);
  const explorePosition = useExplorePlayerStore((state) => state.position);
  const exploreDuration = useExplorePlayerStore((state) => state.duration);
  const playExploreTrack = useExplorePlayerStore((state) => state.playTrack);
  const clearExploreTrack = useExplorePlayerStore((state) => state.clearTrack);
  const setExploreImmersiveMode = useExplorePlayerStore((state) => state.setImmersiveMode);

  const [likedTracks, setLikedTracks] = useState<Record<string, boolean>>({});
  const [dislikedTracks, setDislikedTracks] = useState<Record<string, boolean>>({});
  const [feedItems, setFeedItems] = useState<ExploreFeedItem[]>([]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 84 }).current;
  const feedRef = useRef<FlatList<ExploreFeedItem>>(null);
  const activeFeedIndexRef = useRef(0);

  useEffect(() => {
    if (loadError) {
      showToast(loadError, 'info');
    }
  }, [loadError, showToast]);

  const buildFeedBatch = useCallback(
    (source: DiscoverItem[], seed: number) => {
      const usable = source.filter((item) => !dislikedTracks[item.id]);
      const pool = usable.length > 0 ? usable : source;
      return pool.map((item, index) => ({
        ...item,
        feedKey: `${item.id}-${seed}-${index}`,
      }));
    },
    [dislikedTracks]
  );

  useEffect(() => {
    if (!items.length) {
      setFeedItems([]);
      return;
    }

    const firstBatch = buildFeedBatch(items, Date.now());
    const secondBatch = buildFeedBatch(items, Date.now() + 1);
    setFeedItems([...firstBatch, ...secondBatch]);
  }, [buildFeedBatch, items]);

  useEffect(() => {
    if (isTabBarFocused) {
      setExploreImmersiveMode(true);
      if (stockIsPlaying) {
        pauseStockPlayback().catch(() => {});
      }
    } else {
      setExploreImmersiveMode(false);
      clearExploreTrack().catch(() => {});
    }
  }, [isTabBarFocused, stockIsPlaying, pauseStockPlayback, setExploreImmersiveMode, clearExploreTrack]);

  const appendFeed = useCallback(() => {
    if (!items.length) return;
    setFeedItems((prev) => [...prev, ...buildFeedBatch(items, Date.now())]);
  }, [buildFeedBatch, items]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems.find((entry) => entry.isViewable)?.item as ExploreFeedItem | undefined;
    if (!first) return;

    activeFeedIndexRef.current = viewableItems[0]?.index ?? 0;

    const playback = useExplorePlayerStore.getState();
    if (playback.currentTrack?.id === first.id) return;

    playback
      .playTrack({
        id: first.id,
        title: first.title,
        artist: first.uploaderName,
        artworkUrl: first.artworkUrl,
        url: first.audioUrl,
        uploaderId: first.uploaderId,
      })
      .catch((error) => {
        console.error('Auto-play on feed focus failed:', error);
      });
  }).current;

  useEffect(() => {
    if (!isTabBarFocused) return;
    if (!feedItems.length) return;
    if (exploreCurrentTrack) return;

    const first = feedItems[0];
    playExploreTrack({
      id: first.id,
      title: first.title,
      artist: first.uploaderName,
      artworkUrl: first.artworkUrl,
      url: first.audioUrl,
      uploaderId: first.uploaderId,
    }).catch((error) => {
      console.error('Failed to start initial explore track:', error);
    });
  }, [exploreCurrentTrack, feedItems, playExploreTrack, isTabBarFocused]);

  const handleLike = (item: ExploreFeedItem) => {
    setLikedTracks((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
    showToast(likedTracks[item.id] ? 'Removed like.' : 'Liked track.', 'success');
  };

  const handleDislike = (item: ExploreFeedItem) => {
    setDislikedTracks((prev) => ({ ...prev, [item.id]: true }));
    showToast('Track disliked. Skipping...', 'info');

    const nextIndex = activeFeedIndexRef.current + 1;
    feedRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  };

  const handlePurchase = (item: DiscoverItem) => {
    addItem({
      id: item.id,
      title: item.title,
      artist: item.uploaderName,
      price: item.price,
      audioUrl: item.audioUrl,
      uploaderId: item.uploaderId,
      category: 'Track',
    });
    showToast('Added to cart.', 'success');
  };

  const renderExploreItem = ({ item }: { item: ExploreFeedItem }) => {
    const progressPct =
      exploreCurrentTrack?.id === item.id && exploreDuration > 0
        ? Math.min(1, Math.max(0, explorePosition / exploreDuration))
        : 0;

    return (
      <View style={[styles.explorePage, { width, height: height - 148 }]}>
        <View style={styles.exploreArtworkWrap}>
          {item.artworkUrl ? (
            <Image source={{ uri: item.artworkUrl }} style={styles.fillImage} contentFit="cover" />
          ) : (
            <View style={styles.exploreFallback}>
              <Music size={48} color={appTheme.colors.textSecondary} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.92)']}
            style={styles.exploreGradient}
          />
        </View>

        <View style={styles.exploreMetaBlock}>
          <Text style={[styles.exploreTitle, { color: '#FFFFFF' }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.exploreArtist, { color: 'rgba(255,255,255,0.86)' }]} numberOfLines={1}>
            {item.uploaderName} • {item.genre}
          </Text>
          <Text style={[styles.explorePrice, { color: '#FDE3DA' }]}>{formatUsd(item.price || 0)}</Text>
        </View>

        <View style={styles.exploreActions}>
          <TouchableOpacity
            style={[
              styles.exploreActionBtn,
              { borderColor: 'rgba(255,255,255,0.28)', backgroundColor: 'rgba(20,15,16,0.35)' },
              likedTracks[item.id] && styles.exploreActionBtnActive
            ]}
            onPress={() => handleLike(item)}
            activeOpacity={0.85}
          >
            <Heart size={22} color="#FFFFFF" fill={likedTracks[item.id] ? '#EC5C39' : 'transparent'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exploreActionBtn, { borderColor: 'rgba(255,255,255,0.28)', backgroundColor: 'rgba(20,15,16,0.35)' }]}
            onPress={() => handleDislike(item)}
            activeOpacity={0.85}
          >
            <ThumbsDown size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.explorePurchaseBtn, { borderColor: 'rgba(255,255,255,0.6)', backgroundColor: '#F8D5CB' }]}
            onPress={() => handlePurchase(item)}
            activeOpacity={0.85}
          >
            <ShoppingCart size={18} color="#140F10" />
            <Text style={[styles.explorePurchaseLabel, { color: '#140F10' }]}>Purchase</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.feedProgressTrack}>
          <View style={[styles.feedProgressFill, { width: `${progressPct * 100}%` }]} />
        </View>
      </View>
    );
  };

  const toggleWrapBg = appTheme.colors.backgroundElevated;
  const toggleWrapBorder = appTheme.colors.borderStrong;
  const toggleTextColor = appTheme.colors.textSecondary;
  const toggleActiveText = '#FFFFFF';
  const toggleActiveBg = SHOOUT_BLUE;

  return (
    <SafeScreenWrapper>
      <View style={styles.container}>
        <SharedHeader
          viewMode={viewMode}
          isModeSheetOpen={isModeSheetOpen}
          onModePillPress={openSheet}
          showCart={true}
          cartCount={cartCount}
          showMessages={true}
          showSearch={true}
        />

        {loading && feedItems.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: appTheme.colors.textSecondary }}>Loading explore feed...</Text>
          </View>
        ) : (
          <FlatList
            ref={feedRef}
            data={feedItems}
            keyExtractor={(item) => item.feedKey}
            pagingEnabled
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            onEndReachedThreshold={0.5}
            windowSize={5}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            removeClippedSubviews={false}
            onEndReached={appendFeed}
            renderItem={renderExploreItem}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No published tracks yet.</Text>
              </View>
            }
            getItemLayout={(_, index) => ({
              index,
              length: height - 148,
              offset: (height - 148) * index,
            })}
          />
        )}
      </View>
    </SafeScreenWrapper>
  );
}

const legacyStyles = {
  container: {
    flex: 1,
    backgroundColor: '#140F10',
  },
  modeToggleWrap: {
    marginTop: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  modeToggleBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggleText: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
  },
  searchWrap: {
    flex: 1,
  },
  searchBar: {
    marginTop: 2,
    marginHorizontal: 20,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    lineHeight: 22,
    paddingVertical: 0,
  },
  genreStrip: {
    marginTop: 8,
    marginBottom: 8,
  },
  genreFilterWrap: {
    marginTop: 10,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  genreFilterLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  genreStripContent: {
    paddingHorizontal: 20,
    gap: 8,
    paddingRight: 24,
  },
  genreChip: {
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreChipActive: {
    backgroundColor: `${colors.shooutPrimary}29`,
    borderColor: `${colors.shooutPrimary}6B`,
  },
  genreChipText: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  genreChipTextActive: {
    color: '#D8E8FF',
  },
  emptyState: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  errorBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(236,92,57,0.45)',
    backgroundColor: 'rgba(236,92,57,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  errorBannerText: {
    color: '#FFD9CF',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    height: 28,
    borderRadius: 999,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#EC5C39',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
  },
  searchSections: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 16,
  },
  sectionBlock: {
    marginTop: 8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    marginBottom: 10,
  },
  horizontalPad: {
    paddingRight: 12,
    gap: 10,
  },
  skeletonBlock: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  skeletonLine: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  skeletonSectionTitle: {
    width: 144,
    height: 16,
    marginBottom: 10,
  },
  skeletonLineTitle: {
    width: '86%',
    height: 12,
    marginTop: 8,
  },
  skeletonLineMeta: {
    width: '64%',
    height: 10,
    marginTop: 6,
  },
  skeletonInlineBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  trackCard: {
    width: 148,
  },
  trackArtwork: {
    width: 148,
    height: 148,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fillImage: {
    width: '100%',
    height: '100%',
  },
  trackTitle: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Poppins-SemiBold',
  },
  trackMeta: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
    marginTop: 2,
  },
  inlinePurchaseBtn: {
    marginTop: 8,
    borderRadius: 10,
    height: 30,
    paddingHorizontal: 10,
    backgroundColor: '#F8D5CB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  inlinePurchaseText: {
    color: '#140F10',
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
  },
  artistCard: {
    width: 96,
    alignItems: 'center',
  },
  artistArtwork: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistName: {
    marginTop: 8,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    textAlign: 'center',
  },
  explorePage: {
    position: 'relative',
    overflow: 'hidden',
  },
  exploreArtworkWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  exploreFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  exploreMetaBlock: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 34,
  },
  exploreTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    lineHeight: 30,
  },
  exploreArtist: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.86)',
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  explorePrice: {
    marginTop: 8,
    color: '#FDE3DA',
    fontFamily: 'Poppins-Bold',
    fontSize: 15,
  },
  exploreActions: {
    position: 'absolute',
    right: 14,
    bottom: 98,
    alignItems: 'center',
    gap: 12,
  },
  exploreActionBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(20,15,16,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreActionBtnActive: {
    borderColor: 'rgba(236,92,57,0.62)',
    backgroundColor: 'rgba(236,92,57,0.24)',
  },
  explorePurchaseBtn: {
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 46,
    backgroundColor: '#F8D5CB',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  explorePurchaseLabel: {
    color: '#140F10',
    fontFamily: 'Poppins-Bold',
    fontSize: 12,
  },
  feedProgressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  feedProgressFill: {
    height: '100%',
    backgroundColor: colors.shooutPrimary,
  },
};