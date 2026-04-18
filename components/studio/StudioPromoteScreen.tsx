import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SharedHeader from '@/components/SharedHeader';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/constants/theme';
import { FontFamily, typography } from '@/constants/typography';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useStudioWorkspaceData } from '@/hooks/useStudioWorkspaceData';
import { useAuthStore } from '@/store/useAuthStore';
import { getModeSurfaceTheme, getModeTheme } from '@/utils/appModeTheme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { canUseStudioServices, getEffectivePlan } from '@/utils/subscriptions';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function useStudioPromoteStyles(modeSurfaceTheme: ReturnType<typeof getModeSurfaceTheme>) {
  const appTheme = useAppTheme();
  return React.useMemo(() => {
    const baseStyles = adaptLegacyStyles(legacyStyles, appTheme) as Record<string, any>;
    const overrides: Record<string, any> = {
      heroCard: { backgroundColor: appTheme.colors.backgroundElevated, borderColor: appTheme.colors.borderStrong },
      heroEyebrow: { color: modeSurfaceTheme.accentLabel },
      heroTitle: { color: appTheme.colors.textPrimary },
      panel: { backgroundColor: appTheme.colors.backgroundElevated, borderColor: appTheme.colors.borderStrong },
      panelTitle: { color: appTheme.colors.textPrimary },
      panelLink: { color: modeSurfaceTheme.accentLabel },
      statusCard: { backgroundColor: appTheme.colors.surfaceMuted, borderColor: appTheme.colors.borderStrong },
      statusValue: { color: appTheme.colors.textPrimary },
      statusLabel: { color: appTheme.colors.textSecondary },
      placeholder: { color: appTheme.colors.textSecondary },
      trackIcon: { backgroundColor: appTheme.colors.surfaceMuted },
      trackTitle: { color: appTheme.colors.textPrimary },
      trackMeta: { color: appTheme.colors.textTertiary },
      promoteChipText: { color: modeSurfaceTheme.accentLabel },
      tipText: { color: appTheme.colors.textPrimary },
      primaryCtaText: { color: modeSurfaceTheme.onAccent },
    };

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
  }, [appTheme, modeSurfaceTheme]);
}

export default function StudioPromoteScreen() {
  const appTheme = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
  const modeKey = viewMode === 'hybrid' ? 'hybrid' : 'studio';
  const modeTheme = getModeTheme(modeKey);
  const modeSurfaceTheme = getModeSurfaceTheme(modeKey, appTheme.isDark);
  const styles = useStudioPromoteStyles(modeSurfaceTheme);
  const currentPlan = getEffectivePlan(useAuthStore((state) => state.actualRole));
  const canUseServices = canUseStudioServices(currentPlan);
  const { topTracks } = useStudioWorkspaceData();
  const accentColor = modeTheme.accent;
  const accentTint = modeSurfaceTheme.actionBorder;
  const accentCard = modeTheme.accentSoft;

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
        <View style={[styles.heroCard, { borderColor: accentTint, backgroundColor: accentCard }]}>
          <Text style={[styles.heroEyebrow, { color: accentColor }]}>Promote</Text>
          <Text style={styles.heroTitle}>Plan campaigns and push your strongest releases in front of more listeners.</Text>
          <TouchableOpacity style={[styles.primaryCta, { backgroundColor: accentColor }]} onPress={() => {
            if (requireStudioSubscription()) return;
            router.push('/studio/ads-intro' as any);
          }} activeOpacity={0.9}>
            <Icon name="rocket" size={18} color={modeSurfaceTheme.onAccent} />
            <Text style={styles.primaryCtaText}>Open Ad Manager</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.panel, { borderColor: accentTint, backgroundColor: accentCard }]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Campaign Readiness</Text>
            <TouchableOpacity onPress={() => {
              if (requireStudioSubscription()) return;
              router.push('/studio/ads-intro' as any);
            }} activeOpacity={0.8}>
              <Text style={[styles.panelLink, { color: accentColor }]}>Create campaign</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusCard, { borderColor: accentTint, backgroundColor: accentCard, borderWidth: 1 }]}>
              <Icon name="megaphone" size={18} color={accentColor} />
              <Text style={styles.statusValue}>0</Text>
              <Text style={styles.statusLabel}>Active campaigns</Text>
            </View>
            <View style={[styles.statusCard, { borderColor: accentTint, backgroundColor: accentCard, borderWidth: 1 }]}> 
              <Icon name="trending-up" size={18} color={accentColor} />
              <Text style={styles.statusValue}>{topTracks.length}</Text>
              <Text style={styles.statusLabel}>Tracks ready</Text>
            </View>
          </View>
        </View>

        <View style={[styles.panel, { borderColor: accentTint, backgroundColor: accentCard }]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Best Tracks To Promote</Text>
            <TouchableOpacity onPress={() => {
              if (requireStudioSubscription()) return;
              router.push('/studio/analytics' as any);
            }} activeOpacity={0.8}>
              <Text style={[styles.panelLink, { color: accentColor }]}>See performance</Text>
            </TouchableOpacity>
          </View>
          {topTracks.length === 0 ? <Text style={styles.placeholder}>Upload and publish tracks first. Your best-performing releases will appear here.</Text> : null}
          {topTracks.map((track) => (
            <View key={track.id} style={styles.trackRow}>
              <View style={[styles.trackIcon, { backgroundColor: accentCard }]}> 
                <Icon name="music" size={18} color={accentColor} />
              </View>
              <View style={styles.trackInfo}>
                <Text style={styles.trackTitle} numberOfLines={1}>{track.title || 'Untitled Track'}</Text>
                <Text style={styles.trackMeta}>{Number(track.listenCount || 0).toLocaleString()} plays · {Number(track.shareCount || 0).toLocaleString()} shares</Text>
              </View>
              <TouchableOpacity style={[styles.promoteChip, { backgroundColor: accentTint }]} onPress={() => {
                if (requireStudioSubscription()) return;
                router.push('/studio/ads-intro' as any);
              }} activeOpacity={0.85}>
                <Text style={[styles.promoteChipText, { color: accentColor }]}>Promote</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={[styles.tipCard, { backgroundColor: accentCard, borderColor: accentTint }]}>
          <Icon name="sparkles" size={18} color={accentColor} />
          <Text style={styles.tipText}>Use Promote to launch ads, refine campaign messaging, and connect new listeners back to your releases.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const legacyStyles = {
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 20, gap: 18 },
  heroCard: { marginTop: 10, backgroundColor: '#1A1A1B', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 12 },
  heroEyebrow: { color: '#4CAF50', ...typography.label, fontFamily: FontFamily.semiBold },
  heroTitle: { color: theme.colors.textPrimary, ...typography.h2, fontFamily: FontFamily.bold },
  primaryCta: { height: 48, borderRadius: 16, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  primaryCtaText: { color: '#FFFFFF', ...typography.buttonSm, fontFamily: FontFamily.semiBold },
  panel: { backgroundColor: '#1A1A1B', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 12 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  panelTitle: { color: theme.colors.textPrimary, ...typography.section, fontFamily: FontFamily.semiBold },
  panelLink: { color: '#4CAF50', ...typography.label, fontFamily: FontFamily.medium },
  statusRow: { flexDirection: 'row', gap: 12 },
  statusCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, alignItems: 'center', gap: 6 },
  statusValue: { color: theme.colors.textPrimary, ...typography.h3, fontFamily: FontFamily.bold },
  statusLabel: { color: 'rgba(255,255,255,0.56)', ...typography.caption, fontFamily: FontFamily.regular, textAlign: 'center' },
  placeholder: { color: 'rgba(255,255,255,0.5)', ...typography.body, fontFamily: FontFamily.regular },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  trackIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(76,175,80,0.12)', alignItems: 'center', justifyContent: 'center' },
  trackInfo: { flex: 1 },
  trackTitle: { color: theme.colors.textPrimary, ...typography.bodyBold, fontFamily: FontFamily.semiBold },
  trackMeta: { color: 'rgba(255,255,255,0.55)', ...typography.small, fontFamily: FontFamily.regular, marginTop: 2 },
  promoteChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(76,175,80,0.12)' },
  promoteChipText: { color: '#4CAF50', ...typography.label, fontFamily: FontFamily.semiBold },
  tipCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: 'rgba(76,175,80,0.1)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(76,175,80,0.2)' },
  tipText: { flex: 1, color: theme.colors.textPrimary, ...typography.body, fontFamily: FontFamily.regular },
};
