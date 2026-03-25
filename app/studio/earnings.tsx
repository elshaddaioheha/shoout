import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { formatUsd } from '@/utils/pricing';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { ArrowLeft, DollarSign, Mic, Users } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type TransactionItem = {
  id: string;
  trackTitle?: string;
  amount?: number;
  createdAt?: any;
};

export default function StudioEarningsScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'transactions'),
      where('sellerId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const tx = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as TransactionItem[];
      setTransactions(tx);
    });

    return () => unsub();
  }, []);

  const netSales = useMemo(
    () => transactions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [transactions]
  );

  const stats = [
    { title: 'Net Sales', value: formatUsd(netSales), icon: <DollarSign size={18} color="#FFFFFF" /> },
    { title: 'New Subscribers', value: '0.00', icon: <Users size={18} color="#FFFFFF" /> },
    { title: 'Total Uploaded Track', value: `${transactions.length}`, icon: <Mic size={18} color="#FFFFFF" /> },
  ];

  return (
    <SafeScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sales & Earnings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.title} style={styles.statCard}>
              <View style={styles.statIconWrap}>{stat.icon}</View>
              <Text style={styles.statTitle}>{stat.title}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </ScrollView>

        {transactions.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No earnings yet</Text>
            <Text style={styles.emptySub}>Your sales transactions will appear here.</Text>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {transactions.slice(0, 20).map((item) => (
              <View key={item.id} style={styles.txRow}>
                <Text style={styles.txTitle}>{item.trackTitle || 'Track purchased'}</Text>
                <Text style={styles.txAmount}>{formatUsd(Number(item.amount) || 0)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#140F10' },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', fontSize: 20, lineHeight: 25, letterSpacing: -0.5 },
  headerSpacer: { width: 34 },
  statsRow: { gap: 10, paddingBottom: 16 },
  statCard: {
    width: 170,
    height: 74,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#140F10',
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  statIconWrap: { position: 'absolute', top: 8, right: 8 },
  statTitle: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', fontSize: 12, lineHeight: 15, letterSpacing: -0.5 },
  statValue: { color: '#FFFFFF', fontFamily: 'Poppins-Regular', fontSize: 12, lineHeight: 25, letterSpacing: -0.5 },
  listWrap: { gap: 10, marginTop: 4 },
  txRow: {
    minHeight: 69,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#767676',
    backgroundColor: '#140F10',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  txTitle: { width: '58%', color: '#FFFFFF', fontFamily: 'Poppins-Regular', fontSize: 12, lineHeight: 21, letterSpacing: -0.5 },
  txAmount: { color: '#FFFFFF', fontFamily: 'Poppins-Regular', fontSize: 12, lineHeight: 25, letterSpacing: -0.5 },
  emptyWrap: {
    marginTop: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { color: '#FFFFFF', fontFamily: 'Poppins-Medium', fontSize: 14, lineHeight: 12, letterSpacing: -0.5 },
  emptySub: { marginTop: 8, color: 'rgba(255,255,255,0.37)', fontFamily: 'Poppins-Regular', fontSize: 8, lineHeight: 12, letterSpacing: -0.5 },
});
