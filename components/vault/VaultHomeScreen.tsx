import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import ActionSheet from '@/components/ActionSheet';
import SharedHeader from '@/components/SharedHeader';
import VaultFloatingActionMenu from '@/components/vault/VaultFloatingActionMenu';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useVaultWorkspaceData } from '@/hooks/useVaultWorkspaceData';
import { useToastStore } from '@/store/useToastStore';
import { useUserStore } from '@/store/useUserStore';
import { adaptLegacyColor, adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { formatPlanLabel } from '@/utils/subscriptions';
import { notifyError } from '@/utils/notify';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Bell, FolderPlus, Grid3x3, Music4, RefreshCw, Search, Share2, Upload, User, View as ViewIcon } from 'lucide-react-native';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db, storage } from '@/firebaseConfig';

function formatStorage(value: number) {
  return `${value.toFixed(2)}GB`;
}

function formatRelative(createdAtMs: number) {
  if (!createdAtMs) return 'Just now';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - createdAtMs) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

async function uploadFileFromUri(uri: string, path: string, metadata?: Record<string, string>) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, metadata ? { customMetadata: metadata } : undefined);
  return getDownloadURL(storageRef);
}

const SEARCH_SHEET_OFFSET = Math.round(Dimensions.get('window').height * 0.14);

function useVaultHomeStyles() {
  const appTheme = useAppTheme();
  return useMemo(() => {
    const adaptedStyles = adaptLegacyStyles(legacyStyles, appTheme) as any;
    
    // Light mode overrides
    if (!appTheme.isDark) {
      adaptedStyles.modalOverlay = {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(20, 15, 16, 0.32)',
      };
      adaptedStyles.searchBackdrop = {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(20, 15, 16, 0.32)',
      };
      adaptedStyles.modalCard = {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        gap: 12,
      };
      adaptedStyles.searchCard = {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        gap: 12,
        minHeight: 420,
        marginTop: 'auto',
      };
      adaptedStyles.searchResultsWrap = {
        minHeight: 180,
        borderRadius: 18,
        backgroundColor: 'rgba(20, 15, 16, 0.04)',
        borderWidth: 1,
        borderColor: 'rgba(20, 15, 16, 0.12)',
        overflow: 'hidden',
        paddingVertical: 6,
      };
      adaptedStyles.searchResultRow = {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(20, 15, 16, 0.08)',
      };
      adaptedStyles.modalTitle = {
        color: '#171213',
        fontFamily: 'Poppins-Bold',
        fontSize: 20,
      };
      adaptedStyles.modalSubtitle = {
        color: 'rgba(20, 15, 16, 0.68)',
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        lineHeight: 20,
      };
      adaptedStyles.input = {
        backgroundColor: 'rgba(20, 15, 16, 0.06)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(20, 15, 16, 0.12)',
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#171213',
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
      };
      adaptedStyles.modalSecondaryButton = {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(20, 15, 16, 0.14)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
      };
      adaptedStyles.modalSecondaryText = {
        color: '#171213',
        fontFamily: 'Poppins-Medium',
        fontSize: 14,
      };
      adaptedStyles.modalPrimaryButton = {
        flex: 1,
        borderRadius: 14,
        backgroundColor: '#D84A28',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
      };
      adaptedStyles.modalPrimaryText = {
        color: '#FFFFFF',
        fontFamily: 'Poppins-Medium',
        fontSize: 14,
      };
      adaptedStyles.placeholderText = {
        color: 'rgba(20, 15, 16, 0.56)',
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        paddingHorizontal: 16,
        paddingVertical: 14,
      };
    }
    
    return StyleSheet.create(adaptedStyles);
  }, [appTheme]);
}

export default function VaultHomeScreen() {
  const appTheme = useAppTheme();
  const styles = useVaultHomeStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
  const { showToast } = useToastStore();
  const {
    role,
    actualRole,
    storageLimitGB,
    maxVaultUploads,
    canUploadToVault,
  } = useUserStore((state) => state);
  const { uploads, folders, shareLinks, usedStorageGB, loading } = useVaultWorkspaceData();
  const [showCreateFolderSheet, setShowCreateFolderSheet] = useState(false);
  const [showSearchSheet, setShowSearchSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('list');
  const [folderName, setFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [trackMenuVisible, setTrackMenuVisible] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [longPressTrackId, setLongPressTrackId] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const searchOverlayOpacity = useRef(new Animated.Value(0)).current;
  const searchSheetOpacity = useRef(new Animated.Value(0)).current;
  const searchSheetTranslateY = useRef(new Animated.Value(SEARCH_SHEET_OFFSET)).current;
  const iconPrimary = appTheme.colors.textPrimary;
  const placeholderColor = appTheme.colors.textPlaceholder;

  const currentPlanLabel = formatPlanLabel(actualRole || role);
  const isHybridMode = viewMode === 'hybrid';
  const accentColor = isHybridMode ? (appTheme.isDark ? '#E5C158' : '#D4AF37') : '#D84A28';
  const accentTextColor = isHybridMode ? (appTheme.isDark ? '#F4D03F' : '#B8860B') : (appTheme.isDark ? '#EC6B4A' : '#B7331B');
  const accentTint = isHybridMode ? (appTheme.isDark ? 'rgba(244,208,63,0.24)' : 'rgba(212,175,55,0.24)') : (appTheme.isDark ? 'rgba(236,92,57,0.22)' : 'rgba(216,74,40,0.2)');
  const accentSoft = isHybridMode ? (appTheme.isDark ? '#18181B' : '#F9F6ED') : (appTheme.isDark ? 'rgba(236,92,57,0.1)' : '#FFF0E9');
  const actionButtonTextColor = isHybridMode ? (appTheme.isDark ? '#121212' : '#B8860B') : '#FFFFFF';
  const actionSecondaryBackground = isHybridMode ? (appTheme.isDark ? 'rgba(244,208,63,0.1)' : '#F9F6ED') : (appTheme.isDark ? 'rgba(236,92,57,0.14)' : '#FFE6DA');
  const heroSurfaceColor = isHybridMode ? accentSoft : (appTheme.isDark ? '#1D1716' : '#FFF5EF');
  const listSurfaceColor = isHybridMode ? accentSoft : (appTheme.isDark ? '#1A1A1B' : '#FFF9F6');
  const effectiveStorageLimitGB = storageLimitGB > 0 ? storageLimitGB : 0.05;
  const effectiveUploadLimit = maxVaultUploads > 0 ? maxVaultUploads : 50;
  const storageSummary = `${formatStorage(usedStorageGB)}/${formatStorage(effectiveStorageLimitGB)}`;
  const uploadSummary = `${uploads.length}/${effectiveUploadLimit}`;
  const uploadLimitReached = uploads.length >= effectiveUploadLimit;
  const storageLimitReached = usedStorageGB >= effectiveStorageLimitGB;
  const vaultIsEmpty = uploads.length === 0 && folders.length === 0 && shareLinks.length === 0;

  // Long-press handlers for tracks
  const handleTrackPressIn = (trackId: string, track: any) => {
    setSelectedTrack(track);
    longPressTimer.current = setTimeout(() => {
      setLongPressTrackId(trackId);
      setTrackMenuVisible(true);
    }, 500);
  };

  const handleTrackPressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const [folderMenuVisible, setFolderMenuVisible] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [longPressFolderId, setLongPressFolderId] = useState<string | null>(null);
  const folderLongPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleFolderPressIn = (folderId: string, folder: any) => {
    setSelectedFolder(folder);
    folderLongPressTimer.current = setTimeout(() => {
      setLongPressFolderId(folderId);
      setFolderMenuVisible(true);
    }, 500);
  };

  const handleFolderPressOut = () => {
    if (folderLongPressTimer.current) {
      clearTimeout(folderLongPressTimer.current);
      folderLongPressTimer.current = null;
    }
  };

  const handleFolderRename = () => {
    if (!selectedFolder) return;
    // TODO: Open rename dialog
    showToast('Rename folder - feature coming soon', 'info');
  };

  const handleFolderShare = async () => {
    if (!selectedFolder) return;
    try {
      await Share.share({
        message: `Check out my "${selectedFolder.name}" folder on Shoouts Vault`,
        title: selectedFolder.name,
      });
    } catch (error) {
      notifyError('Folder Share', error, 'Could not share folder');
    }
  };

  const handleFolderPin = async () => {
    if (!selectedFolder) return;
    try {
      showToast('Folder pinned to favorites', 'success');
    } catch (error) {
      notifyError('Folder Pin', error, 'Could not pin folder');
    }
  };

  const handleFolderDelete = async () => {
    if (!selectedFolder || !auth.currentUser) return;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, `users/${auth.currentUser.uid}/folders/${selectedFolder.id}`));
      showToast('Folder deleted from Vault', 'success');
    } catch (error) {
      notifyError('Folder Delete', error, 'Could not delete folder');
    }
  };

  const handleTrackShare = async () => {
    if (!selectedTrack) return;
    try {
      const trackUrl = selectedTrack.shareUrl || `${selectedTrack.audioUrl}`;
      await import('react-native').then(({ Share }) => {
        Share.share({
          message: `Check out "${selectedTrack.title}" by ${selectedTrack.artist || selectedTrack.uploaderName} on Shoouts Vault`,
          url: trackUrl,
          title: selectedTrack.title,
        });
      });
    } catch (error) {
      notifyError('Track Share', error, 'Could not share track');
    }
  };

  const handleTrackPin = async () => {
    if (!selectedTrack || !auth.currentUser) return;
    try {
      showToast('Track pinned to favorites', 'success');
    } catch (error) {
      notifyError('Track Pin', error, 'Could not pin track');
    }
  };

  const handleTrackMove = () => {
    if (!selectedTrack) return;
    // This would open a folder picker modal
    showToast('Move track to folder - feature coming soon', 'info');
  };

  const handleTrackDelete = async () => {
    if (!selectedTrack || !auth.currentUser) return;
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, `users/${auth.currentUser.uid}/uploads/${selectedTrack.id}`));
      showToast('Track deleted from Vault', 'success');
    } catch (error) {
      notifyError('Track Delete', error, 'Could not delete track');
    }
  };

  const handleStartUpload = () => {
    if (!canUploadToVault) {
      showToast('Upgrade your plan to upload into Vault.', 'info');
      router.push('/settings/subscriptions' as any);
      return;
    }
    if (uploadLimitReached) {
      showToast('Vault upload limit reached. Upgrade for more uploads.', 'info');
      router.push('/settings/subscriptions' as any);
      return;
    }
    if (storageLimitReached) {
      showToast('Vault storage is full. Upgrade for more space.', 'info');
      router.push('/settings/subscriptions' as any);
      return;
    }
    router.push('/vault/upload' as any);
  };

  const handleUploadFolderFromDevice = async () => {
    if (!auth.currentUser) {
      showToast('Please sign in again to upload a folder.', 'error');
      return;
    }

    if (!canUploadToVault) {
      showToast('Upgrade your plan to upload into Vault.', 'info');
      router.push('/settings/subscriptions' as any);
      return;
    }

    if (uploadLimitReached || storageLimitReached) {
      showToast('You reached your Vault limit. Upgrade for more room.', 'info');
      router.push('/settings/subscriptions' as any);
      return;
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      multiple: true,
      copyToCacheDirectory: true,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const now = Date.now();
    const autoFolderName = `Device Folder ${new Date(now).toLocaleDateString()}`;
    const maxRemainingUploads = Math.max(0, effectiveUploadLimit - uploads.length);
    const selectedAssets = result.assets.slice(0, maxRemainingUploads);

    if (selectedAssets.length === 0) {
      showToast('No upload slots left for this folder.', 'info');
      return;
    }

    try {
      const folderRef = await addDoc(collection(db, `users/${auth.currentUser.uid}/folders`), {
        name: autoFolderName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        itemCount: 0,
        source: 'vault-home-folder-import',
      });

      const bytesCap = effectiveStorageLimitGB * 1024 * 1024 * 1024;
      let bytesLeft = Math.max(0, bytesCap - (usedStorageGB * 1024 * 1024 * 1024));
      let uploadedCount = 0;

      for (const asset of selectedAssets) {
        const fileSize = Number(asset.size || 0);
        if (fileSize > 0 && fileSize > bytesLeft) {
          continue;
        }

        const safeName = `${Date.now()}_${String(asset.name || 'folder-audio').replace(/\s+/g, '_')}`;
        const audioUrl = await uploadFileFromUri(
          asset.uri,
          `vaults/${auth.currentUser.uid}/folder-imports/${folderRef.id}/${safeName}`,
          { storageLedger: 'vault' }
        );

        const title = String(asset.name || 'Untitled Track').replace(/\.[^/.]+$/, '');
        const uploadDoc = await addDoc(collection(db, `users/${auth.currentUser.uid}/uploads`), {
          title,
          artist: auth.currentUser.displayName || 'Creator',
          uploaderName: auth.currentUser.displayName || 'Creator',
          description: 'Imported from a device folder.',
          audioUrl,
          fileName: asset.name || null,
          fileSizeBytes: fileSize,
          storageLedger: 'vault',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          folderId: folderRef.id,
          isPublic: false,
          published: false,
          lifecycleStatus: 'vault_private',
          source: 'vault-home-folder-import',
        });

        await setDoc(doc(db, `users/${auth.currentUser.uid}/folders/${folderRef.id}/tracks/${uploadDoc.id}`), {
          uploadId: uploadDoc.id,
          uploaderId: auth.currentUser.uid,
          title,
          artist: auth.currentUser.displayName || 'Creator',
          audioUrl,
          addedAt: serverTimestamp(),
          source: 'vault-home-folder-import',
        }, { merge: true });

        uploadedCount += 1;
        bytesLeft = Math.max(0, bytesLeft - fileSize);
      }

      await setDoc(doc(db, `users/${auth.currentUser.uid}/folders/${folderRef.id}`), {
        updatedAt: serverTimestamp(),
        itemCount: uploadedCount,
      }, { merge: true });

      if (uploadedCount === 0) {
        showToast('No files were uploaded. Storage limit may be full.', 'info');
        return;
      }

      showToast(`Folder imported with ${uploadedCount} track${uploadedCount === 1 ? '' : 's'}.`, 'success');
    } catch (error) {
      notifyError('Device folder import failed', error);
      showToast('Could not import folder right now.', 'error');
    }
  };

  const openSearchSheet = () => {
    searchOverlayOpacity.setValue(0);
    searchSheetOpacity.setValue(0);
    searchSheetTranslateY.setValue(SEARCH_SHEET_OFFSET);
    setShowSearchSheet(true);

    Animated.parallel([
      Animated.timing(searchOverlayOpacity, {
        toValue: 1,
        duration: 170,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(searchSheetOpacity, {
        toValue: 1,
        duration: 190,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(searchSheetTranslateY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSearchSheet = (onClosed?: () => void) => {
    Animated.parallel([
      Animated.timing(searchOverlayOpacity, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(searchSheetOpacity, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(searchSheetTranslateY, {
        toValue: SEARCH_SHEET_OFFSET,
        duration: 190,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) return;
      setShowSearchSheet(false);
      if (onClosed) onClosed();
    });
  };

  const quickActions = useMemo(() => ([
    ...(!isHybridMode ? [{
      key: 'upload',
      label: 'Upload',
      onPress: handleStartUpload,
    }] : []),
    {
      key: 'convert',
      label: 'Convert',
      onPress: () => router.push('/vault/convert' as any),
    },
    {
      key: 'record',
      label: 'Record',
      onPress: () => router.push('/vault/record' as any),
    },
    {
      key: 'folder',
      label: 'Folder',
      onPress: handleUploadFolderFromDevice,
    },
  ]), [handleStartUpload, handleUploadFolderFromDevice, isHybridMode, router]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    const uploadMatches = uploads
      .filter((upload) =>
        String(upload.title || '').toLowerCase().includes(query) ||
        String(upload.artist || upload.uploaderName || '').toLowerCase().includes(query)
      )
      .slice(0, 4)
      .map((upload) => ({
        id: `upload-${upload.id}`,
        title: upload.title || 'Untitled Track',
        subtitle: upload.artist || upload.uploaderName || 'Private vault track',
        onPress: () => {
          closeSearchSheet(() => {
            router.push({ pathname: '/vault/track/[id]', params: { id: upload.id } } as any);
          });
        },
      }));

    const folderMatches = folders
      .filter((folder) => String(folder.name || '').toLowerCase().includes(query))
      .slice(0, 4)
      .map((folder) => ({
        id: `folder-${folder.id}`,
        title: folder.name,
        subtitle: 'Folder',
        onPress: () => {
          closeSearchSheet(() => {
            router.push({ pathname: '/vault/folder/[id]', params: { id: folder.id, name: folder.name } } as any);
          });
        },
      }));

    const linkMatches = shareLinks
      .filter((link) => String(link.title || '').toLowerCase().includes(query))
      .slice(0, 3)
      .map((link) => ({
        id: `link-${link.id}`,
        title: link.title || 'Private link',
        subtitle: link.type === 'folder' ? 'Folder link' : 'Track link',
        onPress: () => {
          closeSearchSheet(() => {
            router.push('/vault/links' as any);
          });
        },
      }));

    return [...uploadMatches, ...folderMatches, ...linkMatches].slice(0, 8);
  }, [folders, router, searchQuery, shareLinks, uploads]);

  const createFolder = async () => {
    const cleanName = folderName.trim();
    if (!auth.currentUser) {
      showToast('Please sign in again to create a folder.', 'error');
      return;
    }
    if (!cleanName) {
      showToast('Enter a folder name.', 'error');
      return;
    }

    try {
      setCreatingFolder(true);
      await addDoc(collection(db, `users/${auth.currentUser.uid}/folders`), {
        name: cleanName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        itemCount: 0,
        artworkUrl: uploads[0]?.artworkUrl || uploads[0]?.coverUrl || null,
        source: 'vault-home',
      });
      setFolderName('');
      setShowCreateFolderSheet(false);
      showToast('Folder created.', 'success');
    } catch (error) {
      notifyError('Create vault folder failed', error);
      showToast('Could not create folder right now.', 'error');
    } finally {
      setCreatingFolder(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SharedHeader
        viewMode={viewMode}
        isModeSheetOpen={isModeSheetOpen}
        onModePillPress={openSheet}
        showMessages={false}
        showCart={false}
        customRightContent={(
          <View style={styles.vaultHeaderActions}>
            <TouchableOpacity
              style={styles.vaultHeaderButton}
              onPress={() => router.push('/vault/updates' as any)}
              activeOpacity={0.8}
            >
              <Bell size={17} color={iconPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.vaultHeaderButton}
              onPress={openSearchSheet}
              activeOpacity={0.8}
            >
              <Search size={17} color={iconPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.vaultHeaderButton, styles.profileButton]}
              onPress={() => router.push('/(tabs)/more' as any)}
              activeOpacity={0.8}
            >
              <User size={17} color={iconPrimary} />
            </TouchableOpacity>
          </View>
        )}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 168 }]}
      >
        <View style={[styles.heroCard, { borderColor: accentTint, backgroundColor: heroSurfaceColor }]}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTextBlock}>
              <Text style={[styles.heroEyebrow, { color: accentTextColor }]}>Vault Workspace</Text>
              <Text style={styles.heroTitle}>Your private uploads, folders, and share links</Text>
            </View>
            <View style={[styles.planPill, { borderColor: accentTint, backgroundColor: accentSoft }]}> 
              <Text style={[styles.planPillText, { color: accentTextColor }]}>{currentPlanLabel}</Text>
            </View>
          </View>

          {isHybridMode ? (
            <View style={styles.heroActionRow}>
              <TouchableOpacity
                activeOpacity={0.92}
                style={[styles.heroPrimaryAction, { borderColor: accentTint }]}
                onPress={handleStartUpload}
              >
                {appTheme.isDark ? (
                  <LinearGradient
                    colors={['#F4D03F', '#D4AF37']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                ) : null}
                <Upload size={16} color={actionButtonTextColor} />
                <Text style={[styles.heroPrimaryActionText, { color: actionButtonTextColor }]}>Add Upload</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.heroSecondaryAction, { backgroundColor: actionSecondaryBackground, borderColor: accentTint }]}
                onPress={() => router.push('/vault/updates' as any)}
              >
                <RefreshCw size={16} color={accentTextColor} />
                <Text style={[styles.heroSecondaryActionText, { color: accentTextColor }]}>Updates</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.heroSecondaryAction, { backgroundColor: actionSecondaryBackground, borderColor: accentTint }]}
                onPress={() => setShowCreateFolderSheet(true)}
              >
                <FolderPlus size={16} color={accentTextColor} />
                <Text style={[styles.heroSecondaryActionText, { color: accentTextColor }]}>Create Folder</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.statRow}>
            <View style={[styles.statCard, styles.statCardFull]}>
              <Text style={styles.statLabel}>Storage</Text>
              <Text style={styles.statValue}>{storageSummary}</Text>
              <Text style={styles.statMeta}>Uploads: {uploadSummary}</Text>
            </View>
          </View>
          {(uploadLimitReached || storageLimitReached) ? (
            <Text style={[styles.limitWarning, { color: accentTextColor }] }>
              {uploadLimitReached ? 'Upload limit reached.' : 'Storage limit reached.'} Upgrade to Vault Pro for more room.
            </Text>
          ) : null}
        </View>

        {vaultIsEmpty ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: accentSoft }]}>
              <FolderPlus size={44} color={accentTextColor} />
            </View>
            <Text style={styles.emptyTitle}>Start building your Vault</Text>
            <Text style={styles.emptySubtitle}>
              Upload tracks, organize them into folders, create private links, and keep track of recent updates from one place.
            </Text>
            <TouchableOpacity style={[styles.emptyButton, { backgroundColor: accentColor }]} onPress={() => router.push('/vault/upload' as any)} activeOpacity={0.9}>
              <Text style={[styles.emptyButtonText, { color: actionButtonTextColor }]}>Upload First Track</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Vault Items</Text>
          <View style={styles.sectionHeaderActions}>
            <TouchableOpacity onPress={() => router.push('/vault/updates' as any)} activeOpacity={0.8}>
              <Text style={[styles.sectionAction, { color: accentTextColor }]}>Open updates</Text>
            </TouchableOpacity>
            <View style={styles.layoutToggle}>
              <TouchableOpacity
                style={[styles.layoutToggleBtn, layoutMode === 'grid' && styles.layoutToggleBtnActive]}
                activeOpacity={0.8}
                onPress={() => setLayoutMode('grid')}
              >
                <Grid3x3 size={15} color={layoutMode === 'grid' ? accentTextColor : appTheme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.layoutToggleBtn, layoutMode === 'list' && styles.layoutToggleBtnActive]}
                activeOpacity={0.8}
                onPress={() => setLayoutMode('list')}
              >
                <ViewIcon size={15} color={layoutMode === 'list' ? accentTextColor : appTheme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.sectionCard, { borderColor: accentTint, backgroundColor: listSurfaceColor }]}> 
          <View style={styles.sectionBlock}>
            <View style={styles.sectionBlockHeader}>
              <Text style={styles.sectionBlockTitle}>Folders</Text>
              <TouchableOpacity onPress={() => setShowCreateFolderSheet(true)} activeOpacity={0.8}>
                <Text style={[styles.sectionBlockAction, { color: accentTextColor }]}>Create</Text>
              </TouchableOpacity>
            </View>
            {loading ? <Text style={styles.placeholderText}>Loading folders...</Text> : null}
            {!loading && folders.length === 0 ? <Text style={styles.placeholderText}>No folders yet. Create one to keep uploads organized.</Text> : null}
            {!loading && layoutMode === 'list' && folders.slice(0, 6).map((folder) => (
              <TouchableOpacity
                key={folder.id}
                style={[styles.listRow, longPressFolderId === folder.id && styles.listRowActive]}
                onPress={() => !longPressFolderId && router.push({ pathname: '/vault/folder/[id]', params: { id: folder.id, name: folder.name } } as any)}
                onPressIn={() => handleFolderPressIn(folder.id, folder)}
                onPressOut={handleFolderPressOut}
                activeOpacity={0.8}
              >
                <View style={[styles.rowIconWrap, { backgroundColor: accentSoft }]}> 
                  <FolderPlus size={18} color={accentTextColor} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{folder.name}</Text>
                  <Text style={styles.rowSubtitle}>{Number(folder.itemCount || 0)} item{Number(folder.itemCount || 0) === 1 ? '' : 's'}</Text>
                </View>
                <Text style={styles.rowMeta}>{formatRelative(new Date(folder.updatedAt?.toDate?.() || folder.createdAt?.toDate?.() || Date.now()).getTime())}</Text>
              </TouchableOpacity>
            ))}
            {!loading && layoutMode === 'grid' ? (
              <View style={styles.gridWrap}>
                {folders.slice(0, 6).map((folder) => (
                  <TouchableOpacity
                    key={folder.id}
                    style={[styles.gridCard, { backgroundColor: accentSoft }, longPressFolderId === folder.id && styles.gridCardActive]}
                    onPress={() => !longPressFolderId && router.push({ pathname: '/vault/folder/[id]', params: { id: folder.id, name: folder.name } } as any)}
                    onPressIn={() => handleFolderPressIn(folder.id, folder)}
                    onPressOut={handleFolderPressOut}
                    activeOpacity={0.86}
                  >
                    <View style={styles.gridCardIcon}>
                      <FolderPlus size={16} color={accentTextColor} />
                    </View>
                    <Text style={styles.gridCardTitle} numberOfLines={2}>{folder.name}</Text>
                    <Text style={styles.gridCardMeta}>{Number(folder.itemCount || 0)} item{Number(folder.itemCount || 0) === 1 ? '' : 's'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.sectionDivider} />

          <View style={styles.sectionBlock}>
            <View style={styles.sectionBlockHeader}>
              <Text style={styles.sectionBlockTitle}>Uploads</Text>
              {uploads.length > 0 ? (
                <TouchableOpacity onPress={() => router.push('/vault/updates' as any)} activeOpacity={0.8}>
                  <Text style={[styles.sectionBlockAction, { color: accentTextColor }]}>View all</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {loading ? <Text style={styles.placeholderText}>Loading uploads...</Text> : null}
            {!loading && uploads.length === 0 ? <Text style={styles.placeholderText}>No private uploads yet.</Text> : null}
            {!loading && layoutMode === 'list' && uploads.slice(0, 6).map((upload) => (
              <TouchableOpacity
                key={upload.id}
                style={[styles.listRow, longPressTrackId === upload.id && styles.listRowActive]}
                onPress={() => !longPressTrackId && router.push({ pathname: '/vault/track/[id]', params: { id: upload.id } } as any)}
                onPressIn={() => handleTrackPressIn(upload.id, upload)}
                onPressOut={handleTrackPressOut}
                activeOpacity={0.8}
              >
                <View style={[styles.rowIconWrap, { backgroundColor: accentSoft }]}> 
                  <Music4 size={18} color={accentTextColor} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{upload.title || 'Untitled Track'}</Text>
                  <Text style={styles.rowSubtitle} numberOfLines={1}>{upload.artist || upload.uploaderName || 'Private vault track'}</Text>
                </View>
                <Text style={styles.rowMeta}>{formatRelative(new Date(upload.updatedAt?.toDate?.() || upload.createdAt?.toDate?.() || Date.now()).getTime())}</Text>
              </TouchableOpacity>
            ))}
            {!loading && layoutMode === 'grid' ? (
              <View style={styles.gridWrap}>
                {uploads.slice(0, 6).map((upload) => (
                  <TouchableOpacity
                    key={upload.id}
                    style={[styles.gridCard, { backgroundColor: accentSoft }, longPressTrackId === upload.id && styles.gridCardActive]}
                    onPress={() => !longPressTrackId && router.push({ pathname: '/vault/track/[id]', params: { id: upload.id } } as any)}
                    onPressIn={() => handleTrackPressIn(upload.id, upload)}
                    onPressOut={handleTrackPressOut}
                    activeOpacity={0.86}
                  >
                    <View style={styles.gridCardIcon}>
                      <Music4 size={16} color={accentTextColor} />
                    </View>
                    <Text style={styles.gridCardTitle} numberOfLines={2}>{upload.title || 'Untitled Track'}</Text>
                    <Text style={styles.gridCardMeta} numberOfLines={1}>{upload.artist || upload.uploaderName || 'Private vault track'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        </View>

      </ScrollView>

      <VaultFloatingActionMenu actions={quickActions} />

      <ActionSheet
        visible={trackMenuVisible}
        onClose={() => {
          setTrackMenuVisible(false);
          setLongPressTrackId(null);
          setSelectedTrack(null);
        }}
        title={selectedTrack?.title || 'Track Options'}
        options={[
          { label: 'Share', icon: <Share2 size={18} />, onPress: handleTrackShare },
          { label: 'Pin to Favorites', onPress: handleTrackPin },
          { label: 'Move to Folder', onPress: handleTrackMove },
          { label: 'Delete', destructive: true, onPress: handleTrackDelete },
        ]}
      />

      <ActionSheet
        visible={folderMenuVisible}
        onClose={() => {
          setFolderMenuVisible(false);
          setLongPressFolderId(null);
          setSelectedFolder(null);
        }}
        title={selectedFolder?.name || 'Folder Options'}
        options={[
          { label: 'Rename', onPress: handleFolderRename },
          { label: 'Share', icon: <Share2 size={18} />, onPress: handleFolderShare },
          { label: 'Pin to Favorites', onPress: handleFolderPin },
          { label: 'Delete', destructive: true, onPress: handleFolderDelete },
        ]}
      />

      <Modal visible={showCreateFolderSheet} transparent animationType="slide" onRequestClose={() => setShowCreateFolderSheet(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Folder</Text>
            <Text style={styles.modalSubtitle}>Give this folder a name so your uploads stay organized.</Text>
            <TextInput
              value={folderName}
              onChangeText={setFolderName}
              placeholder="Folder name"
              placeholderTextColor={placeholderColor}
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => setShowCreateFolderSheet(false)} activeOpacity={0.85}>
                <Text style={styles.modalSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalPrimaryButton} onPress={createFolder} disabled={creatingFolder} activeOpacity={0.9}>
                <Text style={styles.modalPrimaryText}>{creatingFolder ? 'Creating...' : 'Create Folder'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSearchSheet} transparent animationType="none" onRequestClose={() => closeSearchSheet()}>
        <View style={styles.searchModalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closeSearchSheet()}>
            <Animated.View style={[styles.searchBackdrop, { opacity: searchOverlayOpacity }]} />
          </Pressable>
          <Animated.View
            style={[
              styles.searchCard,
              {
                opacity: searchSheetOpacity,
                transform: [{ translateY: searchSheetTranslateY }],
              },
            ]}
          >
            <Text style={styles.modalTitle}>Search Vault</Text>
            <Text style={styles.modalSubtitle}>Find tracks, folders, and private links inside your Vault.</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search uploads, folders, links..."
              placeholderTextColor={placeholderColor}
              style={styles.input}
              autoFocus
            />
            <View style={styles.searchResultsWrap}>
              {!searchQuery.trim() ? <Text style={styles.placeholderText}>Start typing to search your Vault.</Text> : null}
              {searchQuery.trim() && searchResults.length === 0 ? <Text style={styles.placeholderText}>No matching items found.</Text> : null}
              {searchResults.map((result) => (
                <TouchableOpacity key={result.id} style={styles.searchResultRow} onPress={result.onPress} activeOpacity={0.85}>
                  <View style={styles.rowIconWrap}>
                    <Search size={16} color={adaptLegacyColor('#EC5C39', 'color', appTheme)} />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{result.title}</Text>
                    <Text style={styles.rowSubtitle} numberOfLines={1}>{result.subtitle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondaryButton} onPress={() => closeSearchSheet()} activeOpacity={0.85}>
                <Text style={styles.modalSecondaryText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

function SectionHeader({ title, actionLabel, actionColor, onPress }: { title: string; actionLabel?: string; actionColor?: string; onPress?: () => void }) {
  const styles = useVaultHomeStyles();

  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
          <Text style={[styles.sectionAction, actionColor ? { color: actionColor } : null]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
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
    gap: 18,
  },
  vaultHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vaultHeaderButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroCard: {
    marginTop: 10,
    backgroundColor: '#1A1A1B',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 16,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroTextBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  heroEyebrow: {
    color: '#EC5C39',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    lineHeight: 27,
    flexShrink: 1,
  },
  planPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(236,92,57,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 112,
  },
  planPillText: {
    color: '#EC5C39',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
    textAlign: 'center',
  },
  heroActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroPrimaryAction: {
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  heroPrimaryActionText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
  },
  heroSecondaryAction: {
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroSecondaryActionText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  statCardFull: {
    flex: undefined,
    width: '100%',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.68)',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  statValue: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  statMeta: {
    color: 'rgba(255,255,255,0.66)',
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
  },
  limitWarning: {
    color: '#F8B6A7',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyState: {
    backgroundColor: '#1A1A1B',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    gap: 10,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(236,92,57,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 6,
    backgroundColor: '#EC5C39',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 17,
  },
  sectionAction: {
    color: '#EC5C39',
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
  },
  layoutToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 2,
    gap: 2,
  },
  layoutToggleBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layoutToggleBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sectionCard: {
    backgroundColor: '#1A1A1B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 6,
    overflow: 'hidden',
  },
  sectionBlock: {
    paddingVertical: 2,
  },
  sectionBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  sectionBlockTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  sectionBlockAction: {
    color: '#EC5C39',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 16,
    marginTop: 6,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  gridCard: {
    width: '48%',
    minHeight: 108,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    gap: 8,
  },
  gridCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCardTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },
  gridCardMeta: {
    color: 'rgba(255,255,255,0.66)',
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    lineHeight: 15,
  },
  gridCardActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.64)',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    gap: 12,
  },
  listRowActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
  },
  rowIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(236,92,57,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
  },
  rowSubtitle: {
    color: 'rgba(255,255,255,0.68)',
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    marginTop: 2,
  },
  rowMeta: {
    color: 'rgba(255,255,255,0.56)',
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  searchModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  searchBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  modalCard: {
    backgroundColor: '#1A1516',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 12,
  },
  searchCard: {
    backgroundColor: '#1A1516',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 12,
    minHeight: 420,
    marginTop: 'auto',
  },
  searchResultsWrap: {
    minHeight: 180,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    paddingVertical: 6,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.68)',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalSecondaryButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  modalSecondaryText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
  },
  modalPrimaryButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
};
