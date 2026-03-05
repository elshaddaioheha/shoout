import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SharedHeader from '@/components/SharedHeader';
import Sidebar from '@/components/Sidebar';
import { useCartStore } from '@/store/useCartStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUserStore } from '@/store/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collectionGroup, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import {
    DollarSign,
    Filter,
    Music,
    Search,
    ShoppingBag,
    Upload
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

export default function MarketplaceScreen() {
    const router = useRouter();
    const { role, viewMode } = useUserStore();
    const cartItems = useCartStore(state => state.items);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const [trending, setTrending] = useState<any[]>([]);
    const [samples, setSamples] = useState<any[]>([]);
    const [arrivals, setArrivals] = useState<any[]>([]);

    useEffect(() => {
        // Fetch All Public Tracks
        const q = query(
            collectionGroup(db, 'uploads'),
            where('isPublic', '==', true),
            orderBy('listenCount', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Logic to segment for MVP
            setTrending(allItems.slice(0, 5));
            setSamples(allItems.filter((i: any) => i.category === 'Sample').slice(0, 5));
            setArrivals(allItems.slice().sort((a: any, b: any) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
            ).slice(0, 5));

            setLoading(false);
        }, (err) => {
            console.warn("Marketplace query failed (Check for Firestore Index):", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const isStudioMode = viewMode === 'studio';

    const filterItems = (items: any[]) => {
        if (!searchQuery) return items;
        return items.filter(item =>
            item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.uploaderName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.genre?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const filteredTrending = filterItems(trending);
    const filteredSamples = filterItems(samples);
    const filteredArrivals = filterItems(arrivals);

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <SharedHeader
                    onMenuPress={() => setIsSidebarOpen(true)}
                    title="Marketplace"
                    showCart={true}
                    cartCount={cartItems.length}
                    showMessages={true}
                />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Merch Store Entry */}
                    <TouchableOpacity
                        style={styles.merchBanner}
                        onPress={() => router.push('/merch' as any)}
                    >
                        <LinearGradient
                            colors={['#EC5C39', '#863420']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.merchGradient}
                        >
                            <View style={styles.merchTextContent}>
                                <Text style={styles.merchTitle}>Visit Merch Store</Text>
                                <Text style={styles.merchSub}>Buy custom apparel & vinyl</Text>
                            </View>
                            <View style={styles.merchIconCircle}>
                                <ShoppingBag size={24} color="#FFF" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Search & Filter */}
                    <View style={styles.searchRow}>
                        <View style={styles.searchBar}>
                            <Search size={20} color="rgba(255,255,255,0.3)" />
                            <TextInput
                                placeholder="Search beats, samples..."
                                placeholderTextColor="rgba(255,255,255,0.3)"
                                style={styles.searchInput}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                        <TouchableOpacity style={styles.filterButton}>
                            <Filter size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Studio Controls for Sellers */}
                    {isStudioMode && (
                        <LinearGradient
                            colors={['#1E1A1B', '#140F10']}
                            style={styles.studioBanner}
                        >
                            <View style={styles.studioTextContainer}>
                                <Text style={styles.studioTitle}>Seller Dashboard</Text>
                                <Text style={styles.studioSubtitle}>Manage your uploads and earnings</Text>
                            </View>
                            <View style={styles.studioActions}>
                                <TouchableOpacity
                                    style={styles.studioActionBtn}
                                    onPress={() => router.push('/studio/upload')}
                                >
                                    <Upload size={18} color="#FFF" />
                                    <Text style={styles.studioActionText}>Upload</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.studioActionBtn, { backgroundColor: '#EC5C39' }]}
                                    onPress={() => router.push('/studio/withdraw')}
                                >
                                    <DollarSign size={18} color="#FFF" />
                                    <Text style={styles.studioActionText}>Earnings</Text>
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>
                    )}

                    {loading ? (
                        <View style={{ padding: 40, alignItems: 'center' }}>
                            <ActivityIndicator color="#EC5C39" />
                            <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 10 }}>Loading Store...</Text>
                        </View>
                    ) : (
                        <>
                            <MarketplaceSection title="Trending Beats" items={filteredTrending} />
                            <MarketplaceSection title="Top Samples" items={filteredSamples} />
                            <MarketplaceSection title="New Arrivals" items={filteredArrivals} />

                            {filteredTrending.length === 0 && filteredSamples.length === 0 && filteredArrivals.length === 0 && (
                                <View style={{ padding: 40, alignItems: 'center' }}>
                                    <Music size={40} color="rgba(255,255,255,0.1)" />
                                    <Text style={{ color: 'rgba(255,255,255,0.3)', marginTop: 10 }}>No results found for "{searchQuery}"</Text>
                                </View>
                            )}
                        </>
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            </View>
        </SafeScreenWrapper>
    );
}

function MarketplaceSection({ title, items }: any) {
    const setTrack = usePlaybackStore(state => state.setTrack);
    const router = useRouter();

    if (items.length === 0) return null;

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {items.map((item: any, idx: number) => (
                    <TouchableOpacity
                        key={item.id || idx}
                        style={styles.marketCard}
                        onPress={() => router.push({ pathname: '/listing/[id]' as any, params: { id: item.id } })}
                    >
                        <View style={styles.cardImage}>
                            <Music size={32} color="rgba(255,255,255,0.1)" />
                            <View style={styles.priceBadge}>
                                <Text style={styles.priceText}>${item.price?.toFixed(2) || '0.00'}</Text>
                            </View>
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
                                        uploaderId: item.userId
                                    });
                                }}
                            >
                                <LinearGradient
                                    colors={['#EC5C39', '#863420']}
                                    style={styles.previewCircle}
                                >
                                    <Music size={14} color="#FFF" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.itemArtist}>{item.uploaderName || 'Shoouter'}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#140F10' },
    scrollContent: { paddingBottom: 40 },
    searchRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 24 },
    searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 16, height: 50 },
    searchInput: { flex: 1, marginLeft: 12, color: '#FFF', fontFamily: 'Poppins-Regular' },
    filterButton: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(236, 92, 57, 0.1)', alignItems: 'center', justifyContent: 'center' },
    studioBanner: { marginHorizontal: 24, padding: 20, borderRadius: 24, marginBottom: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    studioTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', color: '#FFF' },
    studioSubtitle: { fontSize: 12, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.4)', marginBottom: 16 },
    studioActions: { flexDirection: 'row', gap: 12 },
    studioActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', height: 44, borderRadius: 12 },
    studioActionText: { color: '#FFF', fontSize: 13, fontFamily: 'Poppins-SemiBold' },
    studioTextContainer: { flex: 1 },
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#FFF' },
    seeAll: { fontSize: 14, fontFamily: 'Poppins-Medium', color: '#EC5C39' },
    horizontalScroll: { paddingLeft: 24 },
    marketCard: { width: 160, marginRight: 16 },
    cardImage: { width: 160, height: 160, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    priceBadge: { position: 'absolute', bottom: 12, right: 12, backgroundColor: '#EC5C39', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    priceText: { color: '#FFF', fontSize: 12, fontFamily: 'Poppins-Bold' },
    itemTitle: { color: '#FFF', fontSize: 15, fontFamily: 'Poppins-SemiBold' },
    itemArtist: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'Poppins-Regular' },
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
        backgroundColor: 'rgba(236, 92, 57, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    merchBanner: {
        marginHorizontal: 20,
        marginBottom: 25,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(236, 92, 57, 0.3)',
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
});
