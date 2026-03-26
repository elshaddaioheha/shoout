import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SharedHeader from '@/components/SharedHeader';
import { formatUsd } from '@/utils/pricing';
import { useCartStore } from '@/store/useCartStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useRouter } from 'expo-router';
import {
  Heart,
  MoreVertical,
  Play,
  ShoppingCart,
  Users
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

// Mocked home data — keeps the home screen static and removes Firestore reads
const TRENDING_SONGS = [
  { id: 't1', title: 'Orbit', artist: 'Mara Jade', uploaderName: 'Mara Jade', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', uploaderId: 'u1' },
  { id: 't2', title: 'Night Drive', artist: 'Luna', uploaderName: 'Luna', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', uploaderId: 'u2' },
  { id: 't3', title: 'Glow', artist: 'Dusk', uploaderName: 'Dusk', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', uploaderId: 'u3' },
];

const TOP_PLAYLISTS = [
  { id: 'p1', title: 'Studio Focus', genre: 'Lo-fi', price: 0 },
  { id: 'p2', title: 'Creator Picks', genre: 'Indie', price: 12 },
  { id: 'p3', title: 'Vault Vibes', genre: 'Alt R&B', price: 8 },
  { id: 'p4', title: 'Sunset', genre: 'Afro-pop', price: 5 },
  { id: 'p5', title: 'Midnight', genre: 'EDM', price: 10 },
  { id: 'p6', title: 'Acoustic Gems', genre: 'Acoustic', price: 6 },
];

const FREE_MUSIC = [
  { id: 'f1', title: 'Weightless', artist: 'Nova', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', uploaderId: 'u5', price: 0 },
  { id: 'f2', title: 'Sundown', artist: 'Kai', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', uploaderId: 'u6', price: 0 },
  { id: 'f3', title: 'Breeze', artist: 'Ola', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', uploaderId: 'u7', price: 0 },
];

const ARTISTS = [
  { id: 'a1', fullName: 'Mara Jade' },
  { id: 'a2', fullName: 'Luna' },
  { id: 'a3', fullName: 'Dusk' },
  { id: 'a4', fullName: 'Nova' },
  { id: 'a5', fullName: 'Kai' },
  { id: 'a6', fullName: 'Ola' },
  { id: 'a7', fullName: 'Sage' },
  { id: 'a8', fullName: 'Vela' },
];

const POPULAR_BEATS = [
  { id: 'b1', title: 'Pulse', artist: 'Sage', uploaderName: 'Sage', price: 20, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', uploaderId: 'u8' },
  { id: 'b2', title: 'Drift', artist: 'Vela', uploaderName: 'Vela', price: 18, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', uploaderId: 'u9' },
  { id: 'b3', title: 'Slingshot', artist: 'Ro', uploaderName: 'Ro', price: 22, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', uploaderId: 'u10' },
  { id: 'b4', title: 'Orbit', artist: 'Mara Jade', uploaderName: 'Mara Jade', price: 16, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', uploaderId: 'u1' },
  { id: 'b5', title: 'Low Tide', artist: 'Kai', uploaderName: 'Kai', price: 14, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', uploaderId: 'u6' },
  { id: 'b6', title: 'Lanterns', artist: 'Nova', uploaderName: 'Nova', price: 12, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', uploaderId: 'u5' },
];

// ─── Local favourite hook (no Firestore) ───────────────────────────────────────
function useLocalFavourite(_trackId: string) {
  const [isFav, setIsFav] = useState(false);
  const toggle = () => setIsFav((prev) => !prev);
  return { isFav, toggle };
}

export default function HomeScreen() {
  const router = useRouter();
  const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
  const { items } = useCartStore();

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

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <TrendingSection />
        <PlaylistSection />
        <FreeMusicSection />
        <ArtistsSection />
        <PopularBeatsSection />
      </ScrollView>
    </View>
  );
}

// Sub-sections
function TrendingSection() {
  const setTrack = usePlaybackStore(state => state.setTrack);
  const songs = TRENDING_SONGS;

  const COLORS = ['#D9D9D9', '#C9A959', '#8B7355'];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Trending Song</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {songs.map((song, idx) => (
          <TrendingCard
            key={song.id}
            song={song}
            bgColor={COLORS[idx % COLORS.length]}
            onPlay={() => setTrack({ id: song.id, title: song.title, artist: song.artist || song.uploaderName, url: song.audioUrl || song.url, uploaderId: song.uploaderId })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function TrendingCard({ song, bgColor, onPlay }: { song: any; bgColor: string; onPlay: () => void }) {
  const { isFav, toggle } = useLocalFavourite(song.id);
  return (
    <View style={[styles.trendingCard, { backgroundColor: bgColor }]}>
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
}

function PlaylistSection() {
  const router = useRouter();
  const playlists = TOP_PLAYLISTS;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Top Playlist</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/search')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {playlists.length === 0 ? (
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins-Regular' }}>No playlists yet.</Text>
        ) : (
          playlists.map((playlist, idx) => (
            <TouchableOpacity
              key={playlist.id || idx}
              style={styles.playlistItem}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/listing/[id]', params: { id: playlist.id, uploaderId: playlist.uploaderId } })}
            >
              <View style={styles.playlistVisualContainer}>
                <View style={[styles.playlistLayer, { backgroundColor: '#464646', transform: [{ rotate: '9.7deg' }] }]} />
                <View style={[styles.playlistLayer, { backgroundColor: '#767676', transform: [{ rotate: '5.15deg' }], top: 3 }]} />
                <View style={[styles.playlistLayer, { backgroundColor: '#D9D9D9', top: 12 }]} />
              </View>
              <View style={{ marginTop: 24 }}>
                <Text style={styles.playlistTitle}>{playlist.title || 'Untitled'}</Text>
                <Text style={styles.playlistSubtitle}>{playlist.genre || playlist.category || 'Track'}</Text>
                {typeof playlist.price === 'number' ? <Text style={styles.playlistPrice}>{formatUsd(playlist.price)}</Text> : null}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}


function FreeMusicSection() {
  const router = useRouter();
  const setTrack = usePlaybackStore(state => state.setTrack);
  const songs = FREE_MUSIC;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Free Music</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/marketplace')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {songs.map((song, idx) => (
          <FreeMusicCard
            key={song.id || idx}
            song={song}
            onPlay={() => setTrack({ id: song.id, title: song.title, artist: song.artist, url: song.audioUrl || song.url, uploaderId: song.uploaderId })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function FreeMusicCard({ song, onPlay }: { song: any; onPlay: () => void }) {
  const { isFav, toggle } = useLocalFavourite(song.id);
  const { addItem, items } = useCartStore();
  const inCart = items.some((i: any) => i.id === song.id);
  return (
    <TouchableOpacity style={styles.freeMusicItem} onPress={onPlay}>
      <View style={styles.squarePlaceholder} />
      <Text style={styles.itemTitle}>{song.title}</Text>
      <Text style={styles.itemSubtitle}>{song.artist}</Text>
      <View style={styles.itemActions}>
        <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); addItem({ id: song.id, title: song.title, artist: song.artist, price: song.price || 0, uploaderId: song.uploaderId || '' }); }}>
          <ShoppingCart size={14} color={inCart ? '#4CAF50' : '#EC5C39'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); toggle(); }}>
          <Heart size={12} color="#EC5C39" fill={isFav ? '#EC5C39' : 'transparent'} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function ArtistsSection() {
  const router = useRouter();
  const artists = ARTISTS;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Favorite Artists</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/search')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {artists.length === 0 ? (
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins-Regular' }}>No artists yet.</Text>
        ) : (
          artists.map((artist, idx) => (
            <TouchableOpacity key={artist.id || idx} style={styles.artistItem} onPress={() => router.push({ pathname: '/profile/[id]', params: { id: artist.id } })}>
              <View style={styles.circlePlaceholder} />
              <Text style={styles.artistNameSmall}>{artist.fullName || artist.displayName || 'Artist'}</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function PopularBeatsSection() {
  const router = useRouter();
  const setTrack = usePlaybackStore(state => state.setTrack);
  const beats = POPULAR_BEATS;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Popular Beats</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/marketplace')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
      </View>
      <View style={styles.beatsList}>
        {beats.length === 0 ? (
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins-Regular' }}>No beats available yet.</Text>
        ) : (
          beats.map((beat, idx) => (
            <BeatRow
              key={beat.id || idx}
              beat={beat}
              isLast={idx === beats.length - 1}
              onPlay={() => setTrack({ id: beat.id, title: beat.title, artist: beat.artist || beat.uploaderName, url: beat.audioUrl || beat.url, uploaderId: beat.uploaderId })}
            />
          ))
        )}
      </View>
    </View>
  );
}

function BeatRow({ beat, isLast, onPlay }: { beat: any; isLast: boolean; onPlay: () => void }) {
  const { isFav, toggle } = useLocalFavourite(beat.id);
  const { addItem, items } = useCartStore();
  const inCart = items.some((i: any) => i.id === beat.id);
  const priceDisplay = beat.price && typeof beat.price === 'number' ? formatUsd(beat.price) : (beat.price || '');
  return (
    <View style={styles.beatItem}>
      <TouchableOpacity style={styles.beatRow} onPress={onPlay}>
        <View style={styles.beatImagePlaceholder} />
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{beat.title}</Text>
          <Text style={styles.itemSubtitle}>{beat.artist || beat.uploaderName}</Text>
          <Text style={styles.itemSubtitle}>{priceDisplay}</Text>
        </View>
        <View style={styles.beatActions}>
          <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); addItem({ id: beat.id, title: beat.title, artist: beat.artist || beat.uploaderName, price: beat.price || 0, uploaderId: beat.uploaderId || '' }); }}>
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#140F10',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
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
  horizontalScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  trendingCard: {
    width: 228,
    height: 189,
    borderRadius: 17,
    marginRight: 11,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  songInfoOverlay: {
    margin: 9,
    marginBottom: 15,
    backgroundColor: 'rgba(20, 15, 16, 0.81)',
    borderRadius: 10,
    padding: 8,
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
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistItem: {
    width: 129,
    marginRight: 7,
  },
  playlistVisualContainer: {
    width: 103,
    height: 110,
    position: 'relative',
  },
  playlistLayer: {
    position: 'absolute',
    width: 100,
    height: 110,
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
    width: 146,
    marginRight: 11,
  },
  squarePlaceholder: {
    width: 146,
    height: 145,
    backgroundColor: '#D9D9D9',
    borderRadius: 15,
    marginBottom: 4,
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
  itemActions: {
    position: 'absolute',
    right: 0,
    bottom: -15,
    flexDirection: 'row',
    gap: 9,
  },
  artistItem: {
    width: 88,
    marginRight: 17,
    alignItems: 'center',
  },
  circlePlaceholder: {
    width: 88,
    height: 86,
    backgroundColor: '#D9D9D9',
    borderRadius: 44,
  },
  artistNameSmall: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
    marginTop: 4,
  },
  beatsList: {
    marginTop: 10,
  },
  beatItem: {
    marginBottom: 13,
  },
  beatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  beatImagePlaceholder: {
    width: 63,
    height: 58,
    backgroundColor: '#D9D9D9',
    borderRadius: 15,
  },
  beatActions: {
    flexDirection: 'row',
    gap: 9,
    marginRight: 20,
  },
  beatDivider: {
    height: 1,
    backgroundColor: '#464646',
    marginTop: 13,
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
    fontFamily: 'Inter-Regular',
  },
});
