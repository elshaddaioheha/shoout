export type HomeSectionKey = 'trending' | 'playlist' | 'freeMusic' | 'artists' | 'popularBeats';

export const TRENDING_SONGS = [
  { id: 't1', title: 'Orbit', artist: 'Mara Jade', uploaderName: 'Mara Jade', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', uploaderId: 'u1', artworkUrl: 'https://picsum.photos/seed/t1/400/400?random=1' },
  { id: 't2', title: 'Night Drive', artist: 'Luna', uploaderName: 'Luna', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', uploaderId: 'u2', artworkUrl: 'https://picsum.photos/seed/t2/400/400?random=2' },
  { id: 't3', title: 'Glow', artist: 'Dusk', uploaderName: 'Dusk', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', uploaderId: 'u3', artworkUrl: 'https://picsum.photos/seed/t3/400/400?random=3' },
];

export const TOP_PLAYLISTS = [
  { id: 'p1', title: 'Studio Focus', genre: 'Lo-fi', price: 0, artworkUrl: 'https://picsum.photos/seed/p1/300/300' },
  { id: 'p2', title: 'Creator Picks', genre: 'Indie', price: 12, artworkUrl: 'https://picsum.photos/seed/p2/300/300' },
  { id: 'p3', title: 'Vault Vibes', genre: 'Alt R&B', price: 8, artworkUrl: 'https://picsum.photos/seed/p3/300/300' },
  { id: 'p4', title: 'Sunset', genre: 'Afro-pop', price: 5, artworkUrl: 'https://picsum.photos/seed/p4/300/300' },
  { id: 'p5', title: 'Midnight', genre: 'EDM', price: 10, artworkUrl: 'https://picsum.photos/seed/p5/300/300' },
  { id: 'p6', title: 'Acoustic Gems', genre: 'Acoustic', price: 6, artworkUrl: 'https://picsum.photos/seed/p6/300/300' },
];

export const FREE_MUSIC = [
  { id: 'f1', title: 'Weightless', artist: 'Nova', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', uploaderId: 'u5', price: 0, artworkUrl: 'https://picsum.photos/seed/f1/300/300' },
  { id: 'f2', title: 'Sundown', artist: 'Kai', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', uploaderId: 'u6', price: 0, artworkUrl: 'https://picsum.photos/seed/f2/300/300' },
  { id: 'f3', title: 'Breeze', artist: 'Ola', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', uploaderId: 'u7', price: 0, artworkUrl: 'https://picsum.photos/seed/f3/300/300' },
];

export const ARTISTS = [
  { id: 'a1', fullName: 'Mara Jade', avatarUrl: 'https://i.pravatar.cc/150?u=a1' },
  { id: 'a2', fullName: 'Luna', avatarUrl: 'https://i.pravatar.cc/150?u=a2' },
  { id: 'a3', fullName: 'Dusk', avatarUrl: 'https://i.pravatar.cc/150?u=a3' },
  { id: 'a4', fullName: 'Nova', avatarUrl: 'https://i.pravatar.cc/150?u=a4' },
  { id: 'a5', fullName: 'Kai', avatarUrl: 'https://i.pravatar.cc/150?u=a5' },
  { id: 'a6', fullName: 'Ola', avatarUrl: 'https://i.pravatar.cc/150?u=a6' },
  { id: 'a7', fullName: 'Sage', avatarUrl: 'https://i.pravatar.cc/150?u=a7' },
  { id: 'a8', fullName: 'Vela', avatarUrl: 'https://i.pravatar.cc/150?u=a8' },
];

export const POPULAR_BEATS = [
  { id: 'b1', title: 'Pulse', artist: 'Sage', uploaderName: 'Sage', price: 20, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', uploaderId: 'u8', artworkUrl: 'https://picsum.photos/seed/b1/200/200' },
  { id: 'b2', title: 'Drift', artist: 'Vela', uploaderName: 'Vela', price: 18, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', uploaderId: 'u9', artworkUrl: 'https://picsum.photos/seed/b2/200/200' },
  { id: 'b3', title: 'Slingshot', artist: 'Ro', uploaderName: 'Ro', price: 22, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', uploaderId: 'u10', artworkUrl: 'https://picsum.photos/seed/b3/200/200' },
  { id: 'b4', title: 'Orbit', artist: 'Mara Jade', uploaderName: 'Mara Jade', price: 16, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', uploaderId: 'u1', artworkUrl: 'https://picsum.photos/seed/b4/200/200' },
  { id: 'b5', title: 'Low Tide', artist: 'Kai', uploaderName: 'Kai', price: 14, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', uploaderId: 'u6', artworkUrl: 'https://picsum.photos/seed/b5/200/200' },
  { id: 'b6', title: 'Lanterns', artist: 'Nova', uploaderName: 'Nova', price: 12, audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', uploaderId: 'u5', artworkUrl: 'https://picsum.photos/seed/b6/200/200' },
];

export const HOME_SECTIONS: HomeSectionKey[] = ['trending', 'playlist', 'freeMusic', 'artists', 'popularBeats'];
