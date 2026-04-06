import { getFunctions, httpsCallable } from 'firebase/functions';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';

type ModerationReport = {
  id: string;
  trackId?: string;
  trackTitle?: string;
  uploaderId?: string;
  uploaderName?: string;
  reporterId?: string;
  type?: string;
  reason?: string;
  description?: string;
  createdAt?: { seconds: number };
};

type FilterState = {
  type?: string;
  reporterId?: string;
  uploaderId?: string;
  startDate?: string;
  endDate?: string;
};

const REPORT_TYPES = ['copyright', 'spam', 'offensive', 'illegal', 'other'];

const decisionLabels: Record<string, string> = {
  dismiss: 'Dismiss',
  uphold: 'Uphold & Remove Content',
  escalate: 'Escalate',
};

function useModerationStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function ModerationQueueScreen() {
  const appTheme = useAppTheme();
  const styles = useModerationStyles();

  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ModerationReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({});
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const { showToast } = useToastStore();

  const functions = useMemo(() => getFunctions(), []);
  const getQueueFn = useMemo(
    () =>
      httpsCallable<{ filters?: Record<string, any>; limit: number }, { reports?: ModerationReport[] }>(
        functions,
        'adminGetModerationQueue'
      ),
    [functions]
  );
  const reviewFn = useMemo(
    () =>
      httpsCallable<
        { reportId: string; decision: 'dismiss' | 'uphold' | 'escalate'; notes: string },
        { success?: boolean }
      >(functions, 'adminReviewReport'),
    [functions]
  );
  const batchReviewFn = useMemo(
    () =>
      httpsCallable<
        { reportIds: string[]; decision: 'dismiss' | 'uphold' | 'escalate'; reason: string },
        { processed?: number }
      >(functions, 'adminReviewReportsBatch'),
    [functions]
  );

  useEffect(() => {
    (async () => {
      try {
        const filterObj: Record<string, any> = {};
        if (filters.type) filterObj.type = filters.type;
        if (filters.reporterId) filterObj.reporterId = filters.reporterId;
        if (filters.uploaderId) filterObj.uploaderId = filters.uploaderId;
        if (filters.startDate) filterObj.startAt = new Date(filters.startDate).getTime();
        if (filters.endDate) filterObj.endAt = new Date(filters.endDate).getTime();

        const res = await getQueueFn({ filters: filterObj, limit: 25 });
        setReports(res.data?.reports ?? []);
        setSelectedReportIds(new Set());
      } catch (error: any) {
        console.error('Failed to fetch moderation queue', error);
        showToast('Failed to load moderation queue', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [filters, getQueueFn, showToast]);

  const removeReport = (id: string) => {
    setReports((current) => current.filter((item) => item.id !== id));
    setSelectedReportIds((current) => {
      const updated = new Set(current);
      updated.delete(id);
      return updated;
    });
    if (selectedReport?.id === id) {
      setSelectedReport(null);
    }
  };

  const handleToggleSelect = (reportId: string) => {
    setSelectedReportIds((current) => {
      const updated = new Set(current);
      if (updated.has(reportId)) {
        updated.delete(reportId);
      } else {
        updated.add(reportId);
      }
      return updated;
    });
  };

  const handleSelectAll = () => {
    if (selectedReportIds.size === reports.length) {
      setSelectedReportIds(new Set());
    } else {
      setSelectedReportIds(new Set(reports.map((r) => r.id)));
    }
  };

  const handleDecision = async (report: ModerationReport, decision: 'dismiss' | 'uphold' | 'escalate') => {
    const confirmTitle = decisionLabels[decision];
    const confirmMessage =
      decision === 'dismiss'
        ? 'Mark this report as dismissed? This will close the report with no action taken.'
        : decision === 'uphold'
        ? 'This will remove the reported content and suspend the uploader (temporary).'
        : 'This will flag the report for legal/finance review.';

    Alert.alert(confirmTitle, confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'destructive',
        onPress: async () => {
          setIsProcessing(true);
          try {
            await reviewFn({ reportId: report.id, decision, notes: decisionNotes });
            showToast('Action applied successfully', 'success');
            removeReport(report.id);
          } catch (error: any) {
            console.error('Failed to apply decision', error);
            showToast('Failed to apply action', 'error');
          } finally {
            setIsProcessing(false);
            setDecisionNotes('');
            setSelectedReport(null);
          }
        },
      },
    ]);
  };

  const handleBatchAction = async (decision: 'dismiss' | 'uphold' | 'escalate') => {
    if (selectedReportIds.size === 0) {
      showToast('No reports selected', 'error');
      return;
    }

    const confirmTitle = `${decisionLabels[decision]} (${selectedReportIds.size} reports)`;
    const confirmMessage = `Apply "${decision}" to ${selectedReportIds.size} selected reports? This action cannot be undone.`;

    Alert.alert(confirmTitle, confirmMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Apply',
        style: 'destructive',
        onPress: async () => {
          setIsProcessing(true);
          try {
            const result = await batchReviewFn({
              reportIds: Array.from(selectedReportIds),
              decision,
              reason: decisionNotes || `Batch ${decision}`,
            });

            const processed = result.data?.processed || 0;
            showToast(`Applied action to ${processed} reports`, 'success');

            setReports((current) => current.filter((r) => !selectedReportIds.has(r.id)));
            setSelectedReportIds(new Set());
            setDecisionNotes('');
          } catch (error: any) {
            console.error('Batch action failed', error);
            showToast('Failed to apply batch action', 'error');
          } finally {
            setIsProcessing(false);
          }
        },
      },
    ]);
  };

  const formattedReports = useMemo(() => {
    return reports.map((report) => ({
      ...report,
      createdAtLabel: report.createdAt
        ? new Date(report.createdAt.seconds * 1000).toLocaleString()
        : 'Unknown',
    }));
  }, [reports]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  if (loading) {
    return (
      <SafeScreenWrapper>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading reports…</Text>
        </View>
      </SafeScreenWrapper>
    );
  }

  if (reports.length === 0) {
    return (
      <SafeScreenWrapper>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No pending reports</Text>
          <Text style={styles.emptySubtitle}>There are no pending moderation reports right now.</Text>
        </View>
      </SafeScreenWrapper>
    );
  }

  return (
    <SafeScreenWrapper>
      {/* Header with filter + batch controls */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Text style={styles.filterButtonText}>
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selectAllButton,
            selectedReportIds.size > 0 && styles.selectAllButtonActive,
          ]}
          onPress={handleSelectAll}
        >
          <Text style={styles.selectAllText}>
            {selectedReportIds.size === reports.length ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Batch actions bar */}
      {selectedReportIds.size > 0 && (
        <View style={styles.batchBar}>
          <Text style={styles.batchCount}>{selectedReportIds.size} selected</Text>
          <View style={styles.batchActions}>
            <TouchableOpacity
              style={[styles.batchBtn, styles.batchBtnSmall]}
              onPress={() => handleBatchAction('dismiss')}
              disabled={isProcessing}
            >
              <Text style={styles.batchBtnText}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.batchBtn, styles.batchBtnSmall, styles.batchBtnPrimary]}
              onPress={() => handleBatchAction('uphold')}
              disabled={isProcessing}
            >
              <Text style={styles.batchBtnText}>Uphold</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.batchBtn, styles.batchBtnSmall]}
              onPress={() => handleBatchAction('escalate')}
              disabled={isProcessing}
            >
              <Text style={styles.batchBtnText}>Escalate</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Reports list */}
      <FlatList
        data={formattedReports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => handleToggleSelect(item.id)}
            >
              <View
                style={[
                  styles.checkboxBox,
                  selectedReportIds.has(item.id) && styles.checkboxBoxChecked,
                ]}
              >
                {selectedReportIds.has(item.id) && (
                  <Text style={styles.checkboxTick}>✓</Text>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => setSelectedReport(item)}
              activeOpacity={0.85}
            >
              <Text style={styles.cardTitle}>{item.trackTitle || 'Untitled Track'}</Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                Reported by <Text style={styles.bold}>{item.reporterId || 'unknown'}</Text> • Type:{' '}
                {item.type || 'unknown'}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                Uploader: <Text style={styles.bold}>{item.uploaderName || item.uploaderId || 'unknown'}</Text>
              </Text>
              <Text style={styles.cardMeta}>{item.createdAtLabel}</Text>
              <Text style={styles.cardText} numberOfLines={2}>
                {item.reason ?? item.description ?? 'No reason provided'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Individual report modal */}
      <Modal visible={!!selectedReport} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Details</Text>
            <Text style={styles.modalLabel}>Track</Text>
            <Text style={styles.modalValue}>{selectedReport?.trackTitle || 'Unknown'}</Text>
            <Text style={styles.modalLabel}>Uploader</Text>
            <Text style={styles.modalValue}>
              {selectedReport?.uploaderName || selectedReport?.uploaderId || 'Unknown'}
            </Text>
            <Text style={styles.modalLabel}>Reporter</Text>
            <Text style={styles.modalValue}>{selectedReport?.reporterId || 'Unknown'}</Text>
            <Text style={styles.modalLabel}>Reason</Text>
            <Text style={styles.modalValue}>
              {selectedReport?.reason || selectedReport?.description || 'None'}
            </Text>
            <Text style={styles.modalLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={decisionNotes}
              onChangeText={setDecisionNotes}
              placeholder="Add a note for the audit log"
              multiline
              editable={!isProcessing}
            />

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonNeutral]}
                onPress={() => setSelectedReport(null)}
                disabled={isProcessing}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonWarn]}
                onPress={() => selectedReport && handleDecision(selectedReport, 'dismiss')}
                disabled={isProcessing}
              >
                <Text style={styles.buttonText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={() => selectedReport && handleDecision(selectedReport, 'uphold')}
                disabled={isProcessing}
              >
                <Text style={styles.buttonText}>Uphold</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => selectedReport && handleDecision(selectedReport, 'escalate')}
                disabled={isProcessing}
              >
                <Text style={styles.buttonText}>Escalate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filters modal */}
      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <ScrollView>
              <Text style={styles.modalTitle}>Filters</Text>

              <Text style={styles.modalLabel}>Report Type</Text>
              <View style={styles.typeButtons}>
                {['all', ...REPORT_TYPES].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      (filters.type || 'all') === type && styles.typeButtonActive,
                    ]}
                    onPress={() =>
                      setFilters({
                        ...filters,
                        type: type === 'all' ? undefined : type,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        (filters.type || 'all') === type && styles.typeButtonTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Reporter ID</Text>
              <TextInput
                style={styles.filterInput}
                value={filters.reporterId || ''}
                onChangeText={(text) =>
                  setFilters({ ...filters, reporterId: text || undefined })
                }
                placeholder="Optional: filter by reporter"
              />

              <Text style={styles.modalLabel}>Uploader ID</Text>
              <TextInput
                style={styles.filterInput}
                value={filters.uploaderId || ''}
                onChangeText={(text) =>
                  setFilters({ ...filters, uploaderId: text || undefined })
                }
                placeholder="Optional: filter by uploader"
              />

              <Text style={styles.modalLabel}>Start Date</Text>
              <TextInput
                style={styles.filterInput}
                value={filters.startDate || ''}
                onChangeText={(text) =>
                  setFilters({ ...filters, startDate: text || undefined })
                }
                placeholder="YYYY-MM-DD"
              />

              <Text style={styles.modalLabel}>End Date</Text>
              <TextInput
                style={styles.filterInput}
                value={filters.endDate || ''}
                onChangeText={(text) =>
                  setFilters({ ...filters, endDate: text || undefined })
                }
                placeholder="YYYY-MM-DD"
              />

              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary, { marginTop: 20 }]}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.buttonText}>Done</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonNeutral, { marginTop: 12 }]}
                onPress={() => {
                  setFilters({});
                  setShowFilters(false);
                }}
              >
                <Text style={styles.buttonText}>Clear Filters</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
  },
  header: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#EC5C39',
    borderColor: '#EC5C39',
  },
  filterButtonText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  selectAllButtonActive: {
    backgroundColor: '#1E1A1B',
  },
  selectAllText: {
    fontWeight: '600',
    fontSize: 12,
  },
  batchBar: {
    backgroundColor: '#1E1A1B',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  batchCount: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  batchActions: {
    flexDirection: 'row',
    gap: 8,
  },
  batchBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  batchBtnSmall: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  batchBtnPrimary: {
    backgroundColor: '#EC5C39',
  },
  batchBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  list: {
    padding: 12,
    paddingBottom: 120,
  },
  cardWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  checkbox: {
    justifyContent: 'center',
    paddingTop: 2,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#EC5C39',
    borderColor: '#EC5C39',
  },
  checkboxTick: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#1E1A1B',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginBottom: 3,
  },
  cardText: {
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
    fontSize: 12,
  },
  bold: {
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#1E1A1B',
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 10,
    fontWeight: '600',
  },
  modalValue: {
    marginTop: 4,
    color: '#FFFFFF',
  },
  notesInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
    color: '#FFFFFF',
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  typeButtonActive: {
    backgroundColor: '#EC5C39',
    borderColor: '#EC5C39',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  typeButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  filterInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonNeutral: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  buttonWarn: {
    backgroundColor: '#E02424',
  },
  buttonPrimary: {
    backgroundColor: '#EC5C39',
  },
  buttonSecondary: {
    backgroundColor: '#334155',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
};
