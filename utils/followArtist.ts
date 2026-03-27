import { db } from '@/firebaseConfig';
import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';

export type ToggleArtistFollowInput = {
  artistId: string;
  currentUserId: string;
  isCurrentlyFollowing: boolean;
};

export type ToggleArtistFollowResult = {
  isFollowing: boolean;
  followersDelta: number;
};

export async function toggleArtistFollow({
  artistId,
  currentUserId,
  isCurrentlyFollowing,
}: ToggleArtistFollowInput): Promise<ToggleArtistFollowResult> {
  if (!artistId) {
    throw new Error('Artist id is required.');
  }

  if (!currentUserId) {
    throw new Error('Current user id is required.');
  }

  if (artistId === currentUserId) {
    throw new Error('You cannot follow yourself.');
  }

  const artistRef = doc(db, 'users', artistId);
  const userRef = doc(db, 'users', currentUserId);

  if (isCurrentlyFollowing) {
    await updateDoc(artistRef, { followers: arrayRemove(currentUserId) });
    await updateDoc(userRef, { following: arrayRemove(artistId) });
    return { isFollowing: false, followersDelta: -1 };
  }

  await updateDoc(artistRef, { followers: arrayUnion(currentUserId) });
  await updateDoc(userRef, { following: arrayUnion(artistId) });
  return { isFollowing: true, followersDelta: 1 };
}
