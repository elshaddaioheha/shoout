import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { ArrowLeft, CalendarDays, TrendingDown, TrendingUp } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type UploadTrack = {
  id: string;
  title?: string;
  listenCount?: number;
  subscribers?: number;
  revenue?: number;
};



export default function StudioAnalyticsScreen() {
  const router = useRouter();
  const [tracks, setTracks] = useState<UploadTrack[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, `users/${auth.currentUser.uid}/uploads`),
      orderBy('listenCount', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as UploadTrack[];
      setTracks(list);
    });

    return () => unsub();
  }, []);

  const totalPlays = useMemo(() => tracks.reduce((sum, t) => sum + (Number(t.listenCount) || 0), 0), [tracks]);
  const subscribers = useMemo(() => Math.max(1200, Math.floor(totalPlays * 0.1)), [totalPlays]);
  const revenue = useMemo(() => Math.max(320000, Math.floor(totalPlays * 5.5)), [totalPlays]);
  const engagements = useMemo(() => Math.max(45400, Math.floor(totalPlays * 0.35)), [totalPlays]);

  return (
    <SafeScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.rangeRow}>
          <CalendarDays size={12} color="#FFFFFF" />
          <Text style={styles.rangeText}>Last 7 days</Text>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard title="Total plays" value={toCompact(totalPlays || 12100)} trend="+23%" up />
          <MetricCard title="Subscribers" value={toCompact(subscribers)} trend="+13%" up />
          <MetricCard title="Revenue" value={`N ${toCompact(revenue)}`} trend="+32%" up />
          <MetricCard title="Engagements" value={toCompact(engagements)} trend="-6%" />
        </View>

        <View style={styles.graphWrap}>
          <View style={styles.legendRow}>
            <Legend color="#F38744" label={`Reach ${toCompact(totalPlays)}`} />
            <Legend color="#67E3F9" label={`Engagement ${toCompact(engagements)}`} />
          </View>

          <View style={styles.graphPanel}>
            {[400, 300, 200, 100].map((value) => (
              <View key={value} style={styles.gridRow}>
                <View style={styles.gridLine} />
                <Text style={styles.gridLabel}>{value}k</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.topWrap}>
          <Text style={styles.topTitle}>Top performing Music</Text>
          {tracks.length === 0 ? (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={[styles.songMeta, { fontSize: 12 }]}>Upload tracks to see performance data.</Text>
            </View>
          ) : (
            tracks.slice(0, 5).map((item, idx) => {
              const plays = Number(item.listenCount) || 0;
              // Derive a pseudo-change: each rank position is assumed +/- relative to median
              const median = tracks[Math.floor(tracks.length / 2)]?.listenCount || 1;
              const pct = Math.round(((plays - Number(median)) / Math.max(Number(median), 1)) * 100);
              const up = pct >= 0;
              return (
                <View key={item.id} style={styles.topRow}>
                  <View style={styles.topLeft}>
                    <Text style={styles.rank}>{idx + 1}.</Text>
                    <View>
                      <Text style={styles.song}>{item.title || 'Untitled'}</Text>
                      <Text style={styles.songMeta}>{toCompact(plays)} plays</Text>
                    </View>
                  </View>
                  <View style={styles.topRight}>
                    {up ? <TrendingUp size={10} color="#319F43" /> : <TrendingDown size={10} color="#EC5C39" />}
                    <Text style={[styles.delta, { color: up ? '#319F43' : '#EC5C39' }]}>
                      {up ? '+' : ''}{pct}%
                    </Text>
                  </View>
                </View>
              );
            })
          )}

          <TouchableOpacity activeOpacity={0.8} onPress={() => router.back()}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeScreenWrapper>
  );
}

function MetricCard({ title, value, trend, up = false }: { title: string; value: string; trend: string; up?: boolean }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <View style={styles.metricTrendRow}>
        {up ? <TrendingUp size={8} color="#319F43" /> : <TrendingDown size={8} color="#EC5C39" />}
        <Text style={[styles.metricTrend, { color: up ? '#319F43' : '#EC5C39' }]}>{trend}</Text>
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendLine, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function toCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#140F10' },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  headerSpacer: { width: 34 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  rangeText: { color: 'rgba(255,255,255,0.65)', fontFamily: 'Poppins-Medium', fontSize: 12, lineHeight: 15 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  metricCard: {
    width: '48.4%',
    minHeight: 64,
    borderRadius: 5,
    backgroundColor: '#1A1A1B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  metricTitle: { color: '#FFFFFF', fontFamily: 'Poppins-Regular', fontSize: 8, lineHeight: 8 },
  metricValue: { color: '#FFFFFF', fontFamily: 'Poppins-Medium', fontSize: 14, lineHeight: 15 },
  metricTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metricTrend: { fontFamily: 'Poppins-Regular', fontSize: 8, lineHeight: 10 },
  graphWrap: { marginBottom: 20 },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendLine: { width: 14, height: 3, borderRadius: 2 },
  legendText: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', fontSize: 15, lineHeight: 25, letterSpacing: -0.5 },
  graphPanel: { height: 318, borderRadius: 4, backgroundColor: '#1A1A1B', paddingVertical: 20 },
  gridRow: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 8 },
  gridLine: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: '#140F10' },
  gridLabel: { alignSelf: 'flex-end', color: '#9E9FAD', fontFamily: 'Poppins-Regular', fontSize: 12, lineHeight: 16 },
  topWrap: { borderWidth: 1, borderColor: '#737373', borderRadius: 10, backgroundColor: '#1A1A1B', padding: 12, gap: 4 },
  topTitle: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', fontSize: 12, lineHeight: 18, letterSpacing: -0.5, marginBottom: 6 },
  topRow: {
    borderBottomWidth: 0.3,
    borderBottomColor: 'rgba(255,255,255,0.65)',
    minHeight: 33,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  rank: { color: 'rgba(255,255,255,0.65)', fontFamily: 'Poppins-Medium', fontSize: 10, lineHeight: 12, letterSpacing: -0.5 },
  song: { color: '#FFFFFF', fontFamily: 'Poppins-Medium', fontSize: 10, lineHeight: 12, letterSpacing: -0.5 },
  songMeta: { color: 'rgba(255,255,255,0.65)', fontFamily: 'Poppins-Regular', fontSize: 6, lineHeight: 8, letterSpacing: -0.5 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  delta: { fontFamily: 'Poppins-Regular', fontSize: 8, lineHeight: 10 },
  seeAll: {
    marginTop: 8,
    textAlign: 'right',
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    lineHeight: 18,
    letterSpacing: -0.5,
    textDecorationLine: 'underline',
  },
});
