import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatUsd } from '@/utils/pricing';
import { useCartStore } from '@/store/useCartStore';
import { useLayoutMetricsStore } from '@/store/useLayoutMetricsStore';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyColor, adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    collection,
    doc,
    onSnapshot,
    query
} from 'firebase/firestore';
import {
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
    LayoutChangeEvent,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type MarketplaceItem = {
    id: string;
    title?: string;
    uploaderName?: string;
    price?: number;
    coverUrl?: string;
    userId?: string;
};

function useCartStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function CartScreen() {
    const appTheme = useAppTheme();
    const styles = useCartStyles();
    const isLightMode = !appTheme.isDark;
    const itemFallbackIconColor = adaptLegacyColor('rgba(255,255,255,0.2)', 'color', appTheme);
    const bestSellerFallbackIconColor = adaptLegacyColor('rgba(255,255,255,0.25)', 'color', appTheme);
    const emptyCartIconColor = adaptLegacyColor('rgba(255,255,255,0.7)', 'color', appTheme);
    const insets = useSafeAreaInsets();

    const router = useRouter();
    const { items, removeItem, clearCart, total } = useCartStore();
    const bottomTabBarHeight = useLayoutMetricsStore((state) => state.bottomTabBarHeight);
    const [bestSellers, setBestSellers] = useState<MarketplaceItem[]>([]);
    const [bestSellerLoading, setBestSellerLoading] = useState(true);
    const [purchasedCount, setPurchasedCount] = useState(0);
    const { showToast } = useToastStore();
    const platformListBottomGap = Platform.OS === 'ios' ? 22 : 16;

    useEffect(() => {
        // 🚀 PERFORMANCE: Read pre-aggregated best sellers document instead of inefficient collectionGroup query
        // The /system/bestSellers document is updated hourly by aggregateBestSellers() Cloud Function
        const bestSellersRef = doc(db, 'system', 'bestSellers');
        const unsubMarket = onSnapshot(
            bestSellersRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setBestSellers(data.items || []);
                } else {
                    setBestSellers([]);
                }
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
    }, [auth.currentUser?.uid]);


    const handleCheckout = async () => {
        // Navigate to checkout screen instead of initiating payment directly
        router.push('/checkout-review');
    };

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.cartItem}
            onPress={() =>
                router.push({
                    pathname: '/listing/[id]' as any,
                    params: { id: item.listingId || item.id, uploaderId: item.uploaderId },
                })
            }
            activeOpacity={0.8}
        >
            <View style={styles.itemArtwork}>
                <Music size={24} color={itemFallbackIconColor} />
            </View>
            <View style={styles.itemInfo}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.itemArtist}>{item.artist}</Text>
                {item.licenseTierTitle ? (
                    <Text style={styles.itemLicense} numberOfLines={1}>{item.licenseTierTitle} license</Text>
                ) : null}
                <Text style={styles.itemPrice}>{formatUsd(item.price)}</Text>
            </View>
            <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeItem(item.id)}
            >
                <Trash2 size={20} color="#6AA7FF" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => items.length > 0 && Alert.alert("Clear Cart", "Are you sure?", [
                            { text: "Cancel" },
                            { text: "Clear", onPress: () => clearCart(), style: 'destructive' }
                        ])}
                        disabled={items.length === 0}
                    >
                        <Text style={[styles.clearText, items.length === 0 && { opacity: 0.3 }]}>Clear</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Cart</Text>
                    <TouchableOpacity
                        style={[
                            styles.checkoutHeaderBtn,
                            isLightMode && styles.checkoutHeaderBtnLight,
                            items.length === 0 && styles.checkoutHeaderBtnDisabled,
                        ]}
                        onPress={handleCheckout}
                        disabled={items.length === 0}
                    >
                        <Text
                            style={[
                                styles.checkoutHeaderText,
                                items.length === 0 && styles.checkoutHeaderTextDisabled,
                            ]}
                        >
                            Checkout
                        </Text>
                    </TouchableOpacity>
                </View>

                {items.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <ShoppingCart size={72} color={emptyCartIconColor} />
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
                                <Library size={16} color="#6AA7FF" />
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
                                <ActivityIndicator color={appTheme.colors.primary} />
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
                                                <Music size={22} color={bestSellerFallbackIconColor} />
                                            )}
                                        </View>
                                        <Text style={styles.bestSellerItemTitle} numberOfLines={1}>{item.title || 'Untitled Track'}</Text>
                                        <Text style={styles.bestSellerItemArtist} numberOfLines={1}>{item.uploaderName || 'Creator'}</Text>
                                        <Text style={styles.bestSellerItemPrice}>{formatUsd(item.price || 0)}</Text>
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
                            contentContainerStyle={[
                                styles.listContent,
                                {
                                    paddingBottom: bottomTabBarHeight + insets.bottom + platformListBottomGap,
                                },
                            ]}
                        />
                    </>
                )}
            </View>
        </SafeScreenWrapper>
    );
}


const legacyStyles = {
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
        color: '#6AA7FF',
        fontSize: 14,
        fontFamily: 'Poppins-Medium',
    },
    checkoutHeaderBtn: {
        minHeight: 34,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: '#6AA7FF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        shadowColor: '#6AA7FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.32,
        shadowRadius: 10,
        elevation: 5,
    },
    checkoutHeaderBtnLight: {
        borderColor: 'rgba(255,255,255,0.75)',
        shadowColor: '#4A85E8',
        shadowOpacity: 0.2,
    },
    checkoutHeaderBtnDisabled: {
        backgroundColor: 'rgba(106,167,255,0.32)',
        borderColor: 'rgba(106,167,255,0.26)',
        shadowOpacity: 0,
        elevation: 0,
    },
    checkoutHeaderText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'Poppins-SemiBold',
        letterSpacing: 0.2,
    },
    checkoutHeaderTextDisabled: {
        color: 'rgba(255,255,255,0.86)',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 0,
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
    itemLicense: {
        fontSize: 11,
        fontFamily: 'Poppins-Medium',
        color: '#EC5C39',
        marginTop: 4,
    },
    itemPrice: {
        fontSize: 14,
        fontFamily: 'Poppins-SemiBold',
        color: '#6AA7FF',
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
        backgroundColor: '#6AA7FF',
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
        color: '#6AA7FF',
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
        color: '#6AA7FF',
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
        left: 0,
        right: 0,
        backgroundColor: '#1E1A1B',
        paddingHorizontal: 24,
        paddingVertical: 25,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.26,
        shadowRadius: 16,
        elevation: 20,
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
        color: '#6AA7FF',
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
};
