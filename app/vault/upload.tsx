import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { Icon } from '@/components/ui/Icon';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useVaultWorkspaceData } from '@/hooks/useVaultWorkspaceData';
import { useToastStore } from '@/store/useToastStore';
import { useUserStore } from '@/store/useUserStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { notifyError, notifyWarning } from '@/utils/notify';
import { ROUTES } from '@/utils/routes';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { app, auth, db, storage } from '../../firebaseConfig';
type FolderOption = {
  id: string;
  name: string;
};

async function uploadFileFromUri(uri: string, path: string, metadata?: Record<string, string>) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, metadata ? { customMetadata: metadata } : undefined);
  return getDownloadURL(storageRef);
}

function useVaultUploadStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function VaultUploadScreen() {
  const appTheme = useAppTheme();
  const styles = useVaultUploadStyles();
  const placeholderColor = appTheme.colors.textPlaceholder;

  const router = useRouter();
  const { showToast } = useToastStore();
  const { uploads, usedStorageGB } = useVaultWorkspaceData();
  const { storageLimitGB, maxVaultUploads, canUploadToVault } = useUserStore((state) => state);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState('');
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [folderName, setFolderName] = useState('');
  const [audioFile, setAudioFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [artworkFile, setArtworkFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const uploadLimitReached = maxVaultUploads > 0 && uploads.length >= maxVaultUploads;
  const storageLimitReached = storageLimitGB > 0 && usedStorageGB >= storageLimitGB;
  const selectedFolderName = useMemo(
    () => folders.find((item) => item.id === folderId)?.name || 'No folder selected',
    [folderId, folders]
  );

  useEffect(() => {
    const loadFolders = async () => {
      if (!auth.currentUser) return;
      const snapshot = await getDocs(
        query(collection(db, `users/${auth.currentUser.uid}/folders`), orderBy('createdAt', 'desc'))
      );
      setFolders(snapshot.docs.map((item) => ({ id: item.id, name: String(item.data().name || 'Untitled Folder') })));
    };
    loadFolders().catch((error) => notifyError('Failed to load folders for vault upload', error));
  }, []);

  const handlePickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    setAudioFile(asset);
    if (!title) {
      setTitle(String(asset.name || 'Untitled Track').replace(/\.[^/.]+$/, ''));
    }
  };

  const handlePickArtwork = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
    if (result.canceled) return;
    setArtworkFile(result.assets[0]);
  };

  const handleCreateFolder = async () => {
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
      const created = await addDoc(collection(db, `users/${auth.currentUser.uid}/folders`), {
        name: cleanName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        itemCount: 0,
        source: 'vault-upload',
      });
      const next = { id: created.id, name: cleanName };
      setFolders((prev) => [next, ...prev]);
      setFolderId(created.id);
      setFolderName('');
      showToast('Folder created.', 'success');
    } catch (error) {
      notifyError('Create folder from vault upload failed', error);
      showToast('Could not create folder.', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) {
      showToast('Please sign in again to upload.', 'error');
      return;
    }
    if (!canUploadToVault) {
      showToast('Your plan cannot upload to Vault.', 'error');
      return;
    }
    if (uploadLimitReached) {
      showToast('Vault upload limit reached. Upgrade for more uploads.', 'info');
      router.push(ROUTES.settings.subscriptions as any);
      return;
    }
    if (storageLimitReached) {
      showToast('Vault storage is full. Upgrade for more space.', 'info');
      router.push(ROUTES.settings.subscriptions as any);
      return;
    }
    if (!title.trim()) {
      showToast('Enter a track title.', 'error');
      return;
    }
    if (!audioFile?.uri) {
      showToast('Pick an audio file to upload.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (audioFile?.size && Platform.OS !== 'web') {
        try {
          const functions = getFunctions(app);
          const validateStorageLimitFn = httpsCallable(functions, 'validateStorageLimit');
          await validateStorageLimitFn({ fileSizeBytes: audioFile.size, storageLedger: 'vault' });
        } catch (error: any) {
          notifyWarning('validateStorageLimit failed for vault upload', error?.message);
          if (error?.code === 'functions/resource-exhausted' || error?.code === 'resource-exhausted') {
            showToast('Vault storage limit exceeded. Please upgrade your plan.', 'error');
            return;
          }
        }
      }

      const safeName = `${Date.now()}_${String(audioFile.name || 'vault-track').replace(/\s+/g, '_')}`;
      const audioUrl = await uploadFileFromUri(audioFile.uri, `vaults/${auth.currentUser.uid}/${safeName}`, { storageLedger: 'vault' });
      let artworkUrl: string | null = null;

      if (artworkFile?.uri) {
        const safeArtworkName = `${Date.now()}_${String(artworkFile.name || 'vault-cover').replace(/\s+/g, '_')}`;
        artworkUrl = await uploadFileFromUri(artworkFile.uri, `vaults/${auth.currentUser.uid}/covers/${safeArtworkName}`);
      }

      const uploadDoc = await addDoc(collection(db, `users/${auth.currentUser.uid}/uploads`), {
        title: title.trim(),
        artist: artist.trim() || auth.currentUser.displayName || 'Creator',
        uploaderName: auth.currentUser.displayName || 'Creator',
        description: description.trim(),
        audioUrl,
        artworkUrl,
        coverUrl: artworkUrl,
        fileName: audioFile.name || null,
        fileSizeBytes: Number(audioFile.size || 0),
        storageLedger: 'vault',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        folderId: folderId || null,
        isPublic: false,
        published: false,
        lifecycleStatus: 'vault_private',
        source: 'vault-upload',
      });

      if (folderId) {
        await setDoc(doc(db, `users/${auth.currentUser.uid}/folders/${folderId}/tracks/${uploadDoc.id}`), {
          uploadId: uploadDoc.id,
          uploaderId: auth.currentUser.uid,
          title: title.trim(),
          artist: artist.trim() || auth.currentUser.displayName || 'Creator',
          artworkUrl,
          audioUrl,
          addedAt: serverTimestamp(),
          source: 'vault-upload',
        }, { merge: true });

        await setDoc(doc(db, `users/${auth.currentUser.uid}/folders/${folderId}`), {
          updatedAt: serverTimestamp(),
          artworkUrl: artworkUrl || null,
        }, { merge: true });
      }

      showToast('Track uploaded to Vault.', 'success');
      router.replace({ pathname: '/vault/track/[id]', params: { id: uploadDoc.id } } as any);
    } catch (error: any) {
      notifyError('Vault upload failed', error);
      if (error?.code === 'storage/unauthorized') {
        showToast(
          'Upload blocked by Firebase Storage rules. Confirm you are signed in, deploy the latest storage.rules, and retry.',
          'error'
        );
        return;
      }
      showToast('Upload failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeScreenWrapper>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <SettingsHeader title="Vault Upload" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Upload privately to your Vault</Text>
            <Text style={styles.heroSubtitle}>No pricing, no marketplace publishing. Just your tracks, folders, and shareable private links.</Text>
            <Text style={styles.heroMeta}>Storage used: {usedStorageGB.toFixed(2)}GB / {storageLimitGB.toFixed(2)}GB</Text>
            <Text style={styles.heroMeta}>Uploads used: {uploads.length} / {maxVaultUploads}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Track file</Text>
            <TouchableOpacity style={styles.fileBox} onPress={handlePickAudio} activeOpacity={0.85}>
              <View style={styles.fileIcon}>
                <Icon name="music" size={22} color="#EC5C39" />
              </View>
              <View style={styles.fileInfo}>
                <Text style={styles.fileTitle}>{audioFile?.name || 'Choose audio file'}</Text>
                <Text style={styles.fileSubtitle}>MP3, WAV, M4A and other supported audio formats</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Artwork</Text>
            <TouchableOpacity style={styles.artworkCard} onPress={handlePickArtwork} activeOpacity={0.85}>
              {artworkFile?.uri ? (
                <Image source={{ uri: artworkFile.uri }} style={styles.artworkPreview} contentFit="cover" />
              ) : (
                <View style={styles.artworkPlaceholder}>
                  <Icon name="upload-cloud" size={28} color="#EC5C39" />
                  <Text style={styles.artworkText}>Add optional cover art</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Track details</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="Track title" placeholderTextColor={placeholderColor} style={styles.input} />
            <TextInput value={artist} onChangeText={setArtist} placeholder="Artist name" placeholderTextColor={placeholderColor} style={styles.input} />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Notes about this upload"
              placeholderTextColor={placeholderColor}
              style={[styles.input, styles.textArea]}
              multiline
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Folder</Text>
            <View style={styles.folderSummary}>
              <Text style={styles.folderSummaryLabel}>Selected folder</Text>
              <Text style={styles.folderSummaryValue}>{selectedFolderName}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderChips}>
              <TouchableOpacity
                style={[styles.folderChip, !folderId && styles.folderChipActive]}
                onPress={() => setFolderId('')}
                activeOpacity={0.85}
              >
                <Text style={[styles.folderChipText, !folderId && styles.folderChipTextActive]}>No folder</Text>
              </TouchableOpacity>
              {folders.map((folder) => (
                <TouchableOpacity
                  key={folder.id}
                  style={[styles.folderChip, folderId === folder.id && styles.folderChipActive]}
                  onPress={() => setFolderId(folder.id)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.folderChipText, folderId === folder.id && styles.folderChipTextActive]}>{folder.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.inlineCreateRow}>
              <TextInput value={folderName} onChangeText={setFolderName} placeholder="Create new folder" placeholderTextColor={placeholderColor} style={[styles.input, styles.inlineInput]} />
              <TouchableOpacity style={styles.inlineButton} onPress={handleCreateFolder} activeOpacity={0.9}>
                <Icon name="folder-plus" size={16} color={appTheme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (submitting || uploadLimitReached || storageLimitReached) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || uploadLimitReached || storageLimitReached}
            activeOpacity={0.9}
          >
            {submitting ? <ActivityIndicator color={appTheme.colors.textPrimary} /> : <Icon name="upload-cloud" size={18} color={appTheme.colors.textPrimary} />}
            <Text style={styles.submitButtonText}>{submitting ? 'Uploading...' : 'Upload to Vault'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreenWrapper>
  );
}

const legacyStyles = {
  screen: {
    flex: 1,
    backgroundColor: '#140F10',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
    gap: 18,
  },
  heroCard: {
    backgroundColor: '#1A1A1B',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    fontSize: 22,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  heroMeta: {
    color: '#F8B6A7',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  section: {
    backgroundColor: '#1A1A1B',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
  },
  fileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(236,92,57,0.06)',
    borderRadius: 18,
    padding: 16,
  },
  fileIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(236,92,57,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  fileSubtitle: {
    color: 'rgba(255,255,255,0.52)',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  artworkCard: {
    height: 180,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  artworkPreview: {
    width: '100%',
    height: '100%',
  },
  artworkPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  artworkText: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  folderSummary: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  folderSummaryLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  folderSummaryValue: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  folderChips: {
    gap: 10,
  },
  folderChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  folderChipActive: {
    backgroundColor: 'rgba(236,92,57,0.16)',
    borderColor: 'rgba(236,92,57,0.32)',
  },
  folderChipText: {
    color: 'rgba(255,255,255,0.66)',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
  },
  folderChipTextActive: {
    color: '#EC5C39',
  },
  inlineCreateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inlineInput: {
    flex: 1,
  },
  inlineButton: {
    width: 52,
    borderRadius: 14,
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    marginTop: 6,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    fontSize: 15,
  },
};
