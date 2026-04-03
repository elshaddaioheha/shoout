import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SharedHeader from '@/components/SharedHeader';
import { useStudioWorkspaceData } from '@/hooks/useStudioWorkspaceData';
import { useAuthStore } from '@/store/useAuthStore';
import { canUseStudioServices, getEffectivePlan } from '@/utils/subscriptions';
import { useRouter } from 'expo-router';
import { BarChart3, Megaphone, Music4, Rocket, Sparkles } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StudioPromoteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
  const currentPlan = getEffectivePlan(useAuthStore((state) => state.actualRole));
  const canUseServices = canUseStudioServices(currentPlan);
  const { topTracks } = useStudioWorkspaceData();

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
          <Text style={styles.heroEyebrow}>Promote</Text>
          <Text style={styles.heroTitle}>Plan campaigns and push your strongest releases in front of more listeners.</Text>
          <TouchableOpacity style={styles.primaryCta} onPress={() => {
            if (requireStudioSubscription()) return;
            router.push('/studio/ads-intro' as any);
          }} activeOpacity={0.9}>
            <Rocket size={18} color="#FFF" />
            <Text style={styles.primaryCtaText}>Open Ad Manager</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Campaign Readiness</Text>
            <TouchableOpacity onPress={() => {
              if (requireStudioSubscription()) return;
              router.push('/studio/ads-intro' as any);
            }} activeOpacity={0.8}>
              <Text style={styles.panelLink}>Create campaign</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statusRow}>
            <View style={styles.statusCard}>
              <Megaphone size={18} color="#4CAF50" />
              <Text style={styles.statusValue}>0</Text>
              <Text style={styles.statusLabel}>Active campaigns</Text>
            </View>
            <View style={styles.statusCard}>
              <BarChart3 size={18} color="#4CAF50" />
              <Text style={styles.statusValue}>{topTracks.length}</Text>
              <Text style={styles.statusLabel}>Tracks ready</Text>
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Best Tracks To Promote</Text>
            <TouchableOpacity onPress={() => {
              if (requireStudioSubscription()) return;
              router.push('/studio/analytics' as any);
            }} activeOpacity={0.8}>
              <Text style={styles.panelLink}>See performance</Text>
            </TouchableOpacity>
          </View>
          {topTracks.length === 0 ? <Text style={styles.placeholder}>Upload and publish tracks first. Your best-performing releases will appear here.</Text> : null}
          {topTracks.map((track) => (
            <View key={track.id} style={styles.trackRow}>
              <View style={styles.trackIcon}>
                <Music4 size={18} color="#4CAF50" />
              </View>
              <View style={styles.trackInfo}>
                <Text style={styles.trackTitle} numberOfLines={1}>{track.title || 'Untitled Track'}</Text>
                <Text style={styles.trackMeta}>{Number(track.listenCount || 0).toLocaleString()} plays · {Number(track.shareCount || 0).toLocaleString()} shares</Text>
              </View>
              <TouchableOpacity style={styles.promoteChip} onPress={() => {
                if (requireStudioSubscription()) return;
                router.push('/studio/ads-intro' as any);
              }} activeOpacity={0.85}>
                <Text style={styles.promoteChipText}>Promote</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.tipCard}>
          <Sparkles size={18} color="#4CAF50" />
          <Text style={styles.tipText}>Use Promote to launch ads, refine campaign messaging, and connect new listeners back to your releases.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#140F10' },
  content: { paddingHorizontal: 20, gap: 18 },
  heroCard: { marginTop: 10, backgroundColor: '#1A1A1B', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 12 },
  heroEyebrow: { color: '#4CAF50', fontFamily: 'Poppins-SemiBold', fontSize: 12 },
  heroTitle: { color: '#FFF', fontFamily: 'Poppins-Bold', fontSize: 22, lineHeight: 30 },
  primaryCta: { height: 48, borderRadius: 16, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 4 },
  primaryCtaText: { color: '#FFF', fontFamily: 'Poppins-SemiBold', fontSize: 14 },
  panel: { backgroundColor: '#1A1A1B', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 12 },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  panelTitle: { color: '#FFF', fontFamily: 'Poppins-SemiBold', fontSize: 17 },
  panelLink: { color: '#4CAF50', fontFamily: 'Poppins-Medium', fontSize: 13 },
  statusRow: { flexDirection: 'row', gap: 12 },
  statusCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, alignItems: 'center', gap: 6 },
  statusValue: { color: '#FFF', fontFamily: 'Poppins-Bold', fontSize: 20 },
  statusLabel: { color: 'rgba(255,255,255,0.56)', fontFamily: 'Poppins-Regular', fontSize: 12, textAlign: 'center' },
  placeholder: { color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins-Regular', fontSize: 13, lineHeight: 20 },
  trackRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  trackIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(76,175,80,0.12)', alignItems: 'center', justifyContent: 'center' },
  trackInfo: { flex: 1 },
  trackTitle: { color: '#FFF', fontFamily: 'Poppins-SemiBold', fontSize: 13 },
  trackMeta: { color: 'rgba(255,255,255,0.55)', fontFamily: 'Poppins-Regular', fontSize: 11, marginTop: 2 },
  promoteChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(76,175,80,0.12)' },
  promoteChipText: { color: '#4CAF50', fontFamily: 'Poppins-SemiBold', fontSize: 12 },
  tipCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: 'rgba(76,175,80,0.1)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(76,175,80,0.2)' },
  tipText: { flex: 1, color: '#FFF', fontFamily: 'Poppins-Regular', fontSize: 13, lineHeight: 20 },
});
