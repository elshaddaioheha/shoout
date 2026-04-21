import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import FilterSheet from '@/components/FilterSheet';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SharedHeader from '@/components/SharedHeader';
import StudioPromoteScreen from '@/components/studio/StudioPromoteScreen';
import { colors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { useUserStore } from '@/store/useUserStore';
import { getModeSurfaceTheme } from '@/utils/appModeTheme';
import { adaptLegacyColor, adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { getEffectivePlan } from '@/utils/subscriptions';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collectionGroup, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import {
    DollarSign,
    Filter,
    Music,
    Search,
    Upload
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

function useMarketplaceStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function MarketplaceScreen() {
    const appTheme = useAppTheme();
    const styles = useMarketplaceStyles();
    const searchIconColor = adaptLegacyColor('rgba(255,255,255,0.3)', 'color', appTheme);
    const placeholderColor = appTheme.colors.textPlaceholder;
    const loadingTextColor = adaptLegacyColor('rgba(255,255,255,0.4)', 'color', appTheme);
    const emptyResultIconColor = adaptLegacyColor('rgba(255,255,255,0.1)', 'color', appTheme);
    const emptyResultTextColor = adaptLegacyColor('rgba(255,255,255,0.3)', 'color', appTheme);

    const router = useRouter();
    const { role, activeAppMode } = useUserStore();
    const { actualRole } = useAuthStore();
    const { showToast } = useToastStore();
    const cartItems = useCartStore(state => state.items);
    const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const [allItems, setAllItems] = useState<any[]>([]);

    const [trending, setTrending] = useState<any[]>([]);
    const [samples, setSamples] = useState<any[]>([]);
    const [arrivals, setArrivals] = useState<any[]>([]);

    const rebuildSections = (allItems: any[]) => {
        setTrending(allItems.slice(0, 5));
        setSamples(allItems.filter((i: any) => i.assetType === 'Sample' || i.category === 'Sample').slice(0, 5));
        setArrivals(allItems.slice().sort((a: any, b: any) =>
            (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
        ).slice(0, 5));
    };

    const loadPage = async (after?: any) => {
        let q = query(
            collectionGroup(db, 'uploads'),
            where('isPublic', '==', true),
            orderBy('listenCount', 'desc'),
            limit(20)
        );

        if (after) {
            q = query(
                collectionGroup(db, 'uploads'),
                where('isPublic', '==', true),
                orderBy('listenCount', 'desc'),
                startAfter(after),
                limit(20)
            );
        }

        const snap = await getDocs(q);
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === 20);
        return items;
    };

    useEffect(() => {
        (async () => {
            try {
                const items = await loadPage();
                setAllItems(items);
                rebuildSections(items);
            } catch (err) {
                console.warn('Marketplace query failed (Check for Firestore Index):', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleLoadMore = async () => {
        if (!lastDoc || loadingMore || !hasMore) return;

        setLoadingMore(true);
        try {
            const moreItems = await loadPage(lastDoc);
            const combined = [...allItems, ...moreItems];
            const deduped = Array.from(new Map(combined.map((item: any) => [item.id, item])).values());
            setAllItems(deduped);
            rebuildSections(deduped);
        } catch (err) {
            console.warn('Failed to load more marketplace items:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    const [filterOpen, setFilterOpen] = useState(false);
    const [sortBy, setSortBy] = useState('Newest');
    const [filterCategory, setFilterCategory] = useState('All');

    const isStudioMode = activeAppMode === 'studio' || activeAppMode === 'hybrid';
    const modeTheme = getModeSurfaceTheme(activeAppMode, appTheme.isDark);
    const accentColor = modeTheme.accent;
    const accentStrong = modeTheme.accentStrong;
    const accentTint = modeTheme.accentTint;
    const accentSoft = modeTheme.accentSoft;

    if (activeAppMode === 'studio' || activeAppMode === 'hybrid') {
        return <StudioPromoteScreen />;
    }

    const filterItems = (items: any[]) => {
        if (!searchQuery) return items;
        return items.filter(item =>
            item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.uploaderName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.genre?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const currentPlan = getEffectivePlan(actualRole || role);
    const isStudioPaid = currentPlan === 'studio' || currentPlan === 'hybrid';

    const filteredTrending = filterItems(trending);
    const filteredSamples = filterItems(samples);
    const filteredArrivals = filterItems(arrivals);

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <SharedHeader
                    viewMode={viewMode}
                    isModeSheetOpen={isModeSheetOpen}
                    onModePillPress={openSheet}
                    showCart={true}
                    cartCount={cartItems.length}
                    showMessages={true}
                />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Search & Filter */}
                    <View style={styles.searchRow}>
                        <View style={styles.searchBar}>
                            <Search size={20} color={searchIconColor} />
                            <TextInput
                                placeholder="Search beats, samples..."
                                placeholderTextColor={placeholderColor}
                                style={styles.searchInput}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                        <TouchableOpacity style={[styles.filterButton, { backgroundColor: accentSoft }]} onPress={() => setFilterOpen(true)}>
                            <Filter size={20} color={appTheme.colors.textPrimary} />
                        </TouchableOpacity>
                    </View>

                    {/* Studio Controls for Sellers */}
                    {isStudioMode && (
                        <LinearGradient
                            colors={[appTheme.colors.surface, appTheme.colors.background]}
                            style={styles.studioBanner}
                        >
                            <View style={styles.studioTextContainer}>
                                <Text style={styles.studioTitle}>Seller Dashboard</Text>
                                <Text style={styles.studioSubtitle}>Manage your uploads and earnings</Text>
                            </View>
                            <View style={styles.studioActions}>
                                <TouchableOpacity
                                    style={styles.studioActionBtn}
                                    onPress={() => {
                                        if (!auth.currentUser) {
                                            showToast('Please sign in to upload your music.', 'error');
                                            router.push({ pathname: '/(auth)/login', params: { redirectTo: '/studio/upload' } });
                                            return;
                                        }
                                        router.push('/studio/upload');
                                    }}
                                >
                                    <Upload size={18} color={appTheme.colors.textPrimary} />
                                    <Text style={styles.studioActionText}>Upload</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.studioActionBtn, { backgroundColor: accentColor }]}
                                    onPress={() => {
                                        if (!isStudioPaid) {
                                            showToast('Upgrade to Studio Pro to access earnings.', 'info');
                                            return;
                                        }
                                        router.push('/studio/withdraw');
                                    }}
                                >
                                    <DollarSign size={18} color={appTheme.colors.textPrimary} />
                                    <Text style={styles.studioActionText}>Earnings</Text>
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    )}

                    {loading ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <ActivityIndicator color={accentColor} />
                            <Text style={{ color: loadingTextColor, marginTop: 10 }}>Loading Store...</Text>
                        </View>
                    ) : (
                        <>
                            <MarketplaceSection title="Trending Beats" items={filteredTrending} accentColor={accentColor} accentStrong={accentStrong} />
                            <MarketplaceSection title="Top Samples" items={filteredSamples} accentColor={accentColor} accentStrong={accentStrong} />
                            <MarketplaceSection title="New Arrivals" items={filteredArrivals} accentColor={accentColor} accentStrong={accentStrong} />

                            {hasMore && (
                                <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore} disabled={loadingMore}>
                                    <Text style={styles.loadMoreText}>{loadingMore ? 'Loading...' : 'Load More'}</Text>
                                </TouchableOpacity>
                            )}

                            {filteredTrending.length === 0 && filteredSamples.length === 0 && filteredArrivals.length === 0 && (
                                <View style={{ padding: 40, alignItems: 'center' }}>
                                    <Music size={40} color={emptyResultIconColor} />
                                    <Text style={{ color: emptyResultTextColor, marginTop: 10 }}>No results found for "{searchQuery}"</Text>
                                </View>
                            )}
                        </>
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>

                <FilterSheet
                    visible={filterOpen}
                    onClose={() => setFilterOpen(false)}
                    sortOptions={['Newest', 'Most Popular', 'Price: Low to High', 'Price: High to Low']}
                    selectedSort={sortBy}
                    onSortChange={setSortBy}
                    categories={['All', 'Beats', 'Samples', 'Loops', 'Vocals']}
                    selectedCategory={filterCategory}
                    onCategoryChange={setFilterCategory}
                    onReset={() => { setSortBy('Newest'); setFilterCategory('All'); }}
                />
            </View>
        </SafeScreenWrapper>
    );
}

function MarketplaceSection({ title, items, accentColor, accentStrong }: any) {
    const appTheme = useAppTheme();
    const styles = useMarketplaceStyles();
    const setTrack = usePlaybackStore(state => state.setTrack);
    const router = useRouter();
    const warningSurface = appTheme.isDark ? 'rgba(245,166,35,0.18)' : 'rgba(210,138,20,0.12)';
    const warningBorder = appTheme.isDark ? 'rgba(245,166,35,0.32)' : 'rgba(210,138,20,0.24)';

    const resolveScheduledMs = (item: any): number | null => {
        const raw = item?.scheduledReleaseAtMs;
        if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
        if (typeof raw === 'string') {
            const parsed = Number(raw);
            if (Number.isFinite(parsed)) return parsed;
        }
        return null;
    };

    const getUpcomingState = (item: any) => {
        const scheduledMs = resolveScheduledMs(item);
        const isUpcoming = item?.lifecycleStatus === 'upcoming' && (!scheduledMs || scheduledMs > Date.now());
        return { isUpcoming, scheduledMs };
    };

    if (items.length === 0) return null;

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/marketplace')}><Text style={[styles.seeAll, { color: accentColor }]}>See All</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {items.map((item: any, idx: number) => (
                    (() => {
                        const { isUpcoming, scheduledMs } = getUpcomingState(item);
                        return (
                    <TouchableOpacity
                        key={item.id || idx}
                        style={styles.marketCard}
                        onPress={() => router.push({ pathname: '/listing/[id]' as any, params: { id: item.id, uploaderId: item.userId } })}
                    >
                        <View style={styles.cardImage}>
                            {(item.artworkUrl || item.coverUrl) ? (
                                <Image
                                    source={{ uri: item.artworkUrl || item.coverUrl }}
                                    style={styles.cardImageAsset}
                                />
                            ) : null}
                            <Music size={32} color={adaptLegacyColor('rgba(255,255,255,0.1)', 'color', appTheme)} />
                            <View style={[styles.priceBadge, { backgroundColor: accentColor }]}>
                                <Text style={styles.priceText}>
                                    {isUpcoming ? 'Pre-order ' : ''}${item.price?.toFixed(2) || '0.00'}
                                </Text>
                            </View>
                            {isUpcoming && (
                                <View style={[styles.upcomingBadge, { backgroundColor: warningSurface, borderColor: warningBorder }]}>
                                    <Text style={[styles.upcomingBadgeText, { color: appTheme.colors.warning }]}>Upcoming</Text>
                                </View>
                            )}
                            {/* Play Preview Fast Action */}
                            <TouchableOpacity
                                style={styles.previewPlay}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    setTrack({
                                        id: item.id,
                                        title: item.title,
                                        artist: item.uploaderName || "Creator",
                                        url: item.audioUrl,
                                        uploaderId: item.userId,
                                        artworkUrl: item.artworkUrl || item.coverUrl || '',
                                    });
                                }}
                            >
                                <LinearGradient
                                    colors={[accentColor, accentStrong]}
                                    style={styles.previewCircle}
                                >
                                    <Music size={14} color={appTheme.colors.textPrimary} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.itemArtist}>
                            {item.uploaderName || 'Shoouter'}
                            {isUpcoming && scheduledMs ? ` • ${new Date(scheduledMs).toLocaleDateString()}` : ''}
                        </Text>
                    </TouchableOpacity>
                        );
                    })()
                ))}
            </ScrollView>
        </View>
    );
}

const legacyStyles = {
    container: { flex: 1, backgroundColor: '#140F10' },
    scrollContent: { paddingBottom: 40 },
    searchRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 24 },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 16, height: 50 },
    searchInput: { flex: 1, marginLeft: 12, color: '#FFF', fontFamily: 'Poppins-Regular' },
    filterButton: { width: 50, height: 50, borderRadius: 16, backgroundColor: `${colors.shooutPrimary}1A`, alignItems: 'center', justifyContent: 'center' },
    studioBanner: { marginHorizontal: 24, padding: 20, borderRadius: 24, marginBottom: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    studioTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', color: '#FFF' },
    studioSubtitle: { fontSize: 12, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.62)', marginBottom: 16 },
    studioActions: { flexDirection: 'row', gap: 12 },
    studioActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', height: 44, borderRadius: 12 },
    studioActionText: { color: '#FFF', fontSize: 13, fontFamily: 'Poppins-SemiBold' },
    studioTextContainer: { flex: 1 },
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#FFF' },
    seeAll: { fontSize: 14, fontFamily: 'Poppins-Medium', color: colors.shooutPrimary },
    horizontalScroll: { paddingLeft: 24 },
    marketCard: { width: 160, marginRight: 16 },
    cardImage: { width: 160, height: 160, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    cardImageAsset: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    priceBadge: { position: 'absolute', bottom: 12, right: 12, backgroundColor: colors.shooutPrimary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    priceText: { color: '#FFF', fontSize: 12, fontFamily: 'Poppins-Bold' },
    itemTitle: { color: '#FFF', fontSize: 15, fontFamily: 'Poppins-SemiBold' },
    itemArtist: { color: 'rgba(255,255,255,0.62)', fontSize: 12, fontFamily: 'Poppins-Regular' },
    previewPlay: {
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 10,
    },
    previewCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: `${colors.shooutPrimary}33`,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    upcomingBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    upcomingBadgeText: {
        fontSize: 10,
        fontFamily: 'Poppins-Bold',
        letterSpacing: 0.4,
    },
    merchBanner: {
        marginHorizontal: 20,
        marginBottom: 25,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: `${colors.shooutPrimary}4D`,
    },
    merchGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
    },
    merchTextContent: {
        flex: 1,
    },
    merchTitle: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
    },
    merchSub: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        marginTop: 2,
    },
    merchIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadMoreButton: {
        alignSelf: 'center',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginBottom: 16,
    },
    loadMoreText: {
        color: '#FFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },
};

