import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useToastStore } from '@/store/useToastStore';
import { notifyError } from '@/utils/notify';
import { useUserStore } from '@/store/useUserStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Icon } from '@/components/ui/Icon';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db, storage } from '../../firebaseConfig';

async function uploadFileFromUri(uri: string, path: string, metadata?: Record<string, string>) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, metadata ? { customMetadata: metadata } : undefined);
  return getDownloadURL(storageRef);
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function useRecordStyles() {
  const appTheme = useAppTheme();
  return useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function VaultRecordScreen() {
  const styles = useRecordStyles();
  const router = useRouter();
  const { showToast } = useToastStore();
  const { canUploadToVault } = useUserStore((state) => state);

  const [title, setTitle] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const startRecording = async () => {
    if (!canUploadToVault) {
      showToast('Upgrade your plan to upload recordings into Vault.', 'info');
      router.push('/settings/subscriptions' as any);
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        showToast('Microphone permission is required.', 'error');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const next = new Audio.Recording();
      await next.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      next.setOnRecordingStatusUpdate((status) => {
        if (!status.isLoaded) return;
        setDurationMs(status.durationMillis || 0);
      });
      await next.startAsync();
      setRecordingUri(null);
      setDurationMs(0);
      setRecording(next);
    } catch (error) {
      notifyError('Start recording failed', error);
      showToast('Could not start recording.', 'error');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri || null);
      setRecording(null);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
    } catch (error) {
      notifyError('Stop recording failed', error);
      showToast('Could not finish recording.', 'error');
    }
  };

  const uploadRecording = async () => {
    if (!auth.currentUser) {
      showToast('Please sign in again.', 'error');
      return;
    }

    if (!recordingUri) {
      showToast('Record audio first.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const trackTitle = title.trim() || `Voice note ${new Date().toLocaleDateString()}`;
      const safeName = `${Date.now()}_recording.m4a`;
      const audioUrl = await uploadFileFromUri(
        recordingUri,
        `vaults/${auth.currentUser.uid}/recordings/${safeName}`,
        { storageLedger: 'vault', source: 'in-app-recording' }
      );

      const uploadDoc = await addDoc(collection(db, `users/${auth.currentUser.uid}/uploads`), {
        title: trackTitle,
        artist: auth.currentUser.displayName || 'Creator',
        uploaderName: auth.currentUser.displayName || 'Creator',
        description: 'Recorded in Shoouts app.',
        audioUrl,
        fileName: safeName,
        fileSizeBytes: 0,
        storageLedger: 'vault',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        folderId: null,
        isPublic: false,
        published: false,
        lifecycleStatus: 'vault_private',
        source: 'vault-record-screen',
      });

      showToast('Recording saved to Vault.', 'success');
      router.replace({ pathname: '/vault/track/[id]', params: { id: uploadDoc.id } } as any);
    } catch (error: any) {
      notifyError('Upload recording failed', error);
      if (error?.code === 'storage/unauthorized') {
        showToast(
          'Upload blocked by Firebase Storage rules. Confirm you are signed in, deploy the latest storage.rules, and retry.',
          'error'
        );
        return;
      }
      showToast('Could not upload recording.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeScreenWrapper>
      <View style={styles.screen}>
        <SettingsHeader title="Record in App" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Capture and store in Vault</Text>
            <Text style={styles.heroSubtitle}>Record inside Shoouts, then save it directly to your private Vault uploads.</Text>
            <Text style={styles.timerText}>{formatDuration(durationMs)}</Text>
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Recording title"
            placeholderTextColor="rgba(255,255,255,0.46)"
            style={styles.input}
          />

          {recording ? (
            <TouchableOpacity style={[styles.actionButton, styles.stopButton]} onPress={stopRecording} activeOpacity={0.9}>
              <Square size={18} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Stop Recording</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionButton} onPress={startRecording} activeOpacity={0.9}>
              <Mic size={18} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Start Recording</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.uploadButton, (!recordingUri || submitting) && styles.actionDisabled]}
            onPress={uploadRecording}
            disabled={!recordingUri || submitting}
            activeOpacity={0.9}
          >
            {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Icon name="upload-cloud" size={18} color="#FFFFFF" />}
            <Text style={styles.actionButtonText}>{submitting ? 'Saving...' : 'Save to Vault'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeScreenWrapper>
  );
}

const legacyStyles = {
  screen: { flex: 1, backgroundColor: '#140F10' },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40, gap: 14 },
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
  timerText: { color: '#EC5C39', fontFamily: 'Poppins-SemiBold', fontSize: 20 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionButton: {
    borderRadius: 14,
    backgroundColor: '#EC5C39',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  stopButton: {
    backgroundColor: '#C74226',
  },
  uploadButton: {
    backgroundColor: '#6A8E3A',
  },
  actionDisabled: { opacity: 0.6 },
  actionButtonText: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', fontSize: 14 },
};
