import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { ArrowLeft, CalendarDays, TrendingDown, TrendingUp } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type UploadTrack = {
  id: string;
  title?: string;
  listenCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
};

type TransactionRow = {
  id: string;
  amount?: number;
};


export default function StudioAnalyticsScreen() {
  const router = useRouter();
  const [tracks, setTracks] = useState<UploadTrack[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const uid = auth.currentUser.uid;

    const q = query(
      collection(db, `users/${uid}/uploads`),
      orderBy('listenCount', 'desc')
    );

    const uploadsUnsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as UploadTrack[];
      setTracks(list);
    });

    const userUnsub = onSnapshot(doc(db, 'users', uid), (snapshot) => {
      const userData: any = snapshot.data() || {};
      const followers = Array.isArray(userData.followers)
        ? userData.followers.length
        : Number(userData.followers) || 0;
      setFollowersCount(followers);
    });

    const txQuery = query(collection(db, 'transactions'), where('sellerId', '==', uid));
    const txUnsub = onSnapshot(txQuery, (snapshot) => {
      setTransactions(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as TransactionRow[]);
    });

    return () => {
      uploadsUnsub();
      userUnsub();
      txUnsub();
    };
  }, []);

  const totalPlays = useMemo(() => tracks.reduce((sum, t) => sum + (Number(t.listenCount) || 0), 0), [tracks]);
  const subscribers = useMemo(() => followersCount, [followersCount]);
  const revenue = useMemo(
    () => transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0),
    [transactions]
  );
  const engagements = useMemo(
    () =>
      tracks.reduce(
        (sum, t) => sum + (Number(t.likeCount) || 0) + (Number(t.commentCount) || 0) + (Number(t.shareCount) || 0),
        0
      ),
    [tracks]
  );

  const chartData = useMemo(() => {
    const topTracks = [...tracks]
      .sort((a, b) => (Number(b.listenCount) || 0) - (Number(a.listenCount) || 0))
      .slice(0, 4);

    if (topTracks.length === 0) {
      return [] as Array<{ id: string; label: string; value: number; heightPercent: number }>;
    }

    const maxValue = Math.max(...topTracks.map((track) => Number(track.listenCount) || 0), 1);

    return topTracks.map((track) => {
      const value = Number(track.listenCount) || 0;
      return {
        id: track.id,
        label: (track.title || 'Untitled').slice(0, 8),
        value,
        heightPercent: Math.max(8, Math.round((value / maxValue) * 100)),
      };
    });
  }, [tracks]);

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
          <MetricCard title="Total plays" value={toCompact(totalPlays)} />
          <MetricCard title="Followers" value={toCompact(subscribers)} />
          <MetricCard title="Revenue" value={`N ${toCompact(revenue)}`} />
          <MetricCard title="Engagements" value={toCompact(engagements)} />
        </View>

        <View style={styles.graphWrap}>
          <View style={styles.legendRow}>
            <Legend color="#F38744" label={`Reach ${toCompact(totalPlays)}`} />
            <Legend color="#67E3F9" label={`Engagement ${toCompact(engagements)}`} />
          </View>

          <View style={styles.graphPanel}>
            {[4, 3, 2, 1].map((value) => (
              <View key={value} style={styles.gridRow}>
                <View style={styles.gridLine} />
                <Text style={styles.gridLabel}>{value * 25}%</Text>
              </View>
            ))}

            <View style={styles.barsRow}>
              {chartData.length === 0 ? (
                <Text style={styles.noChartText}>No track play data yet.</Text>
              ) : (
                chartData.map((bar) => (
                  <View key={bar.id} style={styles.barItem}>
                    <View style={[styles.barFill, { height: `${bar.heightPercent}%` }]} />
                    <Text style={styles.barLabel}>{bar.label}</Text>
                    <Text style={styles.barValue}>{toCompact(bar.value)}</Text>
                  </View>
                ))
              )}
            </View>
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

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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
  barsRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    top: 20,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  barItem: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  barFill: {
    width: 20,
    borderRadius: 6,
    backgroundColor: '#F38744',
    minHeight: 8,
  },
  barLabel: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 9,
    lineHeight: 12,
  },
  barValue: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'Poppins-Regular',
    fontSize: 8,
    lineHeight: 10,
  },
  noChartText: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
  },
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
