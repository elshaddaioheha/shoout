import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { theme } from '@/constants/theme';

type ComplianceMetrics = {
  pendingReports: number;
  dailyUploads: number;
  dailyTransactions: number;
};

export default function MetricsScreen() {
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
          <ActivityIndicator size="large" color={theme.colors.primary} />
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

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  cardLabel: {
    color: theme.colors.textSecondary,
    marginBottom: 8,
    fontSize: 12,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  note: {
    marginTop: 20,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
});
