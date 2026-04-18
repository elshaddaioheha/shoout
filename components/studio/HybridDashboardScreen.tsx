import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SharedHeader from '@/components/SharedHeader';
import { Icon, type IconName } from '@/components/ui/Icon';
import { theme } from '@/constants/theme';
import { FontFamily, typography } from '@/constants/typography';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useStudioWorkspaceData } from '@/hooks/useStudioWorkspaceData';
import { useVaultWorkspaceData } from '@/hooks/useVaultWorkspaceData';
import { useAuthStore } from '@/store/useAuthStore';
import { getModeSurfaceTheme, getModeTheme } from '@/utils/appModeTheme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { formatUsd } from '@/utils/pricing';
import { canUseHybridServices, formatPlanLabel, getVaultCapabilities } from '@/utils/subscriptions';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatStorage(value: number) {
  return `${value.toFixed(2)}GB`;
}

function formatStorageCompact(value: number) {
  return `${value.toFixed(1)}GB`;
}

function toMs(value: any) {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

function dayKeyFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDayMs(value: number) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function parseHistoryEntry(entry: any): { key: string; value: number } | null {
  if (!entry) return null;

  if (Array.isArray(entry) && entry.length >= 2) {
    const [dateValue, countValue] = entry;
    const parsedMs = toMs(dateValue);
    const count = Number(countValue || 0);
    if (!parsedMs || !Number.isFinite(count)) return null;
    return { key: dayKeyFromDate(new Date(parsedMs)), value: Math.max(0, count) };
  }

  if (typeof entry === 'object') {
    const dateValue = entry.date ?? entry.day ?? entry.key ?? entry.timestamp ?? entry.time;
    const countValue = entry.count ?? entry.plays ?? entry.value ?? entry.listenCount;
    const parsedMs = toMs(dateValue);
    const count = Number(countValue || 0);
    if (!parsedMs || !Number.isFinite(count)) return null;
    return { key: dayKeyFromDate(new Date(parsedMs)), value: Math.max(0, count) };
  }

  return null;
}

function readTrackPlayHistory(track: Record<string, any>) {
  const entries: Array<{ key: string; value: number }> = [];

  const objectCandidates = [track.dailyPlayCounts, track.playsByDay, track.playCountsByDay, track.listenCountsByDay];
  objectCandidates.forEach((candidate) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return;
    Object.entries(candidate).forEach(([rawKey, rawValue]) => {
      const keyMs = toMs(rawKey);
      const key = keyMs > 0 ? dayKeyFromDate(new Date(keyMs)) : String(rawKey);
      const value = Number(rawValue || 0);
      if (key && Number.isFinite(value)) {
        entries.push({ key, value: Math.max(0, value) });
      }
    });
  });

  const listCandidates = [track.playHistory, track.listenHistory, track.dailyHistory, track.playEvents];
  listCandidates.forEach((candidate) => {
    if (!Array.isArray(candidate)) return;
    candidate.forEach((item) => {
      const parsed = parseHistoryEntry(item);
      if (parsed) entries.push(parsed);
    });
  });

  return entries;
}

function buildPlaysSeries(tracks: Array<Record<string, any>>) {
  const now = new Date();
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
    return {
      key: dayKeyFromDate(day),
      label: formatDayLabel(day),
      value: 0,
    };
  });

  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  const todayStartMs = startOfDayMs(Date.now());
  const earliestBucketMs = todayStartMs - (6 * 24 * 60 * 60 * 1000);

  tracks.forEach((track) => {
    const historyEntries = readTrackPlayHistory(track);
    if (historyEntries.length > 0) {
      historyEntries.forEach((entry) => {
        const target = bucketMap.get(entry.key);
        if (!target) return;
        target.value += entry.value;
      });
      return;
    }

    const listens = Math.max(0, Number(track.listenCount || 0));
    if (!listens) return;

    const createdMs = toMs(track.createdAt);
    const anchorMs = createdMs > 0 ? startOfDayMs(createdMs) : todayStartMs;
    if (anchorMs < earliestBucketMs || anchorMs > todayStartMs) return;

    const anchorKey = dayKeyFromDate(new Date(anchorMs));
    const target = bucketMap.get(anchorKey);
    if (target) target.value += listens;
  });

  return buckets;
}

const hybridTheme = getModeTheme('hybrid');

function getHybridThemeOverrides(appTheme: ReturnType<typeof useAppTheme>) {
  const hybridSurface = getModeSurfaceTheme('hybrid', appTheme.isDark);

  return {
    screen: { backgroundColor: appTheme.colors.background },
    content: { paddingHorizontal: 18, gap: 16 },
    heroCard: { backgroundColor: appTheme.colors.backgroundElevated, borderColor: appTheme.colors.border },
    heroCardCompact: { padding: 16, gap: 10 },
    heroHeader: { gap: 10 },
    heroHeaderCompact: { gap: 8 },
    heroEyebrow: { color: hybridSurface.accentLabel },
    heroTitle: { color: appTheme.colors.textPrimary },
    planPill: { backgroundColor: hybridSurface.actionSurface },
    planPillText: { color: hybridSurface.accentLabel },
    heroActions: { gap: 10 },
    primaryCta: { backgroundColor: hybridSurface.accent },
    primaryCtaText: { color: hybridSurface.onAccent },
    secondaryCta: { backgroundColor: hybridSurface.actionSurface, borderColor: hybridSurface.actionBorder },
    secondaryCtaText: { color: hybridSurface.accentLabel },
    kpiGrid: { gap: 10 },
    kpiCard: { backgroundColor: appTheme.colors.backgroundElevated, borderColor: appTheme.colors.border },
    kpiIcon: { backgroundColor: hybridSurface.accentSoft },
    kpiValue: { color: appTheme.colors.textPrimary },
    kpiLabel: { color: appTheme.colors.textSecondary },
    panelHeader: { marginBottom: 2 },
    panel: { backgroundColor: appTheme.colors.backgroundElevated, borderColor: appTheme.colors.border },
    panelTitle: { color: appTheme.colors.textPrimary },
    panelLink: { color: hybridSurface.accentLabel },
    summaryRow: { gap: 10 },
    summaryCard: { backgroundColor: appTheme.colors.surfaceMuted },
    summaryLabel: { color: appTheme.colors.textSecondary },
    summaryValue: { color: appTheme.colors.textPrimary },
    summaryMeta: { color: appTheme.colors.textTertiary },
    inlineActions: { gap: 10 },
    inlineAction: { backgroundColor: hybridSurface.accentSoft, borderColor: hybridSurface.actionBorder },
    inlineActionText: { color: hybridSurface.accentLabel },
    placeholder: { color: appTheme.colors.textSecondary },
    trackIcon: { backgroundColor: hybridSurface.accentSoft },
    trackTitle: { color: appTheme.colors.textPrimary },
    trackMeta: { color: appTheme.colors.textSecondary },
    operationsGrid: { gap: 10 },
    operationCard: { backgroundColor: appTheme.colors.surfaceMuted },
    operationValue: { color: appTheme.colors.textPrimary },
    operationLabel: { color: appTheme.colors.textSecondary },
    analyticsHero: { backgroundColor: appTheme.colors.backgroundElevated, borderColor: appTheme.colors.border },
    analyticsEyebrow: { color: hybridSurface.accentLabel },
    analyticsTitle: { color: appTheme.colors.textPrimary },
    analyticsSubtitle: { color: appTheme.colors.textSecondary },
    analyticsLegend: { color: appTheme.colors.textSecondary },
    analyticsGraphCard: { backgroundColor: appTheme.colors.surfaceMuted, borderColor: appTheme.colors.border },
    analyticsChartArea: { borderColor: appTheme.colors.border },
    analyticsGridLine: { backgroundColor: appTheme.colors.border },
    analyticsZeroLine: { backgroundColor: appTheme.colors.borderStrong ?? appTheme.colors.border },
    analyticsXAxisRow: { borderColor: appTheme.colors.border },
    analyticsBarFill: { backgroundColor: hybridSurface.accent },
    analyticsBarValue: { color: appTheme.colors.textPrimary },
    analyticsBarLabel: { color: appTheme.colors.textTertiary },
    analyticsMetaPill: { backgroundColor: hybridSurface.accentSoft, borderColor: hybridSurface.actionBorder },
    analyticsMetaValue: { color: appTheme.colors.textPrimary },
    analyticsMetaLabel: { color: appTheme.colors.textSecondary },
  } as const;
}

function useHybridDashboardStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => {
    const baseStyles = adaptLegacyStyles(legacyStyles, appTheme) as Record<string, any>;
    const overrides = getHybridThemeOverrides(appTheme) as Record<string, any>;

    const merged = Object.keys({ ...baseStyles, ...overrides }).reduce<Record<string, any>>((acc, key) => {
      const baseValue = baseStyles[key];
      const overrideValue = overrides[key];

      if (
        baseValue &&
        overrideValue &&
        typeof baseValue === 'object' &&
        typeof overrideValue === 'object' &&
        !Array.isArray(baseValue) &&
        !Array.isArray(overrideValue)
      ) {
        acc[key] = { ...baseValue, ...overrideValue };
        return acc;
      }

      acc[key] = overrideValue ?? baseValue;
      return acc;
    }, {});

    return StyleSheet.create(merged);
  }, [appTheme]);
}

export default function HybridDashboardScreen() {
  const appTheme = useAppTheme();
  const styles = useHybridDashboardStyles();
  const { width } = useWindowDimensions();
  const compactLayout = width < 390;
  const hybridSurface = getModeSurfaceTheme('hybrid', appTheme.isDark);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
  const currentPlan = useAuthStore((state) => state.actualRole || state.subscriptionTier);
  const canUseServices = canUseHybridServices(currentPlan);
  const hybridVault = getVaultCapabilities('hybrid');
  const {
    tracks,
    totalPlays,
    totalEngagement,
    totalRevenue,
    followersCount,
    topTracks,
    drafts,
    publishedTracks,
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

  const playsSeries = React.useMemo(() => buildPlaysSeries(tracks), [tracks]);
  const hasPlaySeriesData = React.useMemo(() => playsSeries.some((point) => point.value > 0), [playsSeries]);
  const playsMax = React.useMemo(() => Math.max(...playsSeries.map((point) => point.value), 1), [playsSeries]);
  const playsThisWeek = React.useMemo(
    () => playsSeries.reduce((sum, point) => sum + point.value, 0),
    [playsSeries]
  );
  const hasUploadedContent = tracks.length > 0;

  const kpis: Array<{ label: string; value: string; iconName: IconName }> = [
    { label: 'Plays', value: totalPlays.toLocaleString(), iconName: 'play-circle' },
    { label: 'Followers', value: followersCount.toLocaleString(), iconName: 'users' },
    { label: 'Engagement', value: totalEngagement.toLocaleString(), iconName: 'trending-up' },
    { label: 'Revenue', value: formatUsd(totalRevenue), iconName: 'dollar-sign' },
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
        {hasUploadedContent ? (
          <View style={[styles.analyticsHero, compactLayout && styles.heroCardCompact]}>
            <View style={[styles.heroHeader, compactLayout && styles.heroHeaderCompact]}>
              <View style={styles.heroTextBlock}>
                <Text style={styles.analyticsEyebrow}>Vault + Distribution</Text>
                <Text style={styles.analyticsTitle}>Plays over time</Text>
                <Text style={styles.analyticsSubtitle}>Private Vault storage with publish and distribution controls from one Hybrid surface.</Text>
              </View>
              <View style={[styles.planPill, compactLayout && styles.planPillCompact]}>
                <Text style={styles.planPillText}>{formatPlanLabel('hybrid')}</Text>
              </View>
            </View>

            <View style={styles.analyticsGraphCard}>
              <View style={styles.analyticsChartArea}>
                {[75, 50, 25].map((level) => (
                  <View key={level} style={[styles.analyticsGridLine, { bottom: `${level}%` }]} />
                ))}
                <View style={styles.analyticsZeroLine} />

                <View style={styles.analyticsBarsRow}>
                  {playsSeries.map((point) => {
                    const percent = hasPlaySeriesData ? Math.max(4, Math.round((point.value / playsMax) * 100)) : 0;
                    return (
                      <View key={point.key} style={styles.analyticsBarItem}>
                        <Text style={styles.analyticsBarValue}>{point.value.toLocaleString()}</Text>
                        <View style={[styles.analyticsBarFill, { height: `${percent}%` }]} />
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.analyticsXAxisRow}>
                {playsSeries.map((point) => (
                  <Text key={point.key} style={styles.analyticsBarLabel}>{point.label}</Text>
                ))}
              </View>

              {!hasPlaySeriesData ? <Text style={styles.placeholder}>No daily play history yet.</Text> : null}
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.analyticsMetaPill}>
                <Text style={styles.analyticsMetaValue}>{playsThisWeek.toLocaleString()}</Text>
                <Text style={styles.analyticsMetaLabel}>Week plays</Text>
              </View>
              <View style={styles.analyticsMetaPill}>
                <Text style={styles.analyticsMetaValue}>{tracks.length.toLocaleString()}</Text>
                <Text style={styles.analyticsMetaLabel}>Uploaded tracks</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.heroCard, compactLayout && styles.heroCardCompact]}>
            <View style={[styles.heroHeader, compactLayout && styles.heroHeaderCompact]}>
              <View style={styles.heroTextBlock}>
                <Text style={styles.heroEyebrow}>Hybrid Workspace</Text>
                <Text style={styles.heroTitle}>Keep files private in Vault, then publish and distribute when a track is release-ready.</Text>
              </View>
              <View style={[styles.planPill, compactLayout && styles.planPillCompact]}>
                <Text style={styles.planPillText}>{formatPlanLabel('hybrid')}</Text>
              </View>
            </View>

            <View style={styles.heroActions}>
              <TouchableOpacity
                style={styles.primaryCta}
                onPress={() => {
                  if (requireHybridSubscription()) return;
                  router.push('/vault/upload' as any);
                }}
                activeOpacity={0.9}
              >
                <Icon name="upload-cloud" size={18} color={hybridSurface.onAccent} />
                <Text style={styles.primaryCtaText}>Upload to Vault</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryCta}
                onPress={() => {
                  if (requireHybridSubscription()) return;
                  router.push('/(tabs)/search' as any);
                }}
                activeOpacity={0.9}
              >
                <Icon name="rocket" size={18} color={hybridSurface.accentLabel} />
                <Text style={styles.secondaryCtaText}>Publish</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.kpiGrid}>
          {kpis.map(({ label, value, iconName }) => (
            <View key={label} style={styles.kpiCard}>
              <View style={styles.kpiIcon}>
                <Icon name={iconName} size={18} color={hybridSurface.accentLabel} />
              </View>
              <Text style={styles.kpiValue}>{value}</Text>
              <Text style={styles.kpiLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.panelTitle}>Vault Snapshot</Text>
              <Text style={styles.placeholder}>Private first. Publish when ready.</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/library' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.panelLink}>Open Vault</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.summaryRow, compactLayout && styles.summaryRowCompact]}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Storage</Text>
              <Text style={styles.summaryValue}>{formatStorageCompact(usedStorageGB)} / {formatStorageCompact(hybridVault.storageLimitGB)}</Text>
              <Text style={styles.summaryMeta}>{uploads.length} / {hybridVault.maxVaultUploads} uploads</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Folders</Text>
              <Text style={styles.summaryValue}>{folders.length}</Text>
            </View>
          </View>

          <View style={[styles.inlineActions, compactLayout && styles.inlineActionsCompact]}>
            <TouchableOpacity
              style={styles.inlineAction}
              onPress={() => {
                if (requireHybridSubscription()) return;
                router.push('/vault/upload' as any);
              }}
              activeOpacity={0.85}
            >
              <Icon name="upload-cloud" size={16} color={hybridTheme.accent} />
              <Text style={styles.inlineActionText}>Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.inlineAction}
              onPress={() => {
                if (requireHybridSubscription()) return;
                router.push('/vault/links' as any);
              }}
              activeOpacity={0.85}
            >
              <Icon name="link-2" size={16} color={hybridTheme.accent} />
              <Text style={styles.inlineActionText}>Links</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.inlineAction}
              onPress={() => {
                if (requireHybridSubscription()) return;
                router.push('/(tabs)/search' as any);
              }}
              activeOpacity={0.85}
            >
              <Icon name="rocket" size={16} color={hybridTheme.accent} />
              <Text style={styles.inlineActionText}>Publish</Text>
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
              <Text style={styles.panelLink}>Open analytics</Text>
            </TouchableOpacity>
          </View>
          {studioLoading ? <Text style={styles.placeholder}>Loading creator stats...</Text> : null}
          {!studioLoading && topTracks.length === 0 ? <Text style={styles.placeholder}>Upload your first track to start tracking performance.</Text> : null}
          {!studioLoading && topTracks.map((track) => (
            <View key={track.id} style={styles.trackRow}>
              <View style={styles.trackIcon}>
                <Icon name="music" size={18} color={hybridTheme.accent} />
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
              <Text style={styles.panelLink}>Settings</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.operationsGrid}>
            <View style={styles.operationCard}>
              <Text style={styles.operationValue}>{drafts.length}</Text>
              <Text style={styles.operationLabel}>Drafts</Text>
            </View>
            <View style={styles.operationCard}>
              <Text style={styles.operationValue}>{publishedTracks.length}</Text>
              <Text style={styles.operationLabel}>Published</Text>
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
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.22)',
    gap: 14,
  },
  heroCardCompact: {
    padding: 18,
    gap: 12,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroHeaderCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  heroTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  heroEyebrow: {
    color: hybridTheme.accent,
    ...typography.label,
    fontFamily: FontFamily.semiBold,
    marginBottom: 4,
  },
  heroTitle: {
    color: theme.colors.textPrimary,
    ...typography.h2,
    fontFamily: FontFamily.bold,
  },
  planPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(255,215,0,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  planPillCompact: {
    marginTop: 4,
  },
  planPillText: {
    color: hybridTheme.accent,
    ...typography.label,
    fontFamily: FontFamily.semiBold,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  primaryCta: {
    flex: 1,
    height: 48,
    borderRadius: 18,
    backgroundColor: hybridTheme.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryCtaText: {
    color: theme.colors.background,
    ...typography.buttonSm,
    fontFamily: FontFamily.semiBold,
  },
  secondaryCta: {
    flex: 1,
    height: 48,
    borderRadius: 18,
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
    ...typography.buttonSm,
    fontFamily: FontFamily.semiBold,
  },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 148,
    backgroundColor: '#1A1A1B',
    borderRadius: 20,
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
  kpiValue: { color: theme.colors.textPrimary, ...typography.title, fontFamily: FontFamily.bold },
  kpiLabel: { color: 'rgba(255,255,255,0.68)', ...typography.label, fontFamily: FontFamily.regular },
  panel: {
    backgroundColor: '#1A1A1B',
    borderRadius: 24,
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
  panelTitle: { color: theme.colors.textPrimary, ...typography.section, fontFamily: FontFamily.semiBold },
  panelLink: { color: hybridTheme.accent, ...typography.label, fontFamily: FontFamily.medium },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryRowCompact: { gap: 10 },
  summaryCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 14, gap: 4 },
  summaryLabel: { color: 'rgba(255,255,255,0.68)', ...typography.label, fontFamily: FontFamily.regular },
  summaryValue: { color: theme.colors.textPrimary, ...typography.bodyBold, fontFamily: FontFamily.bold },
  summaryMeta: { color: 'rgba(255,255,255,0.66)', ...typography.small, fontFamily: FontFamily.regular },
  inlineActions: { flexDirection: 'row', gap: 12 },
  inlineActionsCompact: { flexDirection: 'column', gap: 8 },
  inlineAction: {
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,215,0,0.05)',
  },
  inlineActionText: { color: hybridTheme.accent, ...typography.buttonSm, fontFamily: FontFamily.semiBold },
  placeholder: { color: 'rgba(255,255,255,0.62)', ...typography.body, fontFamily: FontFamily.regular },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  trackIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(255,215,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: { flex: 1 },
  trackTitle: { color: theme.colors.textPrimary, ...typography.bodyBold, fontFamily: FontFamily.semiBold },
  trackMeta: { color: 'rgba(255,255,255,0.66)', ...typography.small, fontFamily: FontFamily.regular, marginTop: 2 },
  operationsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  operationCard: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 148,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    gap: 4,
  },
  operationValue: { color: theme.colors.textPrimary, ...typography.title, fontFamily: FontFamily.bold },
  operationLabel: { color: 'rgba(255,255,255,0.68)', ...typography.label, fontFamily: FontFamily.regular },
  analyticsHero: {
    marginTop: 10,
    backgroundColor: '#1A1A1B',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.22)',
    gap: 14,
  },
  analyticsEyebrow: {
    color: hybridTheme.accent,
    ...typography.label,
    fontFamily: FontFamily.semiBold,
    marginBottom: 4,
  },
  analyticsTitle: {
    color: theme.colors.textPrimary,
    ...typography.h2,
    fontFamily: FontFamily.bold,
  },
  analyticsSubtitle: {
    color: 'rgba(255,255,255,0.74)',
    ...typography.caption,
    fontFamily: FontFamily.regular,
    marginTop: 6,
  },
  analyticsGraphCard: {
    height: 208,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
  },
  analyticsChartArea: {
    position: 'relative',
    height: 152,
  },
  analyticsGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  analyticsZeroLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  analyticsBarsRow: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 1,
    top: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 8,
  },
  analyticsBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  analyticsBarFill: {
    width: '72%',
    minHeight: 0,
    borderRadius: 8,
    backgroundColor: hybridTheme.accent,
  },
  analyticsBarValue: {
    color: '#FFFFFF',
    ...typography.small,
    fontFamily: FontFamily.medium,
  },
  analyticsBarLabel: {
    color: 'rgba(255,255,255,0.64)',
    ...typography.small,
    fontFamily: FontFamily.regular,
  },
  analyticsXAxisRow: {
    borderTopWidth: 0,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    minHeight: 18,
  },
  analyticsMetaPill: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.18)',
    backgroundColor: 'rgba(255,215,0,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  analyticsMetaValue: {
    color: '#FFFFFF',
    ...typography.bodyBold,
    fontFamily: FontFamily.bold,
  },
  analyticsMetaLabel: {
    color: 'rgba(255,255,255,0.66)',
    ...typography.small,
    fontFamily: FontFamily.regular,
  },
};
