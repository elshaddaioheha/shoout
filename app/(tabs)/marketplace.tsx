import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SharedHeader from '@/components/SharedHeader';
import Sidebar from '@/components/Sidebar';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUserStore } from '@/store/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { DollarSign, Filter, Music, Search, Upload } from 'lucide-react-native';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function MarketplaceScreen() {
    const router = useRouter();
    const { role, viewMode } = useUserStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const isStudioMode = viewMode === 'studio';

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                {/* Header */}
                <SharedHeader onMenuPress={() => setIsSidebarOpen(true)} title="Marketplace" />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
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

                    {/* Featured Sections */}
                    <MarketplaceSection title="Trending Beats" items={TRENDING_BEATS} />
                    <MarketplaceSection title="Top Samples" items={TOP_SAMPLES} />
                    <MarketplaceSection title="Exclusive Kits" items={EXCLUSIVE_KITS} />

                    <View style={{ height: 100 }} />
                </ScrollView>
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            </View>
        </SafeScreenWrapper>
    );
}

function MarketplaceSection({ title, items }: any) {
    const setTrack = usePlaybackStore(state => state.setTrack);
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {items.map((item: any, idx: number) => (
                    <TouchableOpacity
                        key={idx}
                        style={styles.marketCard}
                        onPress={() => setTrack({
                            id: `mkt-${idx}-${item.title}`,
                            title: item.title,
                            artist: item.artist,
                            url: item.url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
                        })}
                    >
                        <View style={styles.cardImage}>
                            <Music size={32} color="rgba(255,255,255,0.1)" />
                            <View style={styles.priceBadge}>
                                <Text style={styles.priceText}>${item.price}</Text>
                            </View>
                        </View>
                        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.itemArtist}>{item.artist}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const TRENDING_BEATS = [
    { title: 'Lagos Fire', artist: 'Dozie Beats', price: '29.99', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3' },
    { title: 'Amapiano King', artist: 'Kabza', price: '49.99', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3' },
    { title: 'Drill Flow', artist: 'Ghost Producer', price: '34.99', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3' },
];

const TOP_SAMPLES = [
    { title: 'Afro Vocal Pack', artist: 'Seyi Shay', price: '19.99', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3' },
    { title: 'Drum Kit v2', artist: 'P-Prime', price: '15.00', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3' },
];

const EXCLUSIVE_KITS = [
    { title: 'Grammy Melodies', artist: 'Kel-P', price: '99.99' },
];

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#140F10' },
    scrollContent: { paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
    title: { fontSize: 24, fontFamily: 'Poppins-Bold', color: '#FFF' },
    subtitle: { fontSize: 13, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.5)' },
    cartButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    cartBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#EC5C39', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#140F10' },
    cartBadgeText: { color: '#FFF', fontSize: 10, fontFamily: 'Poppins-Bold' },
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
});
