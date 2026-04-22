import ActionSheet from '@/components/ActionSheet';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyColor, adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { notifyError } from '@/utils/notify';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
    CheckCircle2,
    Clock,
    DollarSign,
    Edit3,
    MoreVertical,
    Music,
    Play,
    Plus,
    Search,
    Tag,
    Trash2
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

function useBeatsStoreStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function BeatsStoreManagement() {
    const appTheme = useAppTheme();
    const styles = useBeatsStoreStyles();
    const placeholderColor = appTheme.colors.textPlaceholder;
    const mutedIconColor = adaptLegacyColor('rgba(255,255,255,0.4)', 'color', appTheme);
    const emptyIconColor = adaptLegacyColor('rgba(255,255,255,0.2)', 'color', appTheme);

    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    const [beats, setBeats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth.currentUser) return;

        const q = query(
            collection(db, `users/${auth.currentUser.uid}/uploads`),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedBeats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBeats(fetchedBeats);
            setLoading(false);
        }, (err) => {
            notifyError('Error fetching beats store', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredBeats = beats.filter(beat => {
        const matchesSearch = beat.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const status = beat.published === true ? 'Published' : 'Unpublished';
        const matchesTab = activeTab === 'All' || status === activeTab;
        return matchesSearch && matchesTab;
    });

    const handleBack = () => {
        router.back();
    };

    const handleDeleteBeat = (id: string) => {
        Alert.alert(
            "Delete Track",
            "Are you sure you want to remove this track from your store and vault?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, `users/${auth.currentUser?.uid}/uploads`, id));
                            useToastStore.getState().showToast("Track deleted successfully.", "success");
                        } catch (e) {
                            useToastStore.getState().showToast("Failed to delete track.", "error");
                        }
                    }
                }
            ]
        );
    };

    const totalSales = beats.reduce((acc, curr) => acc + (curr.salesCount || 0), 0);
    const monthlyRevenue = beats.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
    const openEditFlow = () => {
        useToastStore.getState().showToast('Use Studio Upload to update track details.', 'info');
        router.push('/studio/upload' as any);
    };

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <SettingsHeader
                    title="Beats Store"
                    onBack={handleBack}
                    rightElement={
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => router.push('/studio/upload')}
                        >
                            <LinearGradient
                                colors={['#EC5C39', '#863420']}
                                style={styles.addGradient}
                            >
                                <Plus size={20} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    }
                    style={{ paddingHorizontal: 0, paddingVertical: 0, marginBottom: 10 }}
                />

                {/* Search and Filters */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputWrapper}>
                        <Search size={18} color={mutedIconColor} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search your beats..."
                            placeholderTextColor={placeholderColor}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    {['All', 'Published', 'Unpublished'].map((tab) => (
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
                        <Text style={styles.summaryLabel}>Total Tracks</Text>
                        <Text style={styles.summaryValue}>{beats.length}</Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Total Plays</Text>
                        <Text style={styles.summaryValue}>
                            {beats.reduce((acc, curr) => acc + (curr.listenCount || 0), 0)}
                        </Text>
                    </View>
                    <View style={styles.summaryDivider} />
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryLabel}>Revenue</Text>
                        <Text style={[styles.summaryValue, { color: appTheme.colors.success }]}>
                            ${monthlyRevenue.toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* Beats List */}
                {loading ? (
                    <ActivityIndicator color={appTheme.colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <FlatList
                        data={filteredBeats}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <BeatCard
                                beat={item}
                                onDelete={() => handleDeleteBeat(item.id)}
                                onEdit={openEditFlow}
                                styles={styles}
                                appTheme={appTheme}
                            />
                        )}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Music size={48} color={emptyIconColor} />
                                <Text style={styles.emptyText}>No beats found in store</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </SafeScreenWrapper>
    );
}

function BeatCard({ beat, onDelete, onEdit, styles, appTheme }: any) {
    const setTrack = usePlaybackStore(state => state.setTrack);
    const status = beat.published === true ? 'Published' : 'Unpublished';
    const [menuOpen, setMenuOpen] = useState(false);
    const actionIconColor = adaptLegacyColor('rgba(255,255,255,0.5)', 'color', appTheme);
    const menuIconColor = adaptLegacyColor('rgba(255,255,255,0.6)', 'color', appTheme);
    const deleteTint = adaptLegacyColor('rgba(255,255,255,0.6)', 'color', appTheme);

    return (
        <View style={styles.beatCard}>
            <View style={styles.beatHeader}>
                <View style={styles.beatArtwork}>
                    <Music size={24} color="#EC5C39" />
                </View>
                <View style={styles.beatInfo}>
                    <Text style={styles.beatTitle} numberOfLines={1}>{beat.title}</Text>
                    <View style={styles.beatMeta}>
                        <Text style={styles.beatMetaText}>{beat.genre || 'Afro'}</Text>
                        <Text style={styles.metaDivider}>•</Text>
                        <Text style={styles.beatMetaText}>{beat.bpm || '--'} BPM</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.moreButton} onPress={() => setMenuOpen(true)}>
                    <MoreVertical size={20} color={menuIconColor} />
                </TouchableOpacity>

                <ActionSheet
                    visible={menuOpen}
                    onClose={() => setMenuOpen(false)}
                    title={beat.title}
                    options={[
                        { label: 'Listen Preview', icon: <Play size={18} color={appTheme.colors.textPrimary} />, onPress: () => setTrack({ id: beat.id, title: beat.title, artist: 'My Track', url: beat.audioUrl, uploaderId: beat.uploaderId }) },
                        { label: 'Edit Details', icon: <Edit3 size={18} color={appTheme.colors.textPrimary} />, onPress: onEdit },
                        { label: 'Delete', icon: <Trash2 size={18} color="#FF4D4D" />, onPress: onDelete, destructive: true },
                    ]}
                />
            </View>

            <View style={styles.beatStatsRow}>
                <View style={styles.beatStat}>
                    <DollarSign size={14} color={actionIconColor} />
                    <Text style={styles.beatStatText}>${beat.price || '0.00'}</Text>
                </View>
                <View style={styles.beatStat}>
                    <Tag size={14} color={actionIconColor} />
                    <Text style={styles.beatStatText}>{beat.salesCount || 0} Sales</Text>
                </View>
                <View style={styles.beatStat}>
                    {status === 'Published' ? (
                        <CheckCircle2 size={14} color="#4CAF50" />
                    ) : (
                        <Clock size={14} color="#FFC107" />
                    )}
                    <Text style={[
                        styles.beatStatText,
                        { color: status === 'Published' ? '#4CAF50' : '#FFC107' }
                    ]}>
                        {status}
                    </Text>
                </View>
            </View>

            <View style={styles.cardActions}>
                <TouchableOpacity
                    style={[styles.cardActionButton, { backgroundColor: '#EC5C39' }]}
                    onPress={() => setTrack({
                        id: beat.id,
                        title: beat.title,
                        artist: auth.currentUser?.displayName || 'Creator',
                        url: beat.audioUrl,
                        uploaderId: auth.currentUser?.uid
                    })}
                >
                    <Play size={18} color={appTheme.colors.textPrimary} />
                    <Text style={styles.cardActionText}>Listen</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cardActionButton} onPress={onEdit}>
                    <Edit3 size={18} color={appTheme.colors.textPrimary} />
                    <Text style={styles.cardActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cardActionButton} onPress={onDelete}>
                    <Trash2 size={18} color={deleteTint} />
                    <Text style={[styles.cardActionText, { color: deleteTint }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const legacyStyles = {
    container: {
        flex: 1,
        paddingHorizontal: 20,
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
};
