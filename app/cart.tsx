import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useCartStore } from '@/store/useCartStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
    ArrowRight,
    ChevronLeft,
    CreditCard,
    Music,
    ShoppingBag,
    Trash2
} from 'lucide-react-native';
import React, { useState } from 'react';
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
import { auth, db } from '../firebaseConfig';

const { width } = Dimensions.get('window');

export default function CartScreen() {
    const router = useRouter();
    const { items, removeItem, clearCart, total } = useCartStore();
    const [checkingOut, setCheckingOut] = useState(false);

    const handleCheckout = async () => {
        if (!auth.currentUser) {
            Alert.alert("Auth Required", "Please log in to complete your purchase.");
            router.push('/(auth)/login');
            return;
        }

        if (items.length === 0) return;

        setCheckingOut(true);
        try {
            // Process each item as a transaction AND add to user's library
            const batchPromises = items.flatMap(item => [
                // 1. Record Transaction
                addDoc(collection(db, 'transactions'), {
                    trackId: item.id,
                    buyerId: auth.currentUser!.uid,
                    sellerId: item.uploaderId,
                    amount: item.price,
                    trackTitle: item.title,
                    timestamp: serverTimestamp(),
                    status: 'completed'
                }),
                // 2. Add to User's Library (Purchases)
                addDoc(collection(db, 'users', auth.currentUser!.uid, 'purchases'), {
                    trackId: item.id,
                    title: item.title,
                    artist: item.artist,
                    price: item.price,
                    uploaderId: item.uploaderId,
                    purchasedAt: serverTimestamp(),
                    audioUrl: item.audioUrl || '', // Ensure we have the URL if it exists
                    coverUrl: item.coverUrl || ''
                })
            ]);

            await Promise.all(batchPromises);

            Alert.alert(
                "Purchase Successful!",
                `You have successfully purchased ${items.length} items. They are now available in your library.`,
                [{
                    text: "View Library",
                    onPress: () => {
                        clearCart();
                        router.push('/(tabs)/library');
                    }
                }]
            );
        } catch (error) {
            console.error("Checkout error:", error);
            Alert.alert("Error", "There was an issue processing your checkout. Please try again.");
        } finally {
            setCheckingOut(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.cartItem}>
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
        </View>
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
