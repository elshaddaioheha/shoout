import { useAppTheme } from '@/hooks/use-app-theme';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyColor, adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { notifyError } from '@/utils/notify';
import { auth, db } from '@/firebaseConfig';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import {
  ChevronLeft,
  Grid3x3,
  Heart,
  List,
  Music,
  Play,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type UploadItem = {
  id: string;
  title?: string;
  artist?: string;
  uploaderName?: string;
  audioUrl?: string;
  artworkUrl?: string;
  coverUrl?: string;
  fileSizeBytes?: number;
  price?: number;
  listenCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  createdAt?: any;
};

type VaultFolder = {
  id: string;
  name: string;
  createdAt?: any;
  artworkUrl?: string;
};

type FavouriteTrack = {
  id: string;
  title?: string;
  artist?: string;
  uploaderId?: string;
  url?: string;
  artworkUrl?: string;
  coverUrl?: string;
  addedAt?: string;
};

function useLibraryStyles() {
  const appTheme = useAppTheme();
  return useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function ShooutFavouritesScreen() {
  const appTheme = useAppTheme();
  const styles = useLibraryStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToastStore();
  const [favouriteTracks, setFavouriteTracks] = useState<FavouriteTrack[]>([]);
  const setTrack = usePlaybackStore((state) => state.setTrack);

  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'playlists' | 'subscriptions' | 'storage' | 'songs' | 'artists'>('all');

  // Filter tracks based on active filter tab
  const filteredTracks = useMemo(() => {
    if (activeFilterTab === 'all') {
      return favouriteTracks;
    }
    
    switch (activeFilterTab) {
      case 'playlists':
        // For now, show tracks with metadata indicating playlist association
        // This can be enhanced when playlist metadata is available
        return favouriteTracks;
      case 'subscriptions':
        // Filter for subscription-based or paid content
        // This can be enhanced with pricing tier metadata
        return favouriteTracks;
      case 'storage':
        // Filter for locally stored or archived content
        return favouriteTracks;
      case 'songs':
        // Show all individual songs
        return favouriteTracks;
      case 'artists':
        // Show tracks grouped by artist (but return all for now)
        return favouriteTracks;
      default:
        return favouriteTracks;
    }
  }, [favouriteTracks, activeFilterTab]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const favouritesRef = collection(db, `users/${auth.currentUser.uid}/favourites`);
    const unsubFavourites = onSnapshot(favouritesRef, (snapshot) => {
      const rows = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() })) as FavouriteTrack[];

      rows.sort((a, b) => {
        const aTime = new Date(a.addedAt || 0).getTime();
        const bTime = new Date(b.addedAt || 0).getTime();
        return bTime - aTime;
      });

      setFavouriteTracks(rows);
    });

    return () => {
      unsubFavourites();
    };
  }, []);

  const openFavourite = (track: FavouriteTrack) => {
    if (track.url) {
      setTrack({
        id: track.id,
        title: track.title || 'Untitled Track',
        artist: track.artist || 'Creator',
        url: track.url,
        uploaderId: track.uploaderId || '',
        artworkUrl: track.artworkUrl || track.coverUrl || '',
      });
      return;
    }

    if (track.id && track.uploaderId) {
      router.push({ pathname: '/listing/[id]', params: { id: track.id, uploaderId: track.uploaderId } } as any);
      return;
    }

    showToast('Track details are not available yet.', 'info');
  };

  const removeFavourite = async (trackId: string) => {
    if (!auth.currentUser?.uid || !trackId) return;
    try {
      await deleteDoc(doc(db, `users/${auth.currentUser.uid}/favourites`, trackId));
      showToast('Removed from favourites.', 'info');
    } catch (error) {
      notifyError('Failed to remove favourite', error);
      showToast('Could not remove this favourite right now.', 'error');
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 14,
            paddingBottom: insets.bottom + 120,
          },
        ]}
      >
        <>
            {/* Library Header */}
            <View style={styles.pageHeader}>
              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.8}
                onPress={() => router.push('/(tabs)/more' as any)}
              >
                <ChevronLeft size={24} color={appTheme.colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>Library</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.listingsHeader}>
              <View>
                <Text style={styles.listingsTitle}>Liked Music</Text>
                <Text style={styles.likedCount}>{filteredTracks.length} tracks</Text>
              </View>
              <View style={styles.layoutToggle}>
                <TouchableOpacity
                  style={[styles.layoutToggleBtn, layoutMode === 'grid' && styles.layoutToggleBtnActive]}
                  activeOpacity={0.8}
                  onPress={() => setLayoutMode('grid')}
                >
                  <Grid3x3 size={16} color={layoutMode === 'grid' ? '#6AA7FF' : appTheme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.layoutToggleBtn, layoutMode === 'list' && styles.layoutToggleBtnActive]}
                  activeOpacity={0.8}
                  onPress={() => setLayoutMode('list')}
                >
                  <List size={16} color={layoutMode === 'list' ? '#6AA7FF' : appTheme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Filter Tabs */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.filterTabsContainer}
              style={styles.filterTabsScroll}
            >
              {(['all', 'playlists', 'subscriptions', 'storage', 'songs', 'artists'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.filterTab,
                    activeFilterTab === tab && styles.filterTabActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setActiveFilterTab(tab)}
                >
                  <Text style={[
                    styles.filterTabText,
                    activeFilterTab === tab && styles.filterTabTextActive,
                  ]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredTracks.length === 0 ? (
              <View style={styles.favouritesEmptyWrap}>
                <Heart size={52} color={adaptLegacyColor('rgba(255,255,255,0.24)', 'color', appTheme)} strokeWidth={1.7} />
                <Text style={styles.favouritesEmptyTitle}>No liked tracks yet</Text>
                <Text style={styles.favouritesEmptySubtitle}>Tap the heart icon while playing songs to save them here.</Text>
                <TouchableOpacity
                  style={styles.findSongsBtn}
                  activeOpacity={0.85}
                  onPress={() => router.push('/(tabs)/search' as any)}
                >
                  <Text style={styles.findSongsBtnText}>Find Songs</Text>
                </TouchableOpacity>
              </View>
            ) : layoutMode === 'grid' ? (
              <View style={styles.favouritesGrid}>
                {filteredTracks.map((track) => {
                  const art = track.artworkUrl || track.coverUrl;
                  return (
                    <View key={track.id} style={styles.gridItem}>
                      <TouchableOpacity
                        style={styles.gridItemArtWrap}
                        activeOpacity={0.8}
                        onPress={() => openFavourite(track)}
                      >
                        {art ? (
                          <Image source={{ uri: art }} style={styles.gridItemArt} />
                        ) : (
                          <View style={styles.gridItemPlaceholder}>
                            <Music size={28} color={adaptLegacyColor('rgba(255,255,255,0.5)', 'color', appTheme)} />
                          </View>
                        )}
                        <View style={styles.gridItemOverlay}>
                          <TouchableOpacity
                            style={styles.gridItemPlayBtn}
                            activeOpacity={0.8}
                            onPress={() => openFavourite(track)}
                          >
                            <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                      <View style={styles.gridItemInfo}>
                        <Text style={styles.gridItemTitle} numberOfLines={2}>{track.title || 'Untitled Track'}</Text>
                        <View style={styles.gridItemFooter}>
                          <Text style={styles.gridItemArtist} numberOfLines={1}>{track.artist || 'Creator'}</Text>
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => removeFavourite(track.id)}
                          >
                            <Heart size={14} color="#6AA7FF" fill="#6AA7FF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.favouritesList}>
                {filteredTracks.map((track) => {
                  const art = track.artworkUrl || track.coverUrl;
                  return (
                    <View key={track.id} style={styles.favouriteRow}>
                      <TouchableOpacity
                        style={styles.favouriteMain}
                        activeOpacity={0.8}
                        onPress={() => openFavourite(track)}
                      >
                        <View style={styles.favouriteArtWrap}>
                          {art ? (
                            <Image source={{ uri: art }} style={styles.favouriteArt} />
                          ) : (
                            <Music size={18} color={adaptLegacyColor('rgba(255,255,255,0.5)', 'color', appTheme)} />
                          )}
                        </View>
                        <View style={styles.favouriteInfo}>
                          <Text style={styles.favouriteTitle} numberOfLines={1}>{track.title || 'Untitled Track'}</Text>
                          <Text style={styles.favouriteArtist} numberOfLines={1}>{track.artist || 'Creator'}</Text>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.favouriteActions}>
                        <TouchableOpacity
                          style={styles.favouriteActionBtn}
                          activeOpacity={0.8}
                          onPress={() => openFavourite(track)}
                        >
                          <Play size={16} color={appTheme.colors.textPrimary} fill={appTheme.colors.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.favouriteActionBtn}
                          activeOpacity={0.8}
                          onPress={() => removeFavourite(track.id)}
                        >
                          <Heart size={16} color="#6AA7FF" fill="#6AA7FF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

        </>
      </ScrollView>
    </View>
  );
}

const legacyStyles = {
  screen: {
    flex: 1,
    backgroundColor: '#140F10',
  },
  content: {
    paddingHorizontal: 20,
    gap: 20,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(106,167,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.5,
    flex: 1,
    textAlign: 'center',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  headerTextWrap: {
    gap: 6,
  },
  headerTitle: {
    color: 'rgba(255,255,255,0.95)',
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.5,
  },
  headerStorage: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: -0.5,
  },
  planPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#6AA7FF',
  },
  planPillText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 8,
    lineHeight: 12,
    letterSpacing: 0.1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  filterButton: {
    width: 57,
    height: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  filterText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  addFolderButton: {
    height: 24,
    borderRadius: 5,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#464646',
  },
  addFolderText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: -0.5,
  },
  emptyWrap: {
    marginTop: 38,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconWrap: {
    width: 230,
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: 'rgba(255,255,255,0.64)',
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: -0.5,
  },
  createBtn: {
    marginTop: 4,
    width: 81,
    height: 28,
    borderRadius: 5,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6AA7FF',
  },
  createBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: -0.5,
  },
  sectionHeader: {
    marginTop: 8,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  seeAll: {
    color: '#6AA7FF',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  horizontalList: {
    gap: 20,
    paddingTop: 4,
    paddingRight: 12,
  },
  cardItem: {
    width: 102,
  },
  folderVisual: {
    height: 93,
    position: 'relative',
    marginBottom: 6,
  },
  folderBack: {
    position: 'absolute',
    width: 84,
    height: 84,
    top: 8,
    left: 10,
    borderRadius: 18,
    backgroundColor: '#767676',
  },
  folderFront: {
    position: 'absolute',
    width: 84,
    height: 84,
    top: 0,
    left: 14,
    borderRadius: 18,
    backgroundColor: '#D9D9D9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  folderImage: {
    width: '100%',
    height: '100%',
  },
  trackArt: {
    width: 102,
    height: 110,
    borderRadius: 18,
    backgroundColor: '#D9D9D9',
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackArtImage: {
    width: '100%',
    height: '100%',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  cardMeta: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Light',
    fontSize: 7,
    lineHeight: 9,
    letterSpacing: -0.5,
  },
  fab: {
    position: 'absolute',
    right: 18,
    width: 41,
    height: 41,
    borderRadius: 21,
    backgroundColor: '#6AA7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkFab: {
    position: 'absolute',
    right: 18,
    width: 41,
    height: 41,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#6AA7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioLinkFab: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  uploadFab: {
    position: 'absolute',
    right: 18,
    width: 41,
    height: 41,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studioLegendRow: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendLine: {
    width: 14,
    height: 3,
    borderRadius: 2,
  },
  legendText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  analyticsCard: {
    marginTop: 2,
    width: '100%',
    height: 318,
    backgroundColor: '#1A1A1B',
    paddingVertical: 20,
    justifyContent: 'space-between',
    borderRadius: 6,
  },
  analyticsGridRow: {
    width: '100%',
    height: 40,
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
  },
  analyticsGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 20,
    height: 1,
    backgroundColor: '#140F10',
  },
  analyticsGridLabel: {
    alignSelf: 'flex-end',
    color: '#9E9FAD',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  analyticsLinkWrap: {
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  analyticsLink: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: -0.5,
    textDecorationLine: 'underline',
  },
  listingsHeader: {
    marginTop: 10,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  listingsTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 18,
  },
  layoutToggle: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  layoutToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  layoutToggleBtnActive: {
    backgroundColor: 'rgba(236,92,57,0.2)',
  },
  filterTabsScroll: {
    marginTop: 12,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterTabsContainer: {
    gap: 8,
    paddingRight: 20,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterTabActive: {
    backgroundColor: '#6AA7FF',
    borderColor: '#6AA7FF',
  },
  filterTabText: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
  },
  listingsViewAll: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: -0.5,
    textDecorationLine: 'underline',
  },
  likedCount: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 15,
  },
  favouritesEmptyWrap: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#1A1A1B',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 10,
  },
  favouritesEmptyTitle: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    lineHeight: 20,
  },
  favouritesEmptySubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  findSongsBtn: {
    marginTop: 4,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6AA7FF',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findSongsBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    lineHeight: 16,
  },
  favouritesGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#1A1A1B',
    padding: 12,
  },
  gridItem: {
    width: '48%',
    gap: 8,
  },
  gridItemArtWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  gridItemArt: {
    width: '100%',
    height: '100%',
  },
  gridItemPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  gridItemOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  gridItemPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6AA7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemInfo: {
    gap: 4,
  },
  gridItemTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  gridItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridItemArtist: {
    flex: 1,
    color: 'rgba(255,255,255,0.68)',
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    lineHeight: 14,
  },
  favouritesList: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#1A1A1B',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  favouriteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  favouriteMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  favouriteArtWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favouriteArt: {
    width: '100%',
    height: '100%',
  },
  favouriteInfo: {
    flex: 1,
  },
  favouriteTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.3,
  },
  favouriteArtist: {
    color: 'rgba(255,255,255,0.68)',
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: -0.3,
  },
  favouriteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  favouriteActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(236,92,57,0.22)',
  },
  listingsCard: {
    width: '100%',
    minHeight: 200,
    borderRadius: 10,
    backgroundColor: '#1A1A1B',
    padding: 14,
  },
  listingsEmptyWrap: {
    minHeight: 172,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  listingsEmptyText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 12,
  },
  createListingBtn: {
    height: 32,
    borderRadius: 5,
    backgroundColor: '#6AA7FF',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createListingText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 12,
  },
  salesHeaderBar: {
    marginTop: 10,
    height: 33,
    width: '100%',
    borderRadius: 2,
    backgroundColor: '#1A1A1B',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  salesHeaderText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  statsRow: {
    gap: 10,
    paddingTop: 12,
    paddingRight: 24,
  },
  statCard: {
    width: 155,
    height: 69,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#140F10',
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  statTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  statValue: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  earningsModuleWrap: {
    marginTop: 8,
    width: '100%',
    gap: 10,
  },
  earningRow: {
    width: '100%',
    minHeight: 69,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#767676',
    backgroundColor: '#140F10',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  earningLabel: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 21,
    letterSpacing: -0.5,
    width: '58%',
  },
  earningAmount: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetCard: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#140F10',
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 34,
    gap: 14,
  },
  folderSheetCard: {
    minHeight: 430,
    paddingBottom: 40,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 134,
    height: 5,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
  },
  closeBtn: {
    width: 24,
    height: 24,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOption: {
    height: 98,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetOptionTitle: {
    color: 'rgba(255,255,255,0.76)',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  folderSheetTitle: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    lineHeight: 25,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  folderInputWrap: {
    height: 56,
    borderWidth: 1.5,
    borderColor: '#464646',
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 25,
    marginTop: 4,
  },
  folderInput: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  submitBtn: {
    marginTop: 30,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#6AA7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    lineHeight: 20,
  },
  successCard: {
    marginTop: 8,
    height: 98,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  successIconWrap: {
    width: 71,
    height: 71,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    right: 2,
    bottom: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#6AA7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
};

