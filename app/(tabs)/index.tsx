import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import ActionSheet from '@/components/ActionSheet';
import HybridDashboardScreen from '@/components/studio/HybridDashboardScreen';
import SharedHeader from '@/components/SharedHeader';
import StudioDashboardScreen from '@/components/studio/StudioDashboardScreen';
import VaultHomeScreen from '@/components/vault/VaultHomeScreen';
import { theme } from '@/constants/theme';
import { ARTISTS, FREE_MUSIC, HOME_SECTIONS, POPULAR_BEATS, TOP_PLAYLISTS, TRENDING_SONGS, type HomeSectionKey } from '@/constants/homeFeed';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatUsd } from '@/utils/pricing';
import { toggleArtistFollow } from '@/utils/followArtist';
import { usePlaylists } from '@/hooks/usePlaylists';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCartStore } from '@/store/useCartStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { useUserStore } from '@/store/useUserStore';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  Heart,
  MoreVertical,
  Play,
  ShoppingCart,
  Users
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image as RNImage,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const TRENDING_CARD_WIDTH = clamp(Math.round(width * 0.65), 220, 300);
const TRENDING_CARD_HEIGHT = Math.round(TRENDING_CARD_WIDTH * 0.83);
const PLAYLIST_CARD_WIDTH = clamp(Math.round(width * 0.34), 124, 168);
const PLAYLIST_VISUAL_WIDTH = Math.round(PLAYLIST_CARD_WIDTH * 0.8);
const PLAYLIST_VISUAL_HEIGHT = Math.round(PLAYLIST_VISUAL_WIDTH * 1.1);
const FREE_CARD_WIDTH = clamp(Math.round(width * 0.39), 138, 182);
const ARTIST_CARD_WIDTH = clamp(Math.round(width * 0.24), 84, 108);
const BEAT_IMAGE_WIDTH = clamp(Math.round(width * 0.17), 56, 72);

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 28,
  xxl: 32,
} as const;

const SHOOUT_ACCENT = '#6AA7FF';
const SHOOUT_ACCENT_SOFT = '#D8E8FF';

function useHomeStyles() {
  const appTheme = useAppTheme();
  return useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

// ─── Local favourite hook (no Firestore) ───────────────────────────────────────
function useLocalFavourite(_trackId: string) {
  const [isFav, setIsFav] = useState(false);
  const toggle = () => setIsFav((prev) => !prev);
  return { isFav, toggle };
}

export default function HomeScreen() {
  const styles = useHomeStyles();
  const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
  const colorScheme = useColorScheme();
  const { items } = useCartStore();
  const activeAppMode = useUserStore((state) => state.activeAppMode);

  const renderSection = useCallback(({ item }: { item: HomeSectionKey }) => {
    switch (item) {
      case 'trending':
        return <TrendingSection />;
      case 'playlist':
        return <PlaylistSection />;
      case 'freeMusic':
        return <FreeMusicSection />;
      case 'artists':
        return <ArtistsSection />;
      case 'popularBeats':
        return <PopularBeatsSection />;
      default:
        return null;
    }
  }, []);

  if (activeAppMode === 'vault' || activeAppMode === 'vault_pro') {
    return <VaultHomeScreen />;
  }

  if (activeAppMode === 'studio') {
    return <StudioDashboardScreen />;
  }

  if (activeAppMode === 'hybrid') {
    return <HybridDashboardScreen />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      <SharedHeader
        viewMode={viewMode}
        isModeSheetOpen={isModeSheetOpen}
        onModePillPress={openSheet}
        showCart={true}
        cartCount={items.length}
        showMessages={true}
      />

      <FlatList
        style={styles.content}
        data={HOME_SECTIONS}
        keyExtractor={(item) => item}
        renderItem={renderSection}
        initialNumToRender={3}
        windowSize={5}
        removeClippedSubviews
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.homeListContent}
      />
    </View>
  );
}

// Sub-sections
function TrendingSection() {
  const styles = useHomeStyles();
  const setTrack = usePlaybackStore(state => state.setTrack);
  const songs = TRENDING_SONGS;
  const COLORS = useMemo(() => ['#D9D9D9', '#C9A959', '#8B7355'], []);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <TrendingCard
      song={item}
      bgColor={COLORS[index % COLORS.length]}
      onPlay={() => setTrack({ id: item.id, title: item.title, artist: item.artist || item.uploaderName, url: item.audioUrl || item.url, uploaderId: item.uploaderId, artworkUrl: item.artworkUrl })}
    />
  ), [COLORS, setTrack]);

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, styles.trendingSectionTitle]}>Trending Song</Text>
      <FlatList
        horizontal
        data={songs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        initialNumToRender={2}
        windowSize={3}
        removeClippedSubviews
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContent}
        ItemSeparatorComponent={() => <View style={styles.horizontalSpacer} />}
      />
    </View>
  );
}

const TrendingCard = React.memo(function TrendingCard({ song, bgColor, onPlay }: { song: any; bgColor: string; onPlay: () => void }) {
  const appTheme = useAppTheme();
  const styles = useHomeStyles();
  const { isFav, toggle } = useLocalFavourite(song.id);
  return (
    <View style={[styles.trendingCard, { backgroundColor: bgColor }]}>
      {song.artworkUrl ? (
        <Image source={{ uri: song.artworkUrl }} style={styles.trendingArtwork} contentFit="cover" />
      ) : null}
      <View style={styles.songInfoOverlay}>
        <View style={{ flex: 1 }}>
          <Text style={styles.songTitle}>{song.title}</Text>
          <View style={styles.artistRow}>
              <Users size={14} color={appTheme.colors.textPrimary} />
            <Text style={styles.artistName}>{song.artist || song.uploaderName}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={{ paddingHorizontal: 8 }}
          onPress={() => toggle()}
        >
            <Heart size={18} color={isFav ? SHOOUT_ACCENT : appTheme.colors.textPrimary} fill={isFav ? SHOOUT_ACCENT : 'transparent'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.playButton} onPress={onPlay}>
            <Play size={20} color={appTheme.colors.textPrimary} fill={appTheme.colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
});
function PlaylistSection() {
  const styles = useHomeStyles();
  const router = useRouter();
  const playlists = TOP_PLAYLISTS;

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      key={item.id || index}
      style={styles.playlistItem}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id, uploaderId: item.uploaderId } })}
    >
      <View style={styles.playlistVisualContainer}>
        {item.artworkUrl ? (
          <Image source={{ uri: item.artworkUrl }} style={styles.playlistCoverImage} contentFit="cover" transition={200} />
        ) : (
          <>
            <View style={[styles.playlistLayer, { backgroundColor: '#464646', transform: [{ rotate: '9.7deg' }] }]} />
            <View style={[styles.playlistLayer, { backgroundColor: '#767676', transform: [{ rotate: '5.15deg' }], top: spacing.xs }]} />
            <View style={[styles.playlistLayer, { backgroundColor: '#D9D9D9', top: spacing.md }]} />
          </>
        )}
      </View>
      <View style={{ marginTop: spacing.xl }}>
        <Text style={styles.playlistTitle}>{item.title || 'Untitled'}</Text>
        <Text style={styles.playlistSubtitle}>{item.genre || item.category || 'Track'}</Text>
        {typeof item.price === 'number' ? <Text style={styles.playlistPrice}>{formatUsd(item.price)}</Text> : null}
      </View>
    </TouchableOpacity>
  ), [router]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Top Playlist</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/search')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
      </View>
      <FlatList
        horizontal
        data={playlists}
        keyExtractor={(item, index) => item.id || `playlist-${index}`}
        renderItem={renderItem}
        initialNumToRender={3}
        windowSize={3}
        removeClippedSubviews
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContent}
        ItemSeparatorComponent={() => <View style={styles.horizontalSpacer} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No playlists yet.</Text>}
      />
    </View>
  );
}


function FreeMusicSection() {
  const styles = useHomeStyles();
  const router = useRouter();
  const setTrack = usePlaybackStore(state => state.setTrack);
  const songs = FREE_MUSIC;

  const renderItem = useCallback(({ item }: { item: any }) => (
    <FreeMusicCard
      song={item}
      onPlay={() => setTrack({ id: item.id, title: item.title, artist: item.artist, url: item.audioUrl || item.url, uploaderId: item.uploaderId, artworkUrl: item.artworkUrl })}
    />
  ), [setTrack]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Free Music</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/marketplace')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
      </View>
      <FlatList
        horizontal
        data={songs}
        keyExtractor={(item, index) => item.id || `free-${index}`}
        renderItem={renderItem}
        initialNumToRender={3}
        windowSize={3}
        removeClippedSubviews
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContent}
        ItemSeparatorComponent={() => <View style={styles.horizontalSpacer} />}
      />
    </View>
  );
}

const FreeMusicCard = React.memo(function FreeMusicCard({ song, onPlay }: { song: any; onPlay: () => void }) {
  const styles = useHomeStyles();
  const { isFav, toggle } = useLocalFavourite(song.id);
  const { addItem, items } = useCartStore();
  const inCart = items.some((i: any) => i.id === song.id);

  const handleAddToCart = useCallback((event: any) => {
    event.stopPropagation?.();
    addItem({
      id: song.id,
      title: song.title,
      artist: song.artist,
      price: song.price || 0,
      uploaderId: song.uploaderId || '',
      coverUrl: song.artworkUrl,
    });
  }, [addItem, song]);

  const handleToggleFavorite = useCallback((event: any) => {
    event.stopPropagation?.();
    toggle();
  }, [toggle]);

  return (
    <TouchableOpacity style={styles.freeMusicItem} onPress={onPlay}>
      {song.artworkUrl ? (
        <Image source={{ uri: song.artworkUrl }} style={styles.squarePlaceholder} contentFit="cover" />
      ) : (
        <View style={styles.squarePlaceholder} />
      )}
      <View style={styles.freeMusicMeta}>
        <Text style={styles.itemTitle}>{song.title}</Text>
        <Text style={styles.itemSubtitle}>{song.artist}</Text>
        <View style={styles.itemActionsSafe}>
          <TouchableOpacity onPress={handleAddToCart}>
            <ShoppingCart size={14} color={inCart ? '#4CAF50' : SHOOUT_ACCENT} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleToggleFavorite}>
            <Heart size={12} color={SHOOUT_ACCENT} fill={isFav ? SHOOUT_ACCENT : 'transparent'} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

function ArtistsSection() {
  const styles = useHomeStyles();
  const router = useRouter();
  const artists = ARTISTS;

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity key={item.id || index} style={styles.artistItem} onPress={() => router.push({ pathname: '/profile/[id]', params: { id: item.id } })}>
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.circlePlaceholder} contentFit="cover" transition={200} />
      ) : (
        <View style={styles.circlePlaceholder} />
      )}
      <Text style={styles.artistNameSmall}>{item.fullName || item.displayName || 'Artist'}</Text>
    </TouchableOpacity>
  ), [router]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Favorite Artists</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/search')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
      </View>
      <FlatList
        horizontal
        data={artists}
        keyExtractor={(item, index) => item.id || `artist-${index}`}
        renderItem={renderItem}
        initialNumToRender={4}
        windowSize={3}
        removeClippedSubviews
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalListContent}
        ItemSeparatorComponent={() => <View style={styles.horizontalSpacer} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No artists yet.</Text>}
      />
    </View>
  );
}

function PopularBeatsSection() {
  const styles = useHomeStyles();
  const router = useRouter();
  const setTrack = usePlaybackStore(state => state.setTrack);
  const { addItem, items } = useCartStore();
  const { showToast } = useToastStore();
  const { addToPlaylist } = usePlaylists();
  const [isFollowPending, setIsFollowPending] = useState(false);
  const [followingArtistIds, setFollowingArtistIds] = useState<Record<string, boolean>>({});
  const [hiddenBeatIds, setHiddenBeatIds] = useState<string[]>([]);
  const [selectedBeat, setSelectedBeat] = useState<any | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const beats = POPULAR_BEATS;

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setFollowingArtistIds({});
      return;
    }

    const unsub = onSnapshot(doc(db, 'users', uid), (snapshot) => {
      const row = snapshot.data() as any;
      const following = Array.isArray(row?.following) ? row.following : [];
      const map: Record<string, boolean> = {};
      following.forEach((id: string) => {
        map[id] = true;
      });
      setFollowingArtistIds(map);
    });

    return unsub;
  }, []);

  const visibleBeats = useMemo(
    () => beats.filter((beat) => !hiddenBeatIds.includes(beat.id)),
    [beats, hiddenBeatIds]
  );

  const openBeatMenu = useCallback((beat: any) => {
    setSelectedBeat(beat);
    setMenuOpen(true);
  }, []);

  const hideFromSuggestions = useCallback((beatId: string) => {
    setHiddenBeatIds((prev) => (prev.includes(beatId) ? prev : [...prev, beatId]));
    showToast('Removed from Home suggestions.', 'info');
  }, [showToast]);

  const addSelectedBeatToCart = useCallback(() => {
    if (!selectedBeat) return;
    const inCart = items.some((item: any) => item.id === selectedBeat.id);
    if (inCart) {
      showToast('Track already in cart.', 'info');
      return;
    }
    addItem({
      id: selectedBeat.id,
      title: selectedBeat.title,
      artist: selectedBeat.artist || selectedBeat.uploaderName,
      price: selectedBeat.price || 0,
      uploaderId: selectedBeat.uploaderId || '',
      coverUrl: selectedBeat.artworkUrl,
    });
    showToast(`${selectedBeat.title} added to cart.`, 'success');
  }, [addItem, items, selectedBeat, showToast]);

  const addSelectedBeatToPlaylist = useCallback(async () => {
    await addToPlaylist(selectedBeat);
  }, [addToPlaylist, selectedBeat]);

  const handleFollowSelectedArtist = useCallback(async () => {
    if (!selectedBeat) return;

    const artistId = selectedBeat.uploaderId;
    if (!artistId) {
      showToast('Artist id is missing for this beat.', 'error');
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      showToast('Log in to follow artists.', 'error');
      return;
    }

    if (isFollowPending) return;
    setIsFollowPending(true);

    try {
      const result = await toggleArtistFollow({
        artistId,
        currentUserId: uid,
        isCurrentlyFollowing: !!followingArtistIds[artistId],
      });

      showToast(
        result.isFollowing
          ? `You are now following ${selectedBeat.artist || selectedBeat.uploaderName}.`
          : `You unfollowed ${selectedBeat.artist || selectedBeat.uploaderName}.`,
        'success'
      );
    } catch (error) {
      console.error('Follow artist from home failed:', error);
      showToast('Unable to update follow state right now.', 'error');
    } finally {
      setIsFollowPending(false);
    }
  }, [followingArtistIds, isFollowPending, selectedBeat, showToast]);

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <BeatRow
      beat={item}
      isLast={index === visibleBeats.length - 1}
      onPlay={() => setTrack({ id: item.id, title: item.title, artist: item.artist || item.uploaderName, url: item.audioUrl || item.url, uploaderId: item.uploaderId, artworkUrl: item.artworkUrl })}
      onMorePress={() => openBeatMenu(item)}
    />
  ), [openBeatMenu, setTrack, visibleBeats.length]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Popular Beats</Text>
        <TouchableOpacity onPress={() => router.push({ pathname: '/(tabs)/marketplace', params: { source: 'popular-beats' } } as any)}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={visibleBeats}
        keyExtractor={(item, index) => item.id || `beat-${index}`}
        renderItem={renderItem}
        scrollEnabled={false}
        removeClippedSubviews
        initialNumToRender={4}
        windowSize={5}
        contentContainerStyle={styles.beatsList}
        ListEmptyComponent={<Text style={styles.emptyText}>No beats available in Home right now.</Text>}
      />

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={selectedBeat?.title || 'Track options'}
        options={[
          {
            label: 'Buy',
            onPress: () => {
              if (!selectedBeat) return;
              router.push({ pathname: '/listing/[id]', params: { id: selectedBeat.id, uploaderId: selectedBeat.uploaderId } } as any);
            },
          },
          {
            label: 'Add to my library',
            onPress: () => {
              if (!selectedBeat) return;
              showToast(`${selectedBeat.title} saved to your library.`, 'success');
            },
          },
          {
            label: 'Add to playlist',
            onPress: () => {
              addSelectedBeatToPlaylist();
            },
          },
          {
            label: isFollowPending
              ? 'Updating follow...'
              : (selectedBeat?.uploaderId && followingArtistIds[selectedBeat.uploaderId] ? 'Unfollow artist' : 'Follow artist'),
            onPress: handleFollowSelectedArtist,
          },
          {
            label: 'Add to cart',
            onPress: addSelectedBeatToCart,
          },
          {
            label: 'Do not suggest',
            destructive: true,
            onPress: () => {
              if (!selectedBeat?.id) return;
              hideFromSuggestions(selectedBeat.id);
            },
          },
        ]}
      />
    </View>
  );
}

const BeatRow = React.memo(function BeatRow({
  beat,
  isLast,
  onPlay,
  onMorePress,
}: {
  beat: any;
  isLast: boolean;
  onPlay: () => void;
  onMorePress: () => void;
}) {
  const appTheme = useAppTheme();
  const styles = useHomeStyles();
  const { isFav, toggle } = useLocalFavourite(beat.id);
  const { addItem, items } = useCartStore();
  const { showToast } = useToastStore();
  const inCart = items.some((i: any) => i.id === beat.id);
  const priceDisplay = beat.price && typeof beat.price === 'number' ? formatUsd(beat.price) : (beat.price || '');

  const handleAddToCart = useCallback(() => {
    if (inCart) {
      showToast('Track already in cart.', 'info');
      return;
    }
    addItem({ id: beat.id, title: beat.title, artist: beat.artist || beat.uploaderName, price: beat.price || 0, uploaderId: beat.uploaderId || '', coverUrl: beat.artworkUrl });
    showToast(`${beat.title} added to cart.`, 'success');
  }, [addItem, beat, inCart, showToast]);

  const handleToggleFavorite = useCallback(() => {
    toggle();
    showToast(isFav ? 'Removed from favourites.' : 'Added to favourites.', 'info');
  }, [isFav, showToast, toggle]);

  const handleMetaPress = useCallback((event: any) => {
    event.stopPropagation?.();
    onMorePress();
  }, [onMorePress]);

  return (
    <View style={styles.beatItem}>
      <View style={styles.beatRow}>
        <TouchableOpacity style={styles.beatMainTap} onPress={onPlay} activeOpacity={0.75}>
          {beat.artworkUrl ? (
            <Image source={{ uri: beat.artworkUrl }} style={styles.beatImagePlaceholder} contentFit="cover" />
          ) : (
            <View style={styles.beatImagePlaceholder} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle}>{beat.title}</Text>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleMetaPress}
            >
              <Text style={styles.itemSubtitle}>{beat.artist || beat.uploaderName}</Text>
              <Text style={styles.beatPriceText}>{priceDisplay}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        <View style={styles.beatActions}>
          <TouchableOpacity style={styles.beatActionIconButton} onPress={handleAddToCart} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ShoppingCart size={18} color={inCart ? '#4CAF50' : SHOOUT_ACCENT} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.beatActionIconButton} onPress={handleToggleFavorite} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Heart size={18} color={SHOOUT_ACCENT} fill={isFav ? SHOOUT_ACCENT : 'transparent'} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onMorePress} style={styles.moreActionButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MoreVertical size={24} color={appTheme.colors.textPrimary} />
        </TouchableOpacity>
      </View>
      {!isLast && <View style={styles.beatDivider} />}
    </View>
  );
});

const legacyStyles = {
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  homeListContent: {
    paddingTop: spacing.xs,
    paddingBottom: 96,
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: 0.2,
    fontFamily: 'Poppins-SemiBold',
  },
  trendingSectionTitle: {
    marginBottom: spacing.md,
  },
  seeAllText: {
    color: SHOOUT_ACCENT,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins-Medium',
  },
  horizontalListContent: {
    paddingHorizontal: 0,
  },
  horizontalSpacer: {
    width: spacing.md,
  },
  trendingCard: {
    width: TRENDING_CARD_WIDTH,
    height: TRENDING_CARD_HEIGHT,
    borderRadius: spacing.lg,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  trendingArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  songInfoOverlay: {
    margin: spacing.sm,
    marginBottom: spacing.lg,
    backgroundColor: 'rgba(20, 15, 16, 0.81)',
    borderRadius: spacing.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  songTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins-Bold',
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  artistName: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Poppins-Regular',
  },
  playButton: {
    width: 40,
    height: 40,
    backgroundColor: SHOOUT_ACCENT,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistItem: {
    width: PLAYLIST_CARD_WIDTH,
  },
  playlistVisualContainer: {
    width: PLAYLIST_VISUAL_WIDTH,
    height: PLAYLIST_VISUAL_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  playlistLayer: {
    position: 'absolute',
    width: PLAYLIST_VISUAL_WIDTH,
    height: PLAYLIST_VISUAL_HEIGHT,
    borderRadius: theme.radius.lg,
  },
  playlistCoverImage: {
    width: PLAYLIST_VISUAL_WIDTH,
    height: PLAYLIST_VISUAL_HEIGHT,
    borderRadius: theme.radius.lg,
  },
  playlistTitle: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins-SemiBold',
  },
  playlistSubtitle: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Poppins-Regular',
  },
  playlistPrice: {
    color: SHOOUT_ACCENT_SOFT,
    fontSize: 11,
    lineHeight: 16,
    fontFamily: 'Poppins-Medium',
  },
  freeMusicItem: {
    width: FREE_CARD_WIDTH,
  },
  squarePlaceholder: {
    width: FREE_CARD_WIDTH,
    height: FREE_CARD_WIDTH,
    backgroundColor: '#D9D9D9',
    borderRadius: theme.radius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  freeMusicMeta: {
    paddingBottom: spacing.sm,
  },
  itemTitle: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins-SemiBold',
  },
  itemSubtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Poppins-Regular',
  },
  itemActionsSafe: {
    marginTop: 6,
    flexDirection: 'row',
    gap: spacing.md,
    alignSelf: 'flex-end',
  },
  artistItem: {
    width: ARTIST_CARD_WIDTH,
    alignItems: 'center',
  },
  circlePlaceholder: {
    width: ARTIST_CARD_WIDTH,
    height: ARTIST_CARD_WIDTH,
    backgroundColor: '#D9D9D9',
    borderRadius: ARTIST_CARD_WIDTH / 2,
    overflow: 'hidden',
  },
  artistNameSmall: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  beatsList: {
    marginTop: spacing.sm,
  },
  emptyText: {
    color: theme.colors.textTertiary,
    fontFamily: 'Poppins-Regular',
  },
  beatItem: {
    marginBottom: spacing.md,
  },
  beatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  beatMainTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  beatImagePlaceholder: {
    width: BEAT_IMAGE_WIDTH,
    height: Math.round(BEAT_IMAGE_WIDTH * 0.92),
    backgroundColor: '#D9D9D9',
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
  beatActions: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginRight: 0,
  },
  beatActionIconButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreActionButton: {
    paddingLeft: 0,
  },
  beatPriceText: {
    color: SHOOUT_ACCENT_SOFT,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Poppins-Medium',
    marginTop: 1,
  },
  beatDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 10,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: width * 0.88,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.xl,
    paddingVertical: 34,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalInner: {
    width: '100%',
    alignItems: 'center',
  },
  modalIconContainer: {
    marginBottom: 25,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
  },
  modalBtn: {
    height: 44,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnSolid: {
    backgroundColor: SHOOUT_ACCENT,
    borderWidth: 1,
    borderColor: '#767676',
  },
  modalBtnOutline: {
    borderWidth: 1.5,
    borderColor: SHOOUT_ACCENT,
  },
  modalBtnText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
};
