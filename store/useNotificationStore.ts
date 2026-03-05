import { auth, db } from '@/firebaseConfig';
import {
    Timestamp,
    collection,
    doc,
    limit,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { create } from 'zustand';

export type NotificationType =
    | 'message'        // New chat message from seller/buyer
    | 'artist_update'  // Artist/producer dropped new content
    | 'marketplace'    // New beat/sample matching user's taste
    | 'subscription'   // Tier change confirmation
    | 'system';        // General app announcements

export interface AppNotification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    read: boolean;
    createdAt: Timestamp;
    meta?: {
        chatId?: string;
        otherUserId?: string;
        artistId?: string;
        trackId?: string;
        imageUrl?: string;
    };
}

interface NotificationStore {
    notifications: AppNotification[];
    unreadCount: number;
    loading: boolean;
    _unsubscribe: (() => void) | null;

    startListening: () => void;
    stopListening: () => void;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    _unsubscribe: null,

    startListening: () => {
        // Prevent double subscriptions
        const existing = get()._unsubscribe;
        if (existing) return;

        const uid = auth.currentUser?.uid;
        if (!uid) return;

        set({ loading: true });

        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', uid),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const notifications = snap.docs.map(d => ({
                id: d.id,
                ...d.data(),
            })) as AppNotification[];

            const unreadCount = notifications.filter(n => !n.read).length;
            set({ notifications, unreadCount, loading: false });
        }, (err) => {
            console.error('[NotificationStore] snapshot error:', err);
            set({ loading: false });
        });

        set({ _unsubscribe: unsubscribe });
    },

    stopListening: () => {
        const unsub = get()._unsubscribe;
        if (unsub) {
            unsub();
            set({ _unsubscribe: null });
        }
    },

    markAsRead: async (id: string) => {
        try {
            await updateDoc(doc(db, 'notifications', id), { read: true });
        } catch (e) {
            console.error('[NotificationStore] markAsRead error:', e);
        }
    },

    markAllAsRead: async () => {
        const unread = get().notifications.filter(n => !n.read);
        if (!unread.length) return;
        const batch = writeBatch(db);
        unread.forEach(n => {
            batch.update(doc(db, 'notifications', n.id), { read: true });
        });
        await batch.commit();
    },
}));
