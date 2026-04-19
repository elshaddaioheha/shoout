import { auth, db } from '@/firebaseConfig';
import type { Track } from '@/store/usePlaybackStore';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { Share } from 'react-native';

const TRACK_SHARE_BASE_URL = 'https://shoout.app/track';

export async function shareTrack(track: Track) {
  const shareUrl = `${TRACK_SHARE_BASE_URL}/${encodeURIComponent(track.id)}`;
  return Share.share({
    message: `Listening to "${track.title}" by ${track.artist} on Shoouts. ${shareUrl}`,
    title: track.title,
    url: shareUrl,
  });
}

export async function toggleTrackFavourite(track: Track, liked: boolean) {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('AUTH_REQUIRED');
  }

  const favRef = doc(db, `users/${uid}/favourites`, track.id);
  if (liked) {
    await deleteDoc(favRef);
    return false;
  }

  await setDoc(favRef, {
    id: track.id,
    title: track.title,
    artist: track.artist,
    url: track.url,
    uploaderId: track.uploaderId || '',
    addedAt: new Date().toISOString(),
  });
  return true;
}

export async function addTrackToDefaultPlaylist(track: Track) {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('AUTH_REQUIRED');
  }
  if (!track.id || !track.uploaderId) {
    throw new Error('TRACK_REFERENCE_MISSING');
  }

  const uploadRef = doc(db, `users/${track.uploaderId}/uploads/${track.id}`);
  const uploadSnap = await getDoc(uploadRef);
  if (!uploadSnap.exists()) {
    throw new Error('TRACK_UNAVAILABLE');
  }

  const uploadData = uploadSnap.data() as any;
  if (uploadData.published !== true || uploadData.isPublic !== true) {
    throw new Error('TRACK_NOT_PUBLISHED');
  }

  const playlistQ = query(collection(db, 'globalPlaylists'), where('ownerId', '==', uid), limit(1));
  const playlistSnap = await getDocs(playlistQ);
  let playlistId = '';

  if (playlistSnap.empty) {
    const created = await addDoc(collection(db, 'globalPlaylists'), {
      ownerId: uid,
      name: 'My Playlist',
      isPublic: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    playlistId = created.id;
  } else {
    playlistId = playlistSnap.docs[0].id;
    await setDoc(doc(db, `globalPlaylists/${playlistId}`), { updatedAt: serverTimestamp() }, { merge: true });
  }

  const trackRefId = `${track.id}_${track.uploaderId}`;
  await setDoc(
    doc(db, `globalPlaylists/${playlistId}/tracks/${trackRefId}`),
    {
      uploadId: track.id,
      uploaderId: track.uploaderId,
      titleSnapshot: track.title,
      artistSnapshot: track.artist,
      artworkSnapshot: track.artworkUrl || null,
      addedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
