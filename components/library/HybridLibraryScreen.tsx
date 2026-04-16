import { useAppTheme } from '@/hooks/use-app-theme';
import { useUserStore } from '@/store/useUserStore';
import { useAuthStore } from '@/store/useAuthStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyColor, adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { notifyError } from '@/utils/notify';
import { auth, db } from '@/firebaseConfig';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import {
  Archive,
  Check,
  Filter,
  FolderPlus,
  Heart,
  Link2,
  Music,
  Play,
  Plus,
  X,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

export default function HybridLibraryScreen() {
  const appTheme = useAppTheme();
  const styles = useLibraryStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToastStore();
  const user = useUserStore((s) => s);
  const authState = useAuthStore((s) => s);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [favouriteTracks, setFavouriteTracks] = useState<FavouriteTrack[]>([]);
  const setTrack = usePlaybackStore((state) => state.setTrack);

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showCreateFolderSheet, setShowCreateFolderSheet] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderCreated, setFolderCreated] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const activeRole = authState.actualRole || user.actualRole || user.role;

  useEffect(() => {
    if (!auth.currentUser) return;

    const uploadsQuery = query(
      collection(db, `users/${auth.currentUser.uid}/uploads`),
      orderBy('createdAt', 'desc')
    );

    const unsubUploads = onSnapshot(uploadsQuery, (snapshot) => {
      const tracks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as UploadItem[];
      setUploads(tracks);
    });

    const foldersQuery = query(
      collection(db, `users/${auth.currentUser.uid}/folders`),
      orderBy('createdAt', 'desc')
    );

    const unsubFolders = onSnapshot(foldersQuery, (snapshot) => {
      const backendFolders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as VaultFolder[];
      setFolders(backendFolders);
    });

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
      unsubUploads();
      unsubFolders();
      unsubFavourites();
    };
  }, []);

  const usedStorage = useMemo(() => {
    const totalBytes = uploads.reduce((sum, item) => sum + Number(item.fileSizeBytes || 0), 0);
    const gb = totalBytes / (1024 * 1024 * 1024);
    return gb.toFixed(2);
  }, [uploads.length]);

  const storageLimit = useMemo(() => {
    if (user.storageLimitGB > 0) return user.storageLimitGB;
    const fallbackMap: Record<string, number> = {
      vault: 0.05,
      vault_pro: 5,
      studio: 2,
      hybrid: 10,
    };
    return fallbackMap[activeRole || ''] || 0.05;
  }, [activeRole, user.storageLimitGB]);

  const hasVaultContent = folders.length > 0 || uploads.length > 0;
  const libraryTitle = 'Library';

  const planLabel = useMemo(() => {
    const tier = authState.subscriptionTier || activeRole || 'shoout';
    const subscribed = authState.isSubscribed;
    return `${String(tier).replace(/_/g, ' ')}${subscribed ? '' : ' (free)'}`;
  }, [activeRole, authState.isSubscribed, authState.subscriptionTier]);

  const createFolder = async () => {
    if (!auth.currentUser) {
      showToast('Please login again to create a folder.', 'error');
      return;
    }

    const name = folderName.trim();
    if (!name) {
      showToast('Enter a folder name.', 'error');
      return;
    }

    try {
      setCreatingFolder(true);
      await addDoc(collection(db, `users/${auth.currentUser.uid}/folders`), {
        name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        itemCount: 0,
        artworkUrl: uploads[0]?.artworkUrl || null,
      });
      setFolderCreated(true);
      showToast('Folder created successfully.', 'success');
    } catch (error: any) {
      notifyError('Create folder error', error?.message || error);
      showToast('Failed to create folder. Please try again.', 'error');
    } finally {
      setCreatingFolder(false);
    }
  };

  const closeFolderSheet = () => {
    setShowCreateFolderSheet(false);
    setFolderCreated(false);
    setFolderName('');
  };

  const openUpload = () => {
    if (!auth.currentUser) {
      showToast('Please sign in to upload your music.', 'error');
      router.push({ pathname: '/(auth)/login', params: { redirectTo: '/studio/upload' } });
      return;
    }
    router.push('/studio/upload');
  };

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
        <VaultHeader
          storageText={`${usedStorage}GB/${storageLimit.toFixed(2)}GB`}
          userLabel={user?.name || 'Creator'}
          title={libraryTitle}
          showStorage={false}
          planLabel={planLabel}
        />
        <>
            <View style={styles.listingsHeader}>
              <Text style={styles.listingsTitle}>Saved Songs</Text>
              <Text style={styles.likedCount}>{favouriteTracks.length} tracks</Text>
            </View>

            {favouriteTracks.length === 0 ? (
              <View style={styles.favouritesEmptyWrap}>
                <Heart size={52} color={adaptLegacyColor('rgba(255,255,255,0.24)', 'color', appTheme)} strokeWidth={1.7} />
                <Text style={styles.favouritesEmptyTitle}>No liked tracks yet</Text>
                <Text style={styles.favouritesEmptySubtitle}>Tap the heart icon while playing songs to save them here.</Text>
                <TouchableOpacity
                  style={styles.findSongsBtn}
                  activeOpacity={0.85}
                  onPress={() => router.push('/(tabs)/search' as any)}
                >
                  <Text style={styles.findSongsBtnText}>Browse Songs</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.favouritesList}>
                {favouriteTracks.map((track) => {
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
                          <Heart size={16} color="#EC5C39" fill="#EC5C39" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.filterButton} activeOpacity={0.8} onPress={() => showToast('Coming soon', 'info')}>
                <Filter size={18} color={appTheme.colors.textPrimary} />
                <Text style={styles.filterText}>filter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addFolderButton}
                activeOpacity={0.85}
                onPress={() => setShowCreateFolderSheet(true)}
              >
                <Text style={styles.addFolderText}>Add new folder</Text>
              </TouchableOpacity>
            </View>

            {!hasVaultContent ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconWrap}>
                  <Archive size={84} color={adaptLegacyColor('#767676', 'color', appTheme)} strokeWidth={1.6} />
                </View>

                <Text style={styles.emptyTitle}>No saved or uploaded items yet</Text>
                <Text style={styles.emptySubtitle}>Future MVP: saved, downloaded, and private library items live here.</Text>

                <TouchableOpacity
                  style={styles.createBtn}
                  activeOpacity={0.85}
                  onPress={() => setShowCreateSheet(true)}
                >
                  <Text style={styles.createBtnText}>Create</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Upload</Text>
                  <TouchableOpacity activeOpacity={0.8} onPress={() => showToast('Coming soon', 'info')}>
                    <Text style={styles.seeAll}>See All</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                  {folders.map((folder) => (
                    <FolderCard key={folder.id} folder={folder} />
                  ))}

                  {uploads.slice(0, 6).map((item) => (
                    <UploadCard key={item.id} item={item} />
                  ))}
                </ScrollView>
              </>
            )}
        </>
      </ScrollView>

      <>
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 145 }]}
          activeOpacity={0.85}
          onPress={() => setShowCreateSheet(true)}
        >
          <Plus size={20} color={appTheme.colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkFab, { bottom: insets.bottom + 92 }]}
          activeOpacity={0.85}
          onPress={() => showToast('Coming soon', 'info')}
        >
          <Link2 size={20} color={appTheme.colors.textPrimary} />
        </TouchableOpacity>
      </>

      <Modal transparent visible={showCreateSheet} animationType="slide" onRequestClose={() => setShowCreateSheet(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />

            <TouchableOpacity
              style={styles.closeBtn}
              activeOpacity={0.8}
              onPress={() => setShowCreateSheet(false)}
            >
              <X size={20} color={appTheme.colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              activeOpacity={0.9}
              onPress={() => {
                setShowCreateSheet(false);
                setShowCreateFolderSheet(true);
              }}
            >
              <Text style={styles.sheetOptionTitle}>Create Folder</Text>
              <FolderPlus size={52} color={adaptLegacyColor('rgba(255,255,255,0.58)', 'color', appTheme)} strokeWidth={2.6} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              activeOpacity={0.9}
              onPress={() => {
                setShowCreateSheet(false);
                openUpload();
              }}
            >
              <Text style={styles.sheetOptionTitle}>Upload Track</Text>
              <Music size={52} color={adaptLegacyColor('rgba(255,255,255,0.58)', 'color', appTheme)} strokeWidth={2.6} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showCreateFolderSheet}
        animationType="slide"
        onRequestClose={closeFolderSheet}
      >
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheetCard, styles.folderSheetCard]}>
            <View style={styles.sheetHandle} />

            <TouchableOpacity style={styles.closeBtn} activeOpacity={0.8} onPress={closeFolderSheet}>
              <X size={20} color={appTheme.colors.textSecondary} />
            </TouchableOpacity>

            <Text style={styles.folderSheetTitle}>Create Folder</Text>

            {folderCreated ? (
              <View style={styles.successCard}>
                <View style={styles.successIconWrap}>
                  <FolderPlus size={38} color={adaptLegacyColor('rgba(255,255,255,0.53)', 'color', appTheme)} strokeWidth={2.2} />
                  <View style={styles.checkBadge}>
                    <Check size={14} color={appTheme.colors.textPrimary} strokeWidth={3} />
                  </View>
                </View>
                <Text style={styles.successText}>Folder Uploaded successfully</Text>
              </View>
            ) : (
              <>
                <View style={styles.folderInputWrap}>
                  <TextInput
                    placeholder="Name of Folder"
                    placeholderTextColor={appTheme.colors.textPlaceholder}
                    style={styles.folderInput}
                    value={folderName}
                    onChangeText={setFolderName}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, creatingFolder && styles.submitBtnDisabled]}
                  activeOpacity={0.9}
                  onPress={createFolder}
                  disabled={creatingFolder}
                >
                  <Text style={styles.submitBtnText}>ADD CARD</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function VaultHeader({
  storageText,
  userLabel,
  title,
  showStorage,
  planLabel,
}: {
  storageText: string;
  userLabel: string;
  title: 'Vault' | 'Studio' | 'Hybrid';
  showStorage: boolean;
  planLabel: string;
}) {
  const styles = useLibraryStyles();
  const initials = userLabel
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Archive size={22} color="#EC5C39" strokeWidth={2.2} />

        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>{title}</Text>
          {showStorage ? <Text style={styles.headerStorage}>{storageText}</Text> : null}
          <View style={styles.planPill}>
            <Text style={styles.planPillText}>{planLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials || 'CR'}</Text>
      </View>
    </View>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  const styles = useLibraryStyles();
  return (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function FolderCard({ folder }: { folder: VaultFolder }) {
  const styles = useLibraryStyles();
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.cardItem}
      activeOpacity={0.8}
      onPress={() => router.push({ pathname: '/vault/folder/[id]', params: { id: folder.id, name: folder.name } } as any)}
    >
      <View style={styles.folderVisual}>
        <View style={styles.folderBack} />
        <View style={styles.folderFront}>
          {folder.artworkUrl ? (
            <Image source={{ uri: folder.artworkUrl }} style={styles.folderImage} />
          ) : (
            <Archive size={30} color="#EC5C39" />
          )}
        </View>
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{folder.name}</Text>
      <Text style={styles.cardMeta}>Upload {formatDate(folder.createdAt)}</Text>
    </TouchableOpacity>
  );
}

function UploadCard({ item }: { item: UploadItem }) {
  const appTheme = useAppTheme();
  const styles = useLibraryStyles();
  const artwork = item.artworkUrl || item.coverUrl;
  return (
    <View style={styles.cardItem}>
      <View style={styles.trackArt}>
        {artwork ? (
          <Image source={{ uri: artwork }} style={styles.trackArtImage} />
        ) : (
          <Music size={28} color={adaptLegacyColor('rgba(255,255,255,0.65)', 'color', appTheme)} />
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Untitled Track'}</Text>
      <Text style={styles.cardMeta} numberOfLines={1}>{item.artist || item.uploaderName || 'Creator'}</Text>
      <Text style={styles.cardMeta}>Upload {formatDate(item.createdAt)}</Text>
    </View>
  );
}

function formatDate(date?: any) {
  if (!date) return '';
  const parsed = typeof date?.toDate === 'function' ? date.toDate() : new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
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
    backgroundColor: '#EC5C39',
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
    color: 'rgba(255,255,255,0.37)',
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
    backgroundColor: '#EC5C39',
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
    color: '#EC5C39',
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
    backgroundColor: '#EC5C39',
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
    backgroundColor: '#EC5C39',
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
    alignItems: 'center',
  },
  listingsTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 18,
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
    backgroundColor: '#EC5C39',
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
    backgroundColor: '#EC5C39',
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
    backgroundColor: '#EC5C39',
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
    backgroundColor: '#EC5C39',
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

