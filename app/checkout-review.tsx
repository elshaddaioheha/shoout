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
    limit,
    onSnapshot,
    orderBy,
    query,
    where,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { PayWithFlutterwave } from 'flutterwave-react-native';

import {
    ArrowRight,
    ChevronLeft,
    CreditCard,
    Trash2
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Platform,
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

function useCheckoutReviewStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function CheckoutReviewScreen() {
    const appTheme = useAppTheme();
    const styles = useCheckoutReviewStyles();
    const isLightMode = !appTheme.isDark;
    const checkoutGradientColors = isLightMode
        ? ['#6AA7FF', '#4A85E8']
        : ['#6AA7FF', '#3D5CB8'];
    const checkoutIconTextColor = '#FFFFFF';
    const checkoutFontSize = width < 360 ? 16 : width > 430 ? 19 : 18;
    const itemFallbackIconColor = adaptLegacyColor('rgba(255,255,255,0.2)', 'color', appTheme);
    const insets = useSafeAreaInsets();

    const router = useRouter();
    const { items, removeItem, clearCart, total } = useCartStore();
    const bottomTabBarHeight = useLayoutMetricsStore((state) => state.bottomTabBarHeight);
    const [checkingOut, setCheckingOut] = useState(false);
    const [showFWButton, setShowFWButton] = useState(false);
    const [checkoutTxRef, setCheckoutTxRef] = useState<string | null>(null);
    const [checkoutAmountNgn, setCheckoutAmountNgn] = useState<number>(0);
    const { showToast } = useToastStore();
    const platformListBottomGap = Platform.OS === 'ios' ? 22 : 16;
    const fwAutoFireRef = useRef<string | null>(null);

    // Called after Flutterwave confirms payment
    // Purchase documents are created only by webhook-driven backend functions.
    const handlePaymentSuccess = async (flutterwaveData: any) => {
        if (!auth.currentUser) return;
        setCheckingOut(true);
        try {
            const txRef = flutterwaveData?.tx_ref || checkoutTxRef;
            if (!txRef) {
                throw new Error('Missing transaction reference from payment callback.');
            }

            const functions = getFunctions();
            const getCheckoutStatus = httpsCallable(functions, 'getCheckoutStatus');

            // Poll backend for webhook-processed completion state.
            let completed = false;
            for (let i = 0; i < 15; i += 1) {
                const statusResult = await getCheckoutStatus({ txRef });
                const status = (statusResult.data as { status?: string }).status;
                if (status === 'completed') {
                    completed = true;
                    break;
                }
                if (status === 'failed' || status === 'amount_mismatch') {
                    throw new Error(`Payment processing failed with status: ${status}`);
                }
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }

            if (!completed) {
                showToast('Payment received. We are still confirming your delivery. Please check Library shortly.', 'info');
                return;
            }

            clearCart();
            setCheckoutTxRef(null);
            setCheckoutAmountNgn(0);
            Alert.alert(
                'Purchase Confirmed',
                `${items.length} track${items.length > 1 ? 's are' : ' is'} now in your library.`,
                [{ text: 'View Library', onPress: () => router.push('/(tabs)/library') }]
            );
        } catch (error) {
            console.error('Payment verification error:', error);
            showToast('Payment succeeded but delivery is pending verification. Contact support if this persists.', 'error');
        } finally {
            setCheckingOut(false);
            setShowFWButton(false);
        }
    };

    const handleCheckout = async () => {
        if (!auth.currentUser) {
            showToast('Please sign in to complete your purchase.', 'error');
            return;
        }

        if (total <= 0 || items.length === 0) {
            showToast('Your cart is empty.', 'info');
            return;
        }

        try {
            setCheckingOut(true);
            const functions = getFunctions();
            const getCheckoutSession = httpsCallable(functions, 'getCheckoutSession');

            const checkoutResult = await getCheckoutSession({
                items: items.map((item) => ({ id: item.id })),
                totalAmount: Math.round(total * 100),
            });

            const data = checkoutResult.data as {
                txRef?: string;
                amountNgn?: number;
            };

            if (!data.txRef || !data.amountNgn) {
                showToast('Failed to initiate checkout. Please try again.', 'error');
                setCheckingOut(false);
                return;
            }

            setCheckoutTxRef(data.txRef);
            setCheckoutAmountNgn(data.amountNgn);
            setCheckingOut(false);
            setShowFWButton(true);
        } catch (err: any) {
            console.error('Checkout error:', err);
            showToast(err?.message || 'Checkout failed. Please try again.', 'error');
            setCheckingOut(false);
        }
    };

    const renderItem = ({ item }: { item: MarketplaceItem }) => {
        const itemPrice = item.price ?? 0;
        return (
            <View
                style={[
                    styles.cartItem,
                    {
                        backgroundColor: isLightMode ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
                        borderBottomColor: isLightMode ? 'rgba(106, 167, 255, 0.1)' : 'rgba(255,255,255,0.05)',
                    },
                ]}
            >
                <Image
                    source={{ uri: item.coverUrl || 'https://via.placeholder.com' }}
                    style={styles.cartItemArtwork}
                    placeholder="L2FIE5RP"
                    cachePolicy="web"
                />

                <View style={styles.cartItemContent}>
                    <Text style={[styles.cartItemTitle, isLightMode && { color: '#1E3A5F' }]} numberOfLines={1}>
                        {item.title || 'Unknown Track'}
                    </Text>
                    <Text style={[styles.cartItemArtist, isLightMode && { color: '#5A7FA8' }]} numberOfLines={1}>
                        {item.uploaderName || 'Unknown Artist'}
                    </Text>
                    <Text style={[styles.cartItemPrice, isLightMode && { color: '#4A85E8' }]}>
                        {formatUsd(itemPrice)}
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={() => removeItem(item.id)}
                    style={styles.cartDeleteBtn}
                    activeOpacity={0.6}
                >
                    <Trash2 size={20} color="#6AA7FF" />
                </TouchableOpacity>
            </View>
        );
    };

    if (items.length === 0) {
        return (
            <SafeScreenWrapper>
                <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()}>
                            <View style={[styles.backBtn, { backgroundColor: '#6AA7FF' }]}>
                                <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
                            </View>
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, isLightMode && { color: '#1E3A5F' }]}>Order Review</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={styles.emptyStateContainer}>
                        <Text style={[styles.emptyStateText, isLightMode && { color: '#5A7FA8' }]}>
                            Your cart is empty
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push('/(tabs)/library')}
                            style={[styles.emptyStateButton, { backgroundColor: '#6AA7FF' }]}
                        >
                            <Text style={styles.emptyStateButtonText}>Continue Shopping</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeScreenWrapper>
        );
    }

    return (
        <SafeScreenWrapper>
            <View style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <View style={[styles.backBtn, { backgroundColor: '#6AA7FF' }]}>
                            <ChevronLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
                        </View>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, isLightMode && { color: '#1E3A5F' }]}>Order Review</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Cart Items List */}
                <FlatList
                    data={items}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    scrollEnabled={true}
                    contentContainerStyle={[
                        styles.listContent,
                        {
                            paddingBottom: bottomTabBarHeight + insets.bottom + platformListBottomGap + 200,
                        },
                    ]}
                    ListHeaderComponent={
                        <View style={[styles.summarySection, isLightMode && { backgroundColor: 'rgba(106, 167, 255, 0.05)' }]}>
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, isLightMode && { color: '#5A7FA8' }]}>Items</Text>
                                <Text style={[styles.summaryValue, isLightMode && { color: '#1E3A5F' }]}>{items.length}</Text>
                            </View>
                            <View style={[styles.divider, { backgroundColor: isLightMode ? 'rgba(106, 167, 255, 0.2)' : 'rgba(255,255,255,0.1)' }]} />
                            <View style={styles.summaryRow}>
                                <Text style={[styles.summaryLabel, isLightMode && { color: '#5A7FA8' }]}>Total</Text>
                                <Text style={[styles.totalValue, isLightMode && { color: '#4A85E8' }]}>{formatUsd(total)}</Text>
                            </View>
                        </View>
                    }
                />

                {/* Payment Button - Fixed at bottom */}
                <View
                    style={[
                        styles.footer,
                        {
                            backgroundColor: isLightMode ? '#F0F6FF' : '#1E1A1B',
                            borderTopColor: isLightMode ? 'rgba(106, 167, 255, 0.15)' : 'rgba(255,255,255,0.05)',
                            bottom: bottomTabBarHeight + (Platform.OS === 'ios' ? insets.bottom + 8 : 6),
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={[
                            styles.checkoutBtn,
                            isLightMode && {
                                borderWidth: 1,
                                borderColor: 'rgba(255,255,255,0.62)',
                                shadowColor: '#4A85E8',
                                shadowOpacity: 0.22,
                                shadowRadius: 14,
                                shadowOffset: { width: 0, height: 8 },
                            },
                        ]}
                        onPress={handleCheckout}
                        disabled={checkingOut}
                    >
                        <LinearGradient
                            colors={checkoutGradientColors}
                            style={styles.checkoutGradient}
                        >
                            {checkingOut ? (
                                <ActivityIndicator color={checkoutIconTextColor} />
                            ) : (
                                <>
                                    <CreditCard size={20} color={checkoutIconTextColor} />
                                    <Text style={[styles.checkoutText, { color: checkoutIconTextColor, fontSize: checkoutFontSize }]}>Complete Purchase</Text>
                                    <ArrowRight size={20} color={checkoutIconTextColor} />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Hidden Flutterwave trigger — auto-fires when showFWButton = true */}
                    {showFWButton && auth.currentUser && checkoutTxRef && checkoutAmountNgn > 0 && (
                        <PayWithFlutterwave
                            onRedirect={(data) => {
                                setShowFWButton(false);
                                if (data.status === 'successful') {
                                    handlePaymentSuccess(data);
                                } else {
                                    showToast('Your payment was not completed.', 'error');
                                }
                            }}
                            options={{
                                tx_ref: checkoutTxRef,
                                authorization: process.env.EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || '',
                                customer: {
                                    email: auth.currentUser.email!,
                                },
                                amount: checkoutAmountNgn,
                                currency: 'NGN',
                                payment_options: 'card,banktransfer',
                            }}
                            customButton={(props) => {
                                // Auto-press only once per txRef to prevent duplicate transactions
                                if (!props.disabled && fwAutoFireRef.current !== checkoutTxRef) {
                                    fwAutoFireRef.current = checkoutTxRef;
                                    setTimeout(() => props.onPress(), 0);
                                }
                                return <View />;
                            }}
                        />
                    )}
                </View>
            </View>
        </SafeScreenWrapper>
    );
}

const legacyStyles = {
    container: {
        flex: 1,
        position: 'relative' as const,
    },
    header: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600' as const,
        color: '#FFFFFF',
    },
    listContent: {
        paddingHorizontal: 0,
    },
    summarySection: {
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    summaryRow: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        marginVertical: 8,
    },
    summaryLabel: {
        fontSize: 14,
        fontWeight: '500' as const,
        color: 'rgba(255,255,255,0.7)',
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '600' as const,
        color: '#FFFFFF',
    },
    totalValue: {
        fontSize: 16,
        fontWeight: '700' as const,
        color: '#6AA7FF',
    },
    divider: {
        height: 1,
        marginVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    cartItem: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    cartItemArtwork: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    cartItemContent: {
        flex: 1,
        marginRight: 12,
    },
    cartItemTitle: {
        fontSize: 14,
        fontWeight: '600' as const,
        color: '#FFFFFF',
        marginBottom: 4,
    },
    cartItemArtist: {
        fontSize: 12,
        fontWeight: '400' as const,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 4,
    },
    cartItemPrice: {
        fontSize: 13,
        fontWeight: '600' as const,
        color: '#6AA7FF',
    },
    cartDeleteBtn: {
        padding: 8,
    },
    footer: {
        position: 'absolute' as const,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    checkoutBtn: {
        borderRadius: 12,
        overflow: 'hidden' as const,
        marginBottom: 8,
    },
    checkoutGradient: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        gap: 8,
    },
    checkoutText: {
        fontWeight: '600' as const,
        color: '#FFFFFF',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        paddingHorizontal: 32,
    },
    emptyStateText: {
        fontSize: 16,
        fontWeight: '500' as const,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 16,
    },
    emptyStateButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    emptyStateButtonText: {
        fontSize: 14,
        fontWeight: '600' as const,
        color: '#FFFFFF',
    },
};
