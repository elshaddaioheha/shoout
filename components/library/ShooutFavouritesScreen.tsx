import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { FontFamily } from '@/constants/theme';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { notifyError } from '@/utils/notify';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
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

export default function ShooutsFavouritesScreen() {
  const appTheme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToastStore();
  const [favouriteTracks, setFavouriteTracks] = useState<FavouriteTrack[]>([]);
  const [playlists, setPlaylists] = useState<VaultFolder[]>([]);
  const setTrack = usePlaybackStore((state) => state.setTrack);

  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'playlists' | 'subscriptions' | 'storage' | 'songs' | 'artists'>('all');

  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: appTheme.colors.background },
    content: { paddingHorizontal: 20, gap: 20 },
    pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${appTheme.colors.primary}1A`, alignItems: 'center', justifyContent: 'center' },
    pageTitle: { color: appTheme.colors.textPrimary, fontFamily: 'Poppins-SemiBold', fontSize: 18, lineHeight: 24, letterSpacing: -0.5, flex: 1, textAlign: 'center' },
    listingsHeader: { marginTop: 10, width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    listingsTitle: { color: appTheme.colors.textPrimary, fontFamily: 'Poppins-Medium', fontSize: 16, lineHeight: 18 },
    likedCount: { color: appTheme.colors.textSecondary, fontFamily: 'Poppins-Regular', fontSize: 12, lineHeight: 15 },
    layoutToggle: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    layoutToggleBtn: { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: appTheme.colors.surface },
    layoutToggleBtnActive: { backgroundColor: `${appTheme.colors.shooutPrimary}33` },
    filterTabsScroll: { marginTop: 12, marginHorizontal: -20, paddingHorizontal: 20 },
    filterTabsContainer: { gap: 8, paddingRight: 20 },
    filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: appTheme.colors.surface, borderWidth: 1, borderColor: appTheme.colors.border },
    filterTabActive: { backgroundColor: appTheme.colors.shooutPrimary, borderColor: appTheme.colors.shooutPrimary },
    filterTabText: { color: appTheme.colors.textSecondary, fontFamily: 'Poppins-Regular', fontSize: 12, lineHeight: 16 },
    filterTabTextActive: { color: '#FFFFFF', fontFamily: 'Poppins-Medium' },
    favouritesEmptyWrap: { width: '100%', borderRadius: 10, borderWidth: 1, borderColor: appTheme.colors.border, backgroundColor: appTheme.colors.surface, alignItems: 'center', paddingVertical: 28, paddingHorizontal: 16, gap: 10 },
    favouritesEmptyTitle: { color: appTheme.colors.textPrimary, fontFamily: 'Poppins-SemiBold', fontSize: 15, lineHeight: 20 },
    favouritesEmptySubtitle: { color: appTheme.colors.textSecondary, fontFamily: 'Poppins-Regular', fontSize: 12, lineHeight: 17, textAlign: 'center' },
    findSongsBtn: { marginTop: 4, height: 36, borderRadius: 18, backgroundColor: appTheme.colors.shooutPrimary, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
    findSongsBtnText: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', fontSize: 12, lineHeight: 16 },
    sectionHeader: { marginTop: 8, width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { color: appTheme.colors.textPrimary, fontFamily: 'Poppins-SemiBold', fontSize: 14, lineHeight: 25, letterSpacing: -0.5 },
    seeAll: { color: appTheme.colors.shooutPrimary, fontFamily: 'Poppins-Regular', fontSize: 14, lineHeight: 25, letterSpacing: -0.5 },
    horizontalList: { gap: 20, paddingTop: 4, paddingRight: 12 },
    cardItem: { width: 102 },
    playlistVisual: { width: 102, height: 102, borderRadius: 10, backgroundColor: appTheme.colors.surface, marginBottom: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: appTheme.colors.border },
    playlistImage: { width: '100%', height: '100%' },
    cardTitle: { color: appTheme.colors.textPrimary, fontFamily: 'Poppins-Medium', fontSize: 12, lineHeight: 18, marginTop: 4 },
    favouritesGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderRadius: 10, borderWidth: 1, borderColor: appTheme.colors.border, backgroundColor: appTheme.colors.surface, padding: 12 },
    gridItem: { width: '48%', gap: 8 },
    gridItemArtWrap: { width: '100%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: appTheme.colors.border, position: 'relative' },
    gridItemArt: { width: '100%', height: '100%' },
    gridItemPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: appTheme.colors.border },
    gridItemOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', opacity: 0.8 },
    gridItemPlayBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: appTheme.colors.shooutPrimary, alignItems: 'center', justifyContent: 'center' },
    gridItemInfo: { gap: 4 },
    gridItemTitle: { color: appTheme.colors.textPrimary, fontFamily: 'Poppins-Medium', fontSize: 12, lineHeight: 16 },
    gridItemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    gridItemArtist: { flex: 1, color: appTheme.colors.textSecondary, fontFamily: 'Poppins-Regular', fontSize: 10, lineHeight: 14 },
    transparentIconButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    favouritesList: { width: '100%', borderRadius: 10, borderWidth: 1, borderColor: appTheme.colors.border, backgroundColor: appTheme.colors.surface, paddingVertical: 8, paddingHorizontal: 10, gap: 6 },
    favouriteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
    favouriteMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 8 },
    favouriteArtWrap: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', backgroundColor: appTheme.colors.surface, borderWidth: 1, borderColor: appTheme.colors.border, alignItems: 'center', justifyContent: 'center' },
    favouriteArt: { width: '100%', height: '100%' },
    favouriteInfo: { flex: 1 },
    favouriteTitle: { color: appTheme.colors.textPrimary, fontFamily: 'Poppins-Medium', fontSize: 12, lineHeight: 16, letterSpacing: -0.3 },
    favouriteArtist: { color: appTheme.colors.textSecondary, fontFamily: 'Poppins-Regular', fontSize: 10, lineHeight: 14, letterSpacing: -0.3 },
    favouriteActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    favouriteActionBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: `${appTheme.colors.shooutPrimary}22` },
  }), [appTheme]);

  // Filter tracks based on active filter tab
  const filteredTracks = useMemo(() => {
    if (activeFilterTab === 'all') {
      return favouriteTracks;
    }
    
    switch (activeFilterTab) {
      case 'playlists':
        return favouriteTracks;
      case 'subscriptions':
        return favouriteTracks;
      case 'storage':
        return favouriteTracks;
      case 'songs':
        return favouriteTracks;
      case 'artists':
        return favouriteTracks;
      default:
        return favouriteTracks;
    }
  }, [favouriteTracks, activeFilterTab]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const favouritesRef = collection(db, `users/${uid}/favourites`);
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

    const playlistsQ = query(collection(db, 'globalPlaylists'), where('ownerId', '==', uid));
    const unsubPlaylists = onSnapshot(playlistsQ, (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ id: item.id, name: item.data().name, createdAt: item.data().createdAt, artworkUrl: item.data().artworkUrl })) as VaultFolder[];
      rows.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
      setPlaylists(rows);
    });

    return () => {
      unsubFavourites();
      unsubPlaylists();
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
              <IconButton
                style={styles.backButton}
                accessibilityLabel="Go back"
                accessibilityHint="Return to more options"
                icon="chevron-left"
                color={appTheme.colors.textPrimary}
                size={24}
                onPress={() => router.push('/more' as any)}
              />
              <Text style={styles.pageTitle}>Library</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.listingsHeader}>
              <View>
                <Text style={styles.listingsTitle}>Liked Music</Text>
                <Text style={styles.likedCount}>{filteredTracks.length} tracks</Text>
              </View>
              <View style={styles.layoutToggle}>
                <IconButton
                  style={[styles.layoutToggleBtn, layoutMode === 'grid' && styles.layoutToggleBtnActive]}
                  accessibilityLabel="Grid view"
                  accessibilityState={{ selected: layoutMode === 'grid' }}
                  icon="grid-3x3"
                  color={layoutMode === 'grid' ? appTheme.colors.shooutPrimary : appTheme.colors.textSecondary}
                  size={16}
                  onPress={() => setLayoutMode('grid')}
                />
                <IconButton
                  style={[styles.layoutToggleBtn, layoutMode === 'list' && styles.layoutToggleBtnActive]}
                  accessibilityLabel="List view"
                  accessibilityState={{ selected: layoutMode === 'list' }}
                  icon="view"
                  color={layoutMode === 'list' ? appTheme.colors.shooutPrimary : appTheme.colors.textSecondary}
                  size={16}
                  onPress={() => setLayoutMode('list')}
                />
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

            {activeFilterTab === 'playlists' ? (
              <View style={{ marginTop: 10 }}>
                {playlists.length === 0 ? (
                  <View style={styles.favouritesEmptyWrap}>
                    <Icon name="folder" size={52} color={appTheme.colors.textSecondary} />
                    <Text style={styles.favouritesEmptyTitle}>No playlists found</Text>
                    <Text style={styles.favouritesEmptySubtitle}>Curate your favorite tracks by adding them to playlists.</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
                    {playlists.map((pl) => (
                      <TouchableOpacity
                        key={pl.id}
                        style={styles.cardItem}
                        activeOpacity={0.85}
                        onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: pl.id, title: pl.name } } as any)}
                      >
                        <View style={styles.playlistVisual}>
                            {pl.artworkUrl ? (
                              <Image source={{ uri: pl.artworkUrl }} style={styles.playlistImage} />
                            ) : (
                              <Icon name="music" size={24} color={appTheme.colors.textSecondary} />
                            )}
                        </View>
                        <Text style={styles.cardTitle} numberOfLines={1}>{pl.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <>
                {/* Horizontal Playlists preview only on "all" tab */}
                {activeFilterTab === 'all' && playlists.length > 0 && (
                  <View style={{ marginBottom: 24, marginTop: 10 }}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>Your Playlists</Text>
                      <TouchableOpacity onPress={() => setActiveFilterTab('playlists')}>
                        <Text style={styles.seeAll}>See All</Text>
                      </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                      {playlists.map((pl) => (
                        <TouchableOpacity
                          key={pl.id}
                          style={styles.cardItem}
                          activeOpacity={0.85}
                          onPress={() => router.push({ pathname: '/playlist/[id]', params: { id: pl.id, title: pl.name } } as any)}
                        >
                          <View style={styles.playlistVisual}>
                            {pl.artworkUrl ? (
                              <Image source={{ uri: pl.artworkUrl }} style={styles.playlistImage} />
                            ) : (
                              <Icon name="music" size={24} color={appTheme.colors.textSecondary} />
                            )}
                          </View>
                          <Text style={styles.cardTitle} numberOfLines={1}>{pl.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Tracks Header */}
                {activeFilterTab === 'all' && playlists.length > 0 && (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Liked Songs</Text>
                  </View>
                )}

                {filteredTracks.length === 0 ? (
                  <View style={styles.favouritesEmptyWrap}>
                    <Icon name="heart" size={52} color={appTheme.colors.textSecondary} />
                    <Text style={styles.favouritesEmptyTitle}>No liked tracks yet</Text>
                    <Text style={styles.favouritesEmptySubtitle}>Tap the heart icon while playing songs to save them here.</Text>
                    <TouchableOpacity
                      style={styles.findSongsBtn}
                      activeOpacity={0.85}
                      onPress={() => router.push('/search' as any)}
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
                            <Icon name="music" size={28} color={appTheme.colors.textSecondary} />
                          </View>
                        )}
                        <View style={styles.gridItemOverlay}>
                          <IconButton
                            style={styles.gridItemPlayBtn}
                            accessibilityLabel="Play track"
                            accessibilityHint="Play this favourite track"
                            icon="play"
                            color="#FFFFFF"
                            size={16}
                            fill
                            onPress={() => openFavourite(track)}
                          />
                        </View>
                      </TouchableOpacity>
                      <View style={styles.gridItemInfo}>
                        <Text style={styles.gridItemTitle} numberOfLines={2}>{track.title || 'Untitled Track'}</Text>
                        <View style={styles.gridItemFooter}>
                          <Text style={styles.gridItemArtist} numberOfLines={1}>{track.artist || 'Creator'}</Text>
                          <IconButton
                            style={styles.transparentIconButton}
                            accessibilityLabel="Remove favourite"
                            accessibilityHint="Remove this track from favourites"
                            icon="heart"
                            color={appTheme.colors.shooutPrimary}
                            size={14}
                            fill
                            onPress={() => removeFavourite(track.id)}
                          />
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
                            <Icon name="music" size={18} color={appTheme.colors.textSecondary} />
                          )}
                        </View>
                        <View style={styles.favouriteInfo}>
                          <Text style={styles.favouriteTitle} numberOfLines={1}>{track.title || 'Untitled Track'}</Text>
                          <Text style={styles.favouriteArtist} numberOfLines={1}>{track.artist || 'Creator'}</Text>
                        </View>
                      </TouchableOpacity>

                      <View style={styles.favouriteActions}>
                        <IconButton
                          style={styles.favouriteActionBtn}
                          accessibilityLabel="Play track"
                          accessibilityHint="Play this favourite track"
                          icon="play"
                          color={appTheme.colors.textPrimary}
                          size={16}
                          fill
                          onPress={() => openFavourite(track)}
                        />
                        <IconButton
                          style={styles.favouriteActionBtn}
                          accessibilityLabel="Remove favourite"
                          accessibilityHint="Remove this track from favourites"
                          icon="heart"
                          color={appTheme.colors.shooutPrimary}
                          size={16}
                          fill
                          onPress={() => removeFavourite(track.id)}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            </>
          )}

        </>
      </ScrollView>
    </View>
  );
}
