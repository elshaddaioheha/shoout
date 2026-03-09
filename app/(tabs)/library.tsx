import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SharedHeader from '@/components/SharedHeader';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUserStore } from '@/store/useUserStore';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Download, Heart, MoreVertical, Music } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function LibraryScreen() {
    const { viewMode: appViewMode } = useUserStore();
    const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
    const [uploads, setUploads] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser) return;

        const uploadsQuery = query(
            collection(db, `users/${auth.currentUser.uid}/uploads`),
            orderBy('createdAt', 'desc')
        );

        const purchasesQuery = query(
            collection(db, `users/${auth.currentUser.uid}/purchases`),
            orderBy('purchasedAt', 'desc')
        );

        // Listener for personal uploads
        const unsubUploads = onSnapshot(uploadsQuery, (snapshot) => {
            const tracks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUploads(tracks);
            if (loading) setLoading(false);
        });

        // Listener for purchased tracks
        const unsubPurchases = onSnapshot(purchasesQuery, (snapshot) => {
            const tracks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPurchases(tracks);
            setLoading(false);
        });

        return () => {
            unsubUploads();
            unsubPurchases();
        };
    }, []);

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <SharedHeader viewMode={viewMode} isModeSheetOpen={isModeSheetOpen} onModePillPress={openSheet} />

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

                    {/* Purchased Items */}
                    {purchases.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Purchased Music</Text>
                            <View style={styles.list}>
                                {purchases.map((track) => (
                                    <LibraryItem
                                        key={track.id}
                                        id={track.id}
                                        uploaderId={track.uploaderId}
                                        title={track.title}
                                        artist={track.artist}
                                        type="Purchase"
                                        url={track.audioUrl}
                                    />
                                ))}
                            </View>
                            <View style={{ height: 24 }} />
                        </>
                    )}

                    {/* Personal Uploads / Vault Items */}
                    <Text style={styles.sectionTitle}>
                        {viewMode === 'studio' ? 'Published Songs' : 'Private Vault Uploads'}
                    </Text>
                    <View style={styles.list}>
                        {loading ? (
                            <ActivityIndicator color="#EC5C39" style={{ marginVertical: 20 }} />
                        ) : uploads.length > 0 ? (
                            uploads.map((track) => (
                                <LibraryItem
                                    key={track.id}
                                    id={track.id}
                                    uploaderId={auth.currentUser?.uid}
                                    title={track.title}
                                    artist={viewMode === 'studio' ? 'You' : 'Self-Uploaded'}
                                    type={track.genre || (track.price > 0 ? 'Marketplace' : 'Vault')}
                                    url={track.audioUrl}
                                />
                            ))
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Music size={32} color="rgba(255,255,255,0.2)" />
                                <Text style={styles.emptyText}>No tracks found</Text>
                            </View>
                        )}
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>


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

function LibraryItem({ id, uploaderId, title, artist, type, url }: any) {
    const setTrack = usePlaybackStore(state => state.setTrack);

    const handleShare = async () => {
        if (!url) return;
        try {
            await Share.share({
                message: `Listen to my secure track "${title}" on Shoouts Vault:\n\n${url}`,
            });
        } catch (error: any) {
            console.error('Error sharing link:', error.message);
        }
    };

    return (
        <TouchableOpacity
            style={styles.itemRow}
            onPress={() => setTrack({
                id: id || `lib-${title}`,
                uploaderId: uploaderId,
                title,
                artist,
                url: url
            })}
        >
            <View style={styles.itemArtwork} />
            <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{title}</Text>
                <Text style={styles.itemArtist}>{artist} • {type}</Text>
            </View>
            <TouchableOpacity style={styles.moreButton} onPress={handleShare}>
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
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        backgroundColor: 'rgba(255,255,255,0.01)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderStyle: 'dashed',
    },
    emptyText: {
        color: 'rgba(255,255,255,0.3)',
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        marginTop: 12,
    },
});
