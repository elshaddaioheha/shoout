import { db } from '@/firebaseConfig';
import { arrayRemove, arrayUnion, doc, writeBatch } from 'firebase/firestore';

type ToggleRelationInput = {
  artistId: string;
  currentUserId: string;
  isActive: boolean;
};

type ToggleRelationResult = {
  isActive: boolean;
  delta: number;
};

function validateInput({ artistId, currentUserId }: ToggleRelationInput) {
  if (!artistId) {
    throw new Error('Artist id is required.');
  }
  if (!currentUserId) {
    throw new Error('Current user id is required.');
  }
  if (artistId === currentUserId) {
    throw new Error('You cannot perform this action on yourself.');
  }
}

async function toggleRelation(
  input: ToggleRelationInput,
  artistField: 'followers' | 'subscribers',
  userField: 'following' | 'subscribedArtists'
): Promise<ToggleRelationResult> {
  validateInput(input);

  const { artistId, currentUserId, isActive } = input;
  const artistRef = doc(db, 'users', artistId);
  const userRef = doc(db, 'users', currentUserId);
  const artistUpdate = isActive ? arrayRemove(currentUserId) : arrayUnion(currentUserId);
  const userUpdate = isActive ? arrayRemove(artistId) : arrayUnion(artistId);

  const batch = writeBatch(db);
  batch.update(artistRef, { [artistField]: artistUpdate });
  batch.update(userRef, { [userField]: userUpdate });
  await batch.commit();

  return { isActive: !isActive, delta: isActive ? -1 : 1 };
}

export async function toggleArtistFollow(input: ToggleRelationInput): Promise<ToggleRelationResult> {
  return toggleRelation(input, 'followers', 'following');
}

export async function toggleArtistSubscription(input: ToggleRelationInput): Promise<ToggleRelationResult> {
  return toggleRelation(input, 'subscribers', 'subscribedArtists');
}
