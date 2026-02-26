import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    TextInput,
    FlatList,
    Alert,
    Image
} from 'react-native';
import {
    ChevronLeft,
    Plus,
    Search,
    Filter,
    MoreVertical,
    ShoppingBag,
    DollarSign,
    Package,
    Tag,
    Share2,
    Trash2,
    Edit3,
    CheckCircle2,
    AlertTriangle,
    Layers
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// Mock Data
const MOCK_MERCH = [
    {
        id: '1',
        title: 'Limited Edition "Afro Heat" Tee',
        category: 'Apparel',
        price: '35.00',
        stock: 42,
        sales: 156,
        status: 'In Stock',
        image: null
    },
    {
        id: '2',
        title: 'Breezy Afro Vinyl - Gold Edition',
        category: 'Physical Music',
        price: '65.00',
        stock: 5,
        sales: 45,
        status: 'Low Stock',
        image: null
    },
    {
        id: '3',
        title: 'Signature Drum Kit Vol. 2',
        category: 'Digital Tools',
        price: '49.99',
        stock: 'Unlimited',
        sales: 89,
        status: 'In Stock',
        image: null
    },
    {
        id: '4',
        title: 'Shouuts Official Hoodie',
        category: 'Apparel',
        price: '55.00',
        stock: 0,
        sales: 230,
        status: 'Out of Stock',
        image: null
    }
];

export default function MerchStoreManagement() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('All');

    const filteredMerch = MOCK_MERCH.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === 'All' ||
            (activeTab === 'Physical' && item.category !== 'Digital Tools') ||
            (activeTab === 'Digital' && item.category === 'Digital Tools');
        return matchesSearch && matchesTab;
    });

    const handleBack = () => {
        router.back();
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            "Delete Item",
            "Remove this item from your store?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => console.log('Deleted', id) }
            ]
        );
    };

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <ChevronLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Merch & Store</Text>
                    <TouchableOpacity style={styles.addButton}>
                        <LinearGradient
                            colors={['#EC5C39', '#863420']}
                            style={styles.addGradient}
                        >
                            <Plus size={20} color="#FFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputWrapper}>
                        <Search size={18} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search store..."
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                    <TouchableOpacity style={styles.filterButton}>
                        <Filter size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    {['All', 'Physical', 'Digital'].map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={[styles.tab, activeTab === tab && styles.activeTab]}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Sales Summary */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Total Items</Text>
                        <Text style={styles.summaryValue}>{MOCK_MERCH.length}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Total Sales</Text>
                        <Text style={styles.summaryValue}>520</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Revenue</Text>
                        <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>$18.4K</Text>
                    </View>
                </View>

                {/* Merch List */}
                <FlatList
                    data={filteredMerch}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <MerchCard
                            item={item}
                            onDelete={() => handleDelete(item.id)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <ShoppingBag size={48} color="rgba(255,255,255,0.2)" />
                            <Text style={styles.emptyText}>Store is empty</Text>
                        </View>
                    }
                />
            </View>
        </SafeScreenWrapper>
    );
}

function MerchCard({ item, onDelete }: any) {
    const getStatusColor = () => {
        if (item.status === 'In Stock') return '#4CAF50';
        if (item.status === 'Low Stock') return '#FFC107';
        return '#FF4D4D';
    };

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.imagePlaceholder}>
                    <ShoppingBag size={24} color="#EC5C39" />
                </View>
                <View style={styles.info}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.category}>{item.category}</Text>
                </View>
                <TouchableOpacity style={styles.moreButton}>
                    <MoreVertical size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <DollarSign size={14} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.statValueText}>${item.price}</Text>
                </View>
                <View style={styles.stat}>
                    <Package size={14} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.statValueText}>{item.stock} in stock</Text>
                </View>
                <View style={styles.stat}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                    <Text style={[styles.statusText, { color: getStatusColor() }]}>{item.status}</Text>
                </View>
            </View>

            <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn}>
                    <Edit3 size={16} color="#FFF" />
                    <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                    <Layers size={16} color="#FFF" />
                    <Text style={styles.actionBtnText}>Variants</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={onDelete}>
                    <Trash2 size={16} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        marginBottom: 10,
    },
    backButton: {
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
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
    },
    addGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: '#FFF',
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
    },
    filterButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabsContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: 'rgba(236, 92, 57, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(236, 92, 57, 0.2)',
    },
    tabText: {
        color: 'rgba(255,255,255,0.4)',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
    },
    activeTabText: {
        color: '#EC5C39',
    },
    summaryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(236, 92, 57, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(236, 92, 57, 0.1)',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
        fontFamily: 'Poppins-Regular',
    },
    summaryValue: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
    },
    summaryDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    listContent: {
        paddingBottom: 40,
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    imagePlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    info: {
        flex: 1,
        marginLeft: 15,
    },
    cardTitle: {
        color: '#FFF',
        fontSize: 15,
        fontFamily: 'Poppins-Bold',
    },
    category: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
    },
    moreButton: {
        padding: 5,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statValueText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontFamily: 'Poppins-SemiBold',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'Poppins-Bold',
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    actionBtnText: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: 'Poppins-SemiBold',
    },
    deleteText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontFamily: 'Poppins-SemiBold',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.2)',
        marginTop: 15,
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
    }
});
