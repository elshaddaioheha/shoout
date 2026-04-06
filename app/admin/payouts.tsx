import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';

function usePayoutLedgerStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

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
  const appTheme = useAppTheme();
  const styles = usePayoutLedgerStyles();

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
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
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
    color: 'rgba(255,255,255,0.7)',
  },
  list: {
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#1E1A1B',
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
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
};
