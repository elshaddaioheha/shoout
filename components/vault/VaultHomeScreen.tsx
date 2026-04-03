import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SharedHeader from '@/components/SharedHeader';
import { useVaultWorkspaceData } from '@/hooks/useVaultWorkspaceData';
import { useToastStore } from '@/store/useToastStore';
import { useUserStore } from '@/store/useUserStore';
import { formatPlanLabel } from '@/utils/subscriptions';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Archive, FolderPlus, Link2, Music4, RefreshCw, Share2, UploadCloud } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '@/firebaseConfig';

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

export default function VaultHomeScreen() {
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
    canShareVaultLinks,
  } = useUserStore((state) => state);
  const { uploads, folders, shareLinks, recentActivities, usedStorageGB, loading } = useVaultWorkspaceData();
  const [showCreateFolderSheet, setShowCreateFolderSheet] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  const currentPlanLabel = formatPlanLabel(actualRole || role);
  const storageSummary = `${formatStorage(usedStorageGB)} / ${formatStorage(storageLimitGB)}`;
  const uploadSummary = `${uploads.length} / ${maxVaultUploads}`;
  const uploadLimitReached = maxVaultUploads > 0 && uploads.length >= maxVaultUploads;
  const storageLimitReached = storageLimitGB > 0 && usedStorageGB >= storageLimitGB;
  const vaultIsEmpty = uploads.length === 0 && folders.length === 0 && shareLinks.length === 0;

  const quickActions = useMemo(() => ([
    {
      key: 'upload',
      label: 'Upload Track',
      icon: UploadCloud,
      onPress: () => {
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
      },
    },
    {
      key: 'folder',
      label: 'Create Folder',
      icon: FolderPlus,
      onPress: () => setShowCreateFolderSheet(true),
    },
    {
      key: 'links',
      label: 'Share Link',
      icon: Share2,
      onPress: () => {
        if (!canShareVaultLinks) {
          showToast('Upgrade your plan to share Vault links.', 'info');
          router.push('/settings/subscriptions' as any);
          return;
        }
        router.push('/vault/links' as any);
      },
    },
    {
      key: 'updates',
      label: 'Updates',
      icon: RefreshCw,
      onPress: () => router.push('/vault/updates' as any),
    },
  ]), [canShareVaultLinks, canUploadToVault, router, showToast, storageLimitReached, uploadLimitReached]);

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
      console.error('Create vault folder failed:', error);
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
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroEyebrow}>Vault Workspace</Text>
              <Text style={styles.heroTitle}>Your private uploads, folders, and share links</Text>
            </View>
            <View style={styles.planPill}>
              <Text style={styles.planPillText}>{currentPlanLabel}</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Storage</Text>
              <Text style={styles.statValue}>{storageSummary}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Uploads</Text>
              <Text style={styles.statValue}>{uploadSummary}</Text>
            </View>
          </View>
          {(uploadLimitReached || storageLimitReached) ? (
            <Text style={styles.limitWarning}>
              {uploadLimitReached ? 'Upload limit reached.' : 'Storage limit reached.'} Upgrade to Vault Pro for more room.
            </Text>
          ) : null}
        </View>

        <View style={styles.actionGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity key={action.key} style={styles.actionCard} onPress={action.onPress} activeOpacity={0.85}>
              <View style={styles.actionIconWrap}>
                <action.icon size={20} color="#EC5C39" />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {vaultIsEmpty ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Archive size={44} color="#EC5C39" />
            </View>
            <Text style={styles.emptyTitle}>Start building your Vault</Text>
            <Text style={styles.emptySubtitle}>
              Upload tracks, organize them into folders, create private links, and keep track of recent updates from one place.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/vault/upload' as any)} activeOpacity={0.9}>
              <Text style={styles.emptyButtonText}>Upload First Track</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <SectionHeader title="Recent Uploads" actionLabel={uploads.length > 0 ? 'View all' : undefined} onPress={() => router.push('/vault/updates' as any)} />
        <View style={styles.sectionCard}>
          {loading ? <Text style={styles.placeholderText}>Loading uploads...</Text> : null}
          {!loading && uploads.length === 0 ? <Text style={styles.placeholderText}>No private uploads yet.</Text> : null}
          {!loading && uploads.slice(0, 5).map((upload) => (
            <TouchableOpacity
              key={upload.id}
              style={styles.listRow}
              onPress={() => router.push({ pathname: '/vault/track/[id]', params: { id: upload.id } } as any)}
              activeOpacity={0.8}
            >
              <View style={styles.rowIconWrap}>
                <Music4 size={18} color="#EC5C39" />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle} numberOfLines={1}>{upload.title || 'Untitled Track'}</Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>{upload.artist || upload.uploaderName || 'Private vault track'}</Text>
              </View>
              <Text style={styles.rowMeta}>{formatRelative(new Date(upload.updatedAt?.toDate?.() || upload.createdAt?.toDate?.() || Date.now()).getTime())}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title="Folders" actionLabel={folders.length > 0 ? 'Create' : undefined} onPress={() => setShowCreateFolderSheet(true)} />
        <View style={styles.sectionCard}>
          {folders.length === 0 ? <Text style={styles.placeholderText}>No folders yet. Create one to organize your uploads.</Text> : null}
          {folders.slice(0, 5).map((folder) => (
            <TouchableOpacity
              key={folder.id}
              style={styles.listRow}
              onPress={() => router.push({ pathname: '/vault/folder/[id]', params: { id: folder.id, name: folder.name } } as any)}
              activeOpacity={0.8}
            >
              <View style={styles.rowIconWrap}>
                <FolderPlus size={18} color="#EC5C39" />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle} numberOfLines={1}>{folder.name}</Text>
                <Text style={styles.rowSubtitle}>{Number(folder.itemCount || 0)} item{Number(folder.itemCount || 0) === 1 ? '' : 's'}</Text>
              </View>
              <Text style={styles.rowMeta}>{formatRelative(new Date(folder.updatedAt?.toDate?.() || folder.createdAt?.toDate?.() || Date.now()).getTime())}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title="Shared Links" actionLabel={shareLinks.length > 0 ? 'Manage' : undefined} onPress={() => router.push('/vault/links' as any)} />
        <View style={styles.sectionCard}>
          {shareLinks.length === 0 ? <Text style={styles.placeholderText}>No private share links yet.</Text> : null}
          {shareLinks.slice(0, 4).map((link) => (
            <TouchableOpacity key={link.id} style={styles.listRow} onPress={() => router.push('/vault/links' as any)} activeOpacity={0.8}>
              <View style={styles.rowIconWrap}>
                <Link2 size={18} color="#EC5C39" />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle} numberOfLines={1}>{link.title || 'Private link'}</Text>
                <Text style={styles.rowSubtitle}>{link.type === 'folder' ? 'Folder link' : 'Track link'}</Text>
              </View>
              <Text style={styles.rowMeta}>{formatRelative(new Date(link.updatedAt?.toDate?.() || link.createdAt?.toDate?.() || Date.now()).getTime())}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title="Recent Updates" actionLabel={recentActivities.length > 0 ? 'Open' : undefined} onPress={() => router.push('/vault/updates' as any)} />
        <View style={styles.sectionCard}>
          {recentActivities.length === 0 ? <Text style={styles.placeholderText}>Vault updates will appear here as you upload, edit, and share.</Text> : null}
          {recentActivities.slice(0, 5).map((item) => (
            <TouchableOpacity key={item.id} style={styles.listRow} onPress={() => router.push('/vault/updates' as any)} activeOpacity={0.8}>
              <View style={styles.rowIconWrap}>
                <RefreshCw size={18} color="#EC5C39" />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.rowSubtitle} numberOfLines={1}>{item.subtitle}</Text>
              </View>
              <Text style={styles.rowMeta}>{formatRelative(item.createdAtMs)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal visible={showCreateFolderSheet} transparent animationType="slide" onRequestClose={() => setShowCreateFolderSheet(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Folder</Text>
            <Text style={styles.modalSubtitle}>Give this folder a name so your uploads stay organized.</Text>
            <TextInput
              value={folderName}
              onChangeText={setFolderName}
              placeholder="Folder name"
              placeholderTextColor="rgba(255,255,255,0.35)"
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
    </View>
  );
}

function SectionHeader({ title, actionLabel, onPress }: { title: string; actionLabel?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onPress ? (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#140F10',
  },
  content: {
    paddingHorizontal: 20,
    gap: 18,
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
  statLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  statValue: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  limitWarning: {
    color: '#F8B6A7',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '47%',
    backgroundColor: '#1A1A1B',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(236,92,57,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
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
    color: 'rgba(255,255,255,0.62)',
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
  sectionCard: {
    backgroundColor: '#1A1A1B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 6,
    overflow: 'hidden',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.5)',
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
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 12,
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
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    marginTop: 2,
  },
  rowMeta: {
    color: 'rgba(255,255,255,0.42)',
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalCard: {
    backgroundColor: '#1A1516',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 12,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.58)',
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
});
