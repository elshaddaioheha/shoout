import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useToastStore } from '@/store/useToastStore';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import {
    Check,
    ChevronDown,
    FolderPlus,
    Image as ImageIcon,
    Link2,
    Megaphone,
    Music,
    Share2,
    Upload as UploadIcon,
    X
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Animated,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { app, auth, db, storage } from '../../firebaseConfig';
import { formatUsd } from '../../utils/pricing';

const GENRES = ['Afrobeat', 'Afrobeats', 'Amapiano', 'Trap', 'Drill', 'R&B', 'Dancehall'];
const ASSET_TYPES = ['Single', 'Album', 'Playlist'];
const PRICE_PRESETS = [9.99, 19.99, 29.99];

type AssetType = typeof ASSET_TYPES[number];
type FlowStep = 'menu' | 'createFolder' | 'uploadSource' | 'publish';

type PublisherProfile = {
    stageName: string;
    recordLabel: string;
    fullName: string;
    idNumber: string;
    bank: string;
    accountNumber: string;
    payoutThreshold: string;
    letFansSubscribe: boolean;
};

export default function UploadScreen() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(!!auth.currentUser);
    const [flowStep, setFlowStep] = useState<FlowStep>('menu');
    const [sourceChoice, setSourceChoice] = useState<'storage' | 'local' | null>(null);

    const [profileLoading, setProfileLoading] = useState(false);
    const [profileChecked, setProfileChecked] = useState(false);
    const [isFirstTimePublisher, setIsFirstTimePublisher] = useState(true);

    const [publisherProfile, setPublisherProfile] = useState<PublisherProfile>({
        stageName: '',
        recordLabel: '',
        fullName: '',
        idNumber: '',
        bank: '',
        accountNumber: '',
        payoutThreshold: '',
        letFansSubscribe: false,
    });

    const [folderName, setFolderName] = useState('');
    const [folders, setFolders] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedFolderId, setSelectedFolderId] = useState('');
    const [showFolderPicker, setShowFolderPicker] = useState(false);

    const [existingTracks, setExistingTracks] = useState<Array<{ id: string; title: string }>>([]);
    const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
    const [showTrackPicker, setShowTrackPicker] = useState(false);
    const trackPickerSlide = useRef(new Animated.Value(40)).current;
    const trackPickerFade = useRef(new Animated.Value(0)).current;

    const [title, setTitle] = useState('');
    const [genre, setGenre] = useState('');
    const [assetType, setAssetType] = useState<AssetType | ''>('');
    const [bpm, setBpm] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [subscriberOnly, setSubscriberOnly] = useState(false);
    const [useExistingCover, setUseExistingCover] = useState(false);

    const [uploading, setUploading] = useState(false);
    const [showGenrePicker, setShowGenrePicker] = useState(false);
    const [showAssetTypePicker, setShowAssetTypePicker] = useState(false);

    // Success splash
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadedTrackId, setUploadedTrackId] = useState<string | null>(null);
    const [uploadedTitle, setUploadedTitle] = useState('');

    const [audioFile, setAudioFile] = useState<any>(null);
    const [artworkFile, setArtworkFile] = useState<any>(null);
    const [artworkPreviewUri, setArtworkPreviewUri] = useState<string | null>(null);

    const { showToast } = useToastStore();

    useEffect(() => {
        const unsub = auth.onAuthStateChanged((user) => setIsLoggedIn(!!user));
        return unsub;
    }, []);

    // Animate track picker modal slide/fade
    useEffect(() => {
        if (showTrackPicker) {
            Animated.parallel([
                Animated.timing(trackPickerFade, { toValue: 1, duration: 160, useNativeDriver: true }),
                Animated.spring(trackPickerSlide, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(trackPickerFade, { toValue: 0, duration: 140, useNativeDriver: true }),
                Animated.timing(trackPickerSlide, { toValue: 40, duration: 140, useNativeDriver: true }),
            ]).start();
        }
    }, [showTrackPicker, trackPickerFade, trackPickerSlide]);

    if (!isLoggedIn) {
        return (
            <SafeScreenWrapper>
                <View style={[styles.centered, { padding: 24 }]}>
                    <Text style={styles.guestTitle}>Sign in to upload</Text>
                    <Text style={styles.guestSubtitle}>Create an account or log in to list your music for sale.</Text>
                    <View style={styles.guestActions}>
                        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(auth)/signup' as any)}>
                            <Text style={styles.primaryButtonText}>Create account</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(auth)/login' as any)}>
                            <Text style={styles.secondaryButtonText}>Log in</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeScreenWrapper>
        );
    }

    const loadFolders = async () => {
        if (!auth.currentUser) return;
        const snap = await getDocs(
            query(collection(db, `users/${auth.currentUser.uid}/folders`), orderBy('createdAt', 'desc'))
        );
        const items = snap.docs.map((item) => ({
            id: item.id,
            name: String(item.data().name || 'Untitled Folder'),
        }));
        setFolders(items);
    };

    const loadExistingTracks = async () => {
        if (!auth.currentUser) return;
        const snap = await getDocs(
            query(collection(db, `users/${auth.currentUser.uid}/uploads`), orderBy('createdAt', 'desc'), limit(20))
        );
        const items = snap.docs.map((item) => ({
            id: item.id,
            title: String(item.data().title || 'Untitled'),
        }));
        setExistingTracks(items);
    };

    const checkPublisherProfile = async () => {
        if (!auth.currentUser || profileChecked || profileLoading) return;
        setProfileLoading(true);
        try {
            const profileRef = doc(db, `users/${auth.currentUser.uid}/publisherProfile/main`);
            const profileSnap = await getDoc(profileRef);
            if (profileSnap.exists()) {
                const data = profileSnap.data() as any;
                setPublisherProfile({
                    stageName: String(data.stageName || ''),
                    recordLabel: String(data.recordLabel || ''),
                    fullName: String(data.fullName || ''),
                    idNumber: String(data.idNumber || ''),
                    bank: String(data.bank || ''),
                    accountNumber: String(data.accountNumber || ''),
                    payoutThreshold: String(data.payoutThreshold || ''),
                    letFansSubscribe: Boolean(data.letFansSubscribe),
                });
                setIsFirstTimePublisher(false);
            } else {
                setIsFirstTimePublisher(true);
            }
            setProfileChecked(true);
        } catch (error) {
            console.error('Profile check error:', error);
            showToast('Could not load publisher profile.', 'error');
        } finally {
            setProfileLoading(false);
        }
    };

    const goToPublishStep = async (source: 'storage' | 'local') => {
        setSourceChoice(source);
        await Promise.all([checkPublisherProfile(), loadFolders(), loadExistingTracks()]);
        setFlowStep('publish');
    };

    const handleCreateFolder = async () => {
        if (!auth.currentUser) {
            // Shouldn't happen — screen guards unauthenticated access above
            console.warn('[upload] handleCreateFolder: no auth.currentUser');
            return;
        }
        const cleanName = folderName.trim();
        if (!cleanName) {
            showToast('Please enter a folder name', 'error');
            return;
        }

        try {
            const folderDoc = await addDoc(collection(db, `users/${auth.currentUser.uid}/folders`), {
                name: cleanName,
                createdAt: serverTimestamp(),
            });
            setFolderName('');
            await loadFolders();
            setSelectedFolderId(folderDoc.id);
            showToast('Folder created successfully', 'success');
            setFlowStep('uploadSource');
        } catch (error) {
            console.error('Create folder error:', error);
            showToast('Failed to create folder.', 'error');
        }
    };

    const savePublisherProfile = async () => {
        if (!auth.currentUser) {
            console.warn('[upload] savePublisherProfile: no auth.currentUser');
            return false;
        }

        if (!publisherProfile.stageName || !publisherProfile.fullName || !publisherProfile.bank || !publisherProfile.accountNumber) {
            showToast('Please complete stage name, full name, bank and account number.', 'error');
            return false;
        }

        try {
            await setDoc(doc(db, `users/${auth.currentUser.uid}/publisherProfile/main`), {
                ...publisherProfile,
                updatedAt: serverTimestamp(),
                source: 'studio-upload-flow',
            }, { merge: true });
            await addDoc(collection(db, `users/${auth.currentUser.uid}/publisherProfileAudit`), {
                event: 'publisher_profile_created',
                createdAt: serverTimestamp(),
            });
            setIsFirstTimePublisher(false);
            showToast('Publisher profile saved.', 'success');
            return true;
        } catch (error) {
            console.error('Save publisher profile error:', error);
            showToast('Failed to save publisher profile.', 'error');
            return false;
        }
    };

    const handleBack = () => {
        if (flowStep === 'publish') {
            setFlowStep('uploadSource');
            return;
        }
        if (flowStep === 'uploadSource') {
            setFlowStep('menu');
            return;
        }
        if (flowStep === 'createFolder') {
            setFlowStep('menu');
            return;
        }
        router.back();
    };

    const handleSelectFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
                copyToCacheDirectory: true
            });
            if (result.canceled === false) {
                setAudioFile(result.assets[0]);
                if (!title) {
                    const pickedName = result.assets[0].name || 'Untitled Track';
                    setTitle(String(pickedName).replace(/\.[^/.]+$/, ''));
                }
            }
        } catch (error) {
            console.error('Document picker error:', error);
            showToast('Failed to pick file.', 'error');
        }
    };

    const handleSelectArtwork = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'image/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled) {
                setArtworkFile(result.assets[0]);
                setArtworkPreviewUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Artwork picker error:', error);
            showToast('Failed to pick artwork.', 'error');
        }
    };

    const applyPricePreset = (preset: number) => {
        setPrice(String(preset));
    };

    const toggleTrackSelection = (trackId: string) => {
        setSelectedTrackIds((prev) => {
            if (prev.includes(trackId)) {
                return prev.filter((id) => id !== trackId);
            }
            return [...prev, trackId];
        });
    };

    const handleUpload = async () => {
        if (!auth.currentUser) {
            showToast("Session expired — please log in again", "error");
            return;
        }
        // Use existing token without force-refreshing — force-refreshing triggers
        // notifyAuthListeners which closes all active Firestore streams (causing
        // the 'Missing permissions' error visible in folder tracks).
        // The token is already fresh enough for a new upload.

        if (isFirstTimePublisher) {
            const profileSaved = await savePublisherProfile();
            if (!profileSaved) {
                return;
            }
        }

        if (!title) {
            showToast("Please enter a title", "error");
            return;
        }
        if (!genre) {
            showToast("Please select a genre", "error");
            return;
        }
        if (!assetType) {
            showToast("Please select an asset type", "error");
            return;
        }
        if (!audioFile) {
            showToast("Please select an audio file to upload", "error");
            return;
        }

        if (sourceChoice === 'storage' && selectedTrackIds.length === 0 && !audioFile) {
            showToast('Select at least one existing track or upload a file.', 'error');
            return;
        }

        setUploading(true);
        try {
            // Validate storage limit via Cloud Function.
            // Pass the Firebase app instance explicitly so getFunctions() attaches
            // the correct project — without it the call can be sent to a default
            // (possibly uninitialized) app, causing unauthenticated errors.
            // Validate storage limit via Cloud Function.
            // Skip on web — the CF requires App Check which is not configured
            // for web, causing a consistent 401 Unauthorized error.
            if (audioFile?.size && Platform.OS !== 'web') {
                try {
                    const functions = getFunctions(app);
                    const validateStorageLimitFn = httpsCallable(functions, 'validateStorageLimit');
                    const storageValidation = await validateStorageLimitFn({ fileSizeBytes: audioFile.size });
                    const validationData = storageValidation.data as { allowed: boolean };
                    if (!validationData.allowed) {
                        showToast('Storage limit exceeded. Please upgrade your plan.', 'error');
                        setUploading(false);
                        return;
                    }
                } catch (cfError: any) {
                    // Non-fatal: if CF is unreachable, proceed with upload
                    console.warn('validateStorageLimit skipped:', cfError?.message);
                }
            }

            let downloadUrl = '';
            let fileName = '';
            let fileSizeBytes = 0;

            if (audioFile) {
                // 1. Convert local URI into a blob that Firebase Cloud Storage can digest
                const response = await fetch(audioFile.uri);
                const blob = await response.blob();

                // 2. Reference in Cloud Storage bucket (/vaults/userId/trackName_timestamp.mp3)
                const safeFileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
                const storageRef = ref(storage, `vaults/${auth.currentUser.uid}/${safeFileName}`);

                // 3. Upload bytes to bucket
                const uploadTask = await uploadBytesResumable(storageRef, blob);

                // 4. Get the permanent streamable URL
                downloadUrl = await getDownloadURL(uploadTask.ref);
                fileName = String(audioFile.name || safeFileName);
                fileSizeBytes = Number(audioFile.size || 0);
            }

            let coverUrl = '';
            if (artworkFile) {
                const artResponse = await fetch(artworkFile.uri);
                const artBlob = await artResponse.blob();
                const artRef = ref(storage, `users/${auth.currentUser.uid}/covers/${Date.now()}_${title.replace(/[^a-zA-Z0-9]/g, '_')}`);
                const artTask = await uploadBytesResumable(artRef, artBlob);
                coverUrl = await getDownloadURL(artTask.ref);
            }

            // 5. Save the metadata pointer natively into Firestore Collections
            // 🔒 SECURITY: Firestore rules will block pricing if user lacks canSell permission
            const uploadDoc = await addDoc(collection(db, `users/${auth.currentUser.uid}/uploads`), {
                title,
                genre: genre || "Unknown",
                assetType: assetType || 'Single',
                trackType: assetType || 'Single',
                bpm: parseInt(bpm) || 0,
                price: parseFloat(price) || 0,
                description,
                audioUrl: downloadUrl,
                coverUrl,
                fileName,
                fileSizeBytes,
                folderId: selectedFolderId || null,
                sourceChoice: sourceChoice || 'local',
                useExistingCover,
                selectedTrackIds,
                subscriberOnly,
                listenCount: 0,
                salesCount: 0,
                createdAt: serverTimestamp(),
                publishedAt: serverTimestamp(),
                published: true,
                isPublic: true,
                userId: auth.currentUser.uid,
                uploaderName: auth.currentUser.displayName || "Shoouter",
            });

            showToast("Track uploaded successfully!", "success");
            setUploadedTrackId(uploadDoc.id);
            setUploadedTitle(title);
            setUploadSuccess(true);
        } catch (error: any) {
            console.error("Upload error: ", error);
            if (error.code === 'resource-exhausted') {
                showToast("Storage limit exceeded. Please upgrade your subscription plan.", "error");
            } else {
                showToast("Failed to upload: " + error.message, "error");
            }
        } finally {
            setUploading(false);
        }
    };

    // ── Success Splash ─────────────────────────────────────────────────────────
    if (uploadSuccess && uploadedTrackId) {
        const shareUrl = `https://shoouts.app/listing/${uploadedTrackId}`;
        const handleShare = async () => {
            try {
                await Share.share({
                    message: `🎵 Listen to "${uploadedTitle}" on Shoouts: ${shareUrl}`,
                    url: shareUrl,
                    title: uploadedTitle,
                });
            } catch (e) {
                showToast('Copy this link: ' + shareUrl, 'info');
            }
        };
        return (
            <SafeScreenWrapper>
                <View style={styles.splashContainer}>
                    <View style={styles.splashRingOuter}>
                        <View style={styles.splashRingInner}>
                            <View style={styles.splashCheckCircle}>
                                <Check size={36} color="#140F10" strokeWidth={3} />
                            </View>
                        </View>
                    </View>
                    <Text style={styles.splashTitle}>Track Published! 🎉</Text>
                    <Text style={styles.splashSub}>Your track "{uploadedTitle}" is now live in your Vault.</Text>
                    <View style={styles.splashLinkBox}>
                        <Link2 size={16} color="#EC5C39" />
                        <Text style={styles.splashLinkText} numberOfLines={1} selectable>{shareUrl}</Text>
                    </View>
                    <TouchableOpacity style={styles.splashShareBtn} onPress={handleShare}>
                        <Share2 size={18} color="#140F10" />
                        <Text style={styles.splashShareText}>Share Link</Text>
                    </TouchableOpacity>

                    {/* Promote CTA */}
                    <TouchableOpacity
                        style={styles.splashPromoteBtn}
                        onPress={() => router.push({
                            pathname: '/studio/ads-creation' as any,
                            params: {
                                step: '1',
                                trackId: uploadedTrackId,
                                trackTitle: uploadedTitle,
                                coverUrl: artworkPreviewUri || '',
                            },
                        })}
                    >
                        <Megaphone size={18} color="#EC5C39" />
                        <Text style={styles.splashPromoteText}>Promote this Track</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.splashDoneBtn} onPress={() => router.back()}>
                        <Text style={styles.splashDoneText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </SafeScreenWrapper>
        );
    }

    return (
        <SafeScreenWrapper>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.container}>
                    {/* Header */}
                    <SettingsHeader
                        title={flowStep === 'menu' ? 'Publish Track' : flowStep === 'createFolder' ? 'Create Folder' : flowStep === 'uploadSource' ? 'Upload Track' : 'Publish Track'}
                        onBack={handleBack}
                        style={{ paddingHorizontal: 0, paddingVertical: 0, marginBottom: 10 }}
                    />

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {flowStep === 'menu' && (
                            <View style={styles.flowBlock}>
                                <TouchableOpacity
                                    style={styles.choiceCard}
                                    onPress={() => setFlowStep('createFolder')}
                                >
                                    <View>
                                        <Text style={styles.choiceTitle}>Create Folder</Text>
                                        <Text style={styles.choiceSub}>Organize songs before publishing</Text>
                                    </View>
                                    <View style={styles.choiceIcon}>
                                        <FolderPlus size={26} color="#FFF" />
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.choiceCard}
                                    onPress={() => setFlowStep('uploadSource')}
                                >
                                    <View>
                                        <Text style={styles.choiceTitle}>Upload Track</Text>
                                        <Text style={styles.choiceSub}>Start your publishing flow</Text>
                                    </View>
                                    <View style={styles.choiceIcon}>
                                        <Music size={26} color="#FFF" />
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}

                        {flowStep === 'createFolder' && (
                            <View style={styles.flowBlock}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Name of Folder</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Name of Folder"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        value={folderName}
                                        onChangeText={setFolderName}
                                    />
                                </View>

                                <TouchableOpacity style={styles.publishButton} onPress={handleCreateFolder}>
                                    <LinearGradient colors={['#EC5C39', '#863420']} style={styles.publishGradient}>
                                        <Text style={styles.publishText}>Create Folder</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}

                        {flowStep === 'uploadSource' && (
                            <View style={styles.flowBlock}>
                                <Text style={styles.helperTitle}>Select track source</Text>
                                <TouchableOpacity style={styles.inlineLink} onPress={() => goToPublishStep('storage')}>
                                    <Text style={styles.inlineLinkText}>Select items from Storage</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.inlineLink} onPress={() => goToPublishStep('local')}>
                                    <Text style={styles.inlineLinkText}>Select items from Local device</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.publishButton} onPress={() => goToPublishStep(sourceChoice || 'local')}>
                                    <LinearGradient colors={['#EC5C39', '#863420']} style={styles.publishGradient}>
                                        <Text style={styles.publishText}>Proceed to Publish</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}

                        {flowStep === 'publish' && (
                            <>
                                {profileLoading && (
                                    <View style={{ paddingVertical: 24 }}>
                                        <ActivityIndicator color="#EC5C39" />
                                    </View>
                                )}

                                {/* First-time publisher block */}
                                {isFirstTimePublisher && !profileLoading && (
                                    <View style={styles.sectionCard}>
                                        <Text style={styles.sectionTitle}>First Time Publisher</Text>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Stage Name</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Enter your stage name"
                                                placeholderTextColor="rgba(255,255,255,0.3)"
                                                value={publisherProfile.stageName}
                                                onChangeText={(value) => setPublisherProfile((prev) => ({ ...prev, stageName: value }))}
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Record Label</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Select or input record label"
                                                placeholderTextColor="rgba(255,255,255,0.3)"
                                                value={publisherProfile.recordLabel}
                                                onChangeText={(value) => setPublisherProfile((prev) => ({ ...prev, recordLabel: value }))}
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Full Name</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Enter full name"
                                                placeholderTextColor="rgba(255,255,255,0.3)"
                                                value={publisherProfile.fullName}
                                                onChangeText={(value) => setPublisherProfile((prev) => ({ ...prev, fullName: value }))}
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Means of Identification</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="BVN/NIN/Passport Number"
                                                placeholderTextColor="rgba(255,255,255,0.3)"
                                                value={publisherProfile.idNumber}
                                                onChangeText={(value) => setPublisherProfile((prev) => ({ ...prev, idNumber: value }))}
                                            />
                                        </View>

                                        <View style={styles.rowInputs}>
                                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                                <Text style={styles.label}>Bank</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Select Bank"
                                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                                    value={publisherProfile.bank}
                                                    onChangeText={(value) => setPublisherProfile((prev) => ({ ...prev, bank: value }))}
                                                />
                                            </View>
                                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                                <Text style={styles.label}>Account Number</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Account Number"
                                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                                    keyboardType="number-pad"
                                                    value={publisherProfile.accountNumber}
                                                    onChangeText={(value) => setPublisherProfile((prev) => ({ ...prev, accountNumber: value }))}
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Amount</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Enter amount"
                                                placeholderTextColor="rgba(255,255,255,0.3)"
                                                keyboardType="number-pad"
                                                value={publisherProfile.payoutThreshold}
                                                onChangeText={(value) => setPublisherProfile((prev) => ({ ...prev, payoutThreshold: value }))}
                                            />
                                        </View>

                                        <TouchableOpacity
                                            style={styles.toggleRow}
                                            onPress={() => setPublisherProfile((prev) => ({
                                                ...prev,
                                                letFansSubscribe: !prev.letFansSubscribe,
                                            }))}
                                        >
                                            <Text style={styles.inlineLinkText}>Let Fans Subscribe</Text>
                                            <View style={[styles.checkbox, publisherProfile.letFansSubscribe && styles.checkboxActive]}>
                                                {publisherProfile.letFansSubscribe && <Check size={12} color="#FFF" />}
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* Main publish block */}
                                <View style={styles.sectionCard}>
                                    {/* File Upload Section */}
                                    <TouchableOpacity style={styles.fileUploadBox} onPress={handleSelectFile}>
                                        <View style={styles.fileIconContainer}>
                                            <Music size={24} color="#EC5C39" />
                                        </View>
                                        <View style={styles.fileInfo}>
                                            <Text style={styles.fileTitle} numberOfLines={1}>{audioFile ? audioFile.name : 'Select Audio File'}</Text>
                                            <Text style={styles.fileSub}>{audioFile && audioFile.size ? `${(audioFile.size / (1024 * 1024)).toFixed(2)} MB` : 'MP3, WAV or FLAC (Max 50MB)'}</Text>
                                        </View>
                                        <UploadIcon size={20} color={audioFile ? '#EC5C39' : 'rgba(255,255,255,0.4)'} />
                                    </TouchableOpacity>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Type of Track</Text>
                                        <TouchableOpacity
                                            style={styles.pickerTrigger}
                                            onPress={() => setShowAssetTypePicker(true)}
                                        >
                                            <Text style={[styles.pickerText, !assetType && { color: 'rgba(255,255,255,0.3)' }]}>
                                                {assetType || 'Single, Album, Playlist'}
                                            </Text>
                                            <ChevronDown size={18} color="rgba(255,255,255,0.6)" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Track Title</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter song or beat name"
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                            value={title}
                                            onChangeText={setTitle}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Select Track (Multiple Selection)</Text>
                                        <TouchableOpacity
                                            style={styles.pickerTrigger}
                                            onPress={() => setShowTrackPicker(true)}
                                        >
                                            <Text style={[styles.pickerText, selectedTrackIds.length === 0 && { color: 'rgba(255,255,255,0.3)' }]}>
                                                {selectedTrackIds.length > 0 ? `${selectedTrackIds.length} selected` : 'Select Tracks'}
                                            </Text>
                                            <ChevronDown size={18} color="rgba(255,255,255,0.6)" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Select Genre</Text>
                                        <TouchableOpacity
                                            style={styles.pickerTrigger}
                                            onPress={() => setShowGenrePicker(true)}
                                        >
                                            <Text style={[styles.pickerText, !genre && { color: 'rgba(255,255,255,0.3)' }]}>
                                                {genre || 'Select Genre'}
                                            </Text>
                                            <ChevronDown size={18} color="rgba(255,255,255,0.6)" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Select Track Price</Text>
                                        <View style={styles.pricePillsRow}>
                                            {PRICE_PRESETS.map((preset) => (
                                                <TouchableOpacity
                                                    key={preset}
                                                    style={styles.pricePill}
                                                    onPress={() => applyPricePreset(preset)}
                                                >
                                                    <Text style={styles.pricePillText}>{formatUsd(preset)}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Input Price"
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                            keyboardType="decimal-pad"
                                            value={price}
                                            onChangeText={setPrice}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>BPM</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="120"
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                            keyboardType="numeric"
                                            value={bpm}
                                            onChangeText={setBpm}
                                        />
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Description</Text>
                                        <TextInput
                                            style={[styles.input, styles.textArea]}
                                            placeholder="Write something about your track"
                                            placeholderTextColor="rgba(255,255,255,0.3)"
                                            multiline
                                            numberOfLines={4}
                                            value={description}
                                            onChangeText={setDescription}
                                        />
                                    </View>

                                    <View style={styles.toggleRow}>
                                        <TouchableOpacity onPress={() => setUseExistingCover(!useExistingCover)}>
                                            <Text style={styles.inlineLinkText}>Use existing track cover</Text>
                                        </TouchableOpacity>
                                        <View style={[styles.checkbox, useExistingCover && styles.checkboxActive]}>
                                            {useExistingCover && <Check size={12} color="#FFF" />}
                                        </View>
                                    </View>

                                    {!useExistingCover && (
                                        <TouchableOpacity style={styles.artworkUpload} onPress={handleSelectArtwork}>
                                            {artworkPreviewUri ? (
                                                <Image source={{ uri: artworkPreviewUri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                                            ) : (
                                                <LinearGradient
                                                    colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                                                    style={styles.artworkGradient}
                                                >
                                                    <ImageIcon size={32} color="rgba(255,255,255,0.4)" />
                                                    <Text style={styles.uploadArtText}>Select Track Cover</Text>
                                                    <Text style={styles.uploadArtSub}>Tap to upload image</Text>
                                                </LinearGradient>
                                            )}
                                        </TouchableOpacity>
                                    )}

                                    <View style={styles.toggleRow}>
                                        <Text style={styles.inlineLinkText}>Exclusive to subscribers</Text>
                                        <TouchableOpacity
                                            onPress={() => setSubscriberOnly(!subscriberOnly)}
                                            style={[styles.checkbox, subscriberOnly && styles.checkboxActive]}
                                        >
                                            {subscriberOnly && <Check size={12} color="#FFF" />}
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Folder</Text>
                                        <TouchableOpacity
                                            style={styles.pickerTrigger}
                                            onPress={() => setShowFolderPicker(true)}
                                        >
                                            <Text style={[styles.pickerText, !selectedFolderId && { color: 'rgba(255,255,255,0.3)' }]}>
                                                {selectedFolderId
                                                    ? (folders.find((f) => f.id === selectedFolderId)?.name || 'Selected Folder')
                                                    : 'Folders/File'}
                                            </Text>
                                            <ChevronDown size={18} color="rgba(255,255,255,0.6)" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.publishButton}
                                    onPress={handleUpload}
                                    disabled={uploading}
                                >
                                    <LinearGradient
                                        colors={['#EC5C39', '#863420']}
                                        style={styles.publishGradient}
                                    >
                                        {uploading ? (
                                            <ActivityIndicator color="#FFF" />
                                        ) : (
                                            <View style={styles.buttonContent}>
                                                <UploadIcon size={18} color="#FFF" style={{ marginRight: 8 }} />
                                                <Text style={styles.publishText}>Upload Track</Text>
                                            </View>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        )}

                        <View style={{ height: 100 }} />
                    </ScrollView>
                </View>

                {/* Genre Picker Modal */}
                {showGenrePicker && (
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowGenrePicker(false)}
                    >
                        <View style={styles.pickerContent}>
                            <View style={styles.pickerHeader}>
                                <Text style={styles.pickerTitle}>Select Genre</Text>
                                <TouchableOpacity onPress={() => setShowGenrePicker(false)}>
                                    <X size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                            {GENRES.map((g) => (
                                <TouchableOpacity
                                    key={g}
                                    style={styles.genreItem}
                                    onPress={() => {
                                        setGenre(g);
                                        setShowGenrePicker(false);
                                    }}
                                >
                                    <Text style={[styles.genreItemText, genre === g && { color: '#EC5C39' }]}>
                                        {g}
                                    </Text>
                                    {genre === g && (
                                        <Image
                                            source={require('@/assets/images/check-circle.png')}
                                            style={{ width: 18, height: 18 }}
                                            contentFit="contain"
                                        />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                )}

                {/* Asset Type Picker Modal */}
                {showAssetTypePicker && (
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowAssetTypePicker(false)}
                    >
                        <View style={styles.pickerContent}>
                            <View style={styles.pickerHeader}>
                                <Text style={styles.pickerTitle}>Select Asset Type</Text>
                                <TouchableOpacity onPress={() => setShowAssetTypePicker(false)}>
                                    <X size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                            {ASSET_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={styles.genreItem}
                                    onPress={() => {
                                        setAssetType(type as AssetType);
                                        setShowAssetTypePicker(false);
                                    }}
                                >
                                    <Text style={[styles.genreItemText, assetType === type && { color: '#EC5C39' }]}>
                                        {type}
                                    </Text>
                                    {assetType === type && (
                                        <Image
                                            source={require('@/assets/images/check-circle.png')}
                                            style={{ width: 18, height: 18 }}
                                            contentFit="contain"
                                        />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                )}

                {showFolderPicker && (
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowFolderPicker(false)}
                    >
                        <View style={styles.pickerContent}>
                            <View style={styles.pickerHeader}>
                                <Text style={styles.pickerTitle}>Select Folder</Text>
                                <TouchableOpacity onPress={() => setShowFolderPicker(false)}>
                                    <X size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                            {folders.length === 0 ? (
                                <Text style={styles.emptyPickerText}>No folders found. Create one first.</Text>
                            ) : (
                                folders.map((folder) => (
                                    <TouchableOpacity
                                        key={folder.id}
                                        style={styles.genreItem}
                                        onPress={() => {
                                            setSelectedFolderId(folder.id);
                                            setShowFolderPicker(false);
                                        }}
                                    >
                                        <Text style={[styles.genreItemText, selectedFolderId === folder.id && { color: '#EC5C39' }]}>
                                            {folder.name}
                                        </Text>
                                        {selectedFolderId === folder.id && (
                                            <Image
                                                source={require('@/assets/images/check-circle.png')}
                                                style={{ width: 18, height: 18 }}
                                                contentFit="contain"
                                            />
                                        )}
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </TouchableOpacity>
                )}

                {showTrackPicker && (
                    <Animated.View style={[styles.modalOverlay, { opacity: trackPickerFade }]} pointerEvents="box-none">
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={() => setShowTrackPicker(false)}
                        />
                        <Animated.View style={[styles.pickerContent, { transform: [{ translateY: trackPickerSlide }] }]}>
                            <View style={styles.pickerHeader}>
                                <Text style={styles.pickerTitle}>Select Tracks</Text>
                                <TouchableOpacity onPress={() => setShowTrackPicker(false)}>
                                    <X size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                            {existingTracks.length === 0 ? (
                                <Text style={styles.emptyPickerText}>No existing tracks found yet.</Text>
                            ) : (
                                existingTracks.map((track) => (
                                    <TouchableOpacity
                                        key={track.id}
                                        style={styles.genreItem}
                                        onPress={() => toggleTrackSelection(track.id)}
                                    >
                                        <Text
                                            style={[
                                                styles.genreItemText,
                                                selectedTrackIds.includes(track.id) && { color: '#EC5C39' },
                                            ]}
                                        >
                                            {track.title}
                                        </Text>
                                        {selectedTrackIds.includes(track.id) && (
                                            <Image
                                                source={require('@/assets/images/check-circle.png')}
                                                style={{ width: 18, height: 18 }}
                                                contentFit="contain"
                                            />
                                        )}
                                    </TouchableOpacity>
                                ))
                            )}
                        </Animated.View>
                    </Animated.View>
                )}
            </KeyboardAvoidingView>
        </SafeScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    guestTitle: {
        fontSize: 22,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
        textAlign: 'center',
    },
    guestSubtitle: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.65)',
        textAlign: 'center',
        lineHeight: 20,
    },
    guestActions: {
        width: '100%',
        gap: 12,
    },
    primaryButton: {
        backgroundColor: '#EC5C39',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#FFF',
        fontFamily: 'Poppins-Bold',
        fontSize: 16,
    },
    secondaryButton: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#FFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 15,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    flowBlock: {
        gap: 18,
        paddingTop: 12,
    },
    choiceCard: {
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: '#140F10',
        padding: 18,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    choiceTitle: {
        color: '#FFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 20,
    },
    choiceSub: {
        color: 'rgba(255,255,255,0.55)',
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        marginTop: 4,
    },
    choiceIcon: {
        width: 54,
        height: 54,
        borderRadius: 27,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionCard: {
        marginTop: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 16,
        gap: 14,
    },
    sectionTitle: {
        color: '#FFF',
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        marginBottom: 4,
    },
    helperTitle: {
        color: '#FFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 16,
    },
    inlineLink: {
        paddingVertical: 2,
    },
    inlineLinkText: {
        color: '#EC5C39',
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        textDecorationLine: 'underline',
    },
    artworkUpload: {
        width: '100%',
        aspectRatio: 1.2,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 8,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(255,255,255,0.1)',
    },
    artworkGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadArtText: {
        color: '#FFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 16,
        marginTop: 12,
    },
    uploadArtSub: {
        color: 'rgba(255,255,255,0.4)',
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        marginTop: 4,
    },
    fileUploadBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(236, 92, 57, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(236, 92, 57, 0.1)',
    },
    fileIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(236, 92, 57, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    fileInfo: {
        flex: 1,
        marginLeft: 15,
    },
    fileTitle: {
        color: '#FFF',
        fontFamily: 'Poppins-Bold',
        fontSize: 14,
    },
    fileSub: {
        color: 'rgba(255,255,255,0.4)',
        fontFamily: 'Poppins-Regular',
        fontSize: 11,
        marginTop: 2,
    },
    form: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
        marginLeft: 4,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#FFF',
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    rowInputs: {
        flexDirection: 'row',
        gap: 15,
    },
    pricePillsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    pricePill: {
        backgroundColor: '#D9D9D9',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    pricePillText: {
        color: '#000',
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
    },
    pickerTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    pickerText: {
        color: '#FFF',
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
    },
    priceInputWrapper: {
        position: 'relative',
        justifyContent: 'center',
    },
    currencyPrefix: {
        position: 'absolute',
        left: 16,
        color: 'rgba(255,255,255,0.4)',
        fontFamily: 'Poppins-Bold',
        fontSize: 14,
        zIndex: 1,
    },
    publishButton: {
        marginTop: 40,
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
    },
    publishGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#EC5C39',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: {
        backgroundColor: '#EC5C39',
    },
    publishText: {
        color: '#FFF',
        fontFamily: 'Poppins-Bold',
        fontSize: 16,
    },
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    pickerContent: {
        backgroundColor: '#1A1516',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: 40,
        maxHeight: '70%',
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    pickerTitle: {
        color: '#FFF',
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
    },
    genreItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    genreItemText: {
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 16,
    },
    emptyPickerText: {
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        paddingVertical: 8,
    },

    // ── Upload Success Splash ───────────────────────────────────────────────
    splashContainer: {
        flex: 1,
        backgroundColor: '#140F10',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 20,
    },
    splashRingOuter: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 2,
        borderColor: 'rgba(236,92,57,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    splashRingInner: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 2,
        borderColor: 'rgba(236,92,57,0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    splashCheckCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EC5C39',
        alignItems: 'center',
        justifyContent: 'center',
    },
    splashTitle: {
        color: '#FFF',
        fontFamily: 'Poppins-Bold',
        fontSize: 24,
        textAlign: 'center',
    },
    splashSub: {
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
    splashLinkBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(236,92,57,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(236,92,57,0.25)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        width: '100%',
    },
    splashLinkText: {
        color: '#EC5C39',
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
        flex: 1,
    },
    splashShareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#EC5C39',
        borderRadius: 16,
        paddingVertical: 16,
        width: '100%',
    },
    splashShareText: {
        color: '#140F10',
        fontFamily: 'Poppins-Bold',
        fontSize: 16,
    },
    splashPromoteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#EC5C39',
        backgroundColor: 'rgba(236,92,57,0.08)',
    },
    splashPromoteText: {
        color: '#EC5C39',
        fontFamily: 'Poppins-Bold',
        fontSize: 16,
    },
    splashDoneBtn: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    splashDoneText: {
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'Poppins-Bold',
        fontSize: 15,
    },
});
