import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SharedHeader from '@/components/SharedHeader';
import { auth, db } from '@/firebaseConfig';
import { formatUsd } from '@/utils/pricing';
import { useCartStore } from '@/store/useCartStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, collectionGroup, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { ChevronLeft, Heart, MoreVertical, Search, ShoppingCart } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

type ViewMode = 'browse' | 'allGenres' | 'results';

const FEATURED_GENRES = [
    { name: "Paradise", colors: ["#EC5C39", "#863420"] },
    { name: "Afrobeats", colors: ["#319F43", "#123918"] },
    { name: "Afro-Pop", colors: ["#587DBD", "#293A57"] },
    { name: "Gospel", colors: ["#8A38F5", "#51218F"] },
    { name: "Highlife", colors: ["#D32626", "#6D1414"] },
    { name: "Jùjú", colors: ["#293A57", "#587DBD"] }
];

const ALL_GENRES = [
    ...FEATURED_GENRES,
    { name: "Indigenous", colors: ["#C2B9AC", "#5C5852"] },
    { name: "Hip-Hop", colors: ["rgba(70,70,70,0.18)", "rgba(172,171,171,0.0324)"] },
    { name: "Fuji", colors: ["#E33629", "#7D1E17"] },
    { name: "Blues", colors: ["#40302C", "#A67C74"] },
    { name: "Afro Soul", colors: ["#A67C74", "#40302C"] },
    { name: "Afro Fusion", colors: ["#587DBD", "#293A57"] },
    { name: "Afro Pop", colors: ["#319F43", "#123918"] },
    { name: "Rock", colors: ["#F5F5F5", "#8F8F8F"], dark: true }
];

export default function SearchScreen() {
    const [viewMode, setViewMode] = useState<ViewMode>('browse');
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<{ songs: any[], artists: any[] }>({ songs: [], artists: [] });
    const [searching, setSearching] = useState(false);
    const { openSheet, isModeSheetOpen, viewMode: appViewMode } = useAppSwitcherContext();

    const runSearch = useCallback(async (q: string) => {
        if (!q.trim()) { setResults({ songs: [], artists: [] }); return; }
        setSearching(true);
        try {
            // Search uploads by title (Firestore has no full-text, so we query by genre + fetch all and filter client-side)
            const uploadSnap = await getDocs(query(
                collectionGroup(db, 'uploads'),
                orderBy('listenCount', 'desc'),
                limit(50)
            ));
            const songs = uploadSnap.docs
                .map(d => ({ id: d.id, ...d.data() as any }))
                .filter(s =>
                    s.title?.toLowerCase().includes(q.toLowerCase()) ||
                    s.genre?.toLowerCase().includes(q.toLowerCase())
                )
                .slice(0, 8);

            // Search users/artists by name
            const userSnap = await getDocs(query(collection(db, 'users'), limit(20)));
            const artists = userSnap.docs
                .map(d => ({ id: d.id, ...d.data() as any }))
                .filter(u => u.fullName?.toLowerCase().includes(q.toLowerCase()))
                .map(u => ({ id: u.id, name: u.fullName }))
                .slice(0, 5);

            setResults({ songs, artists });
        } catch (e) {
            console.warn('Search error:', e);
        } finally {
            setSearching(false);
        }
    }, []);

    // Debounce search
    useEffect(() => {
        if (viewMode !== 'results') return;
        const timer = setTimeout(() => runSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery, viewMode]);

    const openGenre = (name: string) => {
        setSearchQuery(name);
        setViewMode('results');
        runSearch(name);
    };

    const goBack = () => {
        if (viewMode === 'results' && searchQuery) {
            // If we query from allGenres, we might want to go back there, 
            // but usually back to browse is fine or state tracking is needed.
            // For simplicity, back to browse.
            setViewMode('browse');
            setSearchQuery('');
        } else {
            setViewMode('browse');
            setSearchQuery('');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            {viewMode === 'browse' ? (
                <SharedHeader viewMode={appViewMode} isModeSheetOpen={isModeSheetOpen} onModePillPress={openSheet} />
            ) : (
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <View style={styles.resultsHeaderRow}>
                            <TouchableOpacity onPress={goBack} style={styles.backButton}>
                                <ChevronLeft size={24} color="#D9D9D9" />
                            </TouchableOpacity>
                            <View style={styles.headerLeftWithBack}>
                                <Text style={styles.headerTitle}>{viewMode === 'allGenres' ? 'Search' : (searchQuery || 'Results')}</Text>
                            </View>
                        </View>
                    </View>
                </SafeAreaView>
            )}

            {/* Search Bar */}
            {viewMode !== 'allGenres' && (
                <View style={styles.searchBar}>
                    <Search size={24} color="black" />
                    <TextInput
                        placeholder="Search the best Afro Music"
                        placeholderTextColor="rgba(0,0,0,0.5)"
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => setViewMode('results')}
                    />
                </View>
            )}

            {/* Content Area */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {viewMode === 'browse' && (
                    <BrowseView
                        genres={FEATURED_GENRES}
                        onGenrePress={openGenre}
                        onSeeAll={() => setViewMode('allGenres')}
                    />
                )}
                {viewMode === 'allGenres' && (
                    <AllGenresView genres={ALL_GENRES} onGenrePress={openGenre} />
                )}
                {viewMode === 'results' && (
                    <SearchResultsView songs={results.songs} artists={results.artists} searching={searching} query={searchQuery} />
                )}
            </ScrollView>


        </View>
    );
}

// Sub-component for Initial Browse View
function BrowseView({ genres, onGenrePress, onSeeAll }: {
    genres: any[],
    onGenrePress: (n: string) => void,
    onSeeAll: () => void
}) {
    const router = useRouter();
    const [playlists, setPlaylists] = useState<any[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                const q = query(
                    collectionGroup(db, 'uploads'),
                    orderBy('listenCount', 'desc'),
                    limit(6)
                );
                const snap = await getDocs(q);
                setPlaylists(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.warn('browse playlists load failed', e);
            }
        };

        load();
    }, []);

    const openPlaylist = (pl: any) => {
        router.push(`/playlist/${pl.id}` as any);
    };

    return (
        <View>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Browse all Afro Genres</Text>
                <TouchableOpacity onPress={onSeeAll}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
            </View>

            <View style={styles.genreGrid}>
                {genres.map((genre, idx) => (
                    <TouchableOpacity
                        key={idx}
                        activeOpacity={0.8}
                        onPress={() => onGenrePress(genre.name)}
                    >
                        <LinearGradient
                            colors={genre.colors as [string, string]}
                            style={styles.genreCard}
                        >
                            <Text style={styles.genreName}>{genre.name}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={[styles.sectionHeader, { marginTop: 40 }]}>
                <Text style={styles.sectionTitle}>See New Artist catalog</Text>
                <TouchableOpacity onPress={() => onGenrePress('all')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {playlists.length === 0 ? (
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins-Regular' }}>No playlists yet.</Text>
                ) : (
                    playlists.map((playlist, idx) => (
                        <TouchableOpacity key={playlist.id || idx} style={styles.playlistItem} activeOpacity={0.8} onPress={() => openPlaylist(playlist)}>
                            <View style={styles.playlistVisualContainer}>
                                <View style={[styles.playlistLayer, { backgroundColor: '#464646', transform: [{ rotate: '9.7deg' }] }]} />
                                <View style={[styles.playlistLayer, { backgroundColor: '#767676', transform: [{ rotate: '5.15deg' }], top: 3 }]} />
                                <View style={[styles.playlistLayer, { backgroundColor: '#D9D9D9', top: 12 }]} />
                            </View>
                            <View style={{ marginTop: 24 }}>
                                <Text style={styles.playlistTitle}>{playlist.title || 'Untitled'}</Text>
                                <Text style={styles.playlistSubtitle}>{playlist.genre || playlist.category || 'Track'}</Text>
                                {typeof playlist.price === 'number' ? <Text style={styles.playlistPrice}>{formatUsd(playlist.price)}</Text> : null}
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

// Sub-component for All Genres View
function AllGenresView({ genres, onGenrePress }: { genres: any[], onGenrePress: (n: string) => void }) {
    return (
        <View style={styles.genreGrid}>
            {genres.map((genre, idx) => (
                <TouchableOpacity
                    key={idx}
                    activeOpacity={0.8}
                    onPress={() => onGenrePress(genre.name)}
                >
                    <LinearGradient
                        colors={genre.colors as [string, string]}
                        style={styles.genreCard}
                    >
                        <Text style={[styles.genreName, genre.dark && { color: 'black' }]}>{genre.name}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            ))}
        </View>
    );
}

// Sub-component for Search Results View
function SearchResultsView({ songs, artists, searching, query }: { songs: any[], artists: any[], searching: boolean, query: string }) {
    const router = useRouter();
    if (searching) {
        return <View style={{ alignItems: 'center', paddingTop: 60 }}><Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins-Regular' }}>Searching...</Text></View>;
    }
    if (!searching && songs.length === 0 && artists.length === 0 && query.trim()) {
        return <View style={{ alignItems: 'center', paddingTop: 60 }}><Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'Poppins-Regular' }}>No results for "{query}"</Text></View>;
    }
    return (
        <View>
            <View style={styles.resultsList}>
                {songs.map((song, idx) => (
                    <View key={`s1-${idx}`}>
                        <SongItem song={song} />
                        {idx < songs.length - 1 && <View style={styles.itemDivider} />}
                    </View>
                ))}
                <View style={styles.itemDivider} />
                {songs.slice(0, 2).map((song, idx) => (
                    <View key={`s2-${idx}`}>
                        <SongItem song={song} />
                        {idx < 1 && <View style={styles.itemDivider} />}
                    </View>
                ))}
            </View>

            <View style={[styles.sectionHeader, { marginTop: 30 }]}>
                <Text style={styles.sectionTitle}>Favorite Artists</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/search')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {artists.map((artist, idx) => (
                    <TouchableOpacity key={idx} style={styles.artistItem} onPress={() => router.push({ pathname: '/profile/[id]', params: { id: artist.id } } as any)}>
                        <View style={styles.circlePlaceholder} />
                        <Text style={styles.artistNameSmall}>{artist.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={[styles.sectionHeader, { marginTop: 30 }]}>
                <Text style={styles.sectionTitle}>Popular Beats</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/marketplace')}><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
            </View>
            <View style={styles.resultsList}>
                {songs.map((song, idx) => (
                    <View key={`b-${idx}`}>
                        <SongItem song={song} />
                        {idx < songs.length - 1 && <View style={styles.itemDivider} />}
                    </View>
                ))}
            </View>
        </View>
    );
}

function SongItem({ song }: { song: any }) {
    const { addItem, items } = useCartStore();
    const inCart = items.some((i: any) => i.id === song.id);
    const [isFav, setIsFav] = React.useState(false);

    React.useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid || !song.id) return;
        const ref = doc(db, `users/${uid}/favourites`, song.id);
        const unsub = onSnapshot(ref, (snap) => setIsFav(snap.exists()));
        return unsub;
    }, [song.id]);

    const toggleFav = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const ref = doc(db, `users/${uid}/favourites`, song.id);
        if (isFav) {
            await deleteDoc(ref);
        } else {
            await setDoc(ref, {
                id: song.id, title: song.title,
                artist: song.artist || song.uploaderName,
                url: song.audioUrl || song.url,
                uploaderId: song.uploaderId || '',
                addedAt: new Date().toISOString(),
            });
        }
    };

    return (
        <View style={styles.songItemContainer}>
            <View style={styles.songAlbumArt} />
            <View style={styles.songMainInfo}>
                <Text style={styles.songTitleText}>{song.title}</Text>
                <Text style={styles.songArtistText}>{song.artist || song.uploaderName}</Text>
                <Text style={styles.songPriceText}>{song.price ? formatUsd(Number(song.price)) : 'Free'}</Text>
            </View>
            <View style={styles.songActionsRow}>
                <TouchableOpacity onPress={() => !inCart && addItem({ id: song.id, title: song.title, artist: song.artist || song.uploaderName, price: song.price || 0, uploaderId: song.uploaderId || '' })}>
                    <ShoppingCart size={14} color={inCart ? '#4CAF50' : '#EC5C39'} strokeWidth={1.5} />
                </TouchableOpacity>
                <TouchableOpacity onPress={toggleFav}>
                    <Heart size={12} color="#EC5C39" strokeWidth={1.5} fill={isFav ? '#EC5C39' : 'transparent'} />
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.moreButton} onPress={() => { }}>
                <MoreVertical size={24} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#140F10',
    },
    safeArea: {
        backgroundColor: '#140F10',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        height: 60,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    resultsHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 31,
        height: 31,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    headerLeftWithBack: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        flex: 1,
    },
    userProfileCircle: {
        width: 33,
        height: 35,
        backgroundColor: '#EC5C39',
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    userProfileInitial: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontFamily: 'Poppins-SemiBold',
        letterSpacing: -0.5,
    },
    searchBar: {
        marginHorizontal: 20,
        marginTop: 10,
        height: 50, // Increased height to prevent text clipping
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: 'rgba(20,15,16,0.9)',
        borderRadius: 12, // Increased border radius slightly for a modern look
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16, // Increased horizontal padding
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        color: 'black',
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
        height: '100%', // Ensure input takes full height
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 32,
        paddingBottom: 120,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        color: 'white',
        fontSize: 14,
        fontFamily: 'Poppins-SemiBold',
    },
    seeAllText: {
        color: '#EC5C39',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
    },
    genreGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 14,
    },
    genreCard: {
        width: (width - 54) / 2,
        height: 73,
        borderRadius: 5,
        paddingHorizontal: 15,
        paddingTop: 8,
    },
    genreName: {
        color: 'white',
        fontSize: 14,
        fontFamily: 'Poppins-Bold',
        letterSpacing: -0.5,
    },
    horizontalScroll: {
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },
    playlistItem: {
        width: 129,
        marginRight: 7,
    },
    playlistVisualContainer: {
        width: 103,
        height: 110,
        position: 'relative',
    },
    playlistLayer: {
        position: 'absolute',
        width: 100,
        height: 110,
        borderRadius: 18,
    },
    playlistTitle: {
        color: 'white',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
    },
    playlistSubtitle: {
        color: 'white',
        fontSize: 10,
        fontFamily: 'Poppins-Light',
    },
    playlistPrice: {
        color: 'white',
        fontSize: 8,
        fontFamily: 'Poppins-Light',
    },
    resultsList: {
        gap: 16,
    },
    songItemContainer: {
        flexDirection: 'row',
        height: 64,
        alignItems: 'center',
    },
    songAlbumArt: {
        width: 63,
        height: 58,
        backgroundColor: '#D9D9D9',
        borderRadius: 15,
    },
    songMainInfo: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    songTitleText: {
        color: 'white',
        fontSize: 13,
        fontFamily: 'Poppins-SemiBold',
        marginBottom: 2,
    },
    songArtistText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        fontFamily: 'Poppins-Light',
        marginBottom: 2,
    },
    songPriceText: {
        color: 'white',
        fontSize: 10,
        fontFamily: 'Poppins-Light',
    },
    songActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        marginRight: 10,
        marginTop: 20,
    },
    moreButton: {
        padding: 4,
    },
    itemDivider: {
        height: 1,
        backgroundColor: '#464646',
        width: '100%',
    },
    artistItem: {
        width: 88,
        marginRight: 17,
        alignItems: 'center',
    },
    circlePlaceholder: {
        width: 88,
        height: 86,
        backgroundColor: '#D9D9D9',
        borderRadius: 44,
    },
    artistNameSmall: {
        color: 'white',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        textAlign: 'center',
        marginTop: 4,
    },
});
