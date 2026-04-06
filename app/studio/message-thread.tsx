import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { useUserStore } from '@/store/useUserStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Camera, Paperclip, SendHorizontal } from 'lucide-react-native';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Bubble = {
  id: string;
  text: string;
  time: any;
  mine: boolean;
  senderId?: string;
};

export default function StudioMessageThreadScreen() {
  const router = useRouter();
  const { role } = useUserStore();
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    chatId?: string;
    otherUserId?: string;
  }>();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [resolvedChatId, setResolvedChatId] = useState<string | null>(null);

  const userName = useMemo(() => String(params?.name || 'Message'), [params?.name]);
  const otherUserId = useMemo(
    () => String(params?.otherUserId || params?.id || ''),
    [params?.otherUserId, params?.id]
  );

  useEffect(() => {
    if (!auth.currentUser) return;

    const directChatId = params?.chatId ? String(params.chatId) : '';
    if (directChatId) {
      setResolvedChatId(directChatId);
      return;
    }

    if (!otherUserId) return;

    const resolveChat = async () => {
      try {
        const q = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', auth.currentUser!.uid)
        );
        const snapshot = await getDocs(q);
        const existing = snapshot.docs.find((chatDoc) => {
          const participants = (chatDoc.data().participants || []) as string[];
          return participants.includes(otherUserId);
        });
        setResolvedChatId(existing ? existing.id : null);
      } catch (error) {
        console.error('Resolve chat error:', error);
      }
    };

    resolveChat();
  }, [otherUserId, params?.chatId]);

  useEffect(() => {
    if (!resolvedChatId || !auth.currentUser) return;

    updateDoc(doc(db, 'chats', resolvedChatId), {
      [`unreadCount.${auth.currentUser.uid}`]: 0,
    }).catch(() => {
      // Keep thread usable even if this metadata update fails.
    });

    const q = query(
      collection(db, 'chats', resolvedChatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const rows = snapshot.docs.map((msgDoc) => {
        const data: any = msgDoc.data();
        return {
          id: msgDoc.id,
          text: data.text || '',
          time: data.timestamp,
          senderId: data.senderId,
          mine: data.senderId === auth.currentUser?.uid,
        } as Bubble;
      });
      setMessages(rows);
    });

    return () => unsub();
  }, [resolvedChatId]);

  const send = async () => {
    if (!auth.currentUser) return;
    if (!otherUserId) return;
    const text = input.trim();
    if (!text) return;

    setInput('');

    try {
      const senderUid = auth.currentUser.uid;

      if (role === 'shoout') {
        const senderSnap = await getDoc(doc(db, `users/${senderUid}`));
        const recipientSnap = await getDoc(doc(db, `users/${String(otherUserId)}`));

        const senderData = senderSnap.data() as any;
        const recipientData = recipientSnap.data() as any;
        const senderFollowing = Array.isArray(senderData?.following) ? senderData.following : [];
        const recipientFollowing = Array.isArray(recipientData?.following) ? recipientData.following : [];
        const recipientRole = String(recipientData?.role || recipientData?.actualRole || '').toLowerCase();
        const senderFollowsRecipient = senderFollowing.includes(String(otherUserId));
        const recipientFollowsBack = recipientFollowing.includes(senderUid);
        const recipientIsStudio = recipientRole.startsWith('studio') || recipientRole.startsWith('hybrid');

        if (senderFollowsRecipient && recipientIsStudio && !recipientFollowsBack && resolvedChatId) {
          const priorMineQ = query(
            collection(db, 'chats', resolvedChatId, 'messages'),
            where('senderId', '==', senderUid),
            limit(1)
          );
          const priorMine = await getDocs(priorMineQ);
          if (!priorMine.empty) {
            setInput(text);
            Alert.alert('Message limit reached', 'You can send one message until this studio follows you back.');
            return;
          }
        }
      }

      let chatId = resolvedChatId;

      if (!chatId) {
        const created = await addDoc(collection(db, 'chats'), {
          participants: [auth.currentUser.uid, otherUserId],
          lastMessage: text,
          lastTimestamp: serverTimestamp(),
          otherUser: { name: userName },
          unreadCount: {
            [otherUserId]: 1,
            [auth.currentUser.uid]: 0,
          },
        });
        chatId = created.id;
        setResolvedChatId(chatId);
      } else {
        await updateDoc(doc(db, 'chats', chatId), {
          lastMessage: text,
          lastTimestamp: serverTimestamp(),
          [`unreadCount.${otherUserId}`]: increment(1),
          [`unreadCount.${auth.currentUser.uid}`]: 0,
        });
      }

      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: auth.currentUser.uid,
        text,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  return (
    <SafeScreenWrapper>
      <View style={styles.container}>
        <View style={styles.headerWrap}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.85}>
              <ArrowLeft size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.userRow}>
              <View style={styles.avatar} />
              <View>
                <Text style={styles.userName}>{userName}</Text>
                <Text style={styles.userStatus}>Active 5h ago</Text>
              </View>
            </View>
          </View>
          <View style={styles.headerLine} />
        </View>

        <ScrollView style={styles.thread} contentContainerStyle={styles.threadContent}>
          {messages.length === 0 ? (
            <View style={styles.emptyThreadWrap}>
              <Text style={styles.emptyThreadText}>No messages yet. Start the conversation.</Text>
            </View>
          ) : null}
          {messages.map((message) => (
            <View key={message.id} style={[styles.bubble, message.mine ? styles.bubbleMine : styles.bubbleOther]}>
              <Text style={styles.bubbleText}>{message.text}</Text>
              <Text style={styles.bubbleTime}>{formatTime(message.time)}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <View style={styles.attachGroup}>
            <Paperclip size={20} color="#FFFFFF" />
            <Camera size={18} color="#FFFFFF" />
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type your message here"
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={styles.input}
            />
            <TouchableOpacity onPress={send} activeOpacity={0.85}>
              <SendHorizontal size={16} color="#EC5C39" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeScreenWrapper>
  );
}

function formatTime(timestamp: any) {
  if (!timestamp) return 'Now';
  const date = typeof timestamp?.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Now';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#140F10' },
  headerWrap: { marginTop: 12 },
  headerRow: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  avatar: { width: 30, height: 30, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.2)' },
  userName: { color: '#FFFFFF', fontFamily: 'Poppins-SemiBold', fontSize: 12, lineHeight: 16, letterSpacing: -0.5 },
  userStatus: { color: '#FFFFFF', fontFamily: 'Poppins-Regular', fontSize: 8, lineHeight: 10, letterSpacing: -0.5 },
  headerLine: { marginTop: 12, borderTopWidth: 0.3, borderTopColor: 'rgba(255,255,255,0.5)' },
  thread: { flex: 1 },
  threadContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, gap: 16 },
  emptyThreadWrap: {
    marginTop: 24,
    alignItems: 'center',
  },
  emptyThreadText: {
    color: 'rgba(255,255,255,0.37)',
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: -0.5,
  },
  bubble: { maxWidth: 157, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 8 },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: '#1A1A1B' },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: '#EC5C39' },
  bubbleText: { color: '#FFFFFF', fontFamily: 'Poppins-Medium', fontSize: 8, lineHeight: 12, letterSpacing: -0.5 },
  bubbleTime: { marginTop: 6, alignSelf: 'flex-end', color: '#FFFFFF', fontFamily: 'Poppins-Regular', fontSize: 4, lineHeight: 8, letterSpacing: -0.5 },
  inputBar: {
    height: 58,
    borderTopWidth: 0.3,
    borderTopColor: 'rgba(255,255,255,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
  },
  attachGroup: { flexDirection: 'row', alignItems: 'center', gap: 12, width: 56 },
  inputWrap: {
    flex: 1,
    height: 32,
    borderRadius: 5,
    backgroundColor: '#1A1A1B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 11,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: -0.5,
    paddingVertical: 0,
  },
});
