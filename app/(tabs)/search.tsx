import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import {
    ARTISTS,
    FREE_MUSIC,
    POPULAR_BEATS,
    TOP_PLAYLISTS,
    TRENDING_SONGS,
} from '@/constants/homeFeed';
import { formatUsd } from '@/utils/pricing';
import { auth, db } from '@/firebaseConfig';
import { useCartStore } from '@/store/useCartStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { useUserStore } from '@/store/useUserStore';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { collection, collectionGroup, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { ChevronLeft, Heart, MoreVertical, Search as SearchIcon, ShoppingCart } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type ViewMode = 'browse' | 'allGenres' | 'results';

type GenreCard = {
    name: string;
    colors: [string, string];
    dark?: boolean;
};

type SearchTrack = {
    id: string;
    title?: string;
    artist?: string;
    uploaderName?: string;
    uploaderId?: string;
    artworkUrl?: string;
    coverUrl?: string;
    audioUrl?: string;
    url?: string;
    price?: number;
    genre?: string;
    listenCount?: number;
};

type SearchArtist = {
    id: string;
    fullName: string;
    avatarUrl?: string;
};

const FEATURED_GENRES: GenreCard[] = [
    { name: 'Paradise', colors: ['#EC5C39', '#863420'] },
    { name: 'Afrobeats', colors: ['#319F43', '#123918'] },
    { name: 'Afro-Pop', colors: ['#587DBD', '#293A57'] },
    { name: 'Gospel', colors: ['#8A38F5', '#51218F'] },
    { name: 'Highlife', colors: ['#D32626', '#6D1414'] },
    { name: 'Juju', colors: ['#293A57', '#587DBD'] },
];

const ALL_GENRES: GenreCard[] = [
    ...FEATURED_GENRES,
    { name: 'Indigenous', colors: ['#C2B9AC', '#5C5852'] },
    { name: 'Hip-Hop', colors: ['#464646', '#ACABAB'] },
    { name: 'Fuji', colors: ['#E33629', '#7D1E17'] },
    { name: 'Blues', colors: ['#40302C', '#A67C74'] },
    { name: 'Afro Soul', colors: ['#A67C74', '#40302C'] },
    { name: 'Afro Fusion', colors: ['#587DBD', '#293A57'] },
    { name: 'Rock', colors: ['#F5F5F5', '#8F8F8F'], dark: true },
];

export default function SearchScreen() {
    const router = useRouter();
    const { name } = useUserStore();
    const setTrack = usePlaybackStore((state) => state.setTrack);
    const { showToast } = useToastStore();

    const [viewMode, setViewMode] = useState<ViewMode>('browse');
    const [searchQuery, setSearchQuery] = useState('');
    const [remoteTracks, setRemoteTracks] = useState<SearchTrack[]>([]);
    const [remoteArtists, setRemoteArtists] = useState<SearchArtist[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
    const [pendingLikeIds, setPendingLikeIds] = useState<Record<string, boolean>>({});

    const initials = useMemo(() => {
        const letters = String(name || 'Creator')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase();
        return letters || 'C';
    }, [name]);

    useEffect(() => {
        let mounted = true;

        const loadSearchData = async () => {
            setIsLoadingData(true);
            setLoadError(null);

            try {
                const uploadsSnap = await getDocs(
                    query(collectionGroup(db, 'uploads'), orderBy('listenCount', 'desc'), limit(120))
                );
                const uploadRows = uploadsSnap.docs.map((item) => {
                    const row = item.data() as any;
                    return {
                        id: item.id,
                        title: row.title || 'Untitled Track',
                        artist: row.artist || row.uploaderName || 'Creator',
                        uploaderName: row.uploaderName || row.artist || 'Creator',
                        uploaderId: row.uploaderId || row.ownerId || '',
                        artworkUrl: row.artworkUrl || row.coverUrl || '',
                        coverUrl: row.coverUrl || row.artworkUrl || '',
                        audioUrl: row.audioUrl || row.url || '',
                        url: row.url || row.audioUrl || '',
                        price: Number(row.price || 0),
                        genre: row.genre || '',
                        listenCount: Number(row.listenCount || 0),
                    } as SearchTrack;
                });

                const usersSnap = await getDocs(query(collection(db, 'users'), limit(80)));
                const artistRows = usersSnap.docs
                    .map((item) => {
                        const row = item.data() as any;
                        return {
                            id: item.id,
                            fullName: row.fullName || row.name || row.displayName || '',
                            avatarUrl: row.avatarUrl || row.photoURL || row.imageUrl || '',
                        } as SearchArtist;
                    })
                    .filter((row) => row.fullName.trim().length > 0);

                if (!mounted) return;
                setRemoteTracks(uploadRows);
                setRemoteArtists(artistRows);
            } catch (error) {
                console.error('Failed to load search feed:', error);
                if (!mounted) return;
                setLoadError('Could not load latest search feed. Showing fallback content.');
            } finally {
                if (mounted) setIsLoadingData(false);
            }
        };

        loadSearchData();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid) {
            setLikedIds({});
            return;
        }

        const ref = collection(db, `users/${uid}/favourites`);
        const unsub = onSnapshot(ref, (snapshot) => {
            const map: Record<string, boolean> = {};
            snapshot.docs.forEach((item) => {
                map[item.id] = true;
            });
            setLikedIds(map);
        });

        return unsub;
    }, []);

    const allTracks = useMemo<SearchTrack[]>(() => {
        if (remoteTracks.length > 0) return remoteTracks;
        return [...TRENDING_SONGS, ...FREE_MUSIC, ...POPULAR_BEATS] as SearchTrack[];
    }, [remoteTracks]);

    const filteredSongs = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return allTracks;
        return allTracks.filter((song) => {
            const row = song as { title?: string; artist?: string; uploaderName?: string };
            const title = String(song.title || '').toLowerCase();
            const artist = String(row.artist || row.uploaderName || '').toLowerCase();
            return title.includes(query) || artist.includes(query);
        });
    }, [allTracks, searchQuery]);

    const allArtists = useMemo<SearchArtist[]>(() => {
        if (remoteArtists.length > 0) return remoteArtists;
        return ARTISTS as SearchArtist[];
    }, [remoteArtists]);

    const filteredArtists = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return allArtists;
        return allArtists.filter((artist) => artist.fullName.toLowerCase().includes(query));
    }, [allArtists, searchQuery]);

    const toggleFavourite = async (song: SearchTrack) => {
        const uid = auth.currentUser?.uid;
        if (!uid) {
            showToast('Please sign in to like tracks.', 'info');
            return;
        }

        const trackId = song.id;
        if (!trackId || pendingLikeIds[trackId]) return;

        setPendingLikeIds((prev) => ({ ...prev, [trackId]: true }));

        try {
            const ref = doc(db, `users/${uid}/favourites`, trackId);
            const liked = !!likedIds[trackId];

            if (liked) {
                await deleteDoc(ref);
                showToast('Removed from favourites.', 'info');
            } else {
                await setDoc(ref, {
                    id: trackId,
                    title: song.title || 'Untitled Track',
                    artist: song.artist || song.uploaderName || 'Creator',
                    uploaderId: song.uploaderId || '',
                    artworkUrl: song.artworkUrl || song.coverUrl || '',
                    url: song.audioUrl || song.url || '',
                    price: Number(song.price || 0),
                    genre: song.genre || '',
                    addedAt: new Date().toISOString(),
                });
                showToast('Added to favourites.', 'success');
            }
        } catch (error) {
            console.error('Favourite toggle failed:', error);
            showToast('Could not update favourite right now.', 'error');
        } finally {
            setPendingLikeIds((prev) => ({ ...prev, [trackId]: false }));
        }
    };

    const openSongActions = (song: SearchTrack) => {
        Alert.alert(
            song.title || 'Track',
            'Choose an action',
            [
                { text: 'Play', onPress: () => handlePlay(song) },
                {
                    text: 'Add to cart',
                    onPress: () => {
                        useCartStore.getState().addItem({
                            id: song.id,
                            title: song.title || 'Untitled Track',
                            artist: song.artist || song.uploaderName || 'Creator',
                            price: Number(song.price || 0),
                            uploaderId: song.uploaderId || '',
                            coverUrl: song.artworkUrl || song.coverUrl,
                        });
                        showToast('Added to cart.', 'success');
                    },
                },
                {
                    text: likedIds[song.id] ? 'Remove from favourites' : 'Add to favourites',
                    onPress: () => toggleFavourite(song),
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const handlePlay = (track: any) => {
        if (!(track.audioUrl || track.url)) return;
        setTrack({
            id: track.id,
            title: track.title,
            artist: track.artist || track.uploaderName,
            url: track.audioUrl || track.url,
            uploaderId: track.uploaderId || '',
            artworkUrl: track.artworkUrl || '',
        });
    };

    const onSearchSubmit = () => {
        setViewMode('results');
    };

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <View style={styles.headerWrap}>
                    {viewMode !== 'browse' ? (
                        <TouchableOpacity style={styles.backButton} onPress={() => setViewMode('browse')}>
                            <ChevronLeft size={22} color="#D9D9D9" />
                        </TouchableOpacity>
                    ) : null}

                    <View style={styles.avatarBubble}>
                        <Text style={styles.avatarText}>{initials}</Text>
                    </View>

                    <Text style={styles.pageTitle}>{viewMode === 'allGenres' ? 'Afrobeats' : 'Search'}</Text>
                </View>

                <View style={styles.searchBar}>
                    <SearchIcon size={20} color="#000000" />
                    <TextInput
                        placeholder="Search the best Afro Music"
                        placeholderTextColor="rgba(0,0,0,0.55)"
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={onSearchSubmit}
                        returnKeyType="search"
                    />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {viewMode === 'browse' ? (
                        <BrowseMode
                            onGenrePress={(genre) => {
                                setSearchQuery(genre);
                                setViewMode('results');
                            }}
                            onSeeAllGenres={() => setViewMode('allGenres')}
                            onSeeAllCatalog={() => setViewMode('results')}
                            onPlay={handlePlay}
                            onToggleFavourite={toggleFavourite}
                            likedIds={likedIds}
                            pendingLikeIds={pendingLikeIds}
                            onMorePress={openSongActions}
                        />
                    ) : null}

                    {viewMode === 'allGenres' ? (
                        <AllGenresMode
                            onGenrePress={(genre) => {
                                setSearchQuery(genre);
                                setViewMode('results');
                            }}
                        />
                    ) : null}

                    {viewMode === 'results' ? (
                        <ResultsMode
                            songs={filteredSongs}
                            artists={filteredArtists}
                            onPlay={handlePlay}
                            onToggleFavourite={toggleFavourite}
                            likedIds={likedIds}
                            pendingLikeIds={pendingLikeIds}
                            onMorePress={openSongActions}
                            onSeeMarketplace={() => router.push('/(tabs)/marketplace' as any)}
                            onArtistPress={(id) => router.push({ pathname: '/profile/[id]', params: { id } } as any)}
                        />
                    ) : null}

                    {isLoadingData ? <Text style={styles.infoText}>Loading search feed...</Text> : null}
                    {!isLoadingData && loadError ? <Text style={styles.infoText}>{loadError}</Text> : null}

                    <View style={{ height: 80 }} />
                </ScrollView>
            </View>
        </SafeScreenWrapper>
    );
}

function BrowseMode({
    onGenrePress,
    onSeeAllGenres,
    onSeeAllCatalog,
    onPlay,
    onToggleFavourite,
    likedIds,
    pendingLikeIds,
    onMorePress,
}: {
    onGenrePress: (genre: string) => void;
    onSeeAllGenres: () => void;
    onSeeAllCatalog: () => void;
    onPlay: (track: any) => void;
    onToggleFavourite: (track: SearchTrack) => void;
    likedIds: Record<string, boolean>;
    pendingLikeIds: Record<string, boolean>;
    onMorePress: (track: SearchTrack) => void;
}) {
    return (
        <View>
            <SectionHeader
                title="Browse all Afro Genres"
                actionLabel="See All"
                onActionPress={onSeeAllGenres}
            />

            <View style={styles.genreGrid}>
                {FEATURED_GENRES.map((genre) => (
                    <GenreTile key={genre.name} genre={genre} onPress={() => onGenrePress(genre.name)} />
                ))}
            </View>

            <SectionHeader
                title="See New Artist catalog"
                actionLabel="See All"
                onActionPress={onSeeAllCatalog}
                style={{ marginTop: 24 }}
            />

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catalogRow}>
                {TOP_PLAYLISTS.map((item) => (
                    <CatalogCard key={item.id} item={item} />
                ))}
            </ScrollView>

            <SectionHeader
                title="Popular Beats"
                actionLabel="See All"
                onActionPress={onSeeAllCatalog}
                style={{ marginTop: 24 }}
            />

            <View style={styles.songListCard}>
                {POPULAR_BEATS.slice(0, 4).map((song, index) => (
                    <View key={song.id}>
                        <SongRow
                            song={song}
                            onPlay={() => onPlay(song)}
                            liked={!!likedIds[song.id]}
                            isLikePending={!!pendingLikeIds[song.id]}
                            onToggleFavourite={() => onToggleFavourite(song as SearchTrack)}
                            onMorePress={() => onMorePress(song as SearchTrack)}
                        />
                        {index < 3 ? <View style={styles.divider} /> : null}
                    </View>
                ))}
            </View>
        </View>
    );
}

function AllGenresMode({ onGenrePress }: { onGenrePress: (genre: string) => void }) {
    return (
        <View style={styles.genreGridTall}>
            {ALL_GENRES.map((genre) => (
                <GenreTile key={genre.name} genre={genre} onPress={() => onGenrePress(genre.name)} />
            ))}
        </View>
    );
}

function ResultsMode({
    songs,
    artists,
    onPlay,
    onToggleFavourite,
    likedIds,
    pendingLikeIds,
    onMorePress,
    onSeeMarketplace,
    onArtistPress,
}: {
    songs: any[];
    artists: SearchArtist[];
    onPlay: (track: any) => void;
    onToggleFavourite: (track: SearchTrack) => void;
    likedIds: Record<string, boolean>;
    pendingLikeIds: Record<string, boolean>;
    onMorePress: (track: SearchTrack) => void;
    onSeeMarketplace: () => void;
    onArtistPress: (id: string) => void;
}) {
    return (
        <View>
            <SectionHeader title="Popular songs" actionLabel="See All" onActionPress={onSeeMarketplace} />
            <View style={styles.songListCard}>
                {songs.length === 0 ? (
                    <Text style={styles.emptyText}>No songs found for this query.</Text>
                ) : (
                    songs.slice(0, 6).map((song, index) => (
                        <View key={`${song.id}-${index}`}>
                            <SongRow
                                song={song}
                                onPlay={() => onPlay(song)}
                                liked={!!likedIds[song.id]}
                                isLikePending={!!pendingLikeIds[song.id]}
                                onToggleFavourite={() => onToggleFavourite(song as SearchTrack)}
                                onMorePress={() => onMorePress(song as SearchTrack)}
                            />
                            {index < Math.min(songs.length, 6) - 1 ? <View style={styles.divider} /> : null}
                        </View>
                    ))
                )}
            </View>

            <SectionHeader title="Favorite Artists" actionLabel="See All" onActionPress={onSeeMarketplace} style={{ marginTop: 22 }} />
            <FlatList
                horizontal
                data={artists}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.artistRow}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.artistItem} onPress={() => onArtistPress(item.id)}>
                        <Image source={{ uri: item.avatarUrl }} style={styles.artistAvatar} contentFit="cover" />
                        <Text style={styles.artistName}>{item.fullName}</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

function SectionHeader({
    title,
    actionLabel,
    onActionPress,
    style,
}: {
    title: string;
    actionLabel: string;
    onActionPress: () => void;
    style?: any;
}) {
    return (
        <View style={[styles.sectionHeader, style]}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <TouchableOpacity onPress={onActionPress}>
                <Text style={styles.sectionAction}>{actionLabel}</Text>
            </TouchableOpacity>
        </View>
    );
}

function GenreTile({ genre, onPress }: { genre: GenreCard; onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.genreTile} activeOpacity={0.85} onPress={onPress}>
            <View style={[styles.genreFill, { backgroundColor: genre.colors[0] }]}>
                <View style={[styles.genreFillOverlay, { backgroundColor: genre.colors[1] }]} />
                <Text style={[styles.genreText, genre.dark && { color: '#111111' }]}>{genre.name}</Text>
            </View>
        </TouchableOpacity>
    );
}

function CatalogCard({ item }: { item: any }) {
    return (
        <View style={styles.catalogCard}>
            <View style={styles.catalogVisualWrap}>
                <View style={[styles.catalogLayer, { backgroundColor: '#464646', transform: [{ rotate: '9.7deg' }] }]} />
                <View style={[styles.catalogLayer, { backgroundColor: '#767676', transform: [{ rotate: '5.15deg' }], top: 3 }]} />
                <Image source={{ uri: item.artworkUrl }} style={styles.catalogCover} contentFit="cover" />
            </View>
            <Text style={styles.catalogTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.catalogMeta} numberOfLines={1}>{item.genre || 'Playlist'}</Text>
            <Text style={styles.catalogPrice}>{typeof item.price === 'number' ? formatUsd(item.price) : ''}</Text>
        </View>
    );
}

function SongRow({
    song,
    onPlay,
    liked,
    isLikePending,
    onToggleFavourite,
    onMorePress,
}: {
    song: SearchTrack;
    onPlay: () => void;
    liked: boolean;
    isLikePending: boolean;
    onToggleFavourite: () => void;
    onMorePress: () => void;
}) {
    const { addItem, items } = useCartStore();
    const inCart = items.some((item: any) => item.id === song.id);

    return (
        <TouchableOpacity style={styles.songRow} activeOpacity={0.82} onPress={onPlay}>
            <Image source={{ uri: song.artworkUrl }} style={styles.songImage} contentFit="cover" />
            <View style={styles.songMain}>
                <Text style={styles.songTitle} numberOfLines={1}>{song.title || 'Untitled'}</Text>
                <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={(event) => {
                        event.stopPropagation();
                        onMorePress();
                    }}
                >
                    <Text style={styles.songSub} numberOfLines={1}>{song.artist || song.uploaderName || 'Creator'}</Text>
                    <Text style={styles.songPrice}>{song.price ? formatUsd(Number(song.price)) : 'Free'}</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.songActions}>
                <TouchableOpacity
                    onPress={(event) => {
                        event.stopPropagation();
                        if (inCart) return;
                        addItem({
                            id: song.id,
                            title: song.title || 'Untitled Track',
                            artist: song.artist || song.uploaderName || 'Creator',
                            price: Number(song.price || 0),
                            uploaderId: song.uploaderId || '',
                            coverUrl: song.artworkUrl,
                        });
                    }}
                >
                    <ShoppingCart size={15} color={inCart ? '#4CAF50' : '#EC5C39'} />
                </TouchableOpacity>
                <TouchableOpacity
                    disabled={isLikePending}
                    onPress={(event) => {
                        event.stopPropagation();
                        onToggleFavourite();
                    }}
                >
                    <Heart
                        size={13}
                        color={isLikePending ? 'rgba(236,92,57,0.5)' : '#EC5C39'}
                        fill={liked ? '#EC5C39' : 'transparent'}
                    />
                </TouchableOpacity>
            </View>
            <TouchableOpacity
                onPress={(event) => {
                    event.stopPropagation();
                    onMorePress();
                }}
            >
                <MoreVertical size={20} color="#FFFFFF" />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#140F10',
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    headerWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 48,
        marginBottom: 10,
    },
    backButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    avatarBubble: {
        width: 33,
        height: 35,
        borderRadius: 17,
        backgroundColor: '#EC5C39',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 16,
        lineHeight: 21,
        letterSpacing: -0.5,
    },
    pageTitle: {
        marginLeft: 12,
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 20,
        lineHeight: 25,
        letterSpacing: -0.5,
    },
    searchBar: {
        height: 41,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: 'rgba(20, 15, 16, 0.9)',
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    searchInput: {
        flex: 1,
        color: '#000000',
        fontFamily: 'Poppins-Regular',
        fontSize: 15,
        lineHeight: 22,
        paddingVertical: 0,
    },
    scrollContent: {
        paddingTop: 16,
        paddingBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    sectionTitle: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
        lineHeight: 25,
        letterSpacing: -0.5,
    },
    sectionAction: {
        color: '#EC5C39',
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        lineHeight: 25,
        letterSpacing: -0.5,
    },
    genreGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    genreGridTall: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    genreTile: {
        width: '48%',
    },
    genreFill: {
        height: 73,
        borderRadius: 6,
        overflow: 'hidden',
        justifyContent: 'flex-start',
    },
    genreFillOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.55,
    },
    genreText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-Bold',
        fontSize: 14,
        lineHeight: 25,
        letterSpacing: -0.5,
        marginTop: 8,
        marginLeft: 14,
    },
    catalogRow: {
        gap: 14,
        paddingRight: 12,
    },
    catalogCard: {
        width: 124,
    },
    catalogVisualWrap: {
        width: 103,
        height: 122,
        position: 'relative',
    },
    catalogLayer: {
        position: 'absolute',
        width: 101,
        height: 113,
        borderRadius: 18,
        top: 0,
        left: 2,
    },
    catalogCover: {
        position: 'absolute',
        width: 103,
        height: 110,
        top: 12,
        left: 0,
        borderRadius: 18,
        backgroundColor: '#D9D9D9',
    },
    catalogTitle: {
        marginTop: 4,
        color: '#FFFFFF',
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        lineHeight: 20,
        letterSpacing: -0.4,
    },
    catalogMeta: {
        color: 'rgba(255,255,255,0.9)',
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: -0.4,
    },
    catalogPrice: {
        color: '#F8B6A7',
        fontFamily: 'Poppins-Medium',
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: -0.4,
    },
    songListCard: {
        borderRadius: 8,
    },
    songRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },
    songImage: {
        width: 63,
        height: 58,
        borderRadius: 15,
        backgroundColor: '#D9D9D9',
        marginRight: 12,
    },
    songMain: {
        flex: 1,
    },
    songTitle: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        lineHeight: 20,
        letterSpacing: -0.5,
    },
    songSub: {
        color: 'rgba(255,255,255,0.9)',
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: -0.5,
    },
    songPrice: {
        color: '#F8B6A7',
        fontFamily: 'Poppins-Medium',
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: -0.5,
    },
    songActions: {
        width: 40,
        alignItems: 'center',
        gap: 6,
        marginRight: 10,
    },
    divider: {
        height: 1,
        backgroundColor: '#464646',
    },
    artistRow: {
        gap: 12,
        paddingRight: 12,
    },
    artistItem: {
        width: 88,
        alignItems: 'center',
    },
    artistAvatar: {
        width: 88,
        height: 86,
        borderRadius: 43,
        backgroundColor: '#D9D9D9',
    },
    artistName: {
        marginTop: 2,
        color: '#FFFFFF',
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        lineHeight: 18,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    emptyText: {
        color: 'rgba(255,255,255,0.55)',
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        paddingVertical: 20,
    },
    infoText: {
        marginTop: 12,
        color: 'rgba(255,255,255,0.62)',
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
    },
});
