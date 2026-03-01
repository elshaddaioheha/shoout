import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    updateDoc,
    where
} from 'firebase/firestore';
import {
    ChevronLeft,
    MessageCircle,
    Music,
    Share2,
    User
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function ArtistProfileScreen() {
    const { id: artistId } = useLocalSearchParams();
    const router = useRouter();
    const [artist, setArtist] = useState<any>(null);
    const [tracks, setTracks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);

    useEffect(() => {
        if (!artistId) return;

        // Fetch Artist Profile
        const fetchArtist = async () => {
            const docRef = doc(db, 'users', artistId as string);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setArtist(data);
                setFollowersCount(data.followers?.length || 0);
                setIsFollowing(data.followers?.includes(auth.currentUser?.uid));
            }
        };

        // Fetch Artist Tracks
        const fetchTracks = async () => {
            const q = query(
                collection(db, 'users', artistId as string, 'uploads'),
                where('isPublic', '==', true)
            );
            const snapshot = await getDocs(q);
            setTracks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };

        Promise.all([fetchArtist(), fetchTracks()]).finally(() => setLoading(false));
    }, [artistId]);

    const handleFollow = async () => {
        if (!auth.currentUser) {
            Alert.alert("Auth Required", "Log in to follow artists.");
            return;
        }

        if (auth.currentUser.uid === artistId) return;

        const artistRef = doc(db, 'users', artistId as string);
        const userRef = doc(db, 'users', auth.currentUser.uid);

        try {
            if (isFollowing) {
                await updateDoc(artistRef, { followers: arrayRemove(auth.currentUser.uid) });
                await updateDoc(userRef, { following: arrayRemove(artistId) });
                setIsFollowing(false);
                setFollowersCount(prev => prev - 1);
            } else {
                await updateDoc(artistRef, { followers: arrayUnion(auth.currentUser.uid) });
                await updateDoc(userRef, { following: arrayUnion(artistId) });
                setIsFollowing(true);
                setFollowersCount(prev => prev + 1);
            }
        } catch (err) {
            console.error("Follow error:", err);
        }
    };

    if (loading) {
        return (
            <SafeScreenWrapper>
                <View style={styles.centerContainer}>
                    <ActivityIndicator color="#EC5C39" />
                </View>
            </SafeScreenWrapper>
        );
    }

    return (
        <SafeScreenWrapper>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Header Backdrop */}
                <View style={styles.header}>
                    <LinearGradient
                        colors={['#EC5C39', '#140F10']}
                        style={styles.backdrop}
                    />
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.shareBtn}>
                        <Share2 size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Profile Info */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <User size={50} color="white" />
                        </View>
                    </View>
                    <Text style={styles.artistName}>{artist?.name || 'Artist'}</Text>
                    <Text style={styles.artistRole}>{(artist?.role || 'Creator').toUpperCase()}</Text>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{followersCount}</Text>
                            <Text style={styles.statLabel}>Followers</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{artist?.following?.length || 0}</Text>
                            <Text style={styles.statLabel}>Following</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{tracks.length}</Text>
                            <Text style={styles.statLabel}>Tracks</Text>
                        </View>
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.followBtn, isFollowing && styles.followingBtn]}
                            onPress={handleFollow}
                        >
                            <Text style={styles.followBtnText}>{isFollowing ? 'Following' : 'Follow'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.msgBtn}
                            onPress={() => router.push({ pathname: '/chat/[id]', params: { id: artistId } })}
                        >
                            <MessageCircle size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tracks Section */}
                <View style={styles.tracksSection}>
                    <Text style={styles.sectionTitle}>Tracks</Text>
                    {tracks.length === 0 ? (
                        <Text style={styles.emptyText}>No public tracks listed yet.</Text>
                    ) : (
                        tracks.map(track => (
                            <TouchableOpacity
                                key={track.id}
                                style={styles.trackCard}
                                onPress={() => router.push({ pathname: '/listing/[id]', params: { id: track.id } })}
                            >
                                <View style={styles.trackArtwork}>
                                    <Music size={20} color="rgba(255,255,255,0.2)" />
                                </View>
                                <View style={styles.trackInfo}>
                                    <Text style={styles.trackTitle}>{track.title}</Text>
                                    <Text style={styles.trackMeta}>{track.genre} • {track.bpm} BPM</Text>
                                </View>
                                <Text style={styles.trackPrice}>${track.price}</Text>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#140F10' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { height: 200, position: 'relative' },
    backdrop: { ...StyleSheet.absoluteFillObject, opacity: 0.3 },
    backBtn: { position: 'absolute', top: 20, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    shareBtn: { position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    profileSection: { alignItems: 'center', marginTop: -60, paddingHorizontal: 20 },
    avatarContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#140F10', padding: 5 },
    avatar: { flex: 1, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#EC5C39' },
    artistName: { fontSize: 24, fontFamily: 'Poppins-Bold', color: '#FFF', marginTop: 15 },
    artistRole: { fontSize: 12, fontFamily: 'Poppins-Bold', color: '#EC5C39', marginTop: 2, letterSpacing: 1 },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 25, width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 15 },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#FFF' },
    statLabel: { fontSize: 11, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.4)' },
    statDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.1)' },
    actionRow: { flexDirection: 'row', marginTop: 25, gap: 15, width: '100%' },
    followBtn: { flex: 1, height: 50, borderRadius: 15, backgroundColor: '#EC5C39', alignItems: 'center', justifyContent: 'center' },
    followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    followBtnText: { color: '#FFF', fontSize: 16, fontFamily: 'Poppins-Bold' },
    msgBtn: { width: 50, height: 50, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    tracksSection: { padding: 24, marginTop: 10 },
    sectionTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#FFF', marginBottom: 20 },
    trackCard: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 15, marginBottom: 12 },
    trackArtwork: { width: 45, height: 45, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    trackInfo: { flex: 1, marginLeft: 12 },
    trackTitle: { fontSize: 15, fontFamily: 'Poppins-Bold', color: '#FFF' },
    trackMeta: { fontSize: 12, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.4)', marginTop: 2 },
    trackPrice: { fontSize: 15, fontFamily: 'Poppins-Bold', color: '#EC5C39' },
    emptyText: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 20 }
});
