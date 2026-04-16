import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { notifyError } from '@/utils/notify';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Link2, Music4, Save, Share2 } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type VaultTrack = {
  id: string;
  title?: string;
  artist?: string;
  description?: string;
  artworkUrl?: string;
  coverUrl?: string;
  audioUrl?: string;
  folderId?: string | null;
};

type FolderOption = {
  id: string;
  name: string;
};

function useVaultTrackStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function VaultTrackManageScreen() {
  const appTheme = useAppTheme();
  const styles = useVaultTrackStyles();
  const placeholderColor = appTheme.colors.textPlaceholder;

  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToastStore();
  const [track, setTrack] = useState<VaultTrack | null>(null);
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!auth.currentUser || !id) return;

    const unsubTrack = onSnapshot(doc(db, `users/${auth.currentUser.uid}/uploads/${id}`), (snapshot) => {
      if (!snapshot.exists()) return;
      const data = { id: snapshot.id, ...snapshot.data() } as VaultTrack;
      setTrack(data);
      setTitle(String(data.title || ''));
      setArtist(String(data.artist || ''));
      setDescription(String(data.description || ''));
      setFolderId(String(data.folderId || ''));
    });

    getDocs(query(collection(db, `users/${auth.currentUser.uid}/folders`), orderBy('createdAt', 'desc')))
      .then((snapshot) => setFolders(snapshot.docs.map((item) => ({ id: item.id, name: String(item.data().name || 'Untitled Folder') }))))
      .catch((error) => notifyError('Failed to load folders for vault track', error));

    return () => unsubTrack();
  }, [id]);

  const shareUrl = useMemo(() => {
    if (!auth.currentUser || !id) return '';
    return `https://shoout.app/vault/${auth.currentUser.uid}/track/${id}`;
  }, [id]);

  const persistShareLink = async () => {
    if (!auth.currentUser || !id || !track) return;
    await setDoc(doc(db, `users/${auth.currentUser.uid}/vaultShares/${id}`), {
      title: track.title || 'Private track',
      url: shareUrl,
      type: 'track',
      trackId: id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      source: 'vault-track-manage',
    }, { merge: true });
  };

  const handleSave = async () => {
    if (!auth.currentUser || !id) return;
    if (!title.trim()) {
      showToast('Track title cannot be empty.', 'error');
      return;
    }

    try {
      setSaving(true);
      const nextArtist = artist.trim() || auth.currentUser.displayName || 'Creator';
      const payload = {
        title: title.trim(),
        artist: nextArtist,
        description: description.trim(),
        folderId: folderId || null,
        updatedAt: serverTimestamp(),
        source: 'vault-track-manage',
      };

      await updateDoc(doc(db, `users/${auth.currentUser.uid}/uploads/${id}`), payload);

      if (folderId) {
        await setDoc(doc(db, `users/${auth.currentUser.uid}/folders/${folderId}/tracks/${id}`), {
          uploadId: id,
          uploaderId: auth.currentUser.uid,
          title: title.trim(),
          artist: nextArtist,
          artworkUrl: track?.artworkUrl || track?.coverUrl || null,
          audioUrl: track?.audioUrl || null,
          addedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          source: 'vault-track-manage',
        }, { merge: true });
      }

      showToast('Vault track updated.', 'success');
    } catch (error) {
      notifyError('Failed to update vault track', error);
      showToast('Could not update this track.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      await persistShareLink();
      await Share.share({
        message: `${track?.title || 'Private track'}\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
      notifyError('Vault share failed', error);
      showToast('Could not share this track.', 'error');
    }
  };

  return (
    <SafeScreenWrapper>
      <View style={styles.screen}>
        <SettingsHeader title="Manage Track" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            {track?.artworkUrl || track?.coverUrl ? (
              <Image source={{ uri: track.artworkUrl || track.coverUrl || '' }} style={styles.artwork} contentFit="cover" />
            ) : (
              <View style={styles.artworkPlaceholder}>
                <Music4 size={30} color="#EC5C39" />
              </View>
            )}
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>{track?.title || 'Untitled Track'}</Text>
              <Text style={styles.heroSubtitle}>Private vault upload</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Track title" placeholderTextColor={placeholderColor} />
            <Text style={styles.label}>Artist</Text>
            <TextInput value={artist} onChangeText={setArtist} style={styles.input} placeholder="Artist" placeholderTextColor={placeholderColor} />
            <Text style={styles.label}>Notes</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.textArea]}
              placeholder="What changed, versions, notes..."
              placeholderTextColor={placeholderColor}
              multiline
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Folder</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderChips}>
              <TouchableOpacity style={[styles.folderChip, !folderId && styles.folderChipActive]} onPress={() => setFolderId('')} activeOpacity={0.85}>
                <Text style={[styles.folderChipText, !folderId && styles.folderChipTextActive]}>No folder</Text>
              </TouchableOpacity>
              {folders.map((folder) => (
                <TouchableOpacity key={folder.id} style={[styles.folderChip, folderId === folder.id && styles.folderChipActive]} onPress={() => setFolderId(folder.id)} activeOpacity={0.85}>
                  <Text style={[styles.folderChipText, folderId === folder.id && styles.folderChipTextActive]}>{folder.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Private link</Text>
            <View style={styles.linkCard}>
              <Link2 size={18} color={appTheme.colors.primary} />
              <Text style={styles.linkText} numberOfLines={2}>{shareUrl}</Text>
            </View>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.9}>
              <Share2 size={18} color={appTheme.colors.textPrimary} />
              <Text style={styles.shareButtonText}>Share Link</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving} activeOpacity={0.9}>
            <Save size={18} color={appTheme.colors.textPrimary} />
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#1A1A1B',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  artwork: {
    width: 72,
    height: 72,
    borderRadius: 18,
  },
  artworkPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: 'rgba(236,92,57,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.58)',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    marginTop: 3,
  },
  section: {
    backgroundColor: '#1A1A1B',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
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
    minHeight: 96,
    textAlignVertical: 'top',
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
  linkCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(236,92,57,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(236,92,57,0.2)',
    padding: 14,
  },
  linkText: {
    flex: 1,
    color: '#EC5C39',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  shareButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  saveButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  saveButtonDisabled: {
    opacity: 0.55,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    fontSize: 15,
  },
};
