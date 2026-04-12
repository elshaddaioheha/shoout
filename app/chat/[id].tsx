import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useUserStore } from '@/store/useUserStore';
import { adaptLegacyColor, adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    addDoc,
    collection,
    doc,
    getDocs,
    getDoc,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import {
    ChevronLeft,
    Phone,
    Send,
    User,
    Video
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: any;
}

function useChatStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function ChatConversationScreen() {
    const appTheme = useAppTheme();
    const styles = useChatStyles();
    const placeholderColor = appTheme.colors.textPlaceholder;
    const avatarIconColor = adaptLegacyColor('rgba(255,255,255,0.4)', 'color', appTheme);

    const { id: otherUserId } = useLocalSearchParams();
    const router = useRouter();
    const { name, role } = useUserStore();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [chatId, setChatId] = useState<string | null>(null);
    const [otherUser, setOtherUser] = useState<any>(null);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!auth.currentUser || !otherUserId) return;

        // 1. Fetch Chat Session between currentUser and otherUserId
        const fetchChat = async () => {
            try {
                const chatsRef = collection(db, 'chats');
                const q = query(
                    chatsRef,
                    where('participants', 'array-contains', auth.currentUser!.uid)
                );

                const snapshot = await getDocs(q);
                // Filter client side because Firestore array-contains doesn't support multiple values
                const existingChat = snapshot.docs.find(doc => {
                    const participants = doc.data().participants as string[];
                    return participants.includes(otherUserId as string);
                });

                if (existingChat) {
                    setChatId(existingChat.id);
                    setOtherUser(existingChat.data().otherUser || { name: `User ...${(otherUserId as string).slice(-4)}` });
                } else {
                    // Chat doesn't exist yet - we'll create it when the first message is sent
                    // But we might want some basic context from the other user profile
                    setOtherUser({ name: `User ...${(otherUserId as string).slice(-4)}` });
                }
            } catch (err) {
                console.error("Error fetching/initializing chat:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchChat();
    }, [otherUserId]);

    // 2. Listen to messages if chatId exists
    useEffect(() => {
        if (!chatId) return;

        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message));
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [chatId]);

    const handleSendMessage = async () => {
        if (!inputText.trim() || !auth.currentUser || !otherUserId) return;

        const messageText = inputText.trim();
        setInputText('');
        setSending(true);

        try {
            const senderUid = auth.currentUser.uid;

            // Rule: Shoout user can send only one message to a studio/hybrid user until they are followed back.
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

                if (senderFollowsRecipient && recipientIsStudio && !recipientFollowsBack) {
                    const currentChatId = chatId;
                    if (currentChatId) {
                        const priorMineQ = query(
                            collection(db, 'chats', currentChatId, 'messages'),
                            where('senderId', '==', senderUid),
                            limit(1)
                        );
                        const priorMine = await getDocs(priorMineQ);
                        if (!priorMine.empty) {
                            setInputText(messageText);
                            Alert.alert('Message limit reached', 'You can send one message until this studio follows you back.');
                            return;
                        }
                    }
                }
            }

            let currentChatId = chatId;

            // Create chat if it doesn't exist
            if (!currentChatId) {
                const newChatRef = await addDoc(collection(db, 'chats'), {
                    participants: [auth.currentUser.uid, otherUserId],
                    lastMessage: messageText,
                    lastTimestamp: serverTimestamp(),
                    otherUser: { name: `User ...${(otherUserId as string).slice(-4)}` }, // Placeholder for now
                    unreadCount: { [otherUserId as string]: 1, [auth.currentUser.uid]: 0 }
                });
                currentChatId = newChatRef.id;
                setChatId(currentChatId);
            } else {
                // Update existing chat metadata
                await updateDoc(doc(db, 'chats', currentChatId), {
                    lastMessage: messageText,
                    lastTimestamp: serverTimestamp(),
                });
            }

            // Add the message to the messages subcollection
            await addDoc(collection(db, 'chats', currentChatId, 'messages'), {
                senderId: auth.currentUser.uid,
                text: messageText,
                timestamp: serverTimestamp()
            });

            // Trigger a live Notification for the recipient
            await addDoc(collection(db, `users/${otherUserId}/notifications`), {
                userId: otherUserId,
                type: 'message',
                title: 'New Message',
                body: `${name || 'Someone'} sent you a message: "${messageText.length > 20 ? messageText.substring(0, 20) + '...' : messageText}"`,
                read: false,
                createdAt: serverTimestamp(),
                meta: {
                    chatId: currentChatId,
                    otherUserId: auth.currentUser.uid
                }
            });

        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isMine = item.senderId === auth.currentUser?.uid;

        return (
            <View style={[styles.messageWrapper, isMine ? styles.myMessage : styles.theirMessage]}>
                <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
                    <Text style={[styles.messageText, isMine ? styles.myText : styles.theirText]}>
                        {item.text}
                    </Text>
                    {item.timestamp && (
                        <Text style={[styles.messageTime, isMine ? styles.myTime : styles.theirTime]}>
                            {item.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeScreenWrapper>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Custom Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                        <ChevronLeft size={24} color={appTheme.colors.textPrimary} />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <View style={styles.headerAvatar}>
                            <User size={18} color={avatarIconColor} />
                        </View>
                        <View>
                            <Text style={styles.headerName}>{otherUser?.name || '...'}</Text>
                            <Text style={styles.headerStatus}>Online</Text>
                        </View>
                    </View>

                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert('Coming Soon')}>
                            <Phone size={20} color={appTheme.colors.textPrimary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert('Coming Soon')}>
                            <Video size={20} color={appTheme.colors.textPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator color={appTheme.colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={(item) => item.id}
                        renderItem={renderMessage}
                        contentContainerStyle={styles.messageList}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>Say hi to start a conversation!</Text>
                            </View>
                        }
                    />
                )}

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor={placeholderColor}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]}
                            onPress={handleSendMessage}
                            disabled={!inputText.trim() || sending}
                        >
                            {sending ? (
                                <ActivityIndicator size="small" color={appTheme.colors.textPrimary} />
                            ) : (
                                <Send size={20} color={appTheme.colors.textPrimary} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeScreenWrapper>
    );
}

const legacyStyles = {
    container: {
        flex: 1,
        backgroundColor: '#140F10',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#1E1A1B',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    headerBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10,
    },
    headerAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    headerName: {
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
    },
    headerStatus: {
        fontSize: 11,
        fontFamily: 'Poppins-Regular',
        color: '#10B981',
    },
    headerIcons: {
        flexDirection: 'row',
        gap: 15,
    },
    iconBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    messageList: {
        padding: 20,
        paddingBottom: 30,
    },
    messageWrapper: {
        marginBottom: 15,
        maxWidth: '80%',
    },
    myMessage: {
        alignSelf: 'flex-end',
    },
    theirMessage: {
        alignSelf: 'flex-start',
    },
    bubble: {
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    myBubble: {
        backgroundColor: '#EC5C39',
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        backgroundColor: '#2A2526',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
    },
    myText: { color: '#FFF' },
    theirText: { color: '#FFF' },
    messageTime: {
        fontSize: 10,
        fontFamily: 'Poppins-Regular',
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    myTime: { color: 'rgba(255,255,255,0.7)' },
    theirTime: { color: 'rgba(255,255,255,0.4)' },
    inputContainer: {
        padding: 20,
        backgroundColor: '#140F10',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1A1B',
        borderRadius: 25,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    input: {
        flex: 1,
        color: '#FFF',
        fontFamily: 'Poppins-Regular',
        fontSize: 15,
        paddingVertical: 10,
        maxHeight: 100,
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EC5C39',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
    },
};
