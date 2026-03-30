// Hidden tab route used as a richer discovery surface.
import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SharedHeader from '@/components/SharedHeader';
import { db } from '@/firebaseConfig';
import { useCartStore } from '@/store/useCartStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { collectionGroup, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { Clock3, Music, Play, Search, ShoppingCart } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type ExploreItem = {
  id: string;
  title: string;
  uploaderName: string;
  userId: string;
  genre: string;
  price: number;
  audioUrl: string;
  artworkUrl: string;
  listenCount: number;
  lifecycleStatus?: string;
  scheduledReleaseAtMs?: number | string | null;
};

const FEATURED_GENRE_CHIPS = ['Afrobeats', 'Afro-Pop', 'Gospel', 'Highlife', 'Hip-Hop', 'Afro Fusion'];

export default function ExploreScreen() {
  const router = useRouter();
  const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
  const setTrack = usePlaybackStore((state) => state.setTrack);
  const { showToast } = useToastStore();
  const cartCount = useCartStore((state) => state.items.length);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenreChip, setSelectedGenreChip] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ExploreItem[]>([]);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolveScheduledMs = (item: ExploreItem): number | null => {
    const raw = item.scheduledReleaseAtMs;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  };

  const isUpcoming = (item: ExploreItem) => {
    const scheduledMs = resolveScheduledMs(item);
    return item.lifecycleStatus === 'upcoming' && (!scheduledMs || scheduledMs > Date.now());
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(
          query(
            collectionGroup(db, 'uploads'),
            where('isPublic', '==', true),
            orderBy('listenCount', 'desc'),
            limit(180)
          )
        );

        if (!active) return;

        const mapped = snap.docs.map((docSnap) => {
          const row = docSnap.data() as any;
          const uploaderId = docSnap.ref.parent.parent?.id || row.userId || '';
          return {
            id: docSnap.id,
            title: String(row.title || 'Untitled Track'),
            uploaderName: String(row.uploaderName || row.artist || 'Shoouter'),
            userId: String(uploaderId),
            genre: String(row.genre || 'Unknown'),
            price: Number(row.price || 0),
            audioUrl: String(row.audioUrl || row.url || ''),
            artworkUrl: String(row.artworkUrl || row.coverUrl || ''),
            listenCount: Number(row.listenCount || 0),
            lifecycleStatus: String(row.lifecycleStatus || ''),
            scheduledReleaseAtMs: row.scheduledReleaseAtMs ?? null,
          } as ExploreItem;
        });

        setItems(mapped);
      } catch (error) {
        console.error('Failed to load explore feed:', error);
        showToast('Could not load Explore right now.', 'error');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [showToast]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const hasTextSearch = normalizedQuery.length > 0;

  const genreIndex = useMemo(() => {
    const index = new Map<string, ExploreItem[]>();
    for (const item of items) {
      const key = String(item.genre || '').trim().toLowerCase();
      if (!key) continue;
      if (!index.has(key)) index.set(key, []);
      index.get(key)!.push(item);
    }
    for (const [, rows] of index) {
      rows.sort((a, b) => b.listenCount - a.listenCount);
    }
    return index;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (hasTextSearch) {
      return items.filter((item) =>
        item.title.toLowerCase().includes(normalizedQuery)
        || item.uploaderName.toLowerCase().includes(normalizedQuery)
        || item.genre.toLowerCase().includes(normalizedQuery)
      );
    }

    if (selectedGenreChip) {
      return genreIndex.get(selectedGenreChip.toLowerCase()) || [];
    }

    return items;
  }, [items, hasTextSearch, normalizedQuery, selectedGenreChip, genreIndex]);

  const hasActiveSearch = hasTextSearch || !!selectedGenreChip;

  const upcomingItems = useMemo(
    () => filteredItems.filter(isUpcoming).sort((a, b) => b.listenCount - a.listenCount),
    [filteredItems]
  );

  const mixedFeedItems = useMemo(
    () => filteredItems.slice().sort((a, b) => b.listenCount - a.listenCount),
    [filteredItems]
  );

  const carouselItems = useMemo(
    () => (upcomingItems.length > 0 ? upcomingItems.slice(0, 8) : mixedFeedItems.slice(0, 8)),
    [upcomingItems, mixedFeedItems]
  );

  const playPreview = (item: ExploreItem) => {
    if (!item.audioUrl) {
      showToast('Preview is unavailable for this track.', 'info');
      return;
    }
    setTrack({
      id: item.id,
      title: item.title,
      artist: item.uploaderName,
      url: item.audioUrl,
      uploaderId: item.userId,
      artworkUrl: item.artworkUrl,
    });

    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }

    previewTimerRef.current = setTimeout(async () => {
      const playback = usePlaybackStore.getState();
      if (playback.currentTrack?.id !== item.id) return;
      if (playback.isPlaying) {
        await playback.togglePlayPause();
      }
      await playback.seekTo(0);
      showToast('30-second preview ended.', 'info');
    }, 30_000);
  };

  useEffect(() => {
    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
    };
  }, []);

  const openListing = (item: ExploreItem) => {
    router.push({ pathname: '/listing/[id]' as any, params: { id: item.id, uploaderId: item.userId } });
  };

  const renderTrackRow = (item: ExploreItem) => {
    const upcoming = isUpcoming(item);
    const releaseMs = resolveScheduledMs(item);

    return (
      <TouchableOpacity key={item.id} style={styles.rowCard} onPress={() => playPreview(item)}>
        <View style={styles.rowArtwork}>
          {item.artworkUrl ? <Image source={{ uri: item.artworkUrl }} style={styles.artworkImage} contentFit="cover" /> : null}
          {!item.artworkUrl && <Music size={22} color="rgba(255,255,255,0.25)" />}
          {upcoming && (
            <View style={styles.upcomingTag}>
              <Clock3 size={12} color="#FCD2C5" />
              <Text style={styles.upcomingTagText}>Upcoming</Text>
            </View>
          )}
        </View>

        <View style={styles.rowCenter}>
          <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.trackMeta} numberOfLines={1}>
            {item.uploaderName} • {item.genre}
            {upcoming && releaseMs ? ` • ${new Date(releaseMs).toLocaleDateString()}` : ''}
          </Text>
          <View style={styles.rowActionLine}>
            <TouchableOpacity style={styles.previewBtn} onPress={() => playPreview(item)}>
              <Play size={13} color="#FFF" />
              <Text style={styles.previewBtnText}>Preview</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.preOrderBtn} onPress={() => openListing(item)}>
              <ShoppingCart size={13} color="#140F10" />
              <Text style={styles.preOrderBtnText}>{upcoming ? 'Pre-order' : 'View listing'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.priceText}>{upcoming ? 'Pre-order ' : ''}${item.price.toFixed(2)}</Text>
      </TouchableOpacity>
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

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.searchBar}>
            <Search size={16} color="rgba(255,255,255,0.45)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search tracks, artists, genres"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={searchQuery}
              onChangeText={(value) => {
                setSearchQuery(value);
                if (value.trim().length > 0) {
                  setSelectedGenreChip(null);
                }
              }}
            />
          </View>

          {!hasTextSearch && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.genreChipScroll}
              contentContainerStyle={styles.genreChipRow}
            >
              {FEATURED_GENRE_CHIPS.map((genre) => {
                const active = selectedGenreChip === genre;
                return (
                  <TouchableOpacity
                    key={genre}
                    style={[styles.genreChip, active && styles.genreChipActive]}
                    onPress={() => {
                      const next = active ? null : genre;
                      setSelectedGenreChip(next);
                      setSearchQuery('');
                    }}
                  >
                    <Text style={[styles.genreChipText, active && styles.genreChipTextActive]}>{genre}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#EC5C39" />
              <Text style={styles.loadingText}>Loading explore feed...</Text>
            </View>
          ) : (
            <>
              {hasActiveSearch ? (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Search Results</Text>
                    <Text style={styles.sectionHint}>{filteredItems.length} matches</Text>
                  </View>
                  {filteredItems.length > 0 ? (
                    <View style={styles.listWrap}>{filteredItems.slice(0, 40).map(renderTrackRow)}</View>
                  ) : (
                    <Text style={styles.emptyText}>No tracks found for this search.</Text>
                  )}
                </>
              ) : (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Top Carousel</Text>
                    <Text style={styles.sectionHint}>{upcomingItems.length > 0 ? 'Upcoming spotlight' : 'Popular picks'}</Text>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carouselScroll}>
                    {carouselItems.map((item) => {
                      const upcoming = isUpcoming(item);
                      return (
                        <TouchableOpacity key={`carousel-${item.id}`} style={styles.carouselCard} onPress={() => playPreview(item)}>
                          <View style={styles.carouselArtwork}>
                            {item.artworkUrl ? (
                              <Image source={{ uri: item.artworkUrl }} style={styles.artworkImage} contentFit="cover" />
                            ) : (
                              <Music size={28} color="rgba(255,255,255,0.2)" />
                            )}
                            {upcoming && <View style={styles.carouselUpcomingPill}><Text style={styles.carouselUpcomingText}>Upcoming</Text></View>}
                          </View>
                          <Text style={styles.carouselTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.carouselMeta} numberOfLines={1}>{item.uploaderName}</Text>
                          <TouchableOpacity style={styles.carouselCta} onPress={() => openListing(item)}>
                            <Text style={styles.carouselCtaText}>{upcoming ? 'Pre-order' : 'Details'}</Text>
                          </TouchableOpacity>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Upcoming</Text>
                    <Text style={styles.sectionHint}>Sorted by popularity</Text>
                  </View>
                  {upcomingItems.length > 0 ? (
                    <View style={styles.listWrap}>{upcomingItems.map(renderTrackRow)}</View>
                  ) : (
                    <Text style={styles.emptyText}>No upcoming tracks right now.</Text>
                  )}

                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Main Feed</Text>
                    <Text style={styles.sectionHint}>Mixed released + upcoming</Text>
                  </View>
                  <View style={styles.listWrap}>{mixedFeedItems.slice(0, 40).map(renderTrackRow)}</View>
                </>
              )}
            </>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </View>
    </SafeScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#140F10',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  searchBar: {
    height: 41,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(20, 15, 16, 0.9)',
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
  genreChipScroll: {
    marginTop: 10,
    marginBottom: 16,
  },
  genreChipRow: {
    gap: 8,
    paddingRight: 10,
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
    backgroundColor: 'rgba(236,92,57,0.2)',
    borderColor: 'rgba(236,92,57,0.7)',
  },
  genreChipText: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  genreChipTextActive: {
    color: '#FCD2C5',
  },
  loadingBox: {
    paddingVertical: 42,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
  },
  sectionHeader: {
    marginTop: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
  },
  sectionHint: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  carouselScroll: {
    marginBottom: 8,
  },
  carouselCard: {
    width: 170,
    marginRight: 12,
  },
  carouselArtwork: {
    width: 170,
    height: 135,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artworkImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  carouselUpcomingPill: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(20,15,16,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(236,92,57,0.65)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  carouselUpcomingText: {
    color: '#FCD2C5',
    fontFamily: 'Poppins-Bold',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  carouselTitle: {
    marginTop: 8,
    color: '#FFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  carouselMeta: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  carouselCta: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: '#EC5C39',
    paddingVertical: 8,
    alignItems: 'center',
  },
  carouselCtaText: {
    color: '#FFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
  },
  listWrap: {
    gap: 10,
  },
  rowCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowArtwork: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  upcomingTag: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(20,15,16,0.92)',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  upcomingTagText: {
    color: '#FCD2C5',
    fontSize: 9,
    fontFamily: 'Poppins-SemiBold',
  },
  rowCenter: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  trackTitle: {
    color: '#FFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  trackMeta: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    marginTop: 2,
  },
  rowActionLine: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  previewBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewBtnText: {
    color: '#FFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
  },
  preOrderBtn: {
    borderRadius: 10,
    backgroundColor: '#F8D5CB',
    paddingHorizontal: 10,
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  preOrderBtnText: {
    color: '#140F10',
    fontFamily: 'Poppins-Bold',
    fontSize: 11,
  },
  priceText: {
    color: '#EC5C39',
    fontFamily: 'Poppins-Bold',
    fontSize: 12,
    maxWidth: 72,
    textAlign: 'right',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    marginBottom: 8,
  },
});
