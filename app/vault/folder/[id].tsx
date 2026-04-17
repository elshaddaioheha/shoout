import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyColor, adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { notifyError } from '@/utils/notify';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
    collection,
    doc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
} from 'firebase/firestore';
import {
    FolderLock,
    Music,
    MoreVertical,
    Plus,
    Upload,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActionSheetIOS,
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type FolderTrack = {
    id: string;
    uploadId?: string;
    uploaderId?: string;
    title?: string;
    artist?: string;
    artworkUrl?: string;
    audioUrl?: string;
    duration?: string;
    addedAt?: any;
};

type AvailableUpload = {
    id: string;
    title?: string;
    artist?: string;
    uploaderName?: string;
    coverUrl?: string;
    artworkUrl?: string;
    audioUrl?: string;
    lifecycleStatus?: string;
    published?: boolean;
};

function useFolderDetailStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function FolderDetailScreen() {
    const appTheme = useAppTheme();
    const styles = useFolderDetailStyles();
    const emptyIconColor = adaptLegacyColor('rgba(255,255,255,0.12)', 'color', appTheme);
    const fallbackArtworkColor = adaptLegacyColor('rgba(255,255,255,0.5)', 'color', appTheme);
    const trackMenuIconColor = adaptLegacyColor('rgba(255,255,255,0.4)', 'color', appTheme);

    const router = useRouter();
    const { id, name: nameParam } = useLocalSearchParams<{ id: string; name?: string }>();

    const [folderName, setFolderName] = useState(nameParam || 'Folder');
    const [tracks, setTracks] = useState<FolderTrack[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [availableUploads, setAvailableUploads] = useState<AvailableUpload[]>([]);
    const [selectedUploadIds, setSelectedUploadIds] = useState<string[]>([]);
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const [adding, setAdding] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.96)).current;

    // Load folder tracks from Firestore
    useEffect(() => {
        if (!auth.currentUser || !id) return;

        // Load folder metadata (name)
        const folderRef = doc(db, `users/${auth.currentUser.uid}/folders/${id}`);
        const unsubFolder = onSnapshot(folderRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setFolderName(data.name || nameParam || 'Folder');
            }
        });

        // Load tracks inside this folder
        const tracksQuery = query(
            collection(db, `users/${auth.currentUser.uid}/folders/${id}/tracks`),
            orderBy('addedAt', 'desc')
        );
        const unsubTracks = onSnapshot(tracksQuery, (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as FolderTrack[];
            setTracks(list);
            setLoading(false);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
            ]).start();
        }, (err) => {
            notifyError('Folder tracks error', err);
            setLoading(false);
        });

        return () => {
            unsubFolder();
            unsubTracks();
        };
    }, [id]);

    const loadAvailableUploads = async () => {
        if (!auth.currentUser) return;

        setLoadingAvailable(true);
        try {
            const snap = await getDocs(
                query(
                    collection(db, `users/${auth.currentUser.uid}/uploads`),
                    orderBy('createdAt', 'desc'),
                    limit(120)
                )
            );

            const existingIds = new Set(tracks.map((track) => String(track.uploadId || track.id)));
            const rows = snap.docs
                .map((row) => ({ id: row.id, ...(row.data() as any) } as AvailableUpload))
                .filter((row) => !!row.id && !existingIds.has(String(row.id)));
            setAvailableUploads(rows);
        } catch (err) {
            notifyError('Load uploads for folder failed', err);
            Alert.alert('Error', 'Could not load available uploads.');
        } finally {
            setLoadingAvailable(false);
        }
    };

    const openAddTrackModal = async () => {
        setShowAddModal(true);
        setSelectedUploadIds([]);
        await loadAvailableUploads();
    };

    const toggleUploadSelection = (uploadId: string) => {
        setSelectedUploadIds((prev) => {
            if (prev.includes(uploadId)) return prev.filter((id) => id !== uploadId);
            return [...prev, uploadId];
        });
    };

    const handleAddTrack = async () => {
        if (!auth.currentUser || !id) return;

        if (selectedUploadIds.length === 0) {
            Alert.alert('Select tracks', 'Choose at least one existing upload to add.');
            return;
        }

        try {
            setAdding(true);

            const byId: Record<string, AvailableUpload> = {};
            availableUploads.forEach((row) => {
                byId[row.id] = row;
            });

            for (const uploadId of selectedUploadIds) {
                const row = byId[uploadId];
                if (!row) continue;

                await setDoc(
                    doc(db, `users/${auth.currentUser.uid}/folders/${id}/tracks/${uploadId}`),
                    {
                        uploadId,
                        uploaderId: auth.currentUser.uid,
                        title: row.title || 'Untitled',
                        artist: row.artist || row.uploaderName || auth.currentUser.displayName || 'Unknown Artist',
                        artworkUrl: row.coverUrl || row.artworkUrl || null,
                        audioUrl: row.audioUrl || null,
                        lifecycleStatus: row.lifecycleStatus || (row.published ? 'published' : 'vault_private'),
                        addedAt: serverTimestamp(),
                    },
                    { merge: true }
                );
            }

            // Update folder item count
            const folderRef = doc(db, `users/${auth.currentUser.uid}/folders/${id}`);
            await updateDoc(folderRef, { itemCount: tracks.length + selectedUploadIds.length, updatedAt: serverTimestamp() });

            setSelectedUploadIds([]);
            setShowAddModal(false);
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Could not add track.');
        } finally {
            setAdding(false);
        }
    };

    const handleTrackOptions = (track: FolderTrack) => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Remove from Folder'],
                    destructiveButtonIndex: 1,
                    cancelButtonIndex: 0,
                },
                (idx) => {
                    if (idx === 1) confirmRemoveTrack(track);
                }
            );
        } else {
            Alert.alert(
                track.title || 'Track',
                'What would you like to do?',
                [
                    { text: 'Remove from Folder', style: 'destructive', onPress: () => confirmRemoveTrack(track) },
                    { text: 'Cancel', style: 'cancel' },
                ]
            );
        }
    };

    const confirmRemoveTrack = (track: FolderTrack) => {
        Alert.alert(
            'Remove Track',
            `Remove "${track.title}" from this folder?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove', style: 'destructive',
                    onPress: async () => {
                        if (!auth.currentUser) return;
                        try {
                            const { deleteDoc } = await import('firebase/firestore');
                            const folderTrackId = String(track.uploadId || track.id);
                            await deleteDoc(doc(db, `users/${auth.currentUser.uid}/folders/${id}/tracks/${folderTrackId}`));
                            await updateDoc(doc(db, `users/${auth.currentUser.uid}/folders/${id}`), {
                                itemCount: Math.max(0, tracks.length - 1),
                                updatedAt: serverTimestamp(),
                            });
                        } catch (e: any) {
                            Alert.alert('Error', e?.message || 'Could not remove track.');
                        }
                    }
                },
            ]
        );
    };

    return (
        <SafeScreenWrapper>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.container}>
                <SettingsHeader
                    title={folderName}
                    onBack={() => router.back()}
                    rightElement={
                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => router.push('/vault/upload' as any)}
                        >
                            <Upload size={20} color="#EC5C39" />
                        </TouchableOpacity>
                    }
                    style={{ paddingHorizontal: 0, paddingVertical: 0, marginBottom: 4 }}
                />

                {/* Folder Cover */}
                <View style={styles.coverSection}>
                    <View style={styles.folderCoverWrap}>
                        <View style={styles.folderBack} />
                        <View style={styles.folderFront}>
                            <FolderLock size={52} color="#EC5C39" />
                        </View>
                    </View>
                    <Text style={styles.coverName}>{folderName}</Text>
                    <Text style={styles.coverSub}>{tracks.length} track{tracks.length !== 1 ? 's' : ''}</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={openAddTrackModal}
                    >
                        <Plus size={16} color="#140F10" />
                        <Text style={styles.actionBtnText}>Add Track</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnOutline]}
                        onPress={() => router.push('/vault/upload' as any)}
                    >
                        <Upload size={16} color="#EC5C39" />
                        <Text style={[styles.actionBtnText, { color: '#EC5C39' }]}>Upload</Text>
                    </TouchableOpacity>
                </View>

                {/* Tracks List */}
                {loading ? (
                    <View style={styles.loadingWrap}>
                        <ActivityIndicator color="#EC5C39" />
                    </View>
                ) : (
                    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={tracks.length === 0 ? styles.emptyContainer : styles.listContent}
                        >
                            {tracks.length === 0 ? (
                                <View style={styles.emptyWrap}>
                                    <Music size={64} color={emptyIconColor} strokeWidth={1.5} />
                                    <Text style={styles.emptyTitle}>No tracks yet</Text>
                                    <Text style={styles.emptySub}>
                                        Add existing private uploads to this folder or upload a new track into Vault.
                                    </Text>
                                    <TouchableOpacity style={styles.emptyBtn} onPress={openAddTrackModal}>
                                        <Plus size={16} color="#FFF" />
                                        <Text style={styles.emptyBtnText}>Add First Track</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                tracks.map((track, idx) => (
                                    <View key={track.id} style={styles.trackRow}>
                                        <View style={styles.trackIndex}>
                                            <Text style={styles.trackIndexText}>{idx + 1}</Text>
                                        </View>
                                        <View style={styles.trackArt}>
                                            {track.artworkUrl ? (
                                                <Image source={{ uri: track.artworkUrl }} style={styles.trackArtImage} />
                                            ) : (
                                                <Music size={20} color={fallbackArtworkColor} />
                                            )}
                                        </View>
                                        <View style={styles.trackInfo}>
                                            <Text style={styles.trackTitle} numberOfLines={1}>{track.title || 'Untitled'}</Text>
                                            <Text style={styles.trackArtist} numberOfLines={1}>{track.artist || 'Unknown Artist'}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.trackMore}
                                            onPress={() => handleTrackOptions(track)}
                                        >
                                            <MoreVertical size={18} color={trackMenuIconColor} />
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </Animated.View>
                )}
            </View>

            {/* Add Track Modal */}
            <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Add Track to Folder</Text>
                        <Text style={styles.modalSub}>Select existing uploads to add to "{folderName}"</Text>

                        <View style={styles.availableListWrap}>
                            {loadingAvailable ? (
                                <View style={styles.availableLoadingWrap}>
                                    <ActivityIndicator color="#EC5C39" />
                                </View>
                            ) : availableUploads.length === 0 ? (
                                <Text style={styles.availableEmptyText}>No available uploads left to add.</Text>
                            ) : (
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    {availableUploads.map((row) => {
                                        const selected = selectedUploadIds.includes(row.id);
                                        return (
                                            <TouchableOpacity
                                                key={row.id}
                                                style={[styles.availableRow, selected && styles.availableRowSelected]}
                                                onPress={() => toggleUploadSelection(row.id)}
                                                activeOpacity={0.85}
                                            >
                                                <View style={styles.availableMeta}>
                                                    <Text style={styles.availableTitle} numberOfLines={1}>{row.title || 'Untitled'}</Text>
                                                    <Text style={styles.availableSub} numberOfLines={1}>
                                                        {(row.artist || row.uploaderName || 'Unknown Artist')} | {(row.lifecycleStatus || (row.published ? 'published' : 'vault private'))}
                                                    </Text>
                                                </View>
                                                <View style={[styles.selectDot, selected && styles.selectDotActive]} />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => { setShowAddModal(false); setSelectedUploadIds([]); }}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, adding && { opacity: 0.6 }]}
                                onPress={handleAddTrack}
                                disabled={adding}
                            >
                                {adding ? <ActivityIndicator color="#140F10" size="small" /> : <Text style={styles.confirmBtnText}>Add Selected</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeScreenWrapper>
    );
}

const legacyStyles = {
    container: { flex: 1, backgroundColor: '#140F10' },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    iconBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center', justifyContent: 'center',
    },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { color: '#FFF', fontFamily: 'Poppins-Bold', fontSize: 16 },
    headerSub: { color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins-Regular', fontSize: 12 },

    // Cover section
    coverSection: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20 },
    folderCoverWrap: { width: 140, height: 140, position: 'relative', marginBottom: 16 },
    folderBack: {
        position: 'absolute', top: 0, left: 10, right: 0,
        height: 120, borderRadius: 16,
        backgroundColor: 'rgba(236,92,57,0.2)',
        borderWidth: 1, borderColor: 'rgba(236,92,57,0.3)',
    },
    folderFront: {
        position: 'absolute', bottom: 0, left: 0, right: 10,
        height: 120, borderRadius: 16,
        backgroundColor: '#1F1719',
        borderWidth: 1, borderColor: 'rgba(236,92,57,0.4)',
        alignItems: 'center', justifyContent: 'center',
    },
    coverName: { color: '#FFF', fontFamily: 'Poppins-Bold', fontSize: 20, textAlign: 'center' },
    coverSub: { color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins-Regular', fontSize: 13, marginTop: 4 },

    // Actions
    actionsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 16 },
    actionBtn: {
        flex: 1, height: 48, borderRadius: 14,
        backgroundColor: '#EC5C39',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    },
    actionBtnOutline: {
        backgroundColor: 'transparent',
        borderWidth: 1, borderColor: '#EC5C39',
    },
    actionBtnText: { color: '#140F10', fontFamily: 'Poppins-Bold', fontSize: 14 },

    // Loading
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // List
    listContent: { paddingHorizontal: 20, paddingBottom: 60 },
    emptyContainer: { flex: 1, paddingHorizontal: 20 },
    emptyWrap: { alignItems: 'center', paddingTop: 40 },
    emptyTitle: { color: '#FFF', fontFamily: 'Poppins-Bold', fontSize: 18, marginTop: 20 },
    emptySub: { color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins-Regular', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
    emptyBtn: {
        marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#EC5C39', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14,
    },
    emptyBtnText: { color: '#FFF', fontFamily: 'Poppins-Bold', fontSize: 14 },

    // Track row
    trackRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    trackIndex: { width: 28, alignItems: 'center' },
    trackIndexText: { color: 'rgba(255,255,255,0.35)', fontFamily: 'Poppins-Regular', fontSize: 13 },
    trackArt: {
        width: 48, height: 48, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center', justifyContent: 'center',
        marginLeft: 8, overflow: 'hidden',
    },
    trackArtImage: { width: 48, height: 48 },
    trackInfo: { flex: 1, marginLeft: 12 },
    trackTitle: { color: '#FFF', fontFamily: 'Poppins-Medium', fontSize: 14 },
    trackArtist: { color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins-Regular', fontSize: 12, marginTop: 2 },
    trackMore: { padding: 8 },

    // Add modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
    modalCard: {
        backgroundColor: '#1E1A1A',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingBottom: 48,
    },
    modalHandle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignSelf: 'center', marginBottom: 24,
    },
    modalTitle: { color: '#FFF', fontFamily: 'Poppins-Bold', fontSize: 18, marginBottom: 4 },
    modalSub: { color: 'rgba(255,255,255,0.5)', fontFamily: 'Poppins-Regular', fontSize: 13, marginBottom: 24 },
    availableListWrap: {
        maxHeight: 240,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        marginBottom: 14,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    availableLoadingWrap: {
        minHeight: 120,
        alignItems: 'center',
        justifyContent: 'center',
    },
    availableEmptyText: {
        color: 'rgba(255,255,255,0.45)',
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        textAlign: 'center',
        paddingVertical: 28,
    },
    availableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    availableRowSelected: {
        backgroundColor: 'rgba(236,92,57,0.12)',
    },
    availableMeta: {
        flex: 1,
        paddingRight: 8,
    },
    availableTitle: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-Medium',
        fontSize: 14,
    },
    availableSub: {
        color: 'rgba(255,255,255,0.55)',
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        marginTop: 2,
    },
    selectDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.35)',
    },
    selectDotActive: {
        borderColor: '#EC5C39',
        backgroundColor: '#EC5C39',
    },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: {
        flex: 1, height: 52, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center', justifyContent: 'center',
    },
    cancelBtnText: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Poppins-Bold', fontSize: 15 },
    confirmBtn: {
        flex: 1, height: 52, borderRadius: 14,
        backgroundColor: '#EC5C39',
        alignItems: 'center', justifyContent: 'center',
    },
    confirmBtnText: { color: '#140F10', fontFamily: 'Poppins-Bold', fontSize: 15 },
};

