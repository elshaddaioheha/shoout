import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SharedHeader from '@/components/SharedHeader';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { theme } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useStudioWorkspaceData } from '@/hooks/useStudioWorkspaceData';
import { useAuthStore } from '@/store/useAuthStore';
import { getModeSurfaceTheme, getModeTheme } from '@/utils/appModeTheme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { formatUsd } from '@/utils/pricing';
import { canUseStudioServices, getEffectivePlan } from '@/utils/subscriptions';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const studioTheme = getModeTheme('studio');

function useStudioPublishStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function StudioPublishScreen() {
  const appTheme = useAppTheme();
  const styles = useStudioPublishStyles();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
  const currentPlan = getEffectivePlan(useAuthStore((state) => state.actualRole));
  const canUseServices = canUseStudioServices(currentPlan);
  const { tracks, drafts, publishedTracks, recentTransactions, loading } = useStudioWorkspaceData();
  const modeTheme = getModeSurfaceTheme(viewMode === 'hybrid' ? 'hybrid' : 'studio', appTheme.isDark);
  const accentColor = modeTheme.accent;
  const accentTint = modeTheme.accentTint;
  const accentCard = modeTheme.accentSoft;
  const onAccent = modeTheme.onAccent;

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
          <Text style={[styles.heroEyebrow, { color: accentColor }]}>Publish</Text>
          <Text style={styles.heroTitle}>Upload tracks, manage releases, and keep royalties visible.</Text>
          <TouchableOpacity style={[styles.heroButton, { backgroundColor: accentColor }]} onPress={() => {
            if (requireStudioSubscription()) return;
            router.push('/studio/upload' as any);
          }} activeOpacity={0.9}>
            <Icon name="upload-cloud" size={18} color={onAccent} />
            <Text style={[styles.heroButtonText, { color: onAccent }]}>Upload New Track</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderColor: accentTint, backgroundColor: accentCard }]}>
            <Text style={styles.summaryValue}>{tracks.length}</Text>
            <Text style={styles.summaryLabel}>All uploads</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: accentTint, backgroundColor: accentCard }]}>
            <Text style={styles.summaryValue}>{publishedTracks.length}</Text>
            <Text style={styles.summaryLabel}>Published</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: accentTint, backgroundColor: accentCard }]}>
            <Text style={styles.summaryValue}>{drafts.length}</Text>
            <Text style={styles.summaryLabel}>Drafts</Text>
          </View>
        </View>

        <View style={[styles.panel, { borderColor: accentTint, backgroundColor: accentCard }]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Track Manager</Text>
            <TouchableOpacity onPress={() => {
              if (requireStudioSubscription()) return;
              router.push('/studio/upload' as any);
            }} activeOpacity={0.8}>
              <Text style={[styles.panelLink, { color: accentColor }]}>Open upload flow</Text>
            </TouchableOpacity>
          </View>
          {loading ? <Text style={styles.placeholder}>Loading uploads...</Text> : null}
          {!loading && tracks.length === 0 ? <Text style={styles.placeholder}>No tracks uploaded yet. Start with your next release.</Text> : null}
          {!loading && tracks.slice(0, 8).map((track) => (
            <View key={track.id} style={styles.trackRow}>
              <View style={styles.trackIcon}>
                <Icon name="music" size={18} color={accentColor} />
              </View>
              <View style={styles.trackInfo}>
                <Text style={styles.trackTitle} numberOfLines={1}>{track.title || 'Untitled Track'}</Text>
                <Text style={styles.trackMeta}>
                  {track.published === true || track.lifecycleStatus === 'published' ? 'Published' : 'Draft'} · {formatUsd(Number(track.price || 0))}
                </Text>
              </View>
              <IconButton
                style={[styles.inlineAction, { backgroundColor: accentTint }]}
                icon="file-pen-line"
                color={accentColor}
                size={16}
                accessibilityLabel="Edit track"
                accessibilityHint="Open the track editor"
                onPress={() => {
                  if (requireStudioSubscription()) return;
                  router.push('/studio/upload' as any);
                }}
              />
            </View>
          ))}
        </View>

        <View style={[styles.panel, { borderColor: accentTint, backgroundColor: accentCard }]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Royalties</Text>
            <TouchableOpacity onPress={() => {
              if (requireStudioSubscription()) return;
              router.push('/studio/earnings' as any);
            }} activeOpacity={0.8}>
              <Text style={[styles.panelLink, { color: accentColor }]}>Open earnings</Text>
            </TouchableOpacity>
          </View>
          {recentTransactions.length === 0 ? <Text style={styles.placeholder}>Royalty-related sales will show here as customers purchase your releases.</Text> : null}
          {recentTransactions.map((tx) => (
            <View key={tx.id} style={styles.trackRow}>
              <View style={styles.trackIcon}>
                <Icon name="circle-dollar-sign" size={18} color={accentColor} />
              </View>
              <View style={styles.trackInfo}>
                <Text style={styles.trackTitle} numberOfLines={1}>{tx.trackTitle || 'Track purchased'}</Text>
                <Text style={styles.trackMeta}>Royalty event</Text>
              </View>
              <Text style={styles.amountText}>{formatUsd(Number(tx.amount || 0))}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const legacyStyles = {
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 20, gap: 18 },
  heroCard: {
    marginTop: 10, backgroundColor: '#1A1A1B', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 12,
  },
  heroEyebrow: { color: studioTheme.accent, fontFamily: 'Poppins-SemiBold', fontSize: 12 },
  heroTitle: { color: theme.colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 22, lineHeight: 30 },
  heroButton: { height: 48, borderRadius: 16, backgroundColor: studioTheme.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  heroButtonText: { color: '#FFF', fontFamily: 'Poppins-SemiBold', fontSize: 14 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1, backgroundColor: '#1A1A1B', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 4 },
  summaryValue: { color: theme.colors.textPrimary, fontFamily: 'Poppins-Bold', fontSize: 20, textAlign: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.56)', fontFamily: 'Poppins-Regular', fontSize: 12, textAlign: 'center' },
  panel: { backgroundColor: '#1A1A1B', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 12 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  panelTitle: { color: theme.colors.textPrimary, fontFamily: 'Poppins-SemiBold', fontSize: 17 },
  panelLink: { color: studioTheme.accent, fontFamily: 'Poppins-Medium', fontSize: 13 },
  placeholder: { color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins-Regular', fontSize: 13, lineHeight: 20 },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  trackIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(76,175,80,0.12)', alignItems: 'center', justifyContent: 'center' },
  trackInfo: { flex: 1 },
  trackTitle: { color: theme.colors.textPrimary, fontFamily: 'Poppins-SemiBold', fontSize: 13 },
  trackMeta: { color: 'rgba(255,255,255,0.55)', fontFamily: 'Poppins-Regular', fontSize: 11, marginTop: 2 },
  inlineAction: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(76,175,80,0.08)' },
  amountText: { color: theme.colors.textPrimary, fontFamily: 'Poppins-SemiBold', fontSize: 12 },
};
