import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SharedHeader from '@/components/SharedHeader';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useStudioWorkspaceData } from '@/hooks/useStudioWorkspaceData';
import { useAuthStore } from '@/store/useAuthStore';
import { getModeTheme } from '@/utils/appModeTheme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { formatUsd } from '@/utils/pricing';
import { canUseStudioServices, getEffectivePlan } from '@/utils/subscriptions';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const studioTheme = getModeTheme('studio');

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

function useStudioDashboardStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function StudioDashboardScreen() {
  const appTheme = useAppTheme();
  const styles = useStudioDashboardStyles();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
  const currentPlan = getEffectivePlan(useAuthStore((state) => state.actualRole));
  const canUseServices = canUseStudioServices(currentPlan);
  const {
    tracks,
    totalPlays,
    totalEngagement,
    totalRevenue,
    followersCount,
    topTracks,
    drafts,
    recentTransactions,
    loading,
  } = useStudioWorkspaceData();

  const playsSeries = React.useMemo(() => buildPlaysSeries(tracks), [tracks]);
  const hasPlaySeriesData = React.useMemo(() => playsSeries.some((point) => point.value > 0), [playsSeries]);
  const playsMax = React.useMemo(() => Math.max(...playsSeries.map((point) => point.value), 1), [playsSeries]);
  const playsThisWeek = React.useMemo(
    () => playsSeries.reduce((sum, point) => sum + point.value, 0),
    [playsSeries]
  );
  const hasUploadedContent = tracks.length > 0;

  const kpis = [
    { label: 'Plays', value: totalPlays.toLocaleString(), iconName: 'play-circle' },
    { label: 'Followers', value: followersCount.toLocaleString(), iconName: 'users' },
    { label: 'Engagement', value: totalEngagement.toLocaleString(), iconName: 'trending-up' },
    { label: 'Revenue', value: formatUsd(totalRevenue), iconName: 'dollar-sign' },
  ];

  const requireStudioSubscription = () => {
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
          <View style={styles.analyticsHero}>
            <View style={styles.heroHeader}>
              <View style={styles.heroTextBlock}>
                <Text style={styles.analyticsEyebrow}>Studio Performance</Text>
                <Text style={styles.analyticsTitle}>Plays over time</Text>
                <Text style={styles.analyticsSubtitle}>Track your release momentum and campaign readiness from one Studio surface.</Text>
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
          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Studio Home</Text>
            <Text style={styles.heroTitle}>Manage uploads, publishing, royalties, and promotions from one creator dashboard.</Text>
            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.primaryCta} onPress={() => {
                if (requireStudioSubscription()) return;
                router.push('/(tabs)/search' as any);
              }} activeOpacity={0.9}>
                <Icon name="upload-cloud" size={18} color={appTheme.colors.textPrimary} />
                <Text style={styles.primaryCtaText}>Publish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryCta} onPress={() => {
                if (requireStudioSubscription()) return;
                router.push('/(tabs)/marketplace' as any);
              }} activeOpacity={0.9}>
                <Icon name="megaphone" size={18} color={studioTheme.accent} />
                <Text style={styles.secondaryCtaText}>Promote</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.kpiGrid}>
          {kpis.map(({ label, value, iconName }) => (
            <View key={label} style={styles.kpiCard}>
              <View style={styles.kpiIcon}>
                <Icon name={iconName} size={18} color={studioTheme.accent} />
              </View>
              <Text style={styles.kpiValue}>{value}</Text>
              <Text style={styles.kpiLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Track Analytics</Text>
            <TouchableOpacity onPress={() => {
              if (requireStudioSubscription()) return;
              router.push('/studio/analytics' as any);
            }} activeOpacity={0.8}>
              <Text style={styles.panelLink}>Open analytics</Text>
            </TouchableOpacity>
          </View>
          {loading ? <Text style={styles.placeholder}>Loading creator stats...</Text> : null}
          {!loading && topTracks.length === 0 ? <Text style={styles.placeholder}>Upload your first track to start tracking plays and engagement.</Text> : null}
          {!loading && topTracks.map((track) => (
            <View key={track.id} style={styles.trackRow}>
              <View style={styles.trackIcon}>
                <Icon name="music" size={18} color={studioTheme.accent} />
              </View>
              <View style={styles.trackInfo}>
                <Text style={styles.trackTitle} numberOfLines={1}>{track.title || 'Untitled Track'}</Text>
                <Text style={styles.trackMeta}>
                  {Number(track.listenCount || 0).toLocaleString()} plays · {Number(track.likeCount || 0).toLocaleString()} likes
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Publishing & Royalties</Text>
            <TouchableOpacity onPress={() => {
              if (requireStudioSubscription()) return;
              router.push('/(tabs)/search' as any);
            }} activeOpacity={0.8}>
              <Text style={styles.panelLink}>Manage</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{drafts.length}</Text>
              <Text style={styles.summaryLabel}>Drafts</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{recentTransactions.length}</Text>
              <Text style={styles.summaryLabel}>Royalties</Text>
            </View>
          </View>
          <Text style={styles.summarySub}>Use Publish to upload tracks, update metadata, mark releases live, and monitor royalty-related sales activity.</Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Promotion Snapshot</Text>
            <TouchableOpacity onPress={() => {
              if (requireStudioSubscription()) return;
              router.push('/(tabs)/marketplace' as any);
            }} activeOpacity={0.8}>
              <Text style={styles.panelLink}>Open promote</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.promoBanner}>
            <Icon name="trending-up" size={20} color={appTheme.colors.textPrimary} />
            <Text style={styles.promoText}>Promote your strongest releases and monitor campaign readiness from one place.</Text>
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
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
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
  heroEyebrow: { color: studioTheme.accent, fontFamily: 'Poppins-SemiBold', fontSize: 12 },
  heroTitle: { color: theme.colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 22, lineHeight: 30 },
  heroActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  primaryCta: {
    flex: 1, height: 48, borderRadius: 16, backgroundColor: studioTheme.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  primaryCtaText: { color: '#FFF', fontFamily: 'Poppins-SemiBold', fontSize: 14 },
  secondaryCta: {
    flex: 1, height: 48, borderRadius: 16, backgroundColor: 'rgba(76,175,80,0.08)', borderWidth: 1, borderColor: 'rgba(76,175,80,0.25)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  secondaryCtaText: { color: studioTheme.accent, fontFamily: 'Poppins-SemiBold', fontSize: 14 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard: {
    flexBasis: '48%', flexGrow: 1, minWidth: 148, backgroundColor: '#1A1A1B', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8,
  },
  kpiIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(76,175,80,0.12)', alignItems: 'center', justifyContent: 'center' },
  kpiValue: { color: theme.colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 18 },
  kpiLabel: { color: 'rgba(255,255,255,0.68)', fontFamily: 'Poppins-Regular', fontSize: 12 },
  panel: {
    backgroundColor: '#1A1A1B', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 12,
  },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  panelTitle: { color: theme.colors.textPrimary, fontFamily: 'Poppins-SemiBold', fontSize: 17 },
  panelLink: { color: studioTheme.accent, fontFamily: 'Poppins-Medium', fontSize: 13 },
  placeholder: { color: 'rgba(255,255,255,0.62)', fontFamily: 'Poppins-Regular', fontSize: 13, lineHeight: 20 },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  trackIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(76,175,80,0.12)', alignItems: 'center', justifyContent: 'center' },
  trackInfo: { flex: 1 },
  trackTitle: { color: theme.colors.textPrimary, fontFamily: 'Poppins-SemiBold', fontSize: 13 },
  trackMeta: { color: 'rgba(255,255,255,0.66)', fontFamily: 'Poppins-Regular', fontSize: 11, marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 14, gap: 4 },
  summaryValue: { color: theme.colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 18 },
  summaryLabel: { color: 'rgba(255,255,255,0.68)', fontFamily: 'Poppins-Regular', fontSize: 12 },
  summarySub: { color: 'rgba(255,255,255,0.68)', fontFamily: 'Poppins-Regular', fontSize: 12, lineHeight: 19 },
  promoBanner: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: 'rgba(76,175,80,0.1)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(76,175,80,0.2)' },
  promoText: { flex: 1, color: theme.colors.textPrimary, fontFamily: 'Poppins-Regular', fontSize: 13, lineHeight: 20 },
  analyticsHero: {
    marginTop: 10,
    backgroundColor: '#1A1A1B',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.22)',
    gap: 12,
  },
  analyticsEyebrow: { color: studioTheme.accent, fontFamily: 'Poppins-SemiBold', fontSize: 12 },
  analyticsTitle: { color: theme.colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 22, lineHeight: 30 },
  analyticsSubtitle: { color: 'rgba(255,255,255,0.74)', fontFamily: 'Poppins-Regular', fontSize: 13, lineHeight: 19 },
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
    backgroundColor: studioTheme.accent,
  },
  analyticsBarValue: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    lineHeight: 15,
  },
  analyticsBarLabel: {
    color: 'rgba(255,255,255,0.64)',
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    lineHeight: 15,
  },
  analyticsXAxisRow: {
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
    borderColor: 'rgba(76,175,80,0.2)',
    backgroundColor: 'rgba(76,175,80,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  analyticsMetaValue: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    lineHeight: 21,
  },
  analyticsMetaLabel: {
    color: 'rgba(255,255,255,0.66)',
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    lineHeight: 15,
  },
};
