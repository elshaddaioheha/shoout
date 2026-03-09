import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SharedHeader from '@/components/SharedHeader';
import { useCartStore } from '@/store/useCartStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Heart,
  Mic2,
  MoreVertical,
  Music,
  Play,
  ShoppingCart,
  Sparkles,
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

export default function HomeScreen() {
  const router = useRouter();
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [modalStep, setModalStep] = useState(0);
  const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
  const { items } = useCartStore();

  const modals = [
    {
      icon: <Music size={80} color="#EC5C39" strokeWidth={1.5} />,
      title: "Welcome to Shoouts",
      description: "your space to Discover, Create, Sell, Buy and share Afro sounds like never before.",
      buttons: [
        { label: "Skip", variant: "outline", action: () => setShowWelcomeModal(false) },
        { label: "Next", variant: "solid", action: () => setModalStep(1) }
      ]
    },
    {
      icon: <Mic2 size={80} color="#EC5C39" strokeWidth={1.5} />,
      title: "For Artists",
      description: "Upload your Music, Beats and Store and Share with fans",
      buttons: [
        { label: "Skip", variant: "outline", action: () => setShowWelcomeModal(false) },
        { label: "Next", variant: "solid", action: () => setModalStep(2) }
      ]
    },
    {
      icon: <Sparkles size={80} color="#EC5C39" strokeWidth={1.5} />,
      title: "For Fans & Everyone",
      description: "Stream authentic Afro vibes, follow your favorite creators, and unlock exclusive content.",
      buttons: [
        { label: "Let's Get Started", variant: "solid", action: () => setShowWelcomeModal(false) }
      ]
    }
  ];

  const currentModal = modals[modalStep];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <SharedHeader
        viewMode={viewMode}
        isModeSheetOpen={isModeSheetOpen}
        onModePillPress={openSheet}
        showCart={true}
        cartCount={items.length}
        showMessages={true}
      />

      {/* Main Content */}
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



      {/* Welcome Modal Overlay */}
      {showWelcomeModal && (
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'rgba(115,115,115,0.4)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalInner}>
              <View style={styles.modalIconContainer}>
                {currentModal.icon}
              </View>

              <Text style={styles.modalTitle}>{currentModal.title}</Text>
              <Text style={styles.modalDescription}>{currentModal.description}</Text>

              <View style={styles.modalButtonsContainer}>
                {currentModal.buttons.map((btn, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={btn.action}
                    style={[
                      styles.modalBtn,
                      btn.variant === 'solid' ? styles.modalBtnSolid : styles.modalBtnOutline,
                      currentModal.buttons.length === 1 ? { width: 262 } : { width: 138 }
                    ]}
                  >
                    <Text style={[
                      styles.modalBtnText,
                      btn.variant === 'solid' ? { color: 'white' } : { color: '#EC5C39' }
                    ]}>
                      {btn.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// Sub-sections
function TrendingSection() {
  const setTrack = usePlaybackStore(state => state.setTrack);
  const songs = [
    { id: '1', title: "With You", artist: "Davido ft Omolye", url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', bgColor: "#D9D9D9" },
    { id: '2', title: "Paradise", artist: "Jungle G", url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', bgColor: "#C9A959" },
    { id: '3', title: "Lost in Love", artist: "Jungle G", url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', bgColor: "#8B7355" }
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Trending Song</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {songs.map((song, idx) => (
          <View key={idx} style={[styles.trendingCard, { backgroundColor: song.bgColor }]}>
            <View style={styles.songInfoOverlay}>
              <View style={{ flex: 1 }}>
                <Text style={styles.songTitle}>{song.title}</Text>
                <View style={styles.artistRow}>
                  <Users size={14} color="white" />
                  <Text style={styles.artistName}>{song.artist}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => setTrack({ id: song.id, title: song.title, artist: song.artist, url: song.url })}
              >
                <Play size={20} color="white" fill="white" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function PlaylistSection() {
  const playlists = [
    { title: "Wizkid Playlist Specal", subtitle: "Personal Selection", price: "NGN 3000.00" },
    { title: "Shoouts Top 100", subtitle: "Afro Gospel" },
    { title: "Breezy Playlist", subtitle: "Afro Beats", price: "NGN 3000.00" }
  ];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Top Playlist</Text>
        <TouchableOpacity><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {playlists.map((playlist, idx) => (
          <View key={idx} style={styles.playlistItem}>
            <View style={styles.playlistVisualContainer}>
              <View style={[styles.playlistLayer, { backgroundColor: '#464646', transform: [{ rotate: '9.7deg' }] }]} />
              <View style={[styles.playlistLayer, { backgroundColor: '#767676', transform: [{ rotate: '5.15deg' }], top: 3 }]} />
              <View style={[styles.playlistLayer, { backgroundColor: '#D9D9D9', top: 12 }]} />
            </View>
            <View style={{ marginTop: 24 }}>
              <Text style={styles.playlistTitle}>{playlist.title}</Text>
              <Text style={styles.playlistSubtitle}>{playlist.subtitle}</Text>
              {playlist.price && <Text style={styles.playlistPrice}>{playlist.price}</Text>}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

import { collection, getDocs, limit, query } from 'firebase/firestore';
import { useEffect } from 'react';
import { db } from '../../firebaseConfig';

function FreeMusicSection() {
  const setTrack = usePlaybackStore(state => state.setTrack);
  const [songs, setSongs] = useState<any[]>([]);

  useEffect(() => {
    async function fetchFreeMusic() {
      try {
        // Fetch known artists from our seed and grab their free tracks
        const artistsQuery = query(collection(db, 'users'), limit(5));
        const artistsSnap = await getDocs(artistsQuery);

        const allFreeTracks: any[] = [];

        for (const doc of artistsSnap.docs) {
          const uploadsQuery = query(collection(db, `users/${doc.id}/uploads`));
          const uploadsSnap = await getDocs(uploadsQuery);

          for (const uploadDoc of uploadsSnap.docs) {
            const data = uploadDoc.data();
            if (data.price === 0) {
              allFreeTracks.push({
                id: data.id,
                title: data.title,
                artist: doc.data().fullName,
                url: data.url
              });
            }
          }
        }

        setSongs(allFreeTracks.length ? allFreeTracks : []);
      } catch (error) {
        console.log("Error fetching dynamic seed music", error);
      }
    }
    fetchFreeMusic();
  }, []);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Free Music</Text>
        <TouchableOpacity><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {songs.map((song, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.freeMusicItem}
            onPress={() => setTrack({ id: song.id, title: song.title, artist: song.artist, url: song.url })}
          >
            <View style={styles.squarePlaceholder} />
            <Text style={styles.itemTitle}>{song.title}</Text>
            <Text style={styles.itemSubtitle}>{song.artist}</Text>
            <View style={styles.itemActions}>
              <TouchableOpacity><ShoppingCart size={14} color="#EC5C39" /></TouchableOpacity>
              <TouchableOpacity><Heart size={12} color="#EC5C39" /></TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function ArtistsSection() {
  const artists = ["Davido", "Wizkid", "Lawrence Oyor", "Rema", "Dusin Oyekun"];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Favorite Artists</Text>
        <TouchableOpacity><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {artists.map((artist, idx) => (
          <TouchableOpacity key={idx} style={styles.artistItem}>
            <View style={styles.circlePlaceholder} />
            <Text style={styles.artistNameSmall}>{artist}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

function PopularBeatsSection() {
  const setTrack = usePlaybackStore(state => state.setTrack);
  const beats = [
    { id: 'beat1', title: "Afro Beats", artist: "Sound of Salem", price: "NGN 3000.00", url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
    { id: 'beat2', title: "Sonic Beats", artist: "Sound of Salem", price: "NGN 3000.00", url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
    { id: 'beat3', title: "DA Beats", artist: "Sound of Salem", price: "NGN 3000.00", url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
    { id: 'beat4', title: "Project B", artist: "Sound of Salem", price: "NGN 3000.00", url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3' }
  ];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Popular Beats</Text>
        <TouchableOpacity><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
      </View>
      <View style={styles.beatsList}>
        {beats.map((beat, idx) => (
          <View key={idx} style={styles.beatItem}>
            <TouchableOpacity
              style={styles.beatRow}
              onPress={() => setTrack({ id: beat.id, title: beat.title, artist: beat.artist, url: beat.url })}
            >
              <View style={styles.beatImagePlaceholder} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{beat.title}</Text>
                <Text style={styles.itemSubtitle}>{beat.artist}</Text>
                <Text style={styles.itemSubtitle}>{beat.price}</Text>
              </View>
              <View style={styles.beatActions}>
                <TouchableOpacity><ShoppingCart size={14} color="#EC5C39" /></TouchableOpacity>
                <TouchableOpacity><Heart size={12} color="#EC5C39" /></TouchableOpacity>
              </View>
              <TouchableOpacity>
                <MoreVertical size={24} color="white" />
              </TouchableOpacity>
            </TouchableOpacity>
            {idx < beats.length - 1 && <View style={styles.beatDivider} />}
          </View>
        ))}
      </View>
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
