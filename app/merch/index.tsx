import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import Sidebar from '@/components/Sidebar';
import { db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyColor, adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { formatUsd } from '@/utils/pricing';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ChevronLeft, ShoppingBag, Star, Tag } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

function useMerchIndexStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function MerchStoreScreen() {
    const appTheme = useAppTheme();
    const styles = useMerchIndexStyles();
    const placeholderColor = appTheme.colors.textPlaceholder;
    const mutedIconColor = adaptLegacyColor('rgba(255,255,255,0.4)', 'color', appTheme);
    const emptyIconColor = adaptLegacyColor('rgba(255,255,255,0.1)', 'color', appTheme);

    const router = useRouter();
    const [merch, setMerch] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const q = query(collection(db, 'merch'), where('active', '==', true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMerch(items);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filteredMerch = merch.filter(item =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backBtn}
                    >
                        <ChevronLeft size={22} color={appTheme.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Merch Store</Text>
                </View>

                <View style={styles.searchBar}>
                    <ShoppingBag size={20} color={mutedIconColor} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search custom merch..."
                        placeholderTextColor={placeholderColor}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator color={appTheme.colors.primary} size="large" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredMerch}
                        keyExtractor={(item) => item.id}
                        numColumns={2}
                        renderItem={({ item }) => <MerchCard item={item} styles={styles} appTheme={appTheme} />}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <ShoppingBag size={48} color={emptyIconColor} />
                                <Text style={styles.emptyText}>No merch available yet.</Text>
                            </View>
                        }
                    />
                )}

                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            </View>
        </SafeScreenWrapper>
    );
}

function MerchCard({ item, styles, appTheme }: any) {
    const placeholderIconColor = adaptLegacyColor('rgba(255,255,255,0.2)', 'color', appTheme);

    return (
        <TouchableOpacity style={styles.card}>
            <View style={styles.imageContainer}>
                {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.image} />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <ShoppingBag size={30} color={placeholderIconColor} />
                    </View>
                )}
                <View style={styles.tagBadge}>
                    <Tag size={10} color={appTheme.colors.textPrimary} />
                    <Text style={styles.tagText}>{item.category || 'Limited'}</Text>
                </View>
            </View>
            <View style={styles.cardInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.itemArtist} numberOfLines={1}>by {item.artistName || 'Creator'}</Text>
                <View style={styles.priceRow}>
                    <Text style={styles.itemPrice}>{formatUsd(Number(item.price) || 0)}</Text>
                    <View style={styles.rating}>
                        <Star size={12} color="#FFD700" fill="#FFD700" />
                        <Text style={styles.ratingText}>{item.rating ?? '—'}</Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}



const legacyStyles = {
    container: { flex: 1, backgroundColor: '#140F10' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
    headerTitle: { color: '#FFF', fontSize: 22, fontFamily: 'Poppins-Bold', flex: 1 },
    backBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center', justifyContent: 'center',
        marginRight: 12,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginVertical: 15,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 15,
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    searchInput: { flex: 1, marginLeft: 12, color: '#FFF', fontFamily: 'Poppins-Regular', fontSize: 14 },
    listContent: { paddingHorizontal: 12, paddingBottom: 40 },
    card: {
        width: (width - 48) / 2,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        margin: 6,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    imageContainer: { width: '100%', height: 160, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.02)', overflow: 'hidden', position: 'relative' },
    image: { width: '100%', height: '100%', resizeMode: 'cover' },
    imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    tagBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tagText: { color: '#FFF', fontSize: 9, fontFamily: 'Poppins-Bold', textTransform: 'uppercase' },
    cardInfo: { marginTop: 12, paddingHorizontal: 4 },
    itemName: { color: '#FFF', fontSize: 14, fontFamily: 'Poppins-Bold' },
    itemArtist: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'Poppins-Regular', marginTop: 1 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    itemPrice: { color: '#EC5C39', fontSize: 13, fontFamily: 'Poppins-Bold' },
    rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    ratingText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'Poppins-Regular' },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { color: 'rgba(255,255,255,0.2)', marginTop: 15, fontFamily: 'Poppins-Regular' },
};
