import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { useRouter } from 'expo-router';
import { collection, getDocs, query } from 'firebase/firestore';
import { Download, Music4, RefreshCw } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type DownloadRow = {
  id: string;
  title: string;
  artist: string;
  purchasedAt?: string;
};

function useDownloadsStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function DownloadsScreen() {
  const appTheme = useAppTheme();
  const styles = useDownloadsStyles();

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DownloadRow[]>([]);

  const loadRows = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const purchasesQ = query(collection(db, `users/${uid}/purchases`));
      const snap = await getDocs(purchasesQ);
      const next = snap.docs.map((item) => {
        const data: any = item.data();
        return {
          id: item.id,
          title: String(data.trackTitle || data.title || 'Purchased track'),
          artist: String(data.artist || data.trackArtist || 'Unknown artist'),
          purchasedAt: data.purchasedAt?.toDate?.()?.toLocaleDateString?.() || '',
        } as DownloadRow;
      });
      setRows(next);
    } catch (error) {
      console.error('Failed to load downloads', error);
      Alert.alert('Could not load downloads', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const subtitle = useMemo(() => {
    if (rows.length === 0) return 'No purchased tracks ready for offline download yet.';
    return `${rows.length} track${rows.length === 1 ? '' : 's'} available from your purchases.`;
  }, [rows]);

  return (
    <SafeScreenWrapper>
      <View style={styles.container}>
        <SettingsHeader title="Downloads" onBack={() => router.back()} />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={appTheme.colors.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.heroCard}>
              <View style={styles.heroIconWrap}>
                <Download size={24} color={appTheme.colors.primary} />
              </View>
              <Text style={styles.heroTitle}>Offline Downloads</Text>
              <Text style={styles.heroSub}>{subtitle}</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={loadRows}>
                <RefreshCw size={16} color={appTheme.colors.textPrimary} />
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.listCard}>
              {rows.length === 0 ? (
                <Text style={styles.emptyText}>Buy tracks from marketplace to populate your downloads list.</Text>
              ) : (
                rows.map((row) => (
                  <TouchableOpacity
                    key={row.id}
                    style={styles.row}
                    activeOpacity={0.85}
                    onPress={() => Alert.alert('Download queue', `${row.title} will be available for offline caching in the next update.`)}
                  >
                    <View style={styles.rowIcon}>
                      <Music4 size={16} color={appTheme.colors.primary} />
                    </View>
                    <View style={styles.rowTextWrap}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{row.title}</Text>
                      <Text style={styles.rowSub} numberOfLines={1}>{row.artist}{row.purchasedAt ? ` • ${row.purchasedAt}` : ''}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={{ height: 80 }} />
          </ScrollView>
        )}
      </View>
    </SafeScreenWrapper>
  );
}

const legacyStyles = {
  container: { flex: 1, backgroundColor: '#140F10' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 18,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(236,92,57,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroTitle: { color: '#FFF', fontFamily: 'Poppins-Bold', fontSize: 18 },
  heroSub: { color: 'rgba(255,255,255,0.62)', fontFamily: 'Poppins-Regular', fontSize: 13, marginTop: 6 },
  refreshButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EC5C39',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  refreshText: { color: '#FFF', fontFamily: 'Poppins-SemiBold', fontSize: 12 },
  listCard: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(236,92,57,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: { flex: 1 },
  rowTitle: { color: '#FFF', fontFamily: 'Poppins-SemiBold', fontSize: 13 },
  rowSub: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Poppins-Regular', fontSize: 11, marginTop: 1 },
};
