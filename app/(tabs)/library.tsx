import { useUserStore } from '@/store/useUserStore';
import { useToastStore } from '@/store/useToastStore';
import { auth, db } from '@/firebaseConfig';
import { useRouter } from 'expo-router';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import {
  Archive,
  Check,
  Filter,
  FolderPlus,
  Link2,
  Megaphone,
  MessageSquare,
  Music,
  Plus,
  Upload,
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
  audioUrl?: string;
  artworkUrl?: string;
  createdAt?: any;
};

type VaultFolder = {
  id: string;
  name: string;
  createdAt?: any;
  artworkUrl?: string;
};

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToastStore();
  const user = useUserStore((s) => s); // or use the correct property, e.g., s.currentUser, if that's what your store exports
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [folders, setFolders] = useState<VaultFolder[]>([]);

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showCreateFolderSheet, setShowCreateFolderSheet] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [folderCreated, setFolderCreated] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const isStudioUser = user.viewMode === 'studio' || user.role?.startsWith('studio');
  const isHybridUser = user.role?.startsWith('hybrid');
  const isCreatorSurface = isStudioUser || isHybridUser;

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

    return () => {
      unsubUploads();
      unsubFolders();
    };
  }, []);

  const usedStorage = useMemo(() => {
    const approxMb = uploads.length * 2;
    const gb = approxMb / 1024;
    return gb.toFixed(2);
  }, [uploads.length]);

  const hasVaultContent = folders.length > 0 || uploads.length > 0;
  const reach = uploads.length * 1200;
  const engagement = uploads.length * 320;
  const netSales = uploads.reduce((sum, item: any) => sum + (Number(item?.price) || 0), 0);
  const earningsPreview = uploads.slice(0, 4).map((item) => ({
    id: item.id,
    label: `${item.title || 'Track'} purchased`,
    amount: Number((item as any).price) > 0 ? Number((item as any).price) : 3000,
  }));

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
      console.error('Create folder error:', error?.message || error);
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
          storageText={`${usedStorage}GB/00.00GB`}
          userLabel={user?.name || 'Creator'}
          title={isHybridUser ? 'Hybrid' : isStudioUser ? 'Studio' : 'Vault'}
          showStorage={!isCreatorSurface}
        />

        {isCreatorSurface ? (
          <>
            <View style={styles.studioLegendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: '#F38744' }]} />
                <Text style={styles.legendText}>Reach {reach.toLocaleString()}</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: '#67E3F9' }]} />
                <Text style={styles.legendText}>Engagement {engagement.toLocaleString()}</Text>
              </View>
            </View>

            <View style={styles.analyticsCard}>
              {[400, 300, 200, 100].map((value) => (
                <View key={value} style={styles.analyticsGridRow}>
                  <View style={styles.analyticsGridLine} />
                  <Text style={styles.analyticsGridLabel}>{value}k</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.analyticsLinkWrap}
              onPress={() => router.push('/studio/analytics')}
            >
              <Text style={styles.analyticsLink}>See all Analytics</Text>
            </TouchableOpacity>

            {isHybridUser ? (
              <>
                <View style={styles.listingsHeader}>
                  <Text style={styles.listingsTitle}>My Storage</Text>
                  <TouchableOpacity activeOpacity={0.8}>
                    <Text style={styles.listingsViewAll}>View all</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                  {folders.slice(0, 4).map((folder) => (
                    <FolderCard key={folder.id} folder={folder} />
                  ))}

                  {uploads.slice(0, 6).map((item) => (
                    <UploadCard key={item.id} item={item} />
                  ))}
                </ScrollView>
              </>
            ) : null}

            <View style={styles.listingsHeader}>
              <Text style={styles.listingsTitle}>My Listings</Text>
              <TouchableOpacity activeOpacity={0.8}>
                <Text style={styles.listingsViewAll}>View all</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.listingsCard}>
              {uploads.length === 0 ? (
                <View style={styles.listingsEmptyWrap}>
                  <Archive size={48} color="#4C4E54" strokeWidth={2.2} />
                  <Text style={styles.listingsEmptyText}>You haven’t made any listings.</Text>
                  <TouchableOpacity
                    style={styles.createListingBtn}
                    activeOpacity={0.9}
                    onPress={() => router.push('/studio/upload')}
                  >
                    <Text style={styles.createListingText}>Create Listing</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                  {uploads.slice(0, 6).map((item) => (
                    <UploadCard key={item.id} item={item} />
                  ))}
                </ScrollView>
              )}
            </View>

            {isHybridUser ? (
              <>
                <View style={styles.listingsHeader}>
                  <Text style={styles.listingsTitle}>Promotions</Text>
                  <TouchableOpacity activeOpacity={0.8}>
                    <Text style={styles.listingsViewAll}>View all</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.listingsCard}>
                  <View style={styles.listingsEmptyWrap}>
                    <Megaphone size={48} color="#4C4E54" strokeWidth={2.2} />
                    <Text style={styles.listingsEmptyText}>You haven’t made any promotions.</Text>
                    <TouchableOpacity
                      style={styles.createListingBtn}
                      activeOpacity={0.9}
                      onPress={() => router.push('/studio/ads-intro' as any)}
                    >
                      <Text style={styles.createListingText}>Create Ads</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : null}

            <TouchableOpacity
              style={styles.salesHeaderBar}
              activeOpacity={0.85}
              onPress={() => router.push('/studio/earnings' as any)}
            >
              <Text style={styles.salesHeaderText}>Sales & Earnings</Text>
            </TouchableOpacity>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
              <StatCard title="Net Sales" value={`NGN ${netSales.toFixed(2)}`} />
              <StatCard title="New Subscribers" value="0.00" />
              <StatCard title="New Likes" value="0.00" />
              <StatCard title="New Follows" value="0.00" />
              <StatCard title="Total Uploaded Track" value={`${uploads.length}`} />
            </ScrollView>

            <View style={styles.earningsModuleWrap}>
              {earningsPreview.map((earning) => (
                <TouchableOpacity
                  key={earning.id}
                  style={styles.earningRow}
                  activeOpacity={0.85}
                  onPress={() => router.push('/studio/earnings' as any)}
                >
                  <Text style={styles.earningLabel}>{earning.label}</Text>
                  <Text style={styles.earningAmount}>NGN {earning.amount.toLocaleString()}.00</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.filterButton} activeOpacity={0.8}>
                <Filter size={18} color="#FFFFFF" />
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
                  <Archive size={84} color="rgba(118,118,118,0.4)" strokeWidth={1.6} />
                </View>

                <Text style={styles.emptyTitle}>No Item added yet</Text>
                <Text style={styles.emptySubtitle}>5 free Uploads and Folder Creation</Text>

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
                  <TouchableOpacity activeOpacity={0.8}>
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
        )}
      </ScrollView>

      {isCreatorSurface ? (
        <>
          {isStudioUser ? (
            <TouchableOpacity
              style={[styles.linkFab, styles.studioLinkFab, { bottom: insets.bottom + 180 }]}
              activeOpacity={0.85}
              onPress={() => router.push('/studio/messages' as any)}
            >
              <MessageSquare size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.uploadFab, { bottom: insets.bottom + 130 }]}
            activeOpacity={0.85}
            onPress={() => router.push('/studio/upload')}
          >
            <Upload size={20} color="#EC5C39" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fab, { bottom: insets.bottom + 80 }]}
            activeOpacity={0.85}
            onPress={() => setShowCreateSheet(true)}
          >
            <Plus size={20} color="#F8F8F8" />
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.fab, { bottom: insets.bottom + 145 }]}
            activeOpacity={0.85}
            onPress={() => setShowCreateSheet(true)}
          >
            <Plus size={20} color="#F8F8F8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkFab, { bottom: insets.bottom + 92 }]}
            activeOpacity={0.85}
          >
            <Link2 size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </>
      )}

      <Modal transparent visible={showCreateSheet} animationType="slide" onRequestClose={() => setShowCreateSheet(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />

            <TouchableOpacity
              style={styles.closeBtn}
              activeOpacity={0.8}
              onPress={() => setShowCreateSheet(false)}
            >
              <X size={20} color="#D9D9D9" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              activeOpacity={0.9}
              onPress={() => {
                setShowCreateSheet(false);
                if (isHybridUser) {
                  router.push('/studio/upload');
                } else {
                  setShowCreateFolderSheet(true);
                }
              }}
            >
              <Text style={styles.sheetOptionTitle}>{isHybridUser ? 'Create Listing' : 'Create Folder'}</Text>
              {isHybridUser ? (
                <Music size={52} color="rgba(255,255,255,0.58)" strokeWidth={2.6} />
              ) : (
                <FolderPlus size={52} color="rgba(255,255,255,0.58)" strokeWidth={2.6} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              activeOpacity={0.9}
              onPress={() => {
                setShowCreateSheet(false);
                if (isHybridUser) {
                  router.push('/studio/ads-intro' as any);
                } else {
                  router.push('/studio/upload');
                }
              }}
            >
              <Text style={styles.sheetOptionTitle}>{isHybridUser ? 'Promote Ad' : 'Upload Track'}</Text>
              {isHybridUser ? (
                <Megaphone size={52} color="rgba(255,255,255,0.58)" strokeWidth={2.6} />
              ) : (
                <Music size={52} color="rgba(255,255,255,0.58)" strokeWidth={2.6} />
              )}
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
              <X size={20} color="#D9D9D9" />
            </TouchableOpacity>

            <Text style={styles.folderSheetTitle}>Create Folder</Text>

            {folderCreated ? (
              <View style={styles.successCard}>
                <View style={styles.successIconWrap}>
                  <FolderPlus size={38} color="rgba(255,255,255,0.53)" strokeWidth={2.2} />
                  <View style={styles.checkBadge}>
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  </View>
                </View>
                <Text style={styles.successText}>Folder Uploaded successfully</Text>
              </View>
            ) : (
              <>
                <View style={styles.folderInputWrap}>
                  <TextInput
                    placeholder="Name of Folder"
                    placeholderTextColor="#D9D9D9"
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
}: {
  storageText: string;
  userLabel: string;
  title: 'Vault' | 'Studio' | 'Hybrid';
  showStorage: boolean;
}) {
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
            <Text style={styles.planPillText}>Creator</Text>
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
  return (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function FolderCard({ folder }: { folder: VaultFolder }) {
  return (
    <View style={styles.cardItem}>
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
    </View>
  );
}

function UploadCard({ item }: { item: UploadItem }) {
  return (
    <View style={styles.cardItem}>
      <View style={styles.trackArt}>
        {item.artworkUrl ? (
          <Image source={{ uri: item.artworkUrl }} style={styles.trackArtImage} />
        ) : (
          <Music size={28} color="rgba(255,255,255,0.65)" />
        )}
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Untitled Track'}</Text>
      <Text style={styles.cardMeta} numberOfLines={1}>{item.artist || 'JJ Gospel'}</Text>
      <Text style={styles.cardMeta}>Upload {formatDate(item.createdAt)}</Text>
    </View>
  );
}

function formatDate(date?: any) {
  if (!date) return '20/09/2025';
  const parsed = typeof date?.toDate === 'function' ? date.toDate() : new Date(date);
  if (Number.isNaN(parsed.getTime())) return '20/09/2025';

  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

const styles = StyleSheet.create({
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
});
