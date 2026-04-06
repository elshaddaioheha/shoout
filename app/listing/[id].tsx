import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { formatUsd } from '@/utils/pricing';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    collectionGroup,
    doc,
    documentId,
    getDoc,
    getDocs,
    limit,
    query,
    where,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { PayWithFlutterwave } from 'flutterwave-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type ListingData = {
    id: string;
    title?: string;
    uploaderName?: string;
    artist?: string;
    price?: number;
    audioUrl?: string;
    coverUrl?: string;
    artworkUrl?: string;
    category?: string;
    userId?: string;
    _resolvedUploaderId?: string;
};

function useListingModalStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function ListingLicenseModal() {
    const appTheme = useAppTheme();
    const styles = useListingModalStyles();

    const { id, uploaderId } = useLocalSearchParams();
    const router = useRouter();
    const { items, addItem } = useCartStore();
    const { showToast } = useToastStore();

    const [listing, setListing] = useState<ListingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [checkingOut, setCheckingOut] = useState(false);
    const [showFWButton, setShowFWButton] = useState(false);
    const [checkoutTxRef, setCheckoutTxRef] = useState<string | null>(null);
    const [checkoutAmountNgn, setCheckoutAmountNgn] = useState(0);
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);

    const trackPriceUsd = useMemo(() => {
        const parsed = Number(listing?.price ?? 0);
        if (!Number.isFinite(parsed) || parsed < 0) return 0;
        return Math.round(parsed * 100) / 100;
    }, [listing?.price]);

    const trackTitle = listing?.title || 'Untitled Track';
    const trackArtist = listing?.uploaderName || listing?.artist || 'Creator';
    const trackArtwork = listing?.artworkUrl || listing?.coverUrl || '';

    useEffect(() => {
        const fetchListing = async () => {
            if (!id || typeof id !== 'string') {
                setLoading(false);
                return;
            }

            try {
                if (uploaderId && typeof uploaderId === 'string') {
                    const docRef = doc(db, 'users', uploaderId, 'uploads', id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setListing({ id: docSnap.id, ...docSnap.data(), _resolvedUploaderId: uploaderId });
                        return;
                    }
                }

                const q = query(
                    collectionGroup(db, 'uploads'),
                    where(documentId(), '==', id),
                    limit(1)
                );
                const snapshot = await getDocs(q);
                const foundDoc = snapshot.docs[0];

                if (foundDoc) {
                    setListing({
                        id: foundDoc.id,
                        ...foundDoc.data(),
                        _resolvedUploaderId: foundDoc.ref.parent.parent?.id,
                    });
                } else {
                    setListing(null);
                }
            } catch (error) {
                console.error('Error fetching listing for purchase modal:', error);
                setListing(null);
            } finally {
                setLoading(false);
            }
        };

        fetchListing();
    }, [id, uploaderId]);

    const checkoutItem = useMemo(() => {
        if (!id || typeof id !== 'string') return null;

        const resolvedUploaderId =
            listing?._resolvedUploaderId
            || listing?.userId
            || (typeof uploaderId === 'string' ? uploaderId : '');

        if (!resolvedUploaderId) return null;

        return {
            id,
            title: trackTitle,
            artist: trackArtist,
            price: trackPriceUsd,
            audioUrl: listing?.audioUrl || '',
            coverUrl: trackArtwork,
            uploaderId: resolvedUploaderId,
            category: listing?.category || 'Track',
        };
    }, [id, listing, trackArtist, trackArtwork, trackPriceUsd, trackTitle, uploaderId]);

    const handleAddToCart = () => {
        if (!checkoutItem) {
            showToast('Unable to add this track to cart.', 'error');
            return;
        }

        if (items.some((item) => item.id === checkoutItem.id)) {
            showToast('Track already in your cart.', 'info');
            return;
        }

        addItem(checkoutItem);
        showToast('Track added to cart.', 'success');
        router.back();
    };

    const handlePaymentSuccess = async (flutterwaveData: any) => {
        const txRef = flutterwaveData?.tx_ref || checkoutTxRef;
        if (!txRef) {
            showToast('Payment completed but transaction reference is missing.', 'error');
            return;
        }

        setCheckingOut(true);
        try {
            const functions = getFunctions();
            const getCheckoutStatus = httpsCallable(functions, 'getCheckoutStatus');
            let completed = false;

            for (let i = 0; i < 12; i += 1) {
                const statusResult = await getCheckoutStatus({ txRef });
                const status = (statusResult.data as { status?: string }).status;
                if (status === 'completed') {
                    completed = true;
                    break;
                }
                if (status === 'failed' || status === 'amount_mismatch') {
                    throw new Error(`Payment processing failed with status: ${status}`);
                }
                await new Promise((resolve) => setTimeout(resolve, 1800));
            }

            if (!completed) {
                showToast('Payment received. Delivery is still being confirmed. Check Library shortly.', 'info');
                return;
            }

            setCheckoutTxRef(null);
            setCheckoutAmountNgn(0);
            setShowSuccessPopup(true);
            await new Promise((resolve) => setTimeout(resolve, 900));
            setShowSuccessPopup(false);
            showToast('Purchase confirmed. Track is now in your library.', 'success');
            router.replace('/(tabs)/library');
        } catch (error) {
            console.error('Payment verification error:', error);
            showToast('Payment succeeded but verification is pending. Check Library shortly.', 'error');
        } finally {
            setCheckingOut(false);
        }
    };

    const handleBuyNow = async () => {
        if (!auth.currentUser) {
            showToast('Please sign in or create an account to purchase tracks.', 'error');
            router.push({ pathname: '/(auth)/login', params: { redirectTo: '/cart' } });
            return;
        }

        if (!auth.currentUser.email) {
            showToast('Email is required to complete payment. Update your account and try again.', 'error');
            return;
        }

        if (!checkoutItem) {
            showToast('This track is missing required purchase details.', 'error');
            return;
        }

        if (trackPriceUsd <= 0) {
            showToast('This track is currently not available for paid purchase.', 'error');
            return;
        }

        setCheckingOut(true);
        try {
            await auth.currentUser.getIdToken(true);
            const functions = getFunctions();
            const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
            const result = await createCheckoutSession({
                items: [checkoutItem],
                totalAmountUsd: trackPriceUsd,
            });

            const data = result.data as { txRef: string; amountNgn: number };
            if (!data?.txRef || !data?.amountNgn) {
                throw new Error('Invalid checkout response from backend');
            }

            setCheckoutTxRef(data.txRef);
            setCheckoutAmountNgn(data.amountNgn);
            setShowFWButton(true);
        } catch (error) {
            console.error('Checkout init failed:', error);
            showToast('Unable to start payment right now. Please try again.', 'error');
        } finally {
            setCheckingOut(false);
        }
    };

    return (
        <SafeScreenWrapper>
            <View style={styles.screen}>
                <Pressable style={styles.backdrop} onPress={() => router.back()}>
                    <BlurView intensity={34} tint={appTheme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                    <View style={styles.backdropDim} />
                </Pressable>

                <View style={styles.sheet}>
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>Track purchase</Text>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={appTheme.colors.primary} />
                        </View>
                    ) : (
                        <>
                            <View style={styles.trackCard}>
                                <View style={styles.artworkWrap}>
                                    {trackArtwork ? (
                                        <Image source={{ uri: trackArtwork }} style={styles.artwork} contentFit="cover" />
                                    ) : (
                                        <View style={styles.artworkFallback}>
                                            <Text style={styles.artworkFallbackText}>♫</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={styles.trackMeta}>
                                    <Text style={styles.trackTitle} numberOfLines={1}>{trackTitle}</Text>
                                    <Text style={styles.trackArtist} numberOfLines={1}>{trackArtist}</Text>
                                    <Text style={styles.trackCategory}>{listing?.category || 'Track'}</Text>
                                </View>
                            </View>

                            <View style={styles.priceCard}>
                                <View>
                                    <Text style={styles.priceLabel}>Track Price</Text>
                                    <Text style={styles.priceSubLabel}>Single purchase license</Text>
                                </View>
                                <Text style={styles.priceValue}>{formatUsd(trackPriceUsd)}</Text>
                            </View>

                            <View style={styles.actionsWrap}>
                                <TouchableOpacity
                                    style={[styles.primaryAction, checkingOut && styles.disabledAction]}
                                    onPress={handleBuyNow}
                                    disabled={checkingOut || trackPriceUsd <= 0}
                                >
                                    <Text style={styles.primaryActionText}>{checkingOut ? 'Starting payment...' : 'Buy now'}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.secondaryAction} onPress={handleAddToCart}>
                                    <Text style={styles.secondaryActionText}>Add to cart</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}

                    {showFWButton && auth.currentUser && checkoutTxRef && checkoutAmountNgn > 0 ? (
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
                                customer: { email: auth.currentUser.email! },
                                amount: checkoutAmountNgn,
                                currency: 'NGN',
                                payment_options: 'card,banktransfer',
                            }}
                            customButton={(props) => {
                                setTimeout(() => {
                                    if (!props.disabled) props.onPress();
                                }, 80);
                                return <View />;
                            }}
                        />
                    ) : null}

                    {showSuccessPopup ? (
                        <View style={styles.successPopupWrap} pointerEvents="none">
                            <View style={styles.successPopupCard}>
                                <Text style={styles.successPopupIcon}>✓</Text>
                                <Text style={styles.successPopupTitle}>Payment confirmed</Text>
                                <Text style={styles.successPopupSubtitle}>Opening your Library...</Text>
                            </View>
                        </View>
                    ) : null}
                </View>
            </View>
        </SafeScreenWrapper>
    );
}

const legacyStyles = {
    screen: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    backdropDim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(8,8,12,0.42)',
    },
    sheet: {
        backgroundColor: '#140F10',
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 24,
        maxHeight: '86%',
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sheetTitle: {
        color: '#FFF',
        fontSize: 28,
        lineHeight: 34,
        fontFamily: 'Poppins-SemiBold',
    },
    cancelText: {
        color: 'rgba(255,255,255,0.78)',
        fontSize: 20,
        fontFamily: 'Poppins-Medium',
    },
    loadingContainer: {
        minHeight: 90,
        alignItems: 'center',
        justifyContent: 'center',
    },
    trackCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(236,92,57,0.35)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    artworkWrap: {
        width: 74,
        height: 74,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    artwork: {
        width: '100%',
        height: '100%',
    },
    artworkFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    artworkFallbackText: {
        color: '#FFF',
        fontSize: 24,
        fontFamily: 'Poppins-SemiBold',
    },
    trackMeta: {
        flex: 1,
        marginLeft: 12,
    },
    trackTitle: {
        color: '#FFF',
        fontSize: 17,
        lineHeight: 22,
        fontFamily: 'Poppins-SemiBold',
    },
    trackArtist: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        marginTop: 3,
    },
    trackCategory: {
        color: '#EC5C39',
        fontSize: 11,
        fontFamily: 'Poppins-Medium',
        marginTop: 6,
    },
    priceCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.04)',
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    priceLabel: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
    },
    priceSubLabel: {
        color: 'rgba(255,255,255,0.56)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        marginTop: 2,
    },
    priceValue: {
        color: '#EC5C39',
        fontSize: 22,
        lineHeight: 28,
        fontFamily: 'Poppins-Bold',
    },
    actionsWrap: {
        marginTop: 14,
        gap: 10,
    },
    primaryAction: {
        height: 56,
        borderRadius: 12,
        backgroundColor: '#EC5C39',
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledAction: {
        opacity: 0.6,
    },
    primaryActionText: {
        color: '#FFF',
        fontSize: 20,
        fontFamily: 'Poppins-SemiBold',
    },
    secondaryAction: {
        height: 56,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryActionText: {
        color: '#FFF',
        fontSize: 20,
        fontFamily: 'Poppins-SemiBold',
    },
    successPopupWrap: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    successPopupCard: {
        minWidth: 190,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: 'rgba(76,175,80,0.55)',
        backgroundColor: 'rgba(18, 30, 22, 0.92)',
        alignItems: 'center',
    },
    successPopupIcon: {
        color: '#4CAF50',
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
    },
    successPopupTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Poppins-SemiBold',
        marginTop: 6,
    },
    successPopupSubtitle: {
        color: 'rgba(255,255,255,0.76)',
        fontSize: 11,
        fontFamily: 'Poppins-Regular',
        marginTop: 2,
    },
};
