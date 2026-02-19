import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    SafeAreaView,
    Dimensions,
    StatusBar,
    Platform
} from 'react-native';
import { Search, ChevronLeft, ShoppingCart, Heart, MoreVertical, Compass } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

type ViewMode = 'browse' | 'allGenres' | 'results';

export default function SearchScreen() {
    const [viewMode, setViewMode] = useState<ViewMode>('browse');
    const [searchQuery, setSearchQuery] = useState('');

    const featuredGenres = [
        { name: "Paradise", colors: ["#EC5C39", "#863420"] },
        { name: "Afrobeats", colors: ["#319F43", "#123918"] },
        { name: "Afro-Pop", colors: ["#587DBD", "#293A57"] },
        { name: "Gospel", colors: ["#8A38F5", "#51218F"] },
        { name: "Highlife", colors: ["#D32626", "#6D1414"] },
        { name: "Jùjú", colors: ["#293A57", "#587DBD"] }
    ];

    const allGenres = [
        ...featuredGenres,
        { name: "Indigenous", colors: ["#C2B9AC", "#5C5852"] },
        { name: "Hip-Hop", colors: ["rgba(70,70,70,0.18)", "rgba(172,171,171,0.0324)"] },
        { name: "Fuji", colors: ["#E33629", "#7D1E17"] },
        { name: "Blues", colors: ["#40302C", "#A67C74"] },
        { name: "Afro Soul", colors: ["#A67C74", "#40302C"] },
        { name: "Afro Fusion", colors: ["#587DBD", "#293A57"] },
        { name: "Afro Pop", colors: ["#319F43", "#123918"] },
        { name: "Rock", colors: ["#F5F5F5", "#8F8F8F"], dark: true }
    ];

    const songs = [
        { title: "Afro Beats", artist: "Sound of Salem", price: "NGN 3000.00" },
        { title: "Sonic Beats", artist: "Sound of Salem", price: "NGN 3000.00" },
        { title: "DA Beats", artist: "Sound of Salem", price: "NGN 3000.00" },
        { title: "Project B", artist: "Sound of Salem", price: "NGN 3000.00" }
    ];

    const artists = ["Davido", "Wizkid", "Lawrence Oyor", "Rema", "Dusin Oyekun"];

    const openGenre = (name: string) => {
        setSearchQuery(name);
        setViewMode('results');
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

            {/* Header Area */}
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    {viewMode !== 'browse' ? (
                        <View style={styles.resultsHeaderRow}>
                            <TouchableOpacity onPress={goBack} style={styles.backButton}>
                                <ChevronLeft size={24} color="#D9D9D9" />
                            </TouchableOpacity>
                            <View style={styles.headerLeftWithBack}>
                                <View style={styles.userProfileCircle}>
                                    <Text style={styles.userProfileInitial}>C</Text>
                                </View>
                                <Text style={styles.headerTitle}>{viewMode === 'allGenres' ? 'Search' : (searchQuery || 'Results')}</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.headerLeft}>
                            <View style={styles.userProfileCircle}>
                                <Text style={styles.userProfileInitial}>C</Text>
                            </View>
                            <Text style={styles.headerTitle}>Search</Text>
                        </View>
                    )}
                </View>

                {/* Search Bar (Hidden in All Genres view as per design screenshots usually, but let's keep it if not specifically removed) */}
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
            </SafeAreaView>

            {/* Content Area */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {viewMode === 'browse' && (
                    <BrowseView
                        genres={featuredGenres}
                        onGenrePress={openGenre}
                        onSeeAll={() => setViewMode('allGenres')}
                    />
                )}
                {viewMode === 'allGenres' && (
                    <AllGenresView genres={allGenres} onGenrePress={openGenre} />
                )}
                {viewMode === 'results' && (
                    <SearchResultsView songs={songs} artists={artists} />
                )}
            </ScrollView>

            {/* Home Indicator */}
            <View style={styles.homeIndicator} />
        </View>
    );
}

// Sub-component for Initial Browse View
function BrowseView({ genres, onGenrePress, onSeeAll }: {
    genres: any[],
    onGenrePress: (n: string) => void,
    onSeeAll: () => void
}) {
    const playlists = [
        { title: "Wizkid Playlist Specal", subtitle: "Personal Selection", price: "NGN 3000.00" },
        { title: "Shoouts Top 100", subtitle: "Afro Gospel" },
        { title: "Breezy Playlist", subtitle: "Afro Beats", price: "NGN 3000.00" }
    ];

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
                <TouchableOpacity><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {playlists.map((playlist, idx) => (
                    <View key={idx} style={styles.playlistItem}>
                        <View style={styles.playlistVisualContainer}>
                            <View style={[styles.playlistLayer, { backgroundColor: '#464646', transform: [{ rotate: '9.7deg' }] }]} />
                            <View style={[styles.playlistLayer, { backgroundColor: '#767676', transform: [{ rotate: '5.15deg' }], top: 3 }]} />
                            <View style={[styles.playlistLayer, { backgroundColor: '#D9D9D9', top: 12 }]} />
                        </View>
                        <View style={{ marginTop: 24 }}>
                            <Text style={styles.playlistTitle}>{playlist.title}</Text>
                            <Text style={styles.playlistSubtitle}>{playlist.subtitle}</Text>
                            {playlist.price && <Text style={styles.playlistPrice}>{playlist.price}</Text>}
                        </View>
                    </View>
                ))}
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
function SearchResultsView({ songs, artists }: { songs: any[], artists: string[] }) {
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
                <TouchableOpacity><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {artists.map((artist, idx) => (
                    <TouchableOpacity key={idx} style={styles.artistItem}>
                        <View style={styles.circlePlaceholder} />
                        <Text style={styles.artistNameSmall}>{artist}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={[styles.sectionHeader, { marginTop: 30 }]}>
                <Text style={styles.sectionTitle}>Popular Beats</Text>
                <TouchableOpacity><Text style={styles.seeAllText}>See All</Text></TouchableOpacity>
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
    return (
        <View style={styles.songItemContainer}>
            <View style={styles.songAlbumArt} />
            <View style={styles.songMainInfo}>
                <Text style={styles.songTitleText}>{song.title}</Text>
                <Text style={styles.songArtistText}>{song.artist}</Text>
                <Text style={styles.songPriceText}>{song.price}</Text>
            </View>
            <View style={styles.songActionsRow}>
                <TouchableOpacity><ShoppingCart size={14} color="#EC5C39" strokeWidth={1.5} /></TouchableOpacity>
                <TouchableOpacity><Heart size={12} color="#EC5C39" strokeWidth={1.5} /></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.moreButton}>
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
        height: 41,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: 'rgba(20,15,16,0.9)',
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 11,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        color: 'black',
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
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
    homeIndicator: {
        position: 'absolute',
        bottom: 8,
        alignSelf: 'center',
        width: 134,
        height: 5,
        backgroundColor: 'white',
        borderRadius: 3,
        opacity: 0.5,
    },
});
