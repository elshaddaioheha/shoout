import { auth, db } from '@/firebaseConfig';
import { toggleArtistFollow } from '@/utils/followArtist';
import { doc, onSnapshot } from 'firebase/firestore';
import { create } from 'zustand';

type FollowingMap = Record<string, boolean>;
type PendingMap = Record<string, boolean>;

interface FollowingArtistsState {
  followingArtistIds: FollowingMap;
  pendingByArtistId: PendingMap;
  listening: boolean;
  _unsubscribe: (() => void) | null;
  startListening: () => void;
  stopListening: () => void;
  toggleFollow: (artistId: string) => Promise<{ isFollowing: boolean }>;
}

export const useFollowingArtistsStore = create<FollowingArtistsState>((set, get) => ({
  followingArtistIds: {},
  pendingByArtistId: {},
  listening: false,
  _unsubscribe: null,

  startListening: () => {
    if (get()._unsubscribe) return;

    const uid = auth.currentUser?.uid;
    if (!uid) {
      set({ followingArtistIds: {}, listening: false });
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', uid), (snapshot) => {
      const row = snapshot.data() as any;
      const following = Array.isArray(row?.following) ? row.following : [];
      const map: FollowingMap = {};
      following.forEach((id: string) => {
        map[id] = true;
      });
      set({ followingArtistIds: map, listening: true });
    }, () => {
      set({ listening: false });
    });

    set({ _unsubscribe: unsubscribe, listening: true });
  },

  stopListening: () => {
    const unsub = get()._unsubscribe;
    if (unsub) {
      unsub();
    }
    set({ _unsubscribe: null, listening: false, followingArtistIds: {}, pendingByArtistId: {} });
  },

  toggleFollow: async (artistId: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error('missing-user');
    }
    if (!artistId) {
      throw new Error('missing-artist');
    }

    const pending = get().pendingByArtistId;
    if (pending[artistId]) {
      return { isFollowing: !!get().followingArtistIds[artistId] };
    }

    set({ pendingByArtistId: { ...pending, [artistId]: true } });

    try {
      const result = await toggleArtistFollow({
        artistId,
        currentUserId: uid,
        isCurrentlyFollowing: !!get().followingArtistIds[artistId],
      });
      return { isFollowing: result.isFollowing };
    } finally {
      const nextPending = { ...get().pendingByArtistId };
      delete nextPending[artistId];
      set({ pendingByArtistId: nextPending });
    }
  },
}));
