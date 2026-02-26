import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    TextInput,
    FlatList,
    Alert
} from 'react-native';
import {
    ChevronLeft,
    Plus,
    Search,
    Filter,
    MoreVertical,
    Music,
    DollarSign,
    BarChart2,
    Clock,
    Tag,
    Share2,
    Trash2,
    Edit3,
    CheckCircle2,
    AlertCircle
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// Mock Data
const MOCK_BEATS = [
    {
        id: '1',
        title: 'Dark Knight Trap',
        bpm: '140',
        genre: 'Trap',
        price: '29.99',
        sales: 12,
        status: 'Active',
        date: 'Oct 12, 2023'
    },
    {
        id: '2',
        title: 'Sunset Melodies',
        bpm: '95',
        genre: 'Afrobeat',
        price: '45.00',
        sales: 8,
        status: 'Active',
        date: 'Oct 05, 2023'
    },
    {
        id: '3',
        title: 'Drill Sergeant',
        bpm: '144',
        genre: 'UK Drill',
        price: '35.00',
        sales: 0,
        status: 'Draft',
        date: 'Oct 20, 2023'
    },
    {
        id: '4',
        title: 'Soulful Sessions',
        bpm: '88',
        genre: 'R&B',
        price: '50.00',
        sales: 24,
        status: 'Active',
        date: 'Sep 28, 2023'
    }
];

export default function BeatsStoreManagement() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('All');

    const filteredBeats = MOCK_BEATS.filter(beat => {
        const matchesSearch = beat.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === 'All' || beat.status === activeTab;
        return matchesSearch && matchesTab;
    });

    const handleBack = () => {
        router.back();
    };

    const handleDeleteBeat = (id: string) => {
        Alert.alert(
            "Delete Beat",
            "Are you sure you want to delete this beat? This action cannot be undone.",
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
                    <Text style={styles.headerTitle}>Beats Store</Text>
                    <TouchableOpacity style={styles.addButton}>
                        <LinearGradient
                            colors={['#EC5C39', '#863420']}
                            style={styles.addGradient}
                        >
                            <Plus size={20} color="#FFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Search and Filters */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputWrapper}>
                        <Search size={18} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search your beats..."
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
                    {['All', 'Active', 'Draft'].map((tab) => (
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

                {/* Stats Summary */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Total Beats</Text>
                        <Text style={styles.summaryValue}>{MOCK_BEATS.length}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Total Sales</Text>
                        <Text style={styles.summaryValue}>44</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>This Month</Text>
                        <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>+$420</Text>
                    </View>
                </View>

                {/* Beats List */}
                <FlatList
                    data={filteredBeats}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <BeatCard
                            beat={item}
                            onDelete={() => handleDeleteBeat(item.id)}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Music size={48} color="rgba(255,255,255,0.2)" />
                            <Text style={styles.emptyText}>No beats found</Text>
                        </View>
                    }
                />
            </View>
        </SafeScreenWrapper>
    );
}

function BeatCard({ beat, onDelete }: any) {
    return (
        <View style={styles.beatCard}>
            <View style={styles.beatHeader}>
                <View style={styles.beatArtwork}>
                    <Music size={24} color="#EC5C39" />
                </View>
                <View style={styles.beatInfo}>
                    <Text style={styles.beatTitle}>{beat.title}</Text>
                    <View style={styles.beatMeta}>
                        <Text style={styles.beatMetaText}>{beat.genre}</Text>
                        <Text style={styles.metaDivider}>•</Text>
                        <Text style={styles.beatMetaText}>{beat.bpm} BPM</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.moreButton}>
                    <MoreVertical size={20} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
            </View>

            <View style={styles.beatStatsRow}>
                <View style={styles.beatStat}>
                    <DollarSign size={14} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.beatStatText}>${beat.price}</Text>
                </View>
                <View style={styles.beatStat}>
                    <Tag size={14} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.beatStatText}>{beat.sales} Sales</Text>
                </View>
                <View style={styles.beatStat}>
                    {beat.status === 'Active' ? (
                        <CheckCircle2 size={14} color="#4CAF50" />
                    ) : (
                        <Clock size={14} color="#FFC107" />
                    )}
                    <Text style={[
                        styles.beatStatText,
                        { color: beat.status === 'Active' ? '#4CAF50' : '#FFC107' }
                    ]}>
                        {beat.status}
                    </Text>
                </View>
            </View>

            <View style={styles.cardActions}>
                <TouchableOpacity style={styles.cardActionButton}>
                    <Edit3 size={18} color="#FFF" />
                    <Text style={styles.cardActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cardActionButton}>
                    <Share2 size={18} color="#FFF" />
                    <Text style={styles.cardActionText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cardActionButton} onPress={onDelete}>
                    <Trash2 size={18} color="rgba(255,255,255,0.6)" />
                    <Text style={[styles.cardActionText, { color: 'rgba(255,255,255,0.6)' }]}>Delete</Text>
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
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
        fontFamily: 'Poppins-Regular',
        marginBottom: 2,
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
    beatCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    beatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    beatArtwork: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: 'rgba(236, 92, 57, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    beatInfo: {
        flex: 1,
        marginLeft: 15,
    },
    beatTitle: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
    },
    beatMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    beatMetaText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
    },
    metaDivider: {
        color: 'rgba(255,255,255,0.3)',
        marginHorizontal: 8,
    },
    moreButton: {
        padding: 5,
    },
    beatStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    beatStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    beatStatText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontFamily: 'Poppins-SemiBold',
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    cardActionText: {
        color: '#FFF',
        fontSize: 12,
        fontFamily: 'Poppins-SemiBold',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.4)',
        marginTop: 15,
        fontFamily: 'Poppins-Regular',
        fontSize: 16,
    }
});
