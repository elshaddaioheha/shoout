import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { db } from '@/firebaseConfig';
import { useRouter } from 'expo-router';
import { ChevronLeft, Sparkles, Zap, Bell, Flame } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';

type UpdateItem = {
  id: string;
  title: string;
  body: string;
  chip?: string;
  icon?: React.ReactElement;
  dateLabel?: string;
};

type UpdateGroup = {
  id: string;
  label: string;
  items: UpdateItem[];
};

const resolveIcon = (iconKey?: string, tag?: string) => {
  const key = (iconKey || tag || '').toLowerCase();

  if (key.includes('notify') || key.includes('bell') || key.includes('alert')) {
    return <Bell size={18} color="#3B82F6" />;
  }

  if (key.includes('fix') || key.includes('bug') || key.includes('zap') || key.includes('stability')) {
    return <Zap size={18} color="#22C55E" />;
  }

  if (key.includes('ui') || key.includes('design') || key.includes('flame')) {
    return <Flame size={18} color="#F59E0B" />;
  }

  if (key.includes('new') || key.includes('sparkle') || key.includes('launch')) {
    return <Sparkles size={18} color="#EC5C39" />;
  }

  return <Sparkles size={18} color="#EC5C39" />;
};

const fallbackFeed: UpdateGroup[] = [
  {
    id: 'today',
    label: 'Today',
    items: [
      {
        id: 'today-1',
        title: 'New marketplace drops',
        body: 'Fresh beats from trending creators. Dive into the latest uploads.',
        chip: 'New',
        icon: <Sparkles size={18} color="#EC5C39" />,
      },
      {
        id: 'today-2',
        title: 'Notifications refresh',
        body: 'Cleaner in-app alerts with better grouping and faster reads.',
        chip: 'Improved',
        icon: <Bell size={18} color="#3B82F6" />,
      },
    ],
  },
  {
    id: 'recent',
    label: 'Recently',
    items: [
      {
        id: 'recent-1',
        title: 'Profile polish',
        body: 'Updated profile header and stats so fans see your highlights instantly.',
        chip: 'UI',
        icon: <Flame size={18} color="#F59E0B" />,
      },
      {
        id: 'recent-2',
        title: 'Playback stability',
        body: 'Fewer stalls on slow networks and smoother resume across tabs.',
        chip: 'Fix',
        icon: <Zap size={18} color="#22C55E" />,
      },
    ],
  },
];

export default function UpdatesScreen() {
  const router = useRouter();
  const [feed, setFeed] = useState<UpdateGroup[]>(fallbackFeed);

  useEffect(() => {
    const loadUpdates = async () => {
      try {
        const q = query(
          collection(db, 'appUpdates'),
          where('published', '==', true),
          orderBy('publishedAt', 'desc'),
          orderBy('priority', 'desc')
        );
        const snap = await getDocs(q);
        if (snap.empty) return;

        const items: UpdateItem[] = snap.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            title: data.title || 'Update',
            body: data.body || '',
            chip: data.tag || data.chip || undefined,
            icon: resolveIcon(data.icon, data.tag),
            dateLabel: data.publishedAt?.toDate?.()?.toLocaleDateString?.() || '',
          };
        });

        if (!items.length) return;

        const grouped: UpdateGroup = {
          id: 'remote',
          label: 'Latest',
          items,
        };

        setFeed([grouped]);
      } catch (err) {
        console.warn('updates load failed, using fallback feed', err);
      }
    };

    loadUpdates();
  }, []);

  return (
    <SafeScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={22} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Updates</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {feed.map((group) => (
            <View key={group.id} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <View style={styles.cardStack}>
                {group.items.map((item, index) => (
                  <View key={item.id} style={[styles.card, index === 0 && { marginTop: 0 }]}> 
                    <View style={styles.cardHeader}>
                      <View style={styles.iconBadge}>{item.icon || <Sparkles size={18} color="#EC5C39" />}</View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        {item.dateLabel ? <Text style={styles.cardDate}>{item.dateLabel}</Text> : null}
                      </View>
                    </View>
                    <Text style={styles.cardBody}>{item.body}</Text>
                    <View style={styles.footerRow}>
                      {item.chip ? <Text style={styles.chip}>{item.chip}</Text> : <View />}
                      <Text style={styles.meta}>Shoouts · vNext</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#140F10' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#FFF' },
  content: { padding: 20, paddingBottom: 40 },
  group: { marginBottom: 28 },
  groupLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardStack: { gap: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontFamily: 'Poppins-Medium', color: '#FFF' },
  cardDate: { fontSize: 11, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  cardBody: { fontSize: 13, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(236,92,57,0.12)',
    color: '#EC5C39',
    fontSize: 11,
    fontFamily: 'Poppins-Bold',
  },
  meta: { fontSize: 11, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.5)' },
});
