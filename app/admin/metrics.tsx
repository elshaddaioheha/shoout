import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';

function useMetricsStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

type ComplianceMetrics = {
  pendingReports: number;
  dailyUploads: number;
  dailyTransactions: number;
};

export default function MetricsScreen() {
  const appTheme = useAppTheme();
  const styles = useMetricsStyles();

  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const functions = getFunctions();
        const fn = httpsCallable(functions, 'adminGetComplianceMetrics');
        const res = await fn();
        setMetrics(res.data);
      } catch (err: any) {
        console.error('Failed to load metrics', err);
        setError('Failed to load metrics');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <SafeScreenWrapper>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading metrics…</Text>
        </View>
      </SafeScreenWrapper>
    );
  }

  if (error || !metrics) {
    return (
      <SafeScreenWrapper>
        <View style={styles.container}>
          <Text style={styles.title}>System Health</Text>
          <Text style={styles.subtitle}>{error ?? 'No metrics available.'}</Text>
        </View>
      </SafeScreenWrapper>
    );
  }

  return (
    <SafeScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>System Health</Text>
        <View style={styles.cardRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Pending Reports</Text>
            <Text style={styles.cardValue}>{metrics.pendingReports}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Uploads (24h)</Text>
            <Text style={styles.cardValue}>{metrics.dailyUploads}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Transactions (24h)</Text>
            <Text style={styles.cardValue}>{metrics.dailyTransactions}</Text>
          </View>
        </View>

        <Text style={styles.note}>
          These metrics are calculated via Cloud Functions and may lag by a few minutes.
        </Text>
      </ScrollView>
    </SafeScreenWrapper>
  );
}

const legacyStyles = {
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  container: {
    padding: 16,
    paddingBottom: 120,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#1E1A1B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
    fontSize: 12,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  note: {
    marginTop: 20,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
};
