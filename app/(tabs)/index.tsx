import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SharedHeader from '@/components/SharedHeader';
import { formatUsd } from '@/utils/pricing';
import { useCartStore } from '@/store/useCartStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  Heart,
  MoreVertical,
  Play,
  ShoppingCart,
  Users
} from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
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
  xl: 24,
  xxl: 32,
} as const;

// Mocked home data with CDN assets — keeps the home screen static and removes Firestore reads
const TRENDING_SONGS = [
  { id: 't1', title: 'Orbit', artist: 'Mara Jade', uploaderName: 'Mara Jade', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', uploaderId: 'u1', artworkUrl: 'https://picsum.photos/seed/t1/400/400?random=1' },
  { id: 't2', title: 'Night Drive', artist: 'Luna', uploaderName: 'Luna', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', uploaderId: 'u2', artworkUrl: 'https://picsum.photos/seed/t2/400/400?random=2' },
  { id: 't3', title: 'Glow', artist: 'Dusk', uploaderName: 'Dusk', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', uploaderId: 'u3', artworkUrl: 'https://picsum.photos/seed/t3/400/400?random=3' },
];

const TOP_PLAYLISTS = [
  { id: 'p1', title: 'Studio Focus', genre: 'Lo-fi', price: 0, artworkUrl: 'https://picsum.photos/seed/p1/300/300' },
  { id: 'p2', title: 'Creator Picks', genre: 'Indie', price: 12, artworkUrl: 'https://picsum.photos/seed/p2/300/300' },
  { id: 'p3', title: 'Vault Vibes', genre: 'Alt R&B', price: 8, artworkUrl: 'https://picsum.photos/seed/p3/300/300' },
  { id: 'p4', title: 'Sunset', genre: 'Afro-pop', price: 5, artworkUrl: 'https://picsum.photos/seed/p4/300/300' },
  { id: 'p5', title: 'Midnight', genre: 'EDM', price: 10, artworkUrl: 'https://picsum.photos/seed/p5/300/300' },
  { id: 'p6', title: 'Acoustic Gems', genre: 'Acoustic', price: 6, artworkUrl: 'https://picsum.photos/seed/p6/300/300' },
];

const FREE_MUSIC = [
  { id: 'f1', title: 'Weightless', artist: 'Nova', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', uploaderId: 'u5', price: 0, artworkUrl: 'https://picsum.photos/seed/f1/300/300' },
  { id: 'f2', title: 'Sundown', artist: 'Kai', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', uploaderId: 'u6', price: 0, artworkUrl: 'https://picsum.photos/seed/f2/300/300' },
  { id: 'f3', title: 'Breeze', artist: 'Ola', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', uploaderId: 'u7', price: 0, artworkUrl: 'https://picsum.photos/seed/f3/300/300' },
];

const ARTISTS = [
  { id: 'a1', fullName: 'Mara Jade', avatarUrl: 'https://i.pravatar.cc/150?u=a1' },
  { id: 'a2', fullName: 'Luna', avatarUrl: 'https://i.pravatar.cc/150?u=a2' },
  { id: 'a3', fullName: 'Dusk', avatarUrl: 'https://i.pravatar.cc/150?u=a3' },
  { id: 'a4', fullName: 'Nova', avatarUrl: 'https://i.pravatar.cc/150?u=a4' },
  { id: 'a5', fullName: 'Kai', avatarUrl: 'https://i.pravatar.cc/150?u=a5' },
  { id: 'a6', fullName: 'Ola', avatarUrl: 'https://i.pravatar.cc/150?u=a6' },
  { id: 'a7', fullName: 'Sage', avatarUrl: 'https://i.pravatar.cc/150?u=a7' },
  { id: 'a8', fullName: 'Vela', avatarUrl: 'https://i.pravatar.cc/150?u=a8' },
];

const POPULAR_BEATS = [
  { id: 'b1', title: 'Pulse', artist: 'Sage', uploaderName: 'Sage', price: 20, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', uploaderId: 'u8', artworkUrl: 'https://picsum.photos/seed/b1/200/200' },
  { id: 'b2', title: 'Drift', artist: 'Vela', uploaderName: 'Vela', price: 18, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', uploaderId: 'u9', artworkUrl: 'https://picsum.photos/seed/b2/200/200' },
  { id: 'b3', title: 'Slingshot', artist: 'Ro', uploaderName: 'Ro', price: 22, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', uploaderId: 'u10', artworkUrl: 'https://picsum.photos/seed/b3/200/200' },
  { id: 'b4', title: 'Orbit', artist: 'Mara Jade', uploaderName: 'Mara Jade', price: 16, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', uploaderId: 'u1', artworkUrl: 'https://picsum.photos/seed/b4/200/200' },
  { id: 'b5', title: 'Low Tide', artist: 'Kai', uploaderName: 'Kai', price: 14, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', uploaderId: 'u6', artworkUrl: 'https://picsum.photos/seed/b5/200/200' },
  { id: 'b6', title: 'Lanterns', artist: 'Nova', uploaderName: 'Nova', price: 12, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', uploaderId: 'u5', artworkUrl: 'https://picsum.photos/seed/b6/200/200' },
];

type HomeSectionKey = 'trending' | 'playlist' | 'freeMusic' | 'artists' | 'popularBeats';
const HOME_SECTIONS: HomeSectionKey[] = ['trending', 'playlist', 'freeMusic', 'artists', 'popularBeats'];

// ─── Local favourite hook (no Firestore) ───────────────────────────────────────
function useLocalFavourite(_trackId: string) {
  const [isFav, setIsFav] = useState(false);
  const toggle = () => setIsFav((prev) => !prev);
  return { isFav, toggle };
}

export default function HomeScreen() {
  const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
  const { items } = useCartStore();

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

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
      <Text style={styles.sectionTitle}>Trending Song</Text>
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
            <Users size={14} color="white" />
            <Text style={styles.artistName}>{song.artist || song.uploaderName}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={{ paddingHorizontal: 8 }}
          onPress={() => toggle()}
        >
          <Heart size={18} color={isFav ? '#EC5C39' : 'white'} fill={isFav ? '#EC5C39' : 'transparent'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.playButton} onPress={onPlay}>
          <Play size={20} color="white" fill="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

function PlaylistSection() {
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
  const { isFav, toggle } = useLocalFavourite(song.id);
  const { addItem, items } = useCartStore();
  const inCart = items.some((i: any) => i.id === song.id);
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
          <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); addItem({ id: song.id, title: song.title, artist: song.artist, price: song.price || 0, uploaderId: song.uploaderId || '', coverUrl: song.artworkUrl }); }}>
            <ShoppingCart size={14} color={inCart ? '#4CAF50' : '#EC5C39'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); toggle(); }}>
            <Heart size={12} color="#EC5C39" fill={isFav ? '#EC5C39' : 'transparent'} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

function ArtistsSection() {
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
  const router = useRouter();
  const setTrack = usePlaybackStore(state => state.setTrack);
  const beats = POPULAR_BEATS;

  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => (
    <BeatRow
      beat={item}
      isLast={index === beats.length - 1}
      onPlay={() => setTrack({ id: item.id, title: item.title, artist: item.artist || item.uploaderName, url: item.audioUrl || item.url, uploaderId: item.uploaderId, artworkUrl: item.artworkUrl })}
    />
  ), [beats.length, setTrack]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Popular Beats</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/marketplace')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
      </View>
      <FlatList
        data={beats}
        keyExtractor={(item, index) => item.id || `beat-${index}`}
        renderItem={renderItem}
        scrollEnabled={false}
        removeClippedSubviews
        initialNumToRender={4}
        windowSize={5}
        contentContainerStyle={styles.beatsList}
        ListEmptyComponent={<Text style={styles.emptyText}>No beats available yet.</Text>}
      />
    </View>
  );
}

const BeatRow = React.memo(function BeatRow({ beat, isLast, onPlay }: { beat: any; isLast: boolean; onPlay: () => void }) {
  const { isFav, toggle } = useLocalFavourite(beat.id);
  const { addItem, items } = useCartStore();
  const inCart = items.some((i: any) => i.id === beat.id);
  const priceDisplay = beat.price && typeof beat.price === 'number' ? formatUsd(beat.price) : (beat.price || '');
  return (
    <View style={styles.beatItem}>
      <TouchableOpacity style={styles.beatRow} onPress={onPlay}>
        {beat.artworkUrl ? (
          <Image source={{ uri: beat.artworkUrl }} style={styles.beatImagePlaceholder} contentFit="cover" />
        ) : (
          <View style={styles.beatImagePlaceholder} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{beat.title}</Text>
          <Text style={styles.itemSubtitle}>{beat.artist || beat.uploaderName}</Text>
          <Text style={styles.itemSubtitle}>{priceDisplay}</Text>
        </View>
        <View style={styles.beatActions}>
          <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); addItem({ id: beat.id, title: beat.title, artist: beat.artist || beat.uploaderName, price: beat.price || 0, uploaderId: beat.uploaderId || '', coverUrl: beat.artworkUrl }); }}>
            <ShoppingCart size={14} color={inCart ? '#4CAF50' : '#EC5C39'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); toggle(); }}>
            <Heart size={12} color="#EC5C39" fill={isFav ? '#EC5C39' : 'transparent'} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={(e) => e.stopPropagation?.()}><MoreVertical size={24} color="white" /></TouchableOpacity>
      </TouchableOpacity>
      {!isLast && <View style={styles.beatDivider} />}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#140F10',
  },
  content: {
    flex: 1,
  },
  homeListContent: {
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
    marginBottom: 12,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  seeAllText: {
    color: '#EC5C39',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  horizontalListContent: {
    paddingHorizontal: spacing.lg,
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
    color: 'white',
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  artistName: {
    color: 'white',
    fontSize: 11,
    fontFamily: 'Poppins-Regular',
  },
  playButton: {
    width: 36,
    height: 36,
    backgroundColor: '#EC5C39',
    borderRadius: spacing.sm,
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
    borderRadius: 18,
  },
  playlistCoverImage: {
    width: PLAYLIST_VISUAL_WIDTH,
    height: PLAYLIST_VISUAL_HEIGHT,
    borderRadius: 18,
  },
  playlistTitle: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
  },
  playlistSubtitle: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Poppins-Light',
  },
  playlistPrice: {
    color: 'white',
    fontSize: 8,
    fontFamily: 'Poppins-Light',
  },
  freeMusicItem: {
    width: FREE_CARD_WIDTH,
  },
  squarePlaceholder: {
    width: FREE_CARD_WIDTH,
    height: FREE_CARD_WIDTH,
    backgroundColor: '#D9D9D9',
    borderRadius: 15,
    marginBottom: 4,
    overflow: 'hidden',
  },
  freeMusicMeta: {
    paddingBottom: spacing.sm,
  },
  itemTitle: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
  },
  itemSubtitle: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Poppins-Light',
  },
  itemActionsSafe: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
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
    color: 'white',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginTop: 4,
  },
  beatsList: {
    marginTop: spacing.sm,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Poppins-Regular',
  },
  beatItem: {
    marginBottom: spacing.md,
  },
  beatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  beatImagePlaceholder: {
    width: BEAT_IMAGE_WIDTH,
    height: Math.round(BEAT_IMAGE_WIDTH * 0.92),
    backgroundColor: '#D9D9D9',
    borderRadius: 15,
    overflow: 'hidden',
  },
  beatActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginRight: spacing.lg,
  },
  beatDivider: {
    height: 1,
    backgroundColor: '#464646',
    marginTop: spacing.md,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: width * 0.88,
    backgroundColor: '#140F10',
    borderRadius: 20,
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnSolid: {
    backgroundColor: '#EC5C39',
    borderWidth: 1,
    borderColor: '#767676',
  },
  modalBtnOutline: {
    borderWidth: 1.5,
    borderColor: '#EC5C39',
  },
  modalBtnText: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
});
