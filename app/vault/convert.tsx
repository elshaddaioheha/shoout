import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useToastStore } from '@/store/useToastStore';
import { notifyError } from '@/utils/notify';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Video, WandSparkles } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db, storage } from '../../firebaseConfig';

async function uploadFileFromUri(uri: string, path: string, metadata?: Record<string, string>) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, metadata ? { customMetadata: metadata } : undefined);
  return getDownloadURL(storageRef);
}

function useConvertStyles() {
  const appTheme = useAppTheme();
  return useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function VaultConvertScreen() {
  const styles = useConvertStyles();
  const router = useRouter();
  const { showToast } = useToastStore();

  const [videoFile, setVideoFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickVideo = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'video/*', copyToCacheDirectory: true });
    if (result.canceled) return;
    setVideoFile(result.assets[0]);
  };

  const queueConvertJob = async () => {
    if (!auth.currentUser) {
      showToast('Please sign in again.', 'error');
      return;
    }
    if (!videoFile?.uri) {
      showToast('Choose a video first.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const safeName = `${Date.now()}_${String(videoFile.name || 'video').replace(/\s+/g, '_')}`;
      const sourceUrl = await uploadFileFromUri(
        videoFile.uri,
        `vaults/${auth.currentUser.uid}/conversion-inputs/${safeName}`,
        { sourceType: 'video', requestedOutput: 'mp3' }
      );

      await addDoc(collection(db, `users/${auth.currentUser.uid}/vaultConversions`), {
        sourceFileName: videoFile.name || 'video',
        sourceUrl,
        sourceSizeBytes: Number(videoFile.size || 0),
        requestedOutput: 'mp3',
        status: 'queued',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        source: 'vault-convert-screen',
      });

      showToast('Video queued for MP3 conversion.', 'success');
      router.back();
    } catch (error) {
      notifyError('Queue convert job failed', error);
      showToast('Could not queue conversion right now.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeScreenWrapper>
      <View style={styles.screen}>
        <SettingsHeader title="Convert to MP3" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Video to audio conversion</Text>
            <Text style={styles.heroSubtitle}>Pick a video file and queue it for MP3 conversion in your Vault workspace.</Text>
          </View>

          <TouchableOpacity style={styles.pickCard} onPress={pickVideo} activeOpacity={0.86}>
            <View style={styles.pickIconWrap}>
              <Video size={22} color="#EC5C39" />
            </View>
            <View style={styles.pickInfo}>
              <Text style={styles.pickTitle}>{videoFile?.name || 'Choose video file'}</Text>
              <Text style={styles.pickSubtitle}>Supported video formats from your device.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            disabled={submitting}
            onPress={queueConvertJob}
            activeOpacity={0.9}
          >
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <WandSparkles size={18} color="#FFFFFF" />}
            <Text style={styles.submitText}>{submitting ? 'Queuing...' : 'Queue MP3 Conversion'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeScreenWrapper>
  );
}

const legacyStyles = {
  screen: { flex: 1, backgroundColor: '#140F10' },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40, gap: 16 },
  heroCard: {
    backgroundColor: '#1A1A1B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 18,
    gap: 8,
  },
  heroTitle: { color: '#FFFFFF', fontFamily: 'Poppins-Bold', fontSize: 19 },
  heroSubtitle: { color: 'rgba(255,255,255,0.7)', fontFamily: 'Poppins-Regular', fontSize: 13, lineHeight: 20 },
  pickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1A1A1B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
  },
  pickIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(236,92,57,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickInfo: { flex: 1 },
  pickTitle: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', fontSize: 13 },
  pickSubtitle: { color: 'rgba(255,255,255,0.66)', fontFamily: 'Poppins-Regular', fontSize: 11, marginTop: 2 },
  submitButton: {
    marginTop: 6,
    borderRadius: 14,
    backgroundColor: '#EC5C39',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', fontSize: 14 },
};
