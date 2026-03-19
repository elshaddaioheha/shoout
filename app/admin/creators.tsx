import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useToastStore } from '@/store/useToastStore';
import { theme } from '@/constants/theme';

type CreatorSummary = {
  id: string;
  name?: string;
  email?: string;
  tier?: string;
  suspendedUntil?: string | null;
  createdAt?: string;
};

type CreatorDetails = CreatorSummary & {
  suspensionReason?: string | null;
  uploadCount?: number;
  recentPayouts?: {
    id: string;
    amount: number;
    status: string;
    createdAt: string | null;
  }[];
};

export default function CreatorsScreen() {
  const [creators, setCreators] = useState<CreatorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<CreatorDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { showToast } = useToastStore();

  const functions = useMemo(() => getFunctions(), []);
  const getCreatorsFn = useMemo(() => httpsCallable(functions, 'adminGetCreators'), [functions]);
  const getDetailsFn = useMemo(() => httpsCallable(functions, 'adminGetCreatorDetails'), [functions]);
  const unsuspendFn = useMemo(() => httpsCallable(functions, 'adminUnsuspendCreator'), [functions]);
  const reconcileFn = useMemo(
    () => httpsCallable(functions, 'adminTriggerPayoutReconciliation'),
    [functions]
  );

  // Load creators on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await getCreatorsFn({ query: '', limit: 50 });
        setCreators(res.data?.creators ?? []);
      } catch (error: any) {
        console.error('Failed to load creators', error);
        showToast('Failed to load creators', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [getCreatorsFn, showToast]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchQuery) {
        return;
      }
      try {
        const res = await getCreatorsFn({ query: searchQuery, limit: 50 });
        setCreators(res.data?.creators ?? []);
      } catch (error: any) {
        console.error('Search failed', error);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, getCreatorsFn]);

  const handleSelectCreator = async (creator: CreatorSummary) => {
    setDetailsLoading(true);
    try {
      const res = await getDetailsFn({ creatorId: creator.id });
      setSelectedCreator(res.data as CreatorDetails);
    } catch (error: any) {
      console.error('Failed to load creator details', error);
      showToast('Failed to load creator details', 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleUnsuspend = async () => {
    if (!selectedCreator) return;
    Alert.alert('Unsuspend Creator', 'Are you sure you want to remove the suspension?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unsuspend',
        style: 'destructive',
        onPress: async () => {
          setIsProcessing(true);
          try {
            await unsuspendFn({
              creatorId: selectedCreator.id,
              reason: 'Unsuspended via admin dashboard',
            });
            showToast('Creator unsuspended', 'success');
            setSelectedCreator({ ...selectedCreator, suspendedUntil: null });
          } catch (error: any) {
            console.error('Failed to unsuspend', error);
            showToast('Failed to unsuspend creator', 'error');
          } finally {
            setIsProcessing(false);
          }
        },
      },
    ]);
  };

  const handleReconcilePayout = async () => {
    if (!selectedCreator) return;
    Alert.alert(
      'Trigger Payout Reconciliation',
      'This will check pending transactions and create a payout entry.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          style: 'default',
          onPress: async () => {
            setIsProcessing(true);
            try {
              const res = await reconcileFn({ creatorId: selectedCreator.id });
              showToast(
                `Payout triggered: ₦${res.data?.payoutAmount}`,
                'success'
              );
              // Refresh details
              await handleSelectCreator(selectedCreator);
            } catch (error: any) {
              console.error('Failed to reconcile payout', error);
              showToast('Failed to trigger payout', 'error');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const isSuspended = (creator: CreatorSummary) => {
    if (!creator.suspendedUntil) return false;
    return new Date(creator.suspendedUntil) > new Date();
  };

  if (loading) {
    return (
      <SafeScreenWrapper>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading creators…</Text>
        </View>
      </SafeScreenWrapper>
    );
  }

  return (
    <SafeScreenWrapper>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email…"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.textSecondary}
        />
      </View>

      <FlatList
        data={creators}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleSelectCreator(item)}
            activeOpacity={0.85}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name || 'Unknown'}</Text>
                <Text style={styles.cardMeta}>{item.email || 'No email'}</Text>
              </View>
              <View style={styles.badgeContainer}>
                <Text style={styles.badge}>{item.tier || 'free'}</Text>
                {isSuspended(item) && <Text style={styles.badgeSuspended}>Suspended</Text>}
              </View>
            </View>
            <Text style={styles.cardMeta} numberOfLines={1}>
              Joined: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Unknown'}
            </Text>
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!selectedCreator && !detailsLoading} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Creator Details</Text>

            {detailsLoading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            ) : selectedCreator ? (
              <>
                <Text style={styles.modalLabel}>Name</Text>
                <Text style={styles.modalValue}>{selectedCreator.name}</Text>

                <Text style={styles.modalLabel}>Email</Text>
                <Text style={styles.modalValue}>{selectedCreator.email}</Text>

                <Text style={styles.modalLabel}>Tier</Text>
                <Text style={styles.modalValue}>{selectedCreator.tier}</Text>

                <Text style={styles.modalLabel}>Uploads</Text>
                <Text style={styles.modalValue}>{selectedCreator.uploadCount ?? 0}</Text>

                {selectedCreator.suspendedUntil && (
                  <>
                    <Text style={styles.modalLabel}>Suspension Status</Text>
                    <Text style={styles.modalValue} numberOfLines={2}>
                      {isSuspended(selectedCreator)
                        ? `Suspended until ${new Date(selectedCreator.suspendedUntil).toLocaleString()}`
                        : 'Suspension expired'}
                    </Text>
                    {selectedCreator.suspensionReason && (
                      <>
                        <Text style={styles.modalLabel}>Reason</Text>
                        <Text style={styles.modalValue}>{selectedCreator.suspensionReason}</Text>
                      </>
                    )}
                  </>
                )}

                {selectedCreator.recentPayouts && selectedCreator.recentPayouts.length > 0 && (
                  <>
                    <Text style={styles.modalLabel}>Recent Payouts</Text>
                    {selectedCreator.recentPayouts.map((payout) => (
                      <View key={payout.id} style={styles.payoutRow}>
                        <Text style={styles.payoutAmount}>₦{payout.amount?.toLocaleString()}</Text>
                        <Text style={styles.payoutStatus}>{payout.status}</Text>
                      </View>
                    ))}
                  </>
                )}

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.button, styles.buttonNeutral]}
                    onPress={() => setSelectedCreator(null)}
                    disabled={isProcessing}
                  >
                    <Text style={styles.buttonText}>Close</Text>
                  </TouchableOpacity>

                  {isSuspended(selectedCreator) && (
                    <TouchableOpacity
                      style={[styles.button, styles.buttonWarn]}
                      onPress={handleUnsuspend}
                      disabled={isProcessing}
                    >
                      <Text style={styles.buttonText}>Unsuspend</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary, { marginTop: 12 }]}
                  onPress={handleReconcilePayout}
                  disabled={isProcessing}
                >
                  <Text style={styles.buttonText}>
                    {isProcessing ? 'Processing...' : 'Trigger Payout'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeScreenWrapper>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: theme.colors.textSecondary,
  },
  list: {
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: theme.colors.primary,
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeSuspended: {
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: '#E02424',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 12,
    fontWeight: '600',
  },
  modalValue: {
    marginTop: 4,
    color: theme.colors.text,
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  payoutAmount: {
    fontWeight: '600',
  },
  payoutStatus: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonNeutral: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  buttonWarn: {
    backgroundColor: '#E02424',
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});
