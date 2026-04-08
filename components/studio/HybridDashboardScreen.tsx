import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SharedHeader from '@/components/SharedHeader';
import { theme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useStudioWorkspaceData } from '@/hooks/useStudioWorkspaceData';
import { useVaultWorkspaceData } from '@/hooks/useVaultWorkspaceData';
import { useAuthStore } from '@/store/useAuthStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { getModeTheme } from '@/utils/appModeTheme';
import { formatUsd } from '@/utils/pricing';
import { canUseHybridServices, formatPlanLabel, getVaultCapabilities } from '@/utils/subscriptions';
import { useRouter } from 'expo-router';
import { Archive, BarChart3, Megaphone, Music4, PlayCircle, TrendingUp, UploadCloud, Users } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatStorage(value: number) {
  return `${value.toFixed(2)}GB`;
}

const hybridTheme = getModeTheme('hybrid');

function useHybridDashboardStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function HybridDashboardScreen() {
  const appTheme = useAppTheme();
  const styles = useHybridDashboardStyles();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
  const currentPlan = useAuthStore((state) => state.actualRole || state.subscriptionTier);
  const canUseServices = canUseHybridServices(currentPlan);
  const hybridVault = getVaultCapabilities('hybrid');
  const {
    totalPlays,
    totalEngagement,
    totalRevenue,
    followersCount,
    topTracks,
    drafts,
    recentTransactions,
    loading: studioLoading,
  } = useStudioWorkspaceData();
  const {
    uploads,
    folders,
    recentActivities,
    usedStorageGB,
    loading: vaultLoading,
  } = useVaultWorkspaceData();

  const kpis = [
    { label: 'Plays', value: totalPlays.toLocaleString(), Icon: PlayCircle },
    { label: 'Followers', value: followersCount.toLocaleString(), Icon: Users },
    { label: 'Engagement', value: totalEngagement.toLocaleString(), Icon: TrendingUp },
    { label: 'Revenue', value: formatUsd(totalRevenue), Icon: BarChart3 },
  ];

  const requireHybridSubscription = () => {
    if (canUseServices) return false;
    router.push('/settings/subscriptions' as any);
    return true;
  };

  return (
    <View style={styles.screen}>
      <SharedHeader
        viewMode={viewMode}
        isModeSheetOpen={isModeSheetOpen}
        onModePillPress={openSheet}
        showCart={false}
        showMessages={true}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroEyebrow}>Hybrid Home</Text>
              <Text style={styles.heroTitle}>Run your Studio workflow and keep your private Vault workspace close by.</Text>
            </View>
            <View style={styles.planPill}>
              <Text style={styles.planPillText}>{formatPlanLabel('hybrid')}</Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.primaryCta}
              onPress={() => {
                if (requireHybridSubscription()) return;
                router.push('/(tabs)/search' as any);
              }}
              activeOpacity={0.9}
            >
              <UploadCloud size={18} color={appTheme.colors.background} />
              <Text style={styles.primaryCtaText}>Publish</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryCta}
              onPress={() => {
                if (requireHybridSubscription()) return;
                router.push('/(tabs)/marketplace' as any);
              }}
              activeOpacity={0.9}
            >
              <Megaphone size={18} color={hybridTheme.accent} />
              <Text style={styles.secondaryCtaText}>Promote</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.kpiGrid}>
          {kpis.map(({ label, value, Icon }) => (
            <View key={label} style={styles.kpiCard}>
              <View style={styles.kpiIcon}>
                <Icon size={18} color={hybridTheme.accent} />
              </View>
              <Text style={styles.kpiValue}>{value}</Text>
              <Text style={styles.kpiLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Vault Snapshot</Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/library' as any)}
              activeOpacity={0.8}
            >
              <Text style={[styles.panelLink, { color: hybridTheme.accent }]}>Open Vault</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Storage</Text>
              <Text style={styles.summaryValue}>{formatStorage(usedStorageGB)} / {formatStorage(hybridVault.storageLimitGB)}</Text>
              <Text style={styles.summaryMeta}>Uploads: {uploads.length} / {hybridVault.maxVaultUploads}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Folders</Text>
              <Text style={styles.summaryValue}>{folders.length}</Text>
            </View>
          </View>

          <View style={styles.inlineActions}>
            <TouchableOpacity
              style={styles.inlineAction}
              onPress={() => {
                if (requireHybridSubscription()) return;
                router.push('/vault/upload' as any);
              }}
              activeOpacity={0.85}
            >
              <Archive size={16} color={hybridTheme.accent} />
              <Text style={styles.inlineActionText}>Vault Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.inlineAction}
              onPress={() => {
                if (requireHybridSubscription()) return;
                router.push('/vault/links' as any);
              }}
              activeOpacity={0.85}
            >
              <Archive size={16} color={hybridTheme.accent} />
              <Text style={styles.inlineActionText}>Shared Links</Text>
            </TouchableOpacity>
          </View>
          {(vaultLoading && uploads.length === 0) ? <Text style={styles.placeholder}>Loading your Vault snapshot...</Text> : null}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Track Analytics</Text>
            <TouchableOpacity
              onPress={() => {
                if (requireHybridSubscription()) return;
                router.push('/studio/analytics' as any);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.panelLink, { color: hybridTheme.accent }]}>Open analytics</Text>
            </TouchableOpacity>
          </View>
          {studioLoading ? <Text style={styles.placeholder}>Loading creator stats...</Text> : null}
          {!studioLoading && topTracks.length === 0 ? <Text style={styles.placeholder}>Upload your first track to start tracking performance.</Text> : null}
          {!studioLoading && topTracks.map((track) => (
            <View key={track.id} style={styles.trackRow}>
              <View style={styles.trackIcon}>
                <Music4 size={18} color={hybridTheme.accent} />
              </View>
              <View style={styles.trackInfo}>
                <Text style={styles.trackTitle} numberOfLines={1}>{track.title || 'Untitled Track'}</Text>
                <Text style={styles.trackMeta}>
                  {Number(track.listenCount || 0).toLocaleString()} plays • {Number(track.likeCount || 0).toLocaleString()} likes
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Creator Operations</Text>
            <TouchableOpacity
              onPress={() => {
                if (requireHybridSubscription()) return;
                router.push('/studio/settings' as any);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.panelLink, { color: hybridTheme.accent }]}>Settings</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.operationsGrid}>
            <View style={styles.operationCard}>
              <Text style={styles.operationValue}>{drafts.length}</Text>
              <Text style={styles.operationLabel}>Drafts</Text>
            </View>
            <View style={styles.operationCard}>
              <Text style={styles.operationValue}>{recentTransactions.length}</Text>
              <Text style={styles.operationLabel}>Royalties</Text>
            </View>
            <View style={styles.operationCard}>
              <Text style={styles.operationValue}>{folders.length}</Text>
              <Text style={styles.operationLabel}>Folders</Text>
            </View>
            <View style={styles.operationCard}>
              <Text style={styles.operationValue}>{recentActivities.length}</Text>
              <Text style={styles.operationLabel}>Updates</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const legacyStyles = {
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 20, gap: 18 },
  heroCard: {
    marginTop: 10,
    backgroundColor: '#1A1A1B',
    borderRadius: theme.radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.22)',
    gap: 14,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  heroEyebrow: {
    color: hybridTheme.accent,
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    marginBottom: 4,
  },
  heroTitle: {
    color: theme.colors.textPrimary,
    fontFamily: 'Poppins-Bold',
    fontSize: 22,
    lineHeight: 30,
  },
  planPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(255,215,0,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  planPillText: {
    color: hybridTheme.accent,
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  primaryCta: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: hybridTheme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryCtaText: {
    color: theme.colors.background,
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  secondaryCta: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryCtaText: {
    color: hybridTheme.accent,
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 148,
    backgroundColor: '#1A1A1B',
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: { color: theme.colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 18 },
  kpiLabel: { color: 'rgba(255,255,255,0.68)', fontFamily: 'Poppins-Regular', fontSize: 12 },
  panel: {
    backgroundColor: '#1A1A1B',
    borderRadius: theme.radius.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  panelTitle: { color: theme.colors.textPrimary, fontFamily: 'Poppins-SemiBold', fontSize: 17 },
  panelLink: { color: hybridTheme.accent, fontFamily: 'Poppins-Medium', fontSize: 13 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 14, gap: 4 },
  summaryLabel: { color: 'rgba(255,255,255,0.68)', fontFamily: 'Poppins-Regular', fontSize: 12 },
  summaryValue: { color: theme.colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 16 },
  summaryMeta: { color: 'rgba(255,255,255,0.66)', fontFamily: 'Poppins-Regular', fontSize: 11 },
  inlineActions: { flexDirection: 'row', gap: 12 },
  inlineAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,215,0,0.05)',
  },
  inlineActionText: { color: hybridTheme.accent, fontFamily: 'Poppins-SemiBold', fontSize: 13 },
  placeholder: { color: 'rgba(255,255,255,0.62)', fontFamily: 'Poppins-Regular', fontSize: 13, lineHeight: 20 },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  trackIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: { flex: 1 },
  trackTitle: { color: theme.colors.textPrimary, fontFamily: 'Poppins-SemiBold', fontSize: 13 },
  trackMeta: { color: 'rgba(255,255,255,0.66)', fontFamily: 'Poppins-Regular', fontSize: 11, marginTop: 2 },
  operationsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  operationCard: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 148,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    gap: 4,
  },
  operationValue: { color: theme.colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 18 },
  operationLabel: { color: 'rgba(255,255,255,0.68)', fontFamily: 'Poppins-Regular', fontSize: 12 },
};
