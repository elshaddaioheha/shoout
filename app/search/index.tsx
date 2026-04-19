import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Search, ChevronLeft, Music, ShoppingCart } from 'lucide-react-native';
import { Image } from 'expo-image';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePublishedUploads, type PublishedUpload } from '@/hooks/usePublishedUploads';
import { useCartStore } from '@/store/useCartStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { formatUsd } from '@/utils/pricing';
import { adaptLegacyColor } from '@/utils/legacyThemeAdapter';

const FEATURED_GENRES = ['Afrobeats', 'Afro-Pop', 'Gospel', 'Highlife', 'Hip-Hop', 'Afro Fusion'];

export default function SearchScreen() {
    const router = useRouter();
    const appTheme = useAppTheme();
    const { showToast } = useToastStore();
    const setTrack = usePlaybackStore((state) => state.setTrack);
    const addItem = useCartStore((state) => state.addItem);

    const { tracks: items, loading } = usePublishedUploads(180);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

    const searchIconColor = adaptLegacyColor('rgba(255,255,255,0.45)', 'color', appTheme);
    const placeholderColor = appTheme.colors.textPlaceholder;
    const genreChipTextColor = appTheme.colors.textSecondary;
    const genreChipActiveTextColor = appTheme.colors.textPrimary;

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filteredItems = useMemo(() => {
        const genreFiltered = selectedGenre
            ? items.filter((item) => item.genre.toLowerCase().includes(selectedGenre.toLowerCase()))
            : items;

        if (!normalizedQuery) return genreFiltered;

        return genreFiltered.filter((item) =>
            item.title.toLowerCase().includes(normalizedQuery) ||
            item.uploaderName.toLowerCase().includes(normalizedQuery) ||
            item.genre.toLowerCase().includes(normalizedQuery)
        );
    }, [items, normalizedQuery, selectedGenre]);

    const suggestedTracks = useMemo(() => [...filteredItems].sort((a, b) => b.listenCount - a.listenCount).slice(0, 12), [filteredItems]);
    const trendingArtists = useMemo(() => {
        const map = new Map<string, { name: string; score: number; art?: string }>();
        for (const item of filteredItems) {
            const key = item.uploaderName.toLowerCase();
            const prev = map.get(key);
            if (!prev) {
                map.set(key, { name: item.uploaderName, score: item.listenCount, art: item.artworkUrl });
            } else {
                map.set(key, { ...prev, score: prev.score + item.listenCount, art: prev.art || item.artworkUrl });
            }
        }
        return [...map.values()].sort((a, b) => b.score - a.score).slice(0, 10);
    }, [filteredItems]);

    const popularBeats = useMemo(() => [...filteredItems].filter((item) => item.price > 0).sort((a, b) => b.listenCount - a.listenCount).slice(0, 12), [filteredItems]);

    const handlePlay = (item: PublishedUpload) => {
        setTrack({
            id: item.id,
            title: item.title,
            artist: item.uploaderName,
            url: item.audioUrl,
            uploaderId: item.uploaderId,
            artworkUrl: item.artworkUrl,
        }).catch(error => {
            console.error('Play from search failed:', error);
            showToast('Could not play this track.', 'error');
        });
    };

    const handlePurchase = (item: PublishedUpload) => {
        addItem({
            id: item.id,
            title: item.title,
            artist: item.uploaderName,
            price: item.price,
            audioUrl: item.audioUrl,
            uploaderId: item.uploaderId,
            category: 'Track',
        });
        showToast('Added to cart.', 'success');
    };

    return (
        <SafeScreenWrapper>
            <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.85}>
                        <ChevronLeft size={24} color={appTheme.colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={[styles.searchBar, { backgroundColor: appTheme.colors.backgroundElevated, borderColor: appTheme.colors.borderStrong }]}>
                        <Search size={16} color={searchIconColor} />
                        <TextInput
                            style={[styles.searchInput, { color: appTheme.colors.textPrimary }]}
                            placeholder="Search tracks, artists, genres"
                            placeholderTextColor={placeholderColor}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                    </View>
                </View>

                <FlatList
                    horizontal
                    data={FEATURED_GENRES}
                    keyExtractor={(item) => item}
                    showsHorizontalScrollIndicator={false}
                    style={styles.genreStrip}
                    contentContainerStyle={styles.genreStripContent}
                    renderItem={({ item }) => {
                        const active = selectedGenre === item;
                        return (
                            <TouchableOpacity
                                style={[styles.genreChip, active && styles.genreChipActive, { backgroundColor: appTheme.colors.backgroundElevated, borderColor: active ? '#6AA7FF' : appTheme.colors.borderStrong }]}
                                onPress={() => setSelectedGenre(active ? null : item)}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.genreChipText, { color: active ? '#D8E8FF' : genreChipTextColor }]}>{item}</Text>
                            </TouchableOpacity>
                        );
                    }}
                />

                {loading ? (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyStateText, { color: appTheme.colors.textSecondary }]}>Loading discover feed...</Text>
                    </View>
                ) : filteredItems.length === 0 ? (
                    <View style={[styles.emptyState, { backgroundColor: appTheme.colors.backgroundElevated, borderColor: appTheme.colors.borderStrong }]}>
                        <Text style={[styles.emptyStateText, { color: appTheme.colors.textSecondary }]}>No published tracks match this search yet.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={[
                            { key: 'suggested', title: 'Suggested Tracks', rows: suggestedTracks },
                            { key: 'artists', title: 'Trending Artists', rows: trendingArtists as any },
                            { key: 'beats', title: 'Popular Beats', rows: popularBeats },
                        ]}
                        keyExtractor={(item) => item.key}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.searchSections}
                        renderItem={({ item }) => {
                            if (item.key === 'artists') {
                                return (
                                    <View style={styles.sectionBlock}>
                                        <Text style={[styles.sectionTitle, { color: appTheme.colors.textPrimary }]}>{item.title}</Text>
                                        <FlatList
                                            horizontal
                                            data={item.rows as { name: string; art?: string }[]}
                                            keyExtractor={(row) => row.name}
                                            showsHorizontalScrollIndicator={false}
                                            contentContainerStyle={styles.horizontalPad}
                                            renderItem={({ item: artist }) => (
                                                <View style={[styles.artistCard, { backgroundColor: appTheme.colors.backgroundElevated, borderColor: appTheme.colors.borderStrong }]}>
                                                    <View style={styles.artistArtwork}>
                                                        {artist.art ? (
                                                            <Image source={{ uri: artist.art }} style={styles.fillImage} contentFit="cover" />
                                                        ) : (
                                                            <Music size={18} color={appTheme.colors.textSecondary} />
                                                        )}
                                                    </View>
                                                    <Text numberOfLines={1} style={[styles.artistName, { color: appTheme.colors.textPrimary }]}>{artist.name}</Text>
                                                </View>
                                            )}
                                        />
                                    </View>
                                );
                            }

                            return (
                                <View style={styles.sectionBlock}>
                                    <Text style={[styles.sectionTitle, { color: appTheme.colors.textPrimary }]}>{item.title}</Text>
                                    <FlatList
                                        horizontal
                                        data={item.rows as PublishedUpload[]}
                                        keyExtractor={(row) => `${item.key}-${row.id}`}
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.horizontalPad}
                                        renderItem={({ item: row }) => (
                                            <View style={styles.trackCard}>
                                                <TouchableOpacity style={[styles.trackArtwork, { borderColor: appTheme.colors.borderStrong }]} onPress={() => handlePlay(row)} activeOpacity={0.85}>
                                                    {row.artworkUrl ? (
                                                        <Image source={{ uri: row.artworkUrl }} style={styles.fillImage} contentFit="cover" />
                                                    ) : (
                                                        <Music size={22} color={appTheme.colors.textSecondary} />
                                                    )}
                                                </TouchableOpacity>
                                                <Text numberOfLines={1} style={[styles.trackTitle, { color: appTheme.colors.textPrimary }]}>{row.title}</Text>
                                                <Text numberOfLines={1} style={[styles.trackMeta, { color: appTheme.colors.textSecondary }]}>{row.uploaderName}</Text>
                                                <TouchableOpacity style={[styles.inlinePurchaseBtn, { borderColor: appTheme.colors.borderStrong, backgroundColor: appTheme.colors.backgroundElevated }]} onPress={() => handlePurchase(row)} activeOpacity={0.85}>
                                                    <ShoppingCart size={14} color={appTheme.colors.textPrimary} />
                                                    <Text style={[styles.inlinePurchaseText, { color: appTheme.colors.textPrimary }]}>{formatUsd(row.price || 0)}</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    />
                                </View>
                            );
                        }}
                    />
                )}
            </View>
        </SafeScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
    searchBar: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
    searchInput: { flex: 1, fontSize: 15, fontFamily: 'Poppins-Regular', paddingVertical: 0 },
    genreStrip: { flexGrow: 0, marginTop: 8, marginBottom: 8, paddingVertical: 8 },
    genreStripContent: { paddingHorizontal: 20, gap: 8, paddingRight: 24 },
    genreChip: { paddingHorizontal: 16, height: 32, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    genreChipActive: { backgroundColor: 'rgba(106,167,255,0.16)' },
    genreChipText: { fontFamily: 'Poppins-Medium', fontSize: 13 },
    emptyState: { marginHorizontal: 20, marginTop: 20, padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
    emptyStateText: { fontFamily: 'Poppins-Regular', fontSize: 13 },
    searchSections: { paddingBottom: 100, gap: 24, marginTop: 10 },
    sectionBlock: {},
    sectionTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', marginLeft: 20, marginBottom: 16 },
    horizontalPad: { paddingHorizontal: 20, gap: 14, paddingRight: 32 },
    artistCard: { width: 140, padding: 14, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
    artistArtwork: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' },
    artistName: { fontSize: 13, fontFamily: 'Poppins-SemiBold', textAlign: 'center' },
    trackCard: { width: 140 },
    trackArtwork: { width: 140, height: 140, borderRadius: 16, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden' },
    fillImage: { ...StyleSheet.absoluteFillObject },
    trackTitle: { fontSize: 13, fontFamily: 'Poppins-SemiBold', marginBottom: 2 },
    trackMeta: { fontSize: 11, fontFamily: 'Poppins-Regular', marginBottom: 8 },
    inlinePurchaseBtn: { flexDirection: 'row', alignItems: 'center', height: 32, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, alignSelf: 'flex-start', gap: 6 },
    inlinePurchaseText: { fontSize: 12, fontFamily: 'Poppins-SemiBold' },
});
