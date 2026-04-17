export type HomeSectionKey = 'trending' | 'playlist' | 'freeMusic' | 'artists' | 'popularBeats';

export const HOME_SECTIONS: HomeSectionKey[] = ['trending', 'playlist', 'freeMusic', 'artists', 'popularBeats'];

export interface HomeFeedTrackSeed {
	id: string;
	title: string;
	artist: string;
	audioUrl: string;
	artworkUrl?: string;
	uploaderId?: string;
}

// Legacy playback fallback exports kept for store initialization safety.
export const TRENDING_SONGS: HomeFeedTrackSeed[] = [];
export const FREE_MUSIC: HomeFeedTrackSeed[] = [];
export const POPULAR_BEATS: HomeFeedTrackSeed[] = [];
