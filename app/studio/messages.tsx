import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { ArrowLeft, MessageSquarePlus, UserRound } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type MessageRow = {
  id: string;
  chatId?: string;
  otherUserId?: string;
  name: string;
  preview: string;
  time: string;
  unread: number;
};

export default function StudioMessagesScreen() {
  const router = useRouter();
  const [liveRows, setLiveRows] = useState<MessageRow[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('lastTimestamp', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const rows: MessageRow[] = snapshot.docs.map((doc) => {
        const data: any = doc.data();
        const other = (data.participants || []).find((p: string) => p !== auth.currentUser?.uid) || 'user';
        const timestamp = data?.lastTimestamp?.toDate?.();
        const time = timestamp
          ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '--:--';

        return {
          id: doc.id,
          chatId: doc.id,
          otherUserId: String(other),
          name: data?.otherUser?.name || `User ${String(other).slice(-4)}`,
          preview: data?.lastMessage || 'Start a conversation',
          time,
          unread: data?.unreadCount?.[auth.currentUser?.uid || ''] || 0,
        };
      });
      setLiveRows(rows);
    });

    return () => unsub();
  }, []);

  const rows = liveRows;

  return (
    <SafeScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.leftHeader}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.85}>
              <ArrowLeft size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Message</Text>
          </View>
          <TouchableOpacity activeOpacity={0.85}>
            <MessageSquarePlus size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {rows.length === 0 ? (
          <View style={styles.emptyWrap}>
            <UserRound size={44} color="rgba(255,255,255,0.37)" />
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.emptySub}>Send a message and turn conversations into shoutouts</Text>
            <TouchableOpacity style={styles.startBtn}>
              <Text style={styles.startBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listWrap}>
            {rows.map((row) => (
              <TouchableOpacity
                key={row.id}
                style={styles.row}
                activeOpacity={0.9}
                onPress={() =>
                  router.push({
                    pathname: '/studio/message-thread' as any,
                    params: {
                      id: row.id,
                      chatId: row.chatId,
                      otherUserId: row.otherUserId,
                      name: row.name,
                    },
                  })
                }
              >
                <View style={styles.avatar} />
                <View style={styles.infoCol}>
                  <View style={styles.infoTop}>
                    <Text style={styles.name}>{row.name}</Text>
                    <Text style={[styles.time, row.unread > 0 && styles.timeUnread]}>{row.time}</Text>
                  </View>
                  <View style={styles.infoBottom}>
                    <Text style={styles.preview} numberOfLines={1}>{row.preview}</Text>
                    {row.unread > 0 ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{row.unread}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#140F10' },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  leftHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  title: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', fontSize: 20, lineHeight: 25, letterSpacing: -0.5 },
  emptyWrap: { marginTop: 150, alignItems: 'center', gap: 12 },
  emptyTitle: { color: '#FFFFFF', fontFamily: 'Poppins-Medium', fontSize: 14, lineHeight: 12, letterSpacing: -0.5 },
  emptySub: { color: 'rgba(255,255,255,0.37)', fontFamily: 'Poppins-Medium', fontSize: 8, lineHeight: 12, letterSpacing: -0.5 },
  startBtn: { marginTop: 2, paddingHorizontal: 12, height: 20, borderRadius: 5, backgroundColor: '#EC5C39', alignItems: 'center', justifyContent: 'center' },
  startBtnText: { color: '#FFFFFF', fontFamily: 'Poppins-Medium', fontSize: 8, lineHeight: 12 },
  listWrap: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  avatar: { width: 40, height: 40, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.2)' },
  infoCol: { marginLeft: 12, flex: 1, gap: 4 },
  infoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', fontSize: 16, lineHeight: 20, letterSpacing: -0.5 },
  time: { color: '#FFFFFF', fontFamily: 'Poppins-Medium', fontSize: 8, lineHeight: 12, letterSpacing: -0.5 },
  timeUnread: { color: '#EC5C39' },
  infoBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  preview: { color: 'rgba(255,255,255,0.75)', fontFamily: 'Poppins-Medium', fontSize: 12, lineHeight: 12, letterSpacing: -0.5, width: '86%' },
  badge: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#EC5C39', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontFamily: 'Poppins-Regular', fontSize: 8, lineHeight: 12, letterSpacing: -0.5 },
});
