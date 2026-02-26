import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SharedHeader from '@/components/SharedHeader';
import Sidebar from '@/components/Sidebar';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUserStore } from '@/store/useUserStore';
import { Download, Heart, MoreVertical, Music } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function LibraryScreen() {
    const { viewMode } = useUserStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <SharedHeader onMenuPress={() => setIsSidebarOpen(true)} title="Library" />

                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <Text style={styles.subtitle}>
                        {viewMode === 'studio' ? 'Your saved beats and creations' : 'Your saved music and playlists'}
                    </Text>

                    {/* Categories */}
                    <View style={styles.categories}>
                        <CategoryItem icon={Heart} label="Favorites" count="24" />
                        <CategoryItem icon={Music} label={viewMode === 'studio' ? 'Beats' : 'Playlists'} count="12" />
                        <CategoryItem icon={Download} label="Downloads" count="8" />
                    </View>

                    {/* Recent Items */}
                    <Text style={styles.sectionTitle}>Recently Added</Text>
                    <View style={styles.list}>
                        <LibraryItem title="Midnight Afro" artist="Jungle G" type="Song" />
                        <LibraryItem title="Lagos Vibe" artist="Sound of Salem" type="Beat" />
                        <LibraryItem title="Essence Remix" artist="Wizkid" type="Song" />
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            </View>
        </SafeScreenWrapper>
    );
}

function CategoryItem({ icon: Icon, label, count }: any) {
    return (
        <TouchableOpacity style={styles.categoryCard}>
            <View style={styles.iconContainer}>
                <Icon size={24} color="#EC5C39" />
            </View>
            <Text style={styles.categoryLabel}>{label}</Text>
            <Text style={styles.categoryCount}>{count} items</Text>
        </TouchableOpacity>
    );
}

function LibraryItem({ title, artist, type }: any) {
    const setTrack = usePlaybackStore(state => state.setTrack);
    return (
        <TouchableOpacity
            style={styles.itemRow}
            onPress={() => setTrack({
                id: `lib-${title}`,
                title,
                artist,
                url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
            })}
        >
            <View style={styles.itemArtwork} />
            <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{title}</Text>
                <Text style={styles.itemArtist}>{artist} • {type}</Text>
            </View>
            <TouchableOpacity style={styles.moreButton}>
                <MoreVertical size={20} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#140F10' },
    content: { padding: 24 },
    subtitle: { fontSize: 13, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.5)', marginBottom: 24 },
    categories: { flexDirection: 'row', gap: 12, marginBottom: 32 },
    categoryCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(236, 92, 57, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    categoryLabel: { color: '#FFF', fontFamily: 'Poppins-SemiBold', fontSize: 13 },
    categoryCount: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontFamily: 'Poppins-Regular' },
    sectionTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#FFF', marginBottom: 16 },
    list: { gap: 12 },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 16,
        padding: 12,
    },
    itemArtwork: { width: 50, height: 50, borderRadius: 8, backgroundColor: '#333' },
    itemInfo: { flex: 1, marginLeft: 16 },
    itemTitle: { color: '#FFF', fontSize: 15, fontFamily: 'Poppins-SemiBold' },
    itemArtist: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'Poppins-Regular' },
    moreButton: { padding: 4 },
});
