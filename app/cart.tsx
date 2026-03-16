import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    addDoc,
    collection,
    collectionGroup,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    where
} from 'firebase/firestore';
import { PayWithFlutterwave } from 'flutterwave-react-native';

import {
    ArrowRight,
    ChevronLeft,
    CreditCard,
    Library,
    Music,
    ShoppingCart,
    Trash2
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

type MarketplaceItem = {
    id: string;
    title?: string;
    uploaderName?: string;
    price?: number;
    coverUrl?: string;
    userId?: string;
};

const formatNaira = (value: number) => `NGN ${value.toFixed(2)}`;

export default function CartScreen() {
    const router = useRouter();
    const { items, removeItem, clearCart, total } = useCartStore();
    const [checkingOut, setCheckingOut] = useState(false);
    const [showFWButton, setShowFWButton] = useState(false);
    const [bestSellers, setBestSellers] = useState<MarketplaceItem[]>([]);
    const [bestSellerLoading, setBestSellerLoading] = useState(true);
    const [purchasedCount, setPurchasedCount] = useState(0);
    const { showToast } = useToastStore();

    useEffect(() => {
        const marketQuery = query(
            collectionGroup(db, 'uploads'),
            where('isPublic', '==', true),
            orderBy('listenCount', 'desc'),
            limit(12)
        );

        const unsubMarket = onSnapshot(
            marketQuery,
            (snapshot) => {
                const liveItems = snapshot.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...(docSnap.data() as Omit<MarketplaceItem, 'id'>),
                }));
                setBestSellers(liveItems);
                setBestSellerLoading(false);
            },
            () => {
                setBestSellers([]);
                setBestSellerLoading(false);
            }
        );

        const uid = auth.currentUser?.uid;
        if (!uid) {
            setPurchasedCount(0);
            return () => unsubMarket();
        }

        const purchaseQuery = query(collection(db, 'users', uid, 'purchases'));
        const unsubPurchases = onSnapshot(purchaseQuery, (snapshot) => {
            setPurchasedCount(snapshot.size);
        });

        return () => {
            unsubMarket();
            unsubPurchases();
        };
    }, []);

    // Called after Flutterwave confirms payment
    const handlePaymentSuccess = async () => {
        if (!auth.currentUser) return;
        setCheckingOut(true);
        try {
            const batchPromises = items.flatMap(item => [
                addDoc(collection(db, 'transactions'), {
                    trackId: item.id,
                    buyerId: auth.currentUser!.uid,
                    sellerId: item.uploaderId,
                    amount: item.price,
                    trackTitle: item.title,
                    timestamp: serverTimestamp(),
                    status: 'completed',
                    paymentProvider: 'flutterwave',
                }),
                addDoc(collection(db, 'users', auth.currentUser!.uid, 'purchases'), {
                    trackId: item.id,
                    title: item.title,
                    artist: item.artist,
                    price: item.price,
                    uploaderId: item.uploaderId,
                    purchasedAt: serverTimestamp(),
                    audioUrl: item.audioUrl || '',
                    coverUrl: item.coverUrl || '',
                })
            ]);
            await Promise.all(batchPromises);
            clearCart();
            Alert.alert(
                '🎉 Purchase Successful!',
                `${items.length} track${items.length > 1 ? 's are' : ' is'} now in your library.`,
                [{ text: 'View Library', onPress: () => router.push('/(tabs)/library') }]
            );
        } catch (error) {
            console.error('Post-payment error:', error);
            showToast('Payment succeeded but delivery failed. Contact support.', 'error');
        } finally {
            setCheckingOut(false);
        }
    };

    const handleCheckout = () => {
        if (!auth.currentUser) {
            showToast('Please log in to complete your purchase.', 'error');
            router.push('/(auth)/login');
            return;
        }
        if (items.length === 0) return;
        // Trigger the hidden Flutterwave button
        setShowFWButton(true);
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.cartItem}
            onPress={() => router.push({ pathname: '/listing/[id]' as any, params: { id: item.id, uploaderId: item.uploaderId } })}
            activeOpacity={0.8}
        >
            <View style={styles.itemArtwork}>
                <Music size={24} color="rgba(255,255,255,0.2)" />
            </View>
            <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.itemArtist}>{item.artist}</Text>
                <Text style={styles.itemPrice}>{formatNaira(item.price)}</Text>
            </View>
            <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeItem(item.id)}
            >
                <Trash2 size={20} color="#EF4444" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Cart</Text>
                    <TouchableOpacity
                        onPress={() => items.length > 0 && Alert.alert("Clear Cart", "Are you sure?", [
                            { text: "Cancel" },
                            { text: "Clear", onPress: clearCart, style: 'destructive' }
                        ])}
                        disabled={items.length === 0}
                    >
                        <Text style={[styles.clearText, items.length === 0 && { opacity: 0.3 }]}>Clear</Text>
                    </TouchableOpacity>
                </View>

                {items.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <ShoppingCart size={72} color="rgba(255,255,255,0.7)" />
                        </View>
                        <Text style={styles.emptyTitle}>No Item in Cart</Text>
                        {purchasedCount > 0 ? (
                            <Text style={styles.purchasedCountText}>+{purchasedCount} Purchased Items</Text>
                        ) : null}

                        <TouchableOpacity
                            style={styles.browseBtn}
                            onPress={() => router.push('/(tabs)/marketplace')}
                        >
                            <Text style={styles.browseText}>Browse Marketplace</Text>
                        </TouchableOpacity>

                        {purchasedCount > 0 ? (
                            <TouchableOpacity style={styles.viewListBtn} onPress={() => router.push('/(tabs)/library')}>
                                <Library size={16} color="#EC5C39" />
                                <Text style={styles.viewListText}>View List</Text>
                            </TouchableOpacity>
                        ) : null}

                        <View style={styles.bestSellerHeader}>
                            <Text style={styles.bestSellerTitle}>Best Sellers</Text>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/marketplace')}>
                                <Text style={styles.bestSellerLink}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {bestSellerLoading ? (
                            <View style={styles.bestSellerLoadingWrap}>
                                <ActivityIndicator color="#EC5C39" />
                                <Text style={styles.bestSellerPlaceholderText}>Loading live listings...</Text>
                            </View>
                        ) : bestSellers.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bestSellerScroll}>
                                {bestSellers.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.bestSellerCard}
                                        onPress={() =>
                                            router.push({
                                                pathname: '/listing/[id]' as any,
                                                params: { id: item.id, uploaderId: item.userId || '' },
                                            })
                                        }
                                    >
                                        <View style={styles.bestSellerArtwork}>
                                            {item.coverUrl ? (
                                                <Image source={{ uri: item.coverUrl }} style={styles.bestSellerArtworkImage} />
                                            ) : (
                                                <Music size={22} color="rgba(255,255,255,0.25)" />
                                            )}
                                        </View>
                                        <Text style={styles.bestSellerItemTitle} numberOfLines={1}>{item.title || 'Untitled Track'}</Text>
                                        <Text style={styles.bestSellerItemArtist} numberOfLines={1}>{item.uploaderName || 'Creator'}</Text>
                                        <Text style={styles.bestSellerItemPrice}>{formatNaira(item.price || 0)}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : (
                            <Text style={styles.bestSellerPlaceholderText}>
                                Best sellers will appear here when live marketplace tracks are available.
                            </Text>
                        )}
                    </View>
                ) : (
                    <>
                        <FlatList
                            data={items}
                            keyExtractor={(item) => item.id}
                            renderItem={renderItem}
                            contentContainerStyle={styles.listContent}
                        />

                        {/* Summary & Checkout */}
                        <View style={styles.footer}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Total Items</Text>
                                <Text style={styles.summaryValue}>{items.length}</Text>
                            </View>
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Total Price</Text>
                                <Text style={styles.totalValue}>{formatNaira(total)}</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.checkoutBtn}
                                onPress={handleCheckout}
                                disabled={checkingOut}
                            >
                                <LinearGradient
                                    colors={['#EC5C39', '#863420']}
                                    style={styles.checkoutGradient}
                                >
                                    {checkingOut ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <>
                                            <CreditCard size={20} color="#FFF" />
                                            <Text style={styles.checkoutText}>Complete Purchase</Text>
                                            <ArrowRight size={20} color="#FFF" />
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* Hidden Flutterwave trigger — auto-fires when showFWButton = true */}
                            {showFWButton && auth.currentUser && (
                                <PayWithFlutterwave
                                    onRedirect={(data) => {
                                        setShowFWButton(false);
                                        if (data.status === 'successful') {
                                            handlePaymentSuccess();
                                        } else {
                                            showToast('Your payment was not completed.', 'error');
                                        }
                                    }}
                                    options={{
                                        tx_ref: `shoouts_cart_${Date.now()}`,
                                        authorization: process.env.EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || '',
                                        customer: {
                                            email: auth.currentUser.email || 'customer@shoouts.com',
                                        },
                                        amount: Math.round(total * 1600), // USD → NGN approx
                                        currency: 'NGN',
                                        payment_options: 'card,banktransfer',
                                    }}
                                    customButton={(props) => {
                                        // Auto-press as soon as it renders
                                        setTimeout(() => { if (!props.disabled) props.onPress(); }, 100);
                                        return <View />;
                                    }}
                                />
                            )}
                        </View>
                    </>
                )}
            </View>
        </SafeScreenWrapper>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#140F10',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Poppins-SemiBold',
        color: '#FFF',
    },
    clearText: {
        color: '#EC5C39',
        fontSize: 14,
        fontFamily: 'Poppins-Medium',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 200,
    },
    cartItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    itemArtwork: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemInfo: {
        flex: 1,
        marginLeft: 15,
    },
    itemTitle: {
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
    },
    itemArtist: {
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.4)',
        marginTop: 2,
    },
    itemPrice: {
        fontSize: 14,
        fontFamily: 'Poppins-SemiBold',
        color: '#EC5C39',
        marginTop: 4,
    },
    removeBtn: {
        padding: 10,
    },
    emptyContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 30,
    },
    emptyIconContainer: {
        width: 170,
        height: 170,
        borderRadius: 85,
        backgroundColor: 'rgba(255,255,255,0.04)',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 15,
        fontFamily: 'Poppins-Medium',
        color: '#FFF',
        textAlign: 'center',
    },
    purchasedCountText: {
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
        color: '#FFF',
        textAlign: 'center',
        marginTop: 10,
    },
    browseBtn: {
        marginTop: 14,
        backgroundColor: '#EC5C39',
        alignSelf: 'center',
        paddingHorizontal: 22,
        paddingVertical: 10,
        borderRadius: 999,
    },
    browseText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Poppins-Medium',
    },
    viewListBtn: {
        marginTop: 10,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    viewListText: {
        color: '#EC5C39',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
    },
    bestSellerHeader: {
        marginTop: 32,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bestSellerTitle: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: 'Poppins-SemiBold',
    },
    bestSellerLink: {
        color: '#EC5C39',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
    },
    bestSellerLoadingWrap: {
        height: 120,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bestSellerPlaceholderText: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        marginTop: 10,
        textAlign: 'center',
    },
    bestSellerScroll: {
        paddingRight: 8,
    },
    bestSellerCard: {
        width: Math.min(width * 0.33, 126),
        marginRight: 14,
    },
    bestSellerArtwork: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bestSellerArtworkImage: {
        width: '100%',
        height: '100%',
    },
    bestSellerItemTitle: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        marginTop: 8,
    },
    bestSellerItemArtist: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
        fontFamily: 'Poppins-Light',
    },
    bestSellerItemPrice: {
        color: '#FFF',
        fontSize: 9,
        fontFamily: 'Poppins-Light',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1E1A1B',
        paddingHorizontal: 24,
        paddingVertical: 25,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.4)',
    },
    summaryValue: {
        fontSize: 14,
        fontFamily: 'Poppins-Medium',
        color: '#FFF',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    totalLabel: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
    },
    totalValue: {
        fontSize: 24,
        fontFamily: 'Poppins-Bold',
        color: '#EC5C39',
    },
    checkoutBtn: {
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
    },
    checkoutGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 15,
        paddingHorizontal: 20,
    },
    checkoutText: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
    },
});
