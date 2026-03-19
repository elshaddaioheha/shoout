import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { theme } from '@/constants/theme';

type PayoutEntry = {
  id: string;
  creatorId?: string;
  amount?: number;
  platformFee?: number;
  status?: string;
  createdAt?: { seconds: number };
  providerTransferId?: string;
};

export default function PayoutLedgerScreen() {
  const [entries, setEntries] = useState<PayoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const functions = useMemo(() => getFunctions(), []);
  const getLedgerFn = useMemo(() => httpsCallable(functions, 'adminGetPayoutLedger'), [functions]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getLedgerFn({ limit: 25 });
        setEntries(res.data?.entries ?? []);
      } catch (err: any) {
        console.error('Failed to load payout ledger', err);
        setError('Unable to load payout ledger');
      } finally {
        setLoading(false);
      }
    })();
  }, [getLedgerFn]);

  if (loading) {
    return (
      <SafeScreenWrapper>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading payout ledger…</Text>
        </View>
      </SafeScreenWrapper>
    );
  }

  if (error) {
    return (
      <SafeScreenWrapper>
        <View style={styles.container}>
          <Text style={styles.title}>Payout Ledger</Text>
          <Text style={styles.subtitle}>{error}</Text>
        </View>
      </SafeScreenWrapper>
    );
  }

  return (
    <SafeScreenWrapper>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={() => (
          <Text style={styles.title}>Payout Ledger</Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Creator: {item.creatorId ?? 'unknown'}</Text>
            <Text style={styles.cardMeta}>Amount: ₦{item.amount?.toLocaleString() ?? '—'}</Text>
            <Text style={styles.cardMeta}>Status: {item.status ?? 'unknown'}</Text>
            <Text style={styles.cardMeta}>Transfer: {item.providerTransferId ?? '—'}</Text>
          </View>
        )}
      />
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
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  list: {
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
});
