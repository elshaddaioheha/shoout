import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useCartStore } from '@/store/useCartStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    addDoc,
    collection,
    collectionGroup,
    getDocs,
    query,
    serverTimestamp,
    where
} from 'firebase/firestore';
import {
    ChevronLeft,
    Clock,
    DollarSign,
    MessageCircle,
    Music,
    Pause,
    Play,
    Share2,
    ShoppingBag,
    ShoppingCart,
    Tag
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
import { auth, db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

export default function ListingDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [listing, setListing] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);

    const { currentTrack, setTrack, isPlaying } = usePlaybackStore();
    const { items: cartItems, addItem } = useCartStore();
    const isThisTrackPlaying = currentTrack?.id === id && isPlaying;
    const isInCart = cartItems.some(i => i.id === id);

    useEffect(() => {
        const fetchListing = async () => {
            try {
                // Since listings are subcollections, we search across all of them for this ID
                const q = query(collectionGroup(db, 'uploads'), where('__name__', '==', id));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    setListing({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
                } else {
                    Alert.alert("Error", "Listing not found");
                    router.back();
                }
            } catch (err) {
                console.error("Error fetching listing:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchListing();
    }, [id]);

    const handlePlayPreview = () => {
        if (!listing) return;
        setTrack({
            id: listing.id,
            title: listing.title,
            artist: listing.uploaderName || "Creator",
            url: listing.audioUrl,
            uploaderId: listing.userId
        });
    };

    const handleAddToCart = () => {
        if (!listing) return;
        addItem({
            id: listing.id,
            title: listing.title,
            artist: listing.uploaderName || "Creator",
            price: listing.price,
            audioUrl: listing.audioUrl,
            uploaderId: listing.userId,
            category: listing.category
        });
        Alert.alert("Added to Cart", `${listing.title} has been added to your cart.`);
    };

    const handlePurchase = async () => {
        if (!auth.currentUser) {
            Alert.alert("Auth Required", "Please log in to purchase tracks.");
            return;
        }

        setPurchasing(true);
        try {
            // 1. Record Transaction
            await addDoc(collection(db, 'transactions'), {
                trackId: id,
                buyerId: auth.currentUser.uid,
                sellerId: listing.userId,
                amount: listing.price,
                trackTitle: listing.title,
                timestamp: serverTimestamp(),
                status: 'completed'
            });

            // 2. Add to User's Library (Purchases)
            await addDoc(collection(db, 'users', auth.currentUser.uid, 'purchases'), {
                trackId: id,
                title: listing.title,
                artist: listing.uploaderName || "Creator",
                price: listing.price,
                uploaderId: listing.userId,
                purchasedAt: serverTimestamp(),
                audioUrl: listing.audioUrl || '',
                coverUrl: listing.coverUrl || ''
            });

            Alert.alert(
                "Purchase Successful!",
                "You now have access to this track in your library.",
                [{ text: "View Library", onPress: () => router.push('/(tabs)/library') }]
            );
        } catch (e) {
            console.error("Purchase error:", e);
            Alert.alert("Error", "Transaction failed. Please try again.");
        } finally {
            setPurchasing(false);
        }
    };

    if (loading) {
        return (
            <SafeScreenWrapper>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#EC5C39" size="large" />
                </View>
            </SafeScreenWrapper>
        );
    }

    if (!listing) return null;

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                {/* Header Actions */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={styles.iconAction}
                            onPress={() => router.push('/cart')}
                        >
                            <ShoppingCart size={20} color="#FFF" />
                            {cartItems.length > 0 && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{cartItems.length}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconAction}>
                            <Share2 size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Artwork Container */}
                    <View style={styles.artworkContainer}>
                        <LinearGradient
                            colors={['rgba(236, 92, 57, 0.2)', '#140F10']}
                            style={styles.artworkPlaceholder}
                        >
                            <Music size={80} color="rgba(255,255,255,0.1)" />

                            {/* Floating Play Button */}
                            <TouchableOpacity
                                style={styles.mainPlayBtn}
                                onPress={handlePlayPreview}
                            >
                                <LinearGradient
                                    colors={['#EC5C39', '#863420']}
                                    style={styles.playGradient}
                                >
                                    {isThisTrackPlaying ? (
                                        <Pause size={32} color="#FFF" />
                                    ) : (
                                        <Play size={32} color="#FFF" fill="#FFF" />
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>

                    {/* Metadata Section */}
                    <View style={styles.content}>
                        <Text style={styles.title}>{listing.title}</Text>
                        <TouchableOpacity
                            style={styles.artistRow}
                            onPress={() => router.push({ pathname: '/profile/[id]', params: { id: listing.userId } })}
                        >
                            <View style={styles.avatarPlaceholder} />
                            <Text style={styles.artistName}>by {listing.uploaderName || 'Creator'}</Text>
                        </TouchableOpacity>

                        {/* Price & Stats Row */}
                        <View style={styles.statsRow}>
                            <View style={styles.priceContainer}>
                                <Text style={styles.priceLabel}>Price</Text>
                                <Text style={styles.priceValue}>${listing.price?.toFixed(2) || '0.00'}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.metaBadge}>
                                <Clock size={14} color="#EC5C39" />
                                <Text style={styles.metaText}>{listing.bpm || '--'} BPM</Text>
                            </View>
                            <View style={styles.metaBadge}>
                                <Tag size={14} color="#EC5C39" />
                                <Text style={styles.metaText}>{listing.genre}</Text>
                            </View>
                        </View>

                        {/* Description */}
                        <View style={styles.descriptionSection}>
                            <Text style={styles.sectionTitle}>Description</Text>
                            <Text style={styles.description}>
                                {listing.description || "No description provided for this track."}
                            </Text>
                        </View>

                        {/* Licensing Section (Mock for UI premium feel) */}
                        <View style={styles.licenseCard}>
                            <ShoppingBag size={20} color="#EC5C39" />
                            <View style={styles.licenseInfo}>
                                <Text style={styles.licenseTitle}>Basic Lease</Text>
                                <Text style={styles.licenseSub}>MP3 + WAV, 5,000 Streams</Text>
                            </View>
                            <ChevronLeft size={20} color="rgba(255,255,255,0.3)" style={{ transform: [{ rotate: '180deg' }] }} />
                        </View>
                    </View>
                </ScrollView>

                {/* Bottom Purchase Bar */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.chatBtn}
                        onPress={() => {
                            if (!auth.currentUser) {
                                Alert.alert("Auth Required", "Please log in to contact creators.");
                                return;
                            }
                            router.push({ pathname: '/chat/[id]', params: { id: listing.userId } });
                        }}
                    >
                        <MessageCircle size={24} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.chatBtn, isInCart && { backgroundColor: 'rgba(236, 92, 57, 0.1)' }]}
                        onPress={handleAddToCart}
                        disabled={isInCart}
                    >
                        {isInCart ? (
                            <ShoppingCart size={24} color="#EC5C39" />
                        ) : (
                            <ShoppingCart size={24} color="#FFF" />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.buyBtn}
                        onPress={handlePurchase}
                        disabled={purchasing}
                    >
                        <LinearGradient
                            colors={['#EC5C39', '#863420']}
                            style={styles.buyGradient}
                        >
                            {purchasing ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <DollarSign size={20} color="#FFF" />
                                    <Text style={styles.buyText}>Buy Now</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#140F10' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        zIndex: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRight: { flexDirection: 'row', gap: 10 },
    iconAction: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    artworkContainer: {
        width: width,
        height: width,
        marginTop: -80, // Offset to bleed behind header
    },
    artworkPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E1A1B',
    },
    mainPlayBtn: {
        position: 'absolute',
        bottom: -35,
        right: 30,
        width: 70,
        height: 70,
        borderRadius: 35,
        elevation: 10,
        shadowColor: '#EC5C39',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    playGradient: {
        flex: 1,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 50,
        paddingBottom: 120,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
    },
    artistRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 10,
    },
    avatarPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    artistName: {
        fontSize: 16,
        fontFamily: 'Poppins-Medium',
        color: '#EC5C39',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 20,
        marginTop: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    priceContainer: { flex: 1 },
    priceLabel: {
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.4)',
    },
    priceValue: {
        fontSize: 20,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginHorizontal: 15,
    },
    metaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(236, 92, 57, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
        marginLeft: 10,
    },
    metaText: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: 'Poppins-SemiBold',
    },
    descriptionSection: { marginTop: 30 },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
        marginBottom: 10,
    },
    description: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 22,
    },
    licenseCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 16,
        marginTop: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        gap: 15,
    },
    licenseInfo: { flex: 1 },
    licenseTitle: { fontSize: 15, fontFamily: 'Poppins-Bold', color: '#FFF' },
    licenseSub: { fontSize: 12, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.4)' },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1A1516',
        paddingHorizontal: 24,
        paddingVertical: 20,
        flexDirection: 'row',
        gap: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    chatBtn: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buyBtn: { flex: 1, height: 56, borderRadius: 16, overflow: 'hidden' },
    buyGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    buyText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EC5C39',
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#140F10',
    },
    badgeText: {
        color: 'white',
        fontSize: 9,
        fontFamily: 'Poppins-Bold',
    },
});
