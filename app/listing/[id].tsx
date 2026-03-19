import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useCartStore } from '@/store/useCartStore';
import { useToastStore } from '@/store/useToastStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    collection,
    collectionGroup,
    doc,
    getDoc,
    getDocs,
    query,
} from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

type LicenseOption = {
    id: string;
    title: string;
    formats: string;
    price: number | null;
    perks?: string[];
};

const LICENSE_OPTIONS: LicenseOption[] = [
    {
        id: 'mp3_tagged',
        title: 'MP3',
        formats: 'MP3_TAGGED',
        price: 4.95,
        perks: [
            'Used for Music Recording',
            'Distribute up to 2,000 copies',
            '500,000 Online Audio Streams',
            '1 Music Video',
        ],
    },
    {
        id: 'wav_2_free',
        title: 'WAV (+2 FREE)',
        formats: 'MP3, WAV',
        price: 24.99,
    },
    {
        id: 'unlimited_wav_4_free',
        title: 'UNLIMITED WAV (+4 FREE)',
        formats: 'MP3, WAV',
        price: 32.99,
    },
    {
        id: 'unlimited_stems_9_free',
        title: 'UNLIMITED STEMS (+9 FREE)',
        formats: 'STEMS, MP3, WAV',
        price: 51.99,
    },
    {
        id: 'exclusive_license',
        title: 'Exclusive License',
        formats: 'STEMS, MP3, WAV',
        price: null,
    },
];

export default function ListingLicenseModal() {
    const { id, uploaderId } = useLocalSearchParams();
    const router = useRouter();
    const { addItem } = useCartStore();
    const { showToast } = useToastStore();

    const [listing, setListing] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedLicenseId, setSelectedLicenseId] = useState(LICENSE_OPTIONS[0].id);

    const selectedLicense = useMemo(
        () => LICENSE_OPTIONS.find((option) => option.id === selectedLicenseId) ?? LICENSE_OPTIONS[0],
        [selectedLicenseId]
    );

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
                        setListing({ id: docSnap.id, ...docSnap.data() });
                        return;
                    }
                }

                const q = query(collectionGroup(db, 'uploads'));
                const snapshot = await getDocs(q);
                const foundDoc = snapshot.docs.find((d) => d.id === id);

                if (foundDoc) {
                    setListing({ id: foundDoc.id, ...foundDoc.data() });
                }
            } catch (err) {
                console.error('Error fetching listing for modal:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchListing();
    }, [id, uploaderId]);

    const handleAddToCart = () => {
        if (!id || typeof id !== 'string') {
            showToast('Unable to add this listing to cart.', 'error');
            return;
        }

        if (selectedLicense.price == null) {
            showToast('Exclusive license requires a direct offer.', 'error');
            return;
        }

        addItem({
            id: `${id}_${selectedLicense.id}`,
            title: listing?.title || 'Listing',
            artist: listing?.uploaderName || 'Creator',
            price: selectedLicense.price,
            audioUrl: listing?.audioUrl || '',
            uploaderId: listing?.userId || (uploaderId as string) || '',
            category: listing?.category || 'License',
        });

        showToast(`${selectedLicense.title} added to cart.`, 'success');
        router.back();
    };

    const handleBuyNow = async () => {
        if (!auth.currentUser) {
            showToast('Please log in to purchase tracks.', 'error');
            return;
        }

        if (!id || typeof id !== 'string') {
            showToast('Invalid listing.', 'error');
            return;
        }

        if (selectedLicense.price == null) {
            showToast('Exclusive license is offer-only. Please contact the creator.', 'error');
            return;
        }

        // TODO: Integrate Flutterwave payment for direct "Buy Now" flow
        // This should:
        // 1. Trigger Flutterwave payment modal
        // 2. On success, call backend Cloud Function with payment reference
        // 3. Backend verifies payment and creates transaction + purchase documents
        // For now, redirect to cart which has the secure payment flow
        
        addItem({
            id: `${id}_${selectedLicense.id}`,
            title: listing?.title || 'Listing',
            artist: listing?.uploaderName || 'Creator',
            price: selectedLicense.price,
            audioUrl: listing?.audioUrl || '',
            uploaderId: listing?.userId || (typeof uploaderId === 'string' ? uploaderId : ''),
            category: listing?.category || 'License',
        });

        showToast(`${selectedLicense.title} added to cart. Complete your purchase in the cart.`, 'info');
        router.back();
        router.push('/cart');
    };

    return (
        <SafeScreenWrapper>
            <View style={styles.screen}>
                <Pressable style={styles.backdrop} onPress={() => router.back()} />

                <View style={styles.sheet}>
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>Choose license</Text>
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#EC5C39" />
                        </View>
                    ) : null}

                    <View style={styles.optionsWrap}>
                        {LICENSE_OPTIONS.map((option) => {
                            const selected = selectedLicenseId === option.id;
                            const priceText = option.price == null ? 'Offer only' : `$${option.price.toFixed(2)}`;
                            return (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[styles.optionCard, selected && styles.optionCardSelected]}
                                    onPress={() => setSelectedLicenseId(option.id)}
                                >
                                    <View style={styles.optionTopRow}>
                                        <View>
                                            <Text style={styles.optionTitle}>{option.title}</Text>
                                            <Text style={styles.optionFormats}>{option.formats}</Text>
                                        </View>
                                        <Text style={styles.optionPrice}>{priceText}</Text>
                                    </View>

                                    {selected && option.perks?.length ? (
                                        <View style={styles.perksWrap}>
                                            {option.perks.map((perk) => (
                                                <Text key={perk} style={styles.perkText}> {perk}</Text>
                                            ))}
                                        </View>
                                    ) : null}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.actionsWrap}>
                        <TouchableOpacity
                            style={styles.primaryAction}
                            onPress={handleBuyNow}
                        >
                            <Text style={styles.primaryActionText}>Buy now</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.secondaryAction} onPress={handleAddToCart}>
                            <Text style={styles.secondaryActionText}>Add to cart</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeScreenWrapper>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        backgroundColor: '#0A0A0A',
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        paddingHorizontal: 16,
        paddingTop: 18,
        paddingBottom: 20,
        maxHeight: '92%',
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    sheetTitle: {
        color: '#FFF',
        fontSize: 34,
        fontFamily: 'Poppins-Bold',
    },
    cancelText: {
        color: '#FFF',
        fontSize: 22,
        fontFamily: 'Poppins-SemiBold',
    },
    loadingContainer: {
        paddingVertical: 8,
    },
    optionsWrap: {
        gap: 10,
    },
    optionCard: {
        backgroundColor: '#17181B',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'transparent',
        padding: 14,
    },
    optionCardSelected: {
        backgroundColor: '#0F2A5A',
        borderColor: '#0A84FF',
    },
    optionTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    optionTitle: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
    },
    optionFormats: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        marginTop: 2,
    },
    optionPrice: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Poppins-SemiBold',
    },
    perksWrap: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.08)',
        marginTop: 12,
        paddingTop: 12,
        gap: 8,
    },
    perkText: {
        color: '#E8E8E8',
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
    },
    actionsWrap: {
        marginTop: 14,
        gap: 10,
    },
    primaryAction: {
        height: 56,
        borderRadius: 10,
        backgroundColor: '#0A84FF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledAction: {
        opacity: 0.7,
    },
    primaryActionText: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
    },
    secondaryAction: {
        height: 56,
        borderRadius: 10,
        backgroundColor: '#25272C',
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryActionText: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Poppins-SemiBold',
    },
});
