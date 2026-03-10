import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { PayWithFlutterwave } from 'flutterwave-react-native';

import {
    ArrowRight,
    ChevronLeft,
    CreditCard,
    Music,
    ShoppingBag,
    Trash2
} from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function CartScreen() {
    const router = useRouter();
    const { items, removeItem, clearCart, total } = useCartStore();
    const [checkingOut, setCheckingOut] = useState(false);
    const [showFWButton, setShowFWButton] = useState(false);
    const fwRef = useRef<any>(null);
    const { showToast } = useToastStore();

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
                <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
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
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <ChevronLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Your Cart</Text>
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
                            <ShoppingBag size={60} color="rgba(255,255,255,0.05)" />
                        </View>
                        <Text style={styles.emptyTitle}>Your cart is empty</Text>
                        <Text style={styles.emptySub}>Explore the marketplace to find your next hit!</Text>
                        <TouchableOpacity
                            style={styles.browseBtn}
                            onPress={() => router.push('/(tabs)/marketplace')}
                        >
                            <Text style={styles.browseText}>Browse Marketplace</Text>
                        </TouchableOpacity>
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
                                <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
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
        fontFamily: 'Poppins-Bold',
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
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.02)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 25,
    },
    emptyTitle: {
        fontSize: 22,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
        textAlign: 'center',
    },
    emptySub: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
        marginTop: 10,
    },
    browseBtn: {
        marginTop: 30,
        backgroundColor: 'rgba(236, 92, 57, 0.1)',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(236, 92, 57, 0.2)',
    },
    browseText: {
        color: '#EC5C39',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
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
