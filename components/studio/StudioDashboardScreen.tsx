import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SharedHeader from '@/components/SharedHeader';
import { theme } from '@/constants/theme';
import { useStudioWorkspaceData } from '@/hooks/useStudioWorkspaceData';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAuthStore } from '@/store/useAuthStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { getModeTheme } from '@/utils/appModeTheme';
import { formatUsd } from '@/utils/pricing';
import { canUseStudioServices, getEffectivePlan } from '@/utils/subscriptions';
import { useRouter } from 'expo-router';
import { DollarSign, Megaphone, Music4, PlayCircle, TrendingUp, UploadCloud, Users } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const studioTheme = getModeTheme('studio');

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
    totalPlays,
    totalEngagement,
    totalRevenue,
    followersCount,
    topTracks,
    drafts,
    recentTransactions,
    loading,
  } = useStudioWorkspaceData();

  const kpis = [
    { label: 'Plays', value: totalPlays.toLocaleString(), Icon: PlayCircle },
    { label: 'Followers', value: followersCount.toLocaleString(), Icon: Users },
    { label: 'Engagement', value: totalEngagement.toLocaleString(), Icon: TrendingUp },
    { label: 'Revenue', value: formatUsd(totalRevenue), Icon: DollarSign },
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
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Studio Home</Text>
          <Text style={styles.heroTitle}>Manage uploads, publishing, royalties, and promotions from one creator dashboard.</Text>
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.primaryCta} onPress={() => {
              if (requireStudioSubscription()) return;
              router.push('/(tabs)/search' as any);
            }} activeOpacity={0.9}>
              <UploadCloud size={18} color={appTheme.colors.textPrimary} />
              <Text style={styles.primaryCtaText}>Publish</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryCta} onPress={() => {
              if (requireStudioSubscription()) return;
              router.push('/(tabs)/marketplace' as any);
            }} activeOpacity={0.9}>
              <Megaphone size={18} color={studioTheme.accent} />
              <Text style={styles.secondaryCtaText}>Promote</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.kpiGrid}>
          {kpis.map(({ label, value, Icon }) => (
            <View key={label} style={styles.kpiCard}>
              <View style={styles.kpiIcon}>
                <Icon size={18} color={studioTheme.accent} />
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
                <Music4 size={18} color={studioTheme.accent} />
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
            <TrendingUp size={20} color={appTheme.colors.textPrimary} />
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
};
