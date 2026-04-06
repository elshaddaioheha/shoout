import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useVaultWorkspaceData } from '@/hooks/useVaultWorkspaceData';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { useRouter } from 'expo-router';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Link2, Share2 } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function useVaultLinksStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function VaultLinksScreen() {
  const appTheme = useAppTheme();
  const styles = useVaultLinksStyles();

  const router = useRouter();
  const { showToast } = useToastStore();
  const { uploads, shareLinks } = useVaultWorkspaceData();

  const createLinkForUpload = async (upload: { id: string; title?: string }) => {
    if (!auth.currentUser) return;
    const url = `https://shoout.app/vault/${auth.currentUser.uid}/track/${upload.id}`;
    try {
      await setDoc(doc(db, `users/${auth.currentUser.uid}/vaultShares/${upload.id}`), {
        title: upload.title || 'Private track',
        url,
        type: 'track',
        trackId: upload.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        source: 'vault-links',
      }, { merge: true });
      await Share.share({
        message: `${upload.title || 'Private track'}\n${url}`,
        url,
      });
    } catch (error) {
      console.error('Failed to create vault link:', error);
      showToast('Could not create share link.', 'error');
    }
  };

  return (
    <SafeScreenWrapper>
      <View style={styles.screen}>
        <SettingsHeader title="Shared Links" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Private sharing from Vault</Text>
            <Text style={styles.heroSubtitle}>Generate and resend private links for your uploads without exposing them to the marketplace.</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Existing Links</Text>
            {shareLinks.length === 0 ? <Text style={styles.placeholderText}>No private links generated yet.</Text> : null}
            {shareLinks.map((link) => (
              <TouchableOpacity key={link.id} style={styles.row} activeOpacity={0.85}>
                <View style={styles.rowIcon}>
                  <Link2 size={18} color={appTheme.colors.primary} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{link.title || 'Private link'}</Text>
                  <Text style={styles.rowSubtitle} numberOfLines={2}>{link.url || ''}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Create Link</Text>
            {uploads.length === 0 ? <Text style={styles.placeholderText}>Upload a track first to generate a private link.</Text> : null}
            {uploads.map((upload) => (
              <TouchableOpacity key={upload.id} style={styles.row} onPress={() => createLinkForUpload(upload)} activeOpacity={0.85}>
                <View style={styles.rowIcon}>
                  <Share2 size={18} color={appTheme.colors.primary} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{upload.title || 'Untitled Track'}</Text>
                  <Text style={styles.rowSubtitle}>Create or resend private link</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeScreenWrapper>
  );
}

const legacyStyles = {
  screen: { flex: 1, backgroundColor: '#140F10' },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40, gap: 18 },
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
    fontSize: 21,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: '#1A1A1B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 6,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  rowIcon: {
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
};
