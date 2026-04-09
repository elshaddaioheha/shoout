import { auth, db } from '@/firebaseConfig';
import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

type UploadTrack = {
  id: string;
  title?: string;
  artworkUrl?: string;
  coverUrl?: string;
  listenCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  price?: number;
  createdAt?: any;
  lifecycleStatus?: string;
  published?: boolean;
  storageLedger?: 'vault' | 'studio';
};

type TransactionRow = {
  id: string;
  amount?: number;
  trackTitle?: string;
  createdAt?: any;
};

function toMs(value: any) {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function useStudioWorkspaceData() {
  const [tracks, setTracks] = useState<UploadTrack[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setTracks([]);
      setTransactions([]);
      setFollowersCount(0);
      setLoading(false);
      return;
    }

    const uid = auth.currentUser.uid;
    setLoading(true);

    const uploadsQuery = query(
      collection(db, `users/${uid}/uploads`),
      orderBy('createdAt', 'desc')
    );
    const txQuery = query(
      collection(db, 'transactions'),
      where('sellerId', '==', uid)
    );

    const unsubUploads = onSnapshot(uploadsQuery, (snapshot) => {
      const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as UploadTrack[];
      setTracks(rows.filter((track) => (track.storageLedger || 'vault') === 'studio'));
      setLoading(false);
    });

    const unsubTransactions = onSnapshot(txQuery, (snapshot) => {
      setTransactions(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as TransactionRow[]);
    });

    const unsubUser = onSnapshot(doc(db, 'users', uid), (snapshot) => {
      const row: any = snapshot.data() || {};
      const followers = Array.isArray(row.followers) ? row.followers.length : Number(row.followers) || 0;
      setFollowersCount(followers);
    });

    return () => {
      unsubUploads();
      unsubTransactions();
      unsubUser();
    };
  }, []);

  const totalPlays = useMemo(
    () => tracks.reduce((sum, track) => sum + Number(track.listenCount || 0), 0),
    [tracks]
  );
  const totalEngagement = useMemo(
    () => tracks.reduce((sum, track) => sum + Number(track.likeCount || 0) + Number(track.commentCount || 0) + Number(track.shareCount || 0), 0),
    [tracks]
  );
  const totalRevenue = useMemo(
    () => transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
    [transactions]
  );
  const publishedTracks = useMemo(
    () => tracks.filter((track) => track.published === true || track.lifecycleStatus === 'published'),
    [tracks]
  );
  const drafts = useMemo(
    () => tracks.filter((track) => !(track.published === true || track.lifecycleStatus === 'published')),
    [tracks]
  );
  const topTracks = useMemo(
    () => [...tracks].sort((a, b) => Number(b.listenCount || 0) - Number(a.listenCount || 0)).slice(0, 5),
    [tracks]
  );
  const recentTransactions = useMemo(
    () => [...transactions].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt)).slice(0, 6),
    [transactions]
  );

  return {
    tracks,
    drafts,
    publishedTracks,
    topTracks,
    recentTransactions,
    followersCount,
    totalPlays,
    totalEngagement,
    totalRevenue,
    loading,
  };
}
