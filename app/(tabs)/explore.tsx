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

type DiscoverItem = PublishedUpload;

type ExploreFeedItem = DiscoverItem & { feedKey: string };
type SurfaceMode = 'search' | 'explore';

const FEATURED_GENRES = ['Afrobeats', 'Afro-Pop', 'Gospel', 'Highlife', 'Hip-Hop', 'Afro Fusion'];

function useExploreStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

function DiscoverTrackSkeletonCard({ styles }: { styles: ReturnType<typeof useExploreStyles> }) {
  return (
    <View style={styles.trackCard}>
      <View style={[styles.trackArtwork, styles.skeletonBlock]} />
      <View style={[styles.skeletonLine, styles.skeletonLineTitle]} />
      <View style={[styles.skeletonLine, styles.skeletonLineMeta]} />
      <View style={[styles.inlinePurchaseBtn, styles.skeletonInlineBtn]} />
    </View>
  );
}

function DiscoverySkeletonLoader({ styles }: { styles: ReturnType<typeof useExploreStyles> }) {
  return (
    <View style={styles.searchSections}>
      {['Suggested Tracks', 'Trending Artists', 'Popular Beats'].map((section) => (
        <View key={section} style={styles.sectionBlock}>
          <View style={[styles.skeletonLine, styles.skeletonSectionTitle]} />
          <FlatList
            horizontal
            data={[0, 1, 2]}
            keyExtractor={(item) => `${section}-${item}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalPad}
            renderItem={() => <DiscoverTrackSkeletonCard styles={styles} />}
          />
        </View>
      ))}
    </View>
  );
}

function SearchDiscoveryContent({
  styles,
  appTheme,
  items,
  loading,
  loadError,
  onRetry,
  selectedGenre,
  setSelectedGenre,
  searchQuery,
  setSearchQuery,
  onPlay,
  onPurchase,
}: {
  styles: ReturnType<typeof useExploreStyles>;
  appTheme: ReturnType<typeof useAppTheme>;
  items: DiscoverItem[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
  selectedGenre: string | null;
  setSelectedGenre: (genre: string | null) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onPlay: (item: DiscoverItem) => void;
  onPurchase: (item: DiscoverItem) => void;
}) {
  const searchIconColor = adaptLegacyColor('rgba(255,255,255,0.45)', 'color', appTheme);
  const placeholderColor = appTheme.colors.textPlaceholder;

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredItems = useMemo(() => {
    const genreFiltered = selectedGenre
      ? items.filter((item) => item.genre.toLowerCase().includes(selectedGenre.toLowerCase()))
      : items;

    if (!normalizedQuery) {
      return genreFiltered;
    }

    return genreFiltered.filter((item) =>
      item.title.toLowerCase().includes(normalizedQuery)
      || item.uploaderName.toLowerCase().includes(normalizedQuery)
      || item.genre.toLowerCase().includes(normalizedQuery)
    );
  }, [items, normalizedQuery, selectedGenre]);

  const suggestedTracks = useMemo(
    () => [...filteredItems].sort((a, b) => b.listenCount - a.listenCount).slice(0, 12),
    [filteredItems]
  );

  const trendingArtists = useMemo(() => {
    const map = new Map<string, { name: string; score: number; art?: string }>();
    for (const item of filteredItems) {
      const key = item.uploaderName.toLowerCase();
      const prev = map.get(key);
      if (!prev) {
        map.set(key, { name: item.uploaderName, score: item.listenCount, art: item.artworkUrl });
      } else {
        map.set(key, { ...prev, score: prev.score + item.listenCount, art: prev.art || item.artworkUrl });
      }
    }
    return [...map.values()].sort((a, b) => b.score - a.score).slice(0, 10);
  }, [filteredItems]);

  const popularBeats = useMemo(
    () => [...filteredItems].filter((item) => item.price > 0).sort((a, b) => b.listenCount - a.listenCount).slice(0, 12),
    [filteredItems]
  );

  return (
    <View style={styles.searchWrap}>
      <View style={[styles.searchBar, { backgroundColor: appTheme.colors.backgroundElevated, borderColor: appTheme.colors.borderStrong }]}> 
        <Search size={16} color={searchIconColor} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tracks, artists, genres"
          placeholderTextColor={placeholderColor}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        horizontal
        data={FEATURED_GENRES}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={styles.genreStrip}
        contentContainerStyle={styles.genreStripContent}
        renderItem={({ item }) => {
          const active = selectedGenre === item;
          return (
            <TouchableOpacity
              style={[styles.genreChip, active && styles.genreChipActive]}
              onPress={() => setSelectedGenre(active ? null : item)}
              activeOpacity={0.85}
            >
              <Text style={[styles.genreChipText, active && styles.genreChipTextActive]}>{item}</Text>
            </TouchableOpacity>
          );
        }}
      />

      {loadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.85}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? (
        <DiscoverySkeletonLoader styles={styles} />
      ) : filteredItems.length === 0 ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>No published tracks match this view yet.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.85}>
            <Text style={styles.retryBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={[
            { key: 'suggested', title: 'Suggested Tracks', rows: suggestedTracks },
            { key: 'artists', title: 'Trending Artists', rows: trendingArtists as any },
            { key: 'beats', title: 'Popular Beats', rows: popularBeats },
          ]}
          keyExtractor={(item) => item.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.searchSections}
          renderItem={({ item }) => {
            if (item.key === 'artists') {
              return (
                <View style={styles.sectionBlock}>
                  <Text style={styles.sectionTitle}>{item.title}</Text>
                  <FlatList
                    horizontal
                    data={item.rows as { name: string; art?: string }[]}
                    keyExtractor={(row) => row.name}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalPad}
                    renderItem={({ item: artist }) => (
                      <View style={styles.artistCard}>
                        <View style={styles.artistArtwork}>
                          {artist.art ? <Image source={{ uri: artist.art }} style={styles.fillImage} contentFit="cover" /> : <Music size={18} color={appTheme.colors.textSecondary} />}
                        </View>
                        <Text numberOfLines={1} style={styles.artistName}>{artist.name}</Text>
                      </View>
                    )}
                  />
                </View>
              );
            }

            return (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>{item.title}</Text>
                <FlatList
                  horizontal
                  data={item.rows as DiscoverItem[]}
                  keyExtractor={(row) => `${item.key}-${row.id}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalPad}
                  renderItem={({ item: row }) => (
                    <View style={styles.trackCard}>
                      <TouchableOpacity style={styles.trackArtwork} onPress={() => onPlay(row)} activeOpacity={0.85}>
                        {row.artworkUrl ? <Image source={{ uri: row.artworkUrl }} style={styles.fillImage} contentFit="cover" /> : <Music size={22} color={appTheme.colors.textSecondary} />}
                      </TouchableOpacity>
                      <Text numberOfLines={1} style={styles.trackTitle}>{row.title}</Text>
                      <Text numberOfLines={1} style={styles.trackMeta}>{row.uploaderName}</Text>
                      <TouchableOpacity style={styles.inlinePurchaseBtn} onPress={() => onPurchase(row)} activeOpacity={0.85}>
                        <ShoppingCart size={14} color={appTheme.colors.textPrimary} />
                        <Text style={styles.inlinePurchaseText}>{formatUsd(row.price || 0)}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

export default function ExploreScreen() {
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

  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
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

  const buildFeedBatch = useCallback((source: DiscoverItem[], seed: number) => {
    const usable = source.filter((item) => !dislikedTracks[item.id]);
    const pool = usable.length > 0 ? usable : source;
    return pool.map((item, index) => ({
      ...item,
      feedKey: `${item.id}-${seed}-${index}`,
    }));
  }, [dislikedTracks]);

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
    const enterExploreMode = async () => {
      if (surfaceMode === 'explore') {
        setExploreImmersiveMode(true);
        if (stockIsPlaying) {
          try {
            await pauseStockPlayback();
          } catch (error) {
            console.error('Failed to pause stock player for explore mode:', error);
          }
        }
      } else {
        setExploreImmersiveMode(false);
        await clearExploreTrack();
      }
    };

    enterExploreMode().catch((error) => {
      console.error('Failed to switch explore mode:', error);
    });
  }, [clearExploreTrack, pauseStockPlayback, setExploreImmersiveMode, stockIsPlaying, surfaceMode]);

  useEffect(() => {
    return () => {
      setExploreImmersiveMode(false);
      clearExploreTrack().catch((error) => {
        console.error('Failed to cleanup explore player:', error);
      });
    };
  }, [clearExploreTrack, setExploreImmersiveMode]);

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

    playback.playTrack({
      id: first.id,
      title: first.title,
      artist: first.uploaderName,
      artworkUrl: first.artworkUrl,
      url: first.audioUrl,
      uploaderId: first.uploaderId,
    }).catch((error) => {
      console.error('Auto-play on feed focus failed:', error);
    });
  }).current;

  useEffect(() => {
    if (surfaceMode !== 'explore') return;
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
  }, [exploreCurrentTrack, feedItems, playExploreTrack, surfaceMode]);

  const handleLike = (item: ExploreFeedItem) => {
    setLikedTracks((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
    showToast(likedTracks[item.id] ? 'Removed like.' : 'Liked track.', 'success');
  };

  const handleDislike = async (item: ExploreFeedItem) => {
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
    const progressPct = exploreCurrentTrack?.id === item.id && exploreDuration > 0
      ? Math.min(1, Math.max(0, explorePosition / exploreDuration))
      : 0;

    return (
      <View style={[styles.explorePage, { width, height: height - 148 }]}> 
        <View style={styles.exploreArtworkWrap}>
          {item.artworkUrl ? (
            <Image source={{ uri: item.artworkUrl }} style={styles.fillImage} contentFit="cover" />
          ) : (
            <View style={styles.exploreFallback}><Music size={48} color={appTheme.colors.textSecondary} /></View>
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.48)']}
            style={styles.exploreGradient}
          />
        </View>

        <View style={styles.exploreMetaBlock}>
          <Text style={styles.exploreTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.exploreArtist} numberOfLines={1}>{item.uploaderName} • {item.genre}</Text>
          <Text style={styles.explorePrice}>{formatUsd(item.price || 0)}</Text>
        </View>

        <View style={styles.exploreActions}>
          <TouchableOpacity style={[styles.exploreActionBtn, likedTracks[item.id] && styles.exploreActionBtnActive]} onPress={() => handleLike(item)}>
            <Heart size={22} color="#FFFFFF" fill={likedTracks[item.id] ? '#EC5C39' : 'transparent'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.exploreActionBtn} onPress={() => handleDislike(item)}>
            <ThumbsDown size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.explorePurchaseBtn} onPress={() => handlePurchase(item)}>
            <ShoppingCart size={18} color="#140F10" />
            <Text style={styles.explorePurchaseLabel}>Purchase</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.feedProgressTrack}>
          <View style={[styles.feedProgressFill, { width: `${progressPct * 100}%` }]} />
        </View>
      </View>
    );
  };

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
        />

        <View style={styles.modeToggleWrap}>
          <TouchableOpacity
            style={[styles.modeToggleBtn, surfaceMode === 'search' && styles.modeToggleBtnActive]}
            onPress={() => setSurfaceMode('search')}
          >
            <Text style={[styles.modeToggleText, surfaceMode === 'search' && styles.modeToggleTextActive]}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeToggleBtn, surfaceMode === 'explore' && styles.modeToggleBtnActive]}
            onPress={() => setSurfaceMode('explore')}
          >
            <Text style={[styles.modeToggleText, surfaceMode === 'explore' && styles.modeToggleTextActive]}>Explore</Text>
          </TouchableOpacity>
        </View>

        {surfaceMode === 'search' ? (
          <SearchDiscoveryContent
            styles={styles}
            appTheme={appTheme}
            items={items}
            loading={loading}
            loadError={loadError}
            onRetry={loadFeed}
            selectedGenre={selectedGenre}
            setSelectedGenre={setSelectedGenre}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onPlay={(item) => {
              setTrack({
                id: item.id,
                title: item.title,
                artist: item.uploaderName,
                url: item.audioUrl,
                uploaderId: item.uploaderId,
                artworkUrl: item.artworkUrl,
              }).catch((error) => {
                console.error('Play from search failed:', error);
                showToast('Could not play this track.', 'error');
              });
            }}
            onPurchase={handlePurchase}
          />
        ) : loading ? (
          <DiscoverySkeletonLoader styles={styles} />
        ) : (
          <FlatList
            ref={feedRef}
            data={feedItems}
            keyExtractor={(item) => item.feedKey}
            pagingEnabled
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            onEndReachedThreshold={0.6}
            onEndReached={appendFeed}
            renderItem={renderExploreItem}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            ListEmptyComponent={<View style={styles.errorBanner}><Text style={styles.errorBannerText}>No published tracks yet.</Text></View>}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggleBtnActive: {
    backgroundColor: '#6AA7FF',
  },
  modeToggleText: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
  },
  modeToggleTextActive: {
    color: '#0F172A',
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
    color: '#000000',
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    lineHeight: 22,
    paddingVertical: 0,
  },
  genreStrip: {
    marginTop: 10,
    marginBottom: 8,
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
    backgroundColor: 'rgba(106,167,255,0.16)',
    borderColor: 'rgba(106,167,255,0.42)',
  },
  genreChipText: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  genreChipTextActive: {
    color: '#D8E8FF',
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
  loadingBox: {
    paddingVertical: 42,
    alignItems: 'center',
    gap: 10,
  },
  loadingBoxLarge: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.62)',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
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
    left: 20,
    right: 112,
    bottom: 84,
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
    backgroundColor: '#6AA7FF',
  },
};
