import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SharedHeader from '@/components/SharedHeader';
import { colors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePublishedUploads, type PublishedUpload } from '@/hooks/usePublishedUploads';
import { useCartStore } from '@/store/useCartStore';
import { useExplorePlayerStore } from '@/store/useExplorePlayerStore';
import { useLayoutMetricsStore } from '@/store/useLayoutMetricsStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { formatUsd } from '@/utils/pricing';
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Music, Play, ShoppingCart, ThumbsDown } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ViewToken,
} from 'react-native';

const HEADER_HEIGHT = 60;

type DiscoverItem = PublishedUpload;
type ExploreFeedItem = DiscoverItem & { feedKey: string };
type ExploreItemProps = {
  item: ExploreFeedItem;
  contentHeight: number;
  width: number;
  appTheme: ReturnType<typeof useAppTheme>;
  likedTracks: Record<string, boolean>;
  handleLike: (item: DiscoverItem) => void;
  handleDislike: (item: DiscoverItem) => void;
  handlePurchase: (item: DiscoverItem) => void;
  togglePlayPause: () => Promise<void>;
};

const SHOOUT_BLUE = colors.shooutPrimary;

function useExploreStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

function ExploreItem({ item, contentHeight, width, appTheme, likedTracks, handleLike, handleDislike, handlePurchase, togglePlayPause }: ExploreItemProps) {
  const styles = useExploreStyles();
  const isPlaying = useExplorePlayerStore((state) => state.isPlaying);
  const exploreCurrentTrack = useExplorePlayerStore((state) => state.currentTrack);
  const explorePosition = useExplorePlayerStore((state) => state.position);
  const exploreDuration = useExplorePlayerStore((state) => state.duration);

  const progressPct =
    exploreCurrentTrack?.id === item.id && exploreDuration > 0
      ? Math.min(1, Math.max(0, explorePosition / exploreDuration))
      : 0;

  return (
    <TouchableOpacity activeOpacity={1} onPress={togglePlayPause} style={[styles.explorePage, { width, height: contentHeight }]}>
      {!isPlaying && (
        <View style={styles.playPauseOverlay}>
          <Play size={64} color="rgba(255, 255, 255, 0.8)" />
        </View>
      )}
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

      <View style={styles.exploreActions}>
        <TouchableOpacity
          style={[
            styles.exploreActionBtn,
            likedTracks[item.id] && styles.exploreActionBtnActive
          ]}
          onPress={() => handleLike(item)}
          activeOpacity={0.85}
        >
          <Heart size={28} color="#FFFFFF" fill={likedTracks[item.id] ? '#EC5C39' : 'transparent'} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exploreActionBtn}
          onPress={() => handleDislike(item)}
          activeOpacity={0.85}
        >
          <ThumbsDown size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exploreActionBtn}
          onPress={() => handlePurchase(item)}
          activeOpacity={0.85}
        >
          <ShoppingCart size={28} color="#FFFFFF" />
        </TouchableOpacity>
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

      <View style={styles.feedProgressTrack}>
        <View style={[styles.feedProgressFill, { width: `${progressPct * 100}%` }]} />
      </View>
    </TouchableOpacity>
  );
}

export default function ExploreScreen() {
  const isTabBarFocused = useIsFocused();
  const appTheme = useAppTheme();
  const styles = useExploreStyles();
  const { width, height } = useWindowDimensions();
  const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
  const { showToast } = useToastStore();
  const { bottomTabBarHeight } = useLayoutMetricsStore();
  const contentHeight = height - HEADER_HEIGHT - bottomTabBarHeight;

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

  const clearExploreTrack = useExplorePlayerStore((state) => state.clearTrack);
  const togglePlayPause = useExplorePlayerStore((state) => state.togglePlayPause);
  const setExploreImmersiveMode = useExplorePlayerStore((state) => state.setImmersiveMode);

  const [likedTracks, setLikedTracks] = useState<Record<string, boolean>>({});
  const [dislikedTracks, setDislikedTracks] = useState<Record<string, boolean>>({});
  const [feedItems, setFeedItems] = useState<ExploreFeedItem[]>([]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 84 }).current;
  const feedRef = useRef<FlatList<ExploreFeedItem>>(null);
  const activeFeedIndexRef = useRef(0);
  const isTabBarFocusedRef = useRef(isTabBarFocused);
  const lastRequestedTrackIdRef = useRef<string | null>(null);

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
    isTabBarFocusedRef.current = isTabBarFocused;
  }, [isTabBarFocused]);

  useEffect(() => {
    if (isTabBarFocused) {
      setExploreImmersiveMode(true);
      lastRequestedTrackIdRef.current = null;
      if (stockIsPlaying) {
        pauseStockPlayback().catch(() => {});
      }
    } else {
      setExploreImmersiveMode(false);
      lastRequestedTrackIdRef.current = null;
      clearExploreTrack().catch(() => {});
    }
  }, [isTabBarFocused, stockIsPlaying, pauseStockPlayback, setExploreImmersiveMode, clearExploreTrack]);

  const appendFeed = useCallback(() => {
    if (!items.length) return;
    setFeedItems((prev) => [...prev, ...buildFeedBatch(items, Date.now())]);
  }, [buildFeedBatch, items]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (!isTabBarFocusedRef.current) return;

    const sortedVisibleItems = viewableItems
      .filter((entry) => entry.isViewable && typeof entry.index === 'number')
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    const firstVisibleEntry = sortedVisibleItems[0];
    const first = firstVisibleEntry?.item as ExploreFeedItem | undefined;
    if (!first || typeof firstVisibleEntry?.index !== 'number') return;

    activeFeedIndexRef.current = firstVisibleEntry.index;

    const playback = useExplorePlayerStore.getState();
    if (playback.currentTrack?.id === first.id) return;
    if (lastRequestedTrackIdRef.current === first.id) return;
    lastRequestedTrackIdRef.current = first.id;

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
        lastRequestedTrackIdRef.current = null;
      });
  }).current;

  const handleLike = (item: DiscoverItem) => {
    setLikedTracks((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
    showToast(likedTracks[item.id] ? 'Removed like.' : 'Liked track.', 'success');
  };

  const handleDislike = (item: DiscoverItem) => {
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
    return (
      <ExploreItem
        item={item}
        contentHeight={contentHeight}
        width={width}
        appTheme={appTheme}
        likedTracks={likedTracks}
        handleLike={handleLike}
        handleDislike={handleDislike}
        handlePurchase={handlePurchase}
        togglePlayPause={togglePlayPause}
      />
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
              length: contentHeight,
              offset: contentHeight * index,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
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
    right: 100,
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
    bottom: 34,
    alignItems: 'center',
    gap: 20,
  },
  exploreActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreActionBtnActive: {
    transform: [{ scale: 1.1 }],
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
