import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { useRouter } from 'expo-router';
import {
    collection,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
    where
} from 'firebase/firestore';
import {
    ChevronLeft,
    MessageSquare,
    Search,
    User
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface ChatSession {
    id: string;
    participants: string[];
    lastMessage: string;
    lastTimestamp: Timestamp;
    unreadCount?: { [userId: string]: number };
    otherUser?: {
        name: string;
        avatar?: string;
    };
}

export default function ChatListScreen() {
    const router = useRouter();
    const [chats, setChats] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!auth.currentUser) return;

        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', auth.currentUser.uid),
            orderBy('lastTimestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChatSession));

            setChats(chatData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching chats:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredChats = chats.filter(chat =>
        chat.otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderChatItem = ({ item }: { item: ChatSession }) => {
        const unreadNum = item.unreadCount?.[auth.currentUser?.uid || ''] || 0;
        const hasUnread = unreadNum > 0;
        const otherUserId = item.participants.find(p => p !== auth.currentUser?.uid);

        return (
            <TouchableOpacity
                style={styles.chatCard}
                onPress={() => router.push({ pathname: '/chat/[id]', params: { id: otherUserId || '' } })}
            >
                <View style={styles.avatarContainer}>
                    <View style={styles.avatar}>
                        <User size={24} color="rgba(255,255,255,0.4)" />
                    </View>
                    {hasUnread && <View style={styles.unreadDot} />}
                </View>

                <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                        <Text style={styles.userName}>
                            {item.otherUser?.name || `User ...${otherUserId?.slice(-4)}`}
                        </Text>
                        <Text style={styles.timestamp}>
                            {item.lastTimestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                    <Text
                        style={[styles.lastMessage, hasUnread ? styles.unreadText : null]}
                        numberOfLines={1}
                    >
                        {item.lastMessage || "Start a conversation"}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Messages</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Search size={18} color="rgba(255,255,255,0.3)" />
                        <TextInput
                            placeholder="Search messages..."
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            style={styles.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator color="#EC5C39" />
                    </View>
                ) : chats.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <MessageSquare size={48} color="rgba(255,255,255,0.05)" />
                        <Text style={styles.emptyTitle}>No messages yet</Text>
                        <Text style={styles.emptySub}>Connect with creators and buyers here.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredChats}
                        keyExtractor={(item) => item.id}
                        renderItem={renderChatItem}
                        contentContainerStyle={styles.listContent}
                    />
                )}
            </View>
        </SafeScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#140F10',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 15,
        paddingHorizontal: 15,
        height: 45,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        color: '#FFF',
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
    },
    listContent: {
        paddingHorizontal: 20,
    },
    chatCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 55,
        height: 55,
        borderRadius: 27.5,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    unreadDot: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#EC5C39',
        borderWidth: 2,
        borderColor: '#140F10',
    },
    chatInfo: {
        flex: 1,
        marginLeft: 15,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    userName: {
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
    },
    timestamp: {
        fontSize: 11,
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.3)',
    },
    lastMessage: {
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.5)',
    },
    unreadText: {
        color: '#FFF',
        fontFamily: 'Poppins-SemiBold',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 100,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
        marginTop: 15,
    },
    emptySub: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
        marginTop: 5,
    },
});
