import { db } from '@/firebaseConfig';
import { FirebaseError } from 'firebase/app';
import { collectionGroup, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

export type PublishedUpload = {
  id: string;
  title: string;
  artist: string;
  uploaderName: string;
  uploaderId: string;
  genre: string;
  price: number;
  audioUrl: string;
  artworkUrl: string;
  coverUrl: string;
  listenCount: number;
  assetType?: string;
  category?: string;
  lifecycleStatus?: string;
  published?: boolean;
  publishedAtMs?: number;
  createdAtMs?: number;
};

function getFeedErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    if (error.code === 'permission-denied') return 'Live uploads are unavailable for this account right now.';
    if (error.code === 'failed-precondition') return 'Live upload ranking needs a Firestore index.';
    return `Live uploads error: ${error.code}`;
  }

  return 'Could not load live uploads.';
}

function isVisiblePublishedTrack(row: any) {
  const scheduledMs = Number(row.scheduledReleaseAtMs || 0);
  const isFutureRelease = row.lifecycleStatus === 'upcoming' && (!scheduledMs || scheduledMs > Date.now());
  return row.isPublic === true && !isFutureRelease;
}

function getTimestampMs(value: any) {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsedNumber = Number(value);
    if (Number.isFinite(parsedNumber)) return parsedNumber;
    const parsedDate = Date.parse(value);
    if (Number.isFinite(parsedDate)) return parsedDate;
  }
  if (typeof value?._seconds === 'number') {
    return Number(value._seconds) * 1000;
  }
  return 0;
}

export function mapPublishedUpload(docSnap: any): PublishedUpload | null {
  const row = docSnap.data() as any;
  const audioUrl = String(row.audioUrl || row.url || '');

  if (!audioUrl || !isVisiblePublishedTrack(row)) {
    return null;
  }

  const uploaderId = docSnap.ref?.parent?.parent?.id || row.userId || row.uploaderId || '';
  const uploaderName = String(row.uploaderName || row.artist || 'Shoouter');
  const artworkUrl = String(row.artworkUrl || row.coverUrl || '');

  return {
    id: String(docSnap.id),
    title: String(row.title || 'Untitled Track'),
    artist: String(row.artist || uploaderName),
    uploaderName,
    uploaderId: String(uploaderId),
    genre: String(row.genre || row.assetType || 'Music'),
    price: Number(row.price || 0),
    audioUrl,
    artworkUrl,
    coverUrl: String(row.coverUrl || row.artworkUrl || ''),
    listenCount: Number(row.listenCount || 0),
    assetType: row.assetType ? String(row.assetType) : undefined,
    category: row.category ? String(row.category) : undefined,
    lifecycleStatus: row.lifecycleStatus ? String(row.lifecycleStatus) : undefined,
    published: row.published === true,
    publishedAtMs: getTimestampMs(row.publishedAt),
    createdAtMs: getTimestampMs(row.createdAt),
  };
}

function mergeUniqueTracks(...trackGroups: Array<Array<PublishedUpload>>) {
  const merged = new Map<string, PublishedUpload>();

  for (const group of trackGroups) {
    for (const track of group) {
      if (!merged.has(track.id)) {
        merged.set(track.id, track);
      }
    }
  }

  return Array.from(merged.values());
}

function sortPublishedTracks(tracks: PublishedUpload[]) {
  return tracks.sort((a, b) => {
    const aFreshness = a.publishedAtMs || a.createdAtMs || 0;
    const bFreshness = b.publishedAtMs || b.createdAtMs || 0;

    if (bFreshness !== aFreshness) {
      return bFreshness - aFreshness;
    }

    if (b.listenCount !== a.listenCount) {
      return b.listenCount - a.listenCount;
    }

    return a.title.localeCompare(b.title);
  });
}

export function usePublishedUploads(maxItems = 180, enabled = true) {
  const [tracks, setTracks] = useState<PublishedUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setTracks([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rankedQuery = query(
        collectionGroup(db, 'uploads'),
        where('isPublic', '==', true),
        orderBy('listenCount', 'desc'),
        limit(maxItems)
      );

      const recentQuery = query(
        collectionGroup(db, 'uploads'),
        where('isPublic', '==', true),
        orderBy('publishedAt', 'desc'),
        limit(maxItems)
      );

      const [rankedSnap, recentSnap] = await Promise.allSettled([getDocs(rankedQuery), getDocs(recentQuery)]);

      const rankedTracks = rankedSnap.status === 'fulfilled'
        ? rankedSnap.value.docs.map(mapPublishedUpload).filter((item): item is PublishedUpload => !!item)
        : [];
      const recentTracks = recentSnap.status === 'fulfilled'
        ? recentSnap.value.docs.map(mapPublishedUpload).filter((item): item is PublishedUpload => !!item)
        : [];

      if (rankedSnap.status === 'rejected' && recentSnap.status === 'rejected') {
        throw rankedSnap.reason;
      }

      setTracks(sortPublishedTracks(mergeUniqueTracks(recentTracks, rankedTracks)).slice(0, maxItems));
    } catch (primaryError) {
      const needsIndex = primaryError instanceof FirebaseError && primaryError.code === 'failed-precondition';

      if (!needsIndex) {
        console.error('Failed to load published uploads:', primaryError);
        setTracks([]);
        setError(getFeedErrorMessage(primaryError));
        return;
      }

      try {
        const unrankedSnap = await getDocs(
          query(
            collectionGroup(db, 'uploads'),
            where('isPublic', '==', true),
            limit(maxItems)
          )
        );
        const rows = sortPublishedTracks(
          unrankedSnap.docs
            .map(mapPublishedUpload)
            .filter((item): item is PublishedUpload => !!item)
        ).slice(0, maxItems);

        setTracks(rows);
        setError('Live upload ranking needs a Firestore index. Showing unranked uploads.');
      } catch (fallbackError) {
        console.error('Failed to load unranked published uploads:', fallbackError);
        setTracks([]);
        setError(getFeedErrorMessage(fallbackError));
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, maxItems]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    tracks,
    loading,
    error,
    reload: load,
  };
}
