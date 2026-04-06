import { auth, db } from '@/firebaseConfig';
import { useToastStore } from '@/store/useToastStore';
import { useRouter } from 'expo-router';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

type PlaylistTrackInput = {
  id: string;
  uploaderId: string;
  title?: string;
  artist?: string;
  uploaderName?: string;
  artworkUrl?: string;
};

export function usePlaylists() {
  const router = useRouter();
  const { showToast } = useToastStore();

  const addToPlaylist = async (track: PlaylistTrackInput | null | undefined) => {
    if (!track?.id || !track?.uploaderId) {
      showToast('Track reference is missing.', 'error');
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      showToast('Log in to add tracks to playlists.', 'error');
      router.push({ pathname: '/(auth)/login', params: { redirectTo: '/(tabs)/index' } });
      return;
    }

    try {
      const uploadRef = doc(db, `users/${track.uploaderId}/uploads/${track.id}`);
      const uploadSnap = await getDoc(uploadRef);
      if (!uploadSnap.exists()) {
        showToast('Track is not available for playlist use.', 'error');
        return;
      }

      const uploadData = uploadSnap.data() as any;
      if (uploadData.published !== true || uploadData.isPublic !== true) {
        showToast('Only published tracks can be added to playlists.', 'info');
        return;
      }

      const playlistQ = query(
        collection(db, 'globalPlaylists'),
        where('ownerId', '==', uid),
        limit(1)
      );
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
        await setDoc(doc(db, `globalPlaylists/${playlistId}`), {
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      const trackRefId = `${track.id}_${track.uploaderId}`;
      await setDoc(doc(db, `globalPlaylists/${playlistId}/tracks/${trackRefId}`), {
        uploadId: track.id,
        uploaderId: track.uploaderId,
        titleSnapshot: track.title || 'Untitled',
        artistSnapshot: track.artist || track.uploaderName || 'Artist',
        artworkSnapshot: track.artworkUrl || null,
        addedAt: serverTimestamp(),
      }, { merge: true });

      showToast(`${track.title || 'Track'} added to your playlist.`, 'success');
    } catch (error) {
      console.error('Add to playlist failed:', error);
      showToast('Could not add track to playlist right now.', 'error');
    }
  };

  return { addToPlaylist };
}
