import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Dimensions,
  StatusBar,
  Image,
  Platform
} from 'react-native';
import {
  Search,
  Bell,
  Play,
  Pause,
  ShoppingCart,
  Heart,
  MoreVertical,
  Music,
  Users,
  Cloud
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [modalStep, setModalStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const modals = [
    {
      icon: null,
      title: "Welcome to Shoouts",
      description: "your space to Discover, Create, Sell, Buy and share Afro sounds like never before.",
      buttons: [
        { label: "Skip", variant: "outline", action: () => setShowWelcomeModal(false) },
        { label: "Next", variant: "solid", action: () => setModalStep(1) }
      ]
    },
    {
      icon: <Music size={48} color="#EC5C39" />,
      title: "For Artists",
      description: "Upload your Music, Beats and Store and Share with fans",
      buttons: [
        { label: "Skip", variant: "outline", action: () => setShowWelcomeModal(false) },
        { label: "Next", variant: "solid", action: () => setModalStep(2) }
      ]
    },
    {
      icon: (
        <View style={{ position: 'relative', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Users size={32} color="#EC5C39" />
          <Music size={16} color="#EC5C39" style={{ position: 'absolute', right: 0, bottom: 0 }} />
        </View>
      ),
      title: "For Fans",
      description: "Stream authentic Afro vibes, follow your favorite creators, and unlock exclusive content.",
      buttons: [
        { label: "Skip", variant: "outline", action: () => setShowWelcomeModal(false) },
        { label: "Next", variant: "solid", action: () => setModalStep(3) }
      ]
    },
    {
      icon: (
        <View style={{ position: 'relative', width: 66, height: 67, alignItems: 'center', justifyContent: 'center' }}>
          <Cloud size={52} color="#EC5C39" />
          <Music size={24} color="#EC5C39" style={{ position: 'absolute', bottom: 8, right: 8 }} />
        </View>
      ),
      title: "For Everyone",
      description: "A home for Afro beats, culture, and community.",
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
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.userProfileCircle}>
              <Text style={styles.userProfileInitial}>C</Text>
            </View>
            <View style={styles.logoWrapper}>
              <Text style={styles.logoText}>ShooutS</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.iconButton}>
            <Bell size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={24} color="white" />
          <TextInput
            placeholder="Search the best Afro Music"
            placeholderTextColor="#464646"
            style={styles.searchInput}
          />
        </View>
      </SafeAreaView>

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
              {modalStep === 0 ? (
                <View style={styles.modalLogoContainer}>
                  <Text style={styles.modalLogoText}>ShooutS</Text>
                </View>
              ) : (
                <View style={styles.modalIconContainer}>
                  {currentModal.icon}
                </View>
              )}

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

      {/* Mini Player */}
      <View style={styles.miniPlayerContainer}>
        <View style={styles.miniPlayerBg} />

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFull, { width: '15%' }]} />
        </View>

        {/* Player Content */}
        <View style={styles.playerContent}>
          <View style={styles.playerLeft}>
            <View style={styles.playerAlbumArt} />
            <View style={styles.playerInfo}>
              <Text style={styles.playerSongTitle}>Essence</Text>
              <Text style={styles.playerArtistName}>Wizkid ft Tems</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setIsPlaying(!isPlaying)}
            style={styles.playerPlayButton}
          >
            {isPlaying ? (
              <Pause size={14} color="#1D1B20" fill="#1D1B20" />
            ) : (
              <Play size={14} color="#1D1B20" fill="#1D1B20" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Home Indicator */}
      <View style={styles.homeIndicator} />
    </View>
  );
}

// Sub-sections
function TrendingSection() {
  const songs = [
    { title: "With You", artist: "Davido ft Omolye", price: "NGN 3000.00", bgColor: "#D9D9D9" },
    { title: "Paradise", artist: "Jungle G", bgColor: "#C9A959" },
    { title: "Lost in Love", artist: "Jungle G", bgColor: "#8B7355" }
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
                {song.price && <Text style={styles.songPrice}>{song.price}</Text>}
              </View>
              <TouchableOpacity style={styles.playButton}>
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

function FreeMusicSection() {
  const songs = [
    { title: "With You", artist: "Davido ft Omaley" },
    { title: "Essences", artist: "Wizkid ft Tems" },
    { title: "Promise Keeper", artist: "Sound of Salem" },
    { title: "Paradise Instrumental", artist: "Jungle G" }
  ];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Free Music</Text>
        <TouchableOpacity><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {songs.map((song, idx) => (
          <View key={idx} style={styles.freeMusicItem}>
            <View style={styles.squarePlaceholder} />
            <Text style={styles.itemTitle}>{song.title}</Text>
            <Text style={styles.itemSubtitle}>{song.artist}</Text>
            <View style={styles.itemActions}>
              <TouchableOpacity><ShoppingCart size={14} color="#EC5C39" /></TouchableOpacity>
              <TouchableOpacity><Heart size={12} color="#EC5C39" /></TouchableOpacity>
            </View>
          </View>
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
  const beats = [
    { title: "Afro Beats", artist: "Sound of Salem", price: "NGN 3000.00" },
    { title: "Sonic Beats", artist: "Sound of Salem", price: "NGN 3000.00" },
    { title: "DA Beats", artist: "Sound of Salem", price: "NGN 3000.00" },
    { title: "Project B", artist: "Sound of Salem", price: "NGN 3000.00" }
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
            <View style={styles.beatRow}>
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
            </View>
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
  safeArea: {
    backgroundColor: '#140F10',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
  },
  logoWrapper: {
    paddingVertical: 10,
  },
  logoText: {
    color: 'white',
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
  },
  iconButton: {
    padding: 6,
  },
  searchContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
    height: 48,
    backgroundColor: 'rgba(70,70,70,0.18)',
    borderWidth: 1.5,
    borderColor: '#464646',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: 'white',
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
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
  songPrice: {
    color: 'white',
    fontSize: 7,
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
  modalLogoContainer: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLogoText: {
    color: 'white',
    fontSize: 40,
    fontFamily: 'Poppins-Bold',
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
  homeIndicator: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    width: 134,
    height: 5,
    backgroundColor: 'white',
    borderRadius: 3,
    opacity: 0.5,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userProfileCircle: {
    width: 33,
    height: 35,
    backgroundColor: '#EC5C39',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userProfileInitial: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  miniPlayerContainer: {
    position: 'absolute',
    bottom: 60, // Above the tab bar area
    left: 16,
    right: 16,
    height: 47,
    justifyContent: 'center',
  },
  miniPlayerBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#C2B9AC',
    borderRadius: 10,
    opacity: 0.6, // Blend of black 0.4 and color as per user spec
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: -1,
    left: 5,
    right: 5,
    height: 1,
    backgroundColor: '#464646',
    borderRadius: 6,
  },
  progressBarFull: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 6,
  },
  playerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  playerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerAlbumArt: {
    width: 37,
    height: 37,
    backgroundColor: '#D9D9D9',
    borderRadius: 9,
  },
  playerInfo: {
    justifyContent: 'center',
  },
  playerSongTitle: {
    color: 'white',
    fontSize: 10,
    fontFamily: 'Poppins-SemiBold',
    lineHeight: 14,
  },
  playerArtistName: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 8,
    fontFamily: 'Poppins-Regular',
    lineHeight: 12,
  },
  playerPlayButton: {
    width: 24,
    height: 24,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
