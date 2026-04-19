import { toggleArtistFollow as toggleArtistFollowAtomic } from '@/utils/artistSocial';

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
  const result = await toggleArtistFollowAtomic({
    artistId,
    currentUserId,
    isActive: isCurrentlyFollowing,
  });
  return { isFollowing: result.isActive, followersDelta: result.delta };
}
