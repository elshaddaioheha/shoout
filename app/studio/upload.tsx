import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useAppTheme } from '@/hooks/use-app-theme';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyColor, adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { notifyError, notifyWarning } from '@/utils/notify';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
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
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
type UploadAction = 'saveDraft' | 'publish';

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
    const appTheme = useAppTheme();
    const styles = useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
    const placeholderColor = appTheme.colors.textPlaceholder;
    const iconPrimary = appTheme.colors.textPrimary;
    const iconMuted = appTheme.colors.textSecondary;

    const router = useRouter();
    const authRole = useAuthStore((state) => state.actualRole);
    const authTier = useAuthStore((state) => state.subscriptionTier);
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
    const [scheduleRelease, setScheduleRelease] = useState(false);
    const [scheduledReleaseInput, setScheduledReleaseInput] = useState('');

    const [uploading, setUploading] = useState(false);
    const [activeUploadAction, setActiveUploadAction] = useState<UploadAction | null>(null);
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
    const effectiveRole = String(authRole || authTier || 'shoout').toLowerCase();
    const canMonetize = effectiveRole.startsWith('studio') || effectiveRole.startsWith('hybrid');

    const parseScheduledRelease = () => {
        const raw = String(scheduledReleaseInput || '').trim();
        if (!raw) return null;
        const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
        const date = new Date(normalized);
        if (Number.isNaN(date.getTime())) return null;
        return {
            atMs: date.getTime(),
            atIsoUtc: date.toISOString(),
        };
    };

    const buildPublishSnapshot = (data: Record<string, any>) => ({
        title: String(data.title || ''),
        genre: String(data.genre || ''),
        assetType: String(data.assetType || data.trackType || ''),
        trackType: String(data.trackType || data.assetType || ''),
        bpm: Number(data.bpm || 0),
        price: Number(data.price || 0),
        description: String(data.description || ''),
        audioUrl: String(data.audioUrl || ''),
        coverUrl: String(data.coverUrl || data.artworkUrl || ''),
        isPublic: data.isPublic === true,
        subscriberOnly: data.subscriberOnly === true,
        userId: String(data.userId || auth.currentUser?.uid || ''),
        uploaderName: String(data.uploaderName || auth.currentUser?.displayName || 'Shoouter'),
        snapshotVersion: 1,
        capturedAtMs: Date.now(),
        capturedAtIso: new Date().toISOString(),
    });

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
            notifyError('Profile check error', error);
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
            notifyWarning('[upload] handleCreateFolder: no auth.currentUser');
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
            notifyError('Create folder error', error);
            showToast('Failed to create folder.', 'error');
        }
    };

    const savePublisherProfile = async () => {
        if (!auth.currentUser) {
            notifyWarning('[upload] savePublisherProfile: no auth.currentUser');
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
            notifyError('Save publisher profile error', error);
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
            notifyError('Document picker error', error);
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
            notifyError('Artwork picker error', error);
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

    const upsertFolderTrackReference = async (trackId: string, trackData: {
        title?: string;
        artist?: string;
        artworkUrl?: string;
        audioUrl?: string;
    }) => {
        if (!auth.currentUser || !selectedFolderId) return;
        await setDoc(doc(db, `users/${auth.currentUser.uid}/folders/${selectedFolderId}/tracks/${trackId}`), {
            uploadId: trackId,
            uploaderId: auth.currentUser.uid,
            title: trackData.title || 'Untitled',
            artist: trackData.artist || auth.currentUser.displayName || 'Unknown Artist',
            artworkUrl: trackData.artworkUrl || null,
            audioUrl: trackData.audioUrl || null,
            addedAt: serverTimestamp(),
            source: 'upload-flow-reference',
        }, { merge: true });
        await setDoc(doc(db, `users/${auth.currentUser.uid}/folders/${selectedFolderId}`), {
            updatedAt: serverTimestamp(),
        }, { merge: true });
    };

    const handleUpload = async (action: UploadAction) => {
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

        const isStorageSource = sourceChoice === 'storage';
        if (isStorageSource) {
            if (selectedTrackIds.length === 0) {
                showToast('Select at least one existing track from Vault storage.', 'error');
                return;
            }
        } else {
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
        }

        const scheduled = scheduleRelease && canMonetize ? parseScheduledRelease() : null;
        if (action === 'publish' && scheduleRelease && canMonetize) {
            if (!scheduled) {
                showToast('Enter a valid schedule date/time (YYYY-MM-DD HH:mm).', 'error');
                return;
            }
            if (scheduled.atMs <= Date.now()) {
                showToast('Scheduled release time must be in the future.', 'error');
                return;
            }
        }

        setUploading(true);
        setActiveUploadAction(action);
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
                    const storageValidation = await validateStorageLimitFn({ fileSizeBytes: audioFile.size, storageLedger: 'studio' });
                    const validationData = storageValidation.data as { allowed: boolean };
                    if (!validationData.allowed) {
                        showToast('Storage limit exceeded. Please upgrade your plan.', 'error');
                        setUploading(false);
                        return;
                    }
                } catch (cfError: any) {
                    // Non-fatal: if CF is unreachable, proceed with upload
                    notifyWarning('validateStorageLimit skipped', cfError?.message);
                }
            }

            if (isStorageSource) {
                const publishNow = action === 'publish' && !(scheduleRelease && canMonetize && !!scheduled);
                const lifecycleStatus =
                    action === 'publish'
                        ? (publishNow ? 'published' : 'upcoming')
                        : 'draft';
                const storageUpdatesBase = {
                    folderId: selectedFolderId || null,
                    sourceChoice: 'storage',
                    updatedAt: serverTimestamp(),
                    lifecycleStatus,
                    published: publishNow,
                    isPublic: action === 'publish',
                    publishedAt: publishNow ? serverTimestamp() : null,
                    scheduledReleaseAtMs: scheduled ? scheduled.atMs : null,
                    scheduledReleaseAtIso: scheduled ? scheduled.atIsoUtc : null,
                };

                for (const trackId of selectedTrackIds) {
                    const trackRef = doc(db, `users/${auth.currentUser.uid}/uploads/${trackId}`);
                    const trackSnap = await getDoc(trackRef);
                    const trackData = (trackSnap.data() || {}) as any;

                    const storageUpdates = {
                        ...storageUpdatesBase,
                        publishSnapshot: publishNow
                            ? buildPublishSnapshot({
                                ...trackData,
                                isPublic: true,
                                published: true,
                                lifecycleStatus: 'published',
                                userId: trackData.userId || auth.currentUser.uid,
                                uploaderName: trackData.uploaderName || auth.currentUser.displayName || 'Shoouter',
                            })
                            : null,
                    };

                    await updateDoc(trackRef, storageUpdates);

                    if (selectedFolderId) {
                        await upsertFolderTrackReference(trackId, {
                            title: String(trackData.title || 'Untitled'),
                            artist: String(trackData.artist || trackData.uploaderName || auth.currentUser.displayName || 'Unknown Artist'),
                            artworkUrl: String(trackData.coverUrl || trackData.artworkUrl || ''),
                            audioUrl: String(trackData.audioUrl || ''),
                        });
                    }
                }

                showToast(
                    action === 'publish'
                        ? (publishNow
                            ? `${selectedTrackIds.length} track${selectedTrackIds.length > 1 ? 's' : ''} published.`
                            : `${selectedTrackIds.length} track${selectedTrackIds.length > 1 ? 's' : ''} scheduled as Upcoming.`)
                        : `${selectedTrackIds.length} track${selectedTrackIds.length > 1 ? 's' : ''} saved as draft.`,
                    'success'
                );
                router.back();
                return;
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
                const uploadTask = await uploadBytesResumable(storageRef, blob, {
                    contentType: blob.type || 'audio/mpeg',
                    customMetadata: {
                        storageLedger: 'studio',
                    },
                });

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

            const normalizedPrice = canMonetize ? (parseFloat(price) || 0) : 0;
            const publishNow = action === 'publish' && !(scheduleRelease && canMonetize && !!scheduled);
            const lifecycleStatus = action === 'publish'
                ? (publishNow ? 'published' : 'upcoming')
                : 'draft';

            // 5. Save the metadata pointer natively into Firestore Collections
            const uploadDoc = await addDoc(collection(db, `users/${auth.currentUser.uid}/uploads`), {
                title,
                genre: genre || "Unknown",
                assetType: assetType || 'Single',
                trackType: assetType || 'Single',
                bpm: parseInt(bpm) || 0,
                price: normalizedPrice,
                description,
                audioUrl: downloadUrl,
                coverUrl,
                fileName,
                fileSizeBytes,
                storageLedger: 'studio',
                folderId: selectedFolderId || null,
                sourceChoice: sourceChoice || 'local',
                useExistingCover,
                selectedTrackIds,
                subscriberOnly: canMonetize ? subscriberOnly : false,
                listenCount: 0,
                salesCount: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                publishedAt: publishNow ? serverTimestamp() : null,
                published: publishNow,
                isPublic: action === 'publish',
                lifecycleStatus,
                scheduledReleaseAtMs: scheduled ? scheduled.atMs : null,
                scheduledReleaseAtIso: scheduled ? scheduled.atIsoUtc : null,
                publishSnapshot: publishNow
                    ? buildPublishSnapshot({
                        title,
                        genre,
                        assetType,
                        trackType: assetType,
                        bpm: parseInt(bpm) || 0,
                        price: normalizedPrice,
                        description,
                        audioUrl: downloadUrl,
                        coverUrl,
                        isPublic: true,
                        subscriberOnly: canMonetize ? subscriberOnly : false,
                        userId: auth.currentUser.uid,
                        uploaderName: auth.currentUser.displayName || 'Shoouter',
                    })
                    : null,
                userId: auth.currentUser.uid,
                uploaderName: auth.currentUser.displayName || "Shoouter",
            });

            if (selectedFolderId) {
                await upsertFolderTrackReference(uploadDoc.id, {
                    title,
                    artist: auth.currentUser.displayName || 'Unknown Artist',
                    artworkUrl: coverUrl,
                    audioUrl: downloadUrl,
                });
            }

            if (action === 'publish' && publishNow) {
                showToast("Track published successfully!", "success");
                setUploadedTrackId(uploadDoc.id);
                setUploadedTitle(title);
                setUploadSuccess(true);
            } else if (action === 'publish' && !publishNow) {
                showToast('Track scheduled as Upcoming.', 'success');
                router.back();
            } else {
                showToast("Draft saved to Vault.", "success");
                router.back();
            }
        } catch (error: any) {
            notifyError('Upload error', error);
            if (error.code === 'resource-exhausted') {
                showToast("Storage limit exceeded. Please upgrade your subscription plan.", "error");
            } else {
                showToast("Failed to upload: " + error.message, "error");
            }
        } finally {
            setUploading(false);
            setActiveUploadAction(null);
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
                                <Check size={36} color={adaptLegacyColor('#140F10', 'color', appTheme)} strokeWidth={3} />
                            </View>
                        </View>
                    </View>
                    <Text style={styles.splashTitle}>Track Published! 🎉</Text>
                    <Text style={styles.splashSub}>Your track "{uploadedTitle}" is now live in your Vault.</Text>
                    <View style={styles.splashLinkBox}>
                        <Link2 size={16} color={adaptLegacyColor('#EC5C39', 'color', appTheme)} />
                        <Text style={styles.splashLinkText} numberOfLines={1} selectable>{shareUrl}</Text>
                    </View>
                    <TouchableOpacity style={styles.splashShareBtn} onPress={handleShare}>
                        <Share2 size={18} color={adaptLegacyColor('#140F10', 'color', appTheme)} />
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
                        <Megaphone size={18} color={adaptLegacyColor('#EC5C39', 'color', appTheme)} />
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
                                        <FolderPlus size={26} color={iconPrimary} />
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
                                        <Music size={26} color={iconPrimary} />
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
                                        placeholderTextColor={placeholderColor}
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
                                                placeholderTextColor={placeholderColor}
                                                value={publisherProfile.stageName}
                                                onChangeText={(value) => setPublisherProfile((prev) => ({ ...prev, stageName: value }))}
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Record Label</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Select or input record label"
                                                placeholderTextColor={placeholderColor}
                                                value={publisherProfile.recordLabel}
                                                onChangeText={(value) => setPublisherProfile((prev) => ({ ...prev, recordLabel: value }))}
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Full Name</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="Enter full name"
                                                placeholderTextColor={placeholderColor}
                                                value={publisherProfile.fullName}
                                                onChangeText={(value) => setPublisherProfile((prev) => ({ ...prev, fullName: value }))}
                                            />
                                        </View>

                                        <View style={styles.inputGroup}>
                                            <Text style={styles.label}>Means of Identification</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="BVN/NIN/Passport Number"
                                                placeholderTextColor={placeholderColor}
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
                                                    placeholderTextColor={placeholderColor}
                                                    value={publisherProfile.bank}
                                                    onChangeText={(value) => setPublisherProfile((prev) => ({ ...prev, bank: value }))}
                                                />
                                            </View>
                                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                                <Text style={styles.label}>Account Number</Text>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Account Number"
                                                    placeholderTextColor={placeholderColor}
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
                                                placeholderTextColor={placeholderColor}
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
                                                {publisherProfile.letFansSubscribe && <Check size={12} color={iconPrimary} />}
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
                                        <UploadIcon size={20} color={audioFile ? '#EC5C39' : iconMuted} />
                                    </TouchableOpacity>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Type of Track</Text>
                                        <TouchableOpacity
                                            style={styles.pickerTrigger}
                                            onPress={() => setShowAssetTypePicker(true)}
                                        >
                                            <Text style={[styles.pickerText, !assetType && { color: placeholderColor }]}>
                                                {assetType || 'Single, Album, Playlist'}
                                            </Text>
                                            <ChevronDown size={18} color={iconMuted} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Track Title</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Enter song or beat name"
                                            placeholderTextColor={placeholderColor}
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
                                            <Text style={[styles.pickerText, selectedTrackIds.length === 0 && { color: placeholderColor }]}>
                                                {selectedTrackIds.length > 0 ? `${selectedTrackIds.length} selected` : 'Select Tracks'}
                                            </Text>
                                            <ChevronDown size={18} color={iconMuted} />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Select Genre</Text>
                                        <TouchableOpacity
                                            style={styles.pickerTrigger}
                                            onPress={() => setShowGenrePicker(true)}
                                        >
                                            <Text style={[styles.pickerText, !genre && { color: placeholderColor }]}>
                                                {genre || 'Select Genre'}
                                            </Text>
                                            <ChevronDown size={18} color={iconMuted} />
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
                                            placeholderTextColor={placeholderColor}
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
                                            placeholderTextColor={placeholderColor}
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
                                            placeholderTextColor={placeholderColor}
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
                                            {useExistingCover && <Check size={12} color={iconPrimary} />}
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
                                                    <ImageIcon size={32} color={iconMuted} />
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
                                            {subscriberOnly && <Check size={12} color={iconPrimary} />}
                                        </TouchableOpacity>
                                    </View>

                                    {canMonetize && (
                                        <View style={styles.scheduleCard}>
                                            <View style={styles.toggleRow}>
                                                <Text style={styles.inlineLinkText}>Schedule as Upcoming</Text>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        const next = !scheduleRelease;
                                                        setScheduleRelease(next);
                                                        if (!next) setScheduledReleaseInput('');
                                                    }}
                                                    style={[styles.checkbox, scheduleRelease && styles.checkboxActive]}
                                                >
                                                    {scheduleRelease && <Check size={12} color={iconPrimary} />}
                                                </TouchableOpacity>
                                            </View>

                                            {scheduleRelease && (
                                                <View style={styles.inputGroup}>
                                                    <Text style={styles.label}>Release Date & Time (Local)</Text>
                                                    <TextInput
                                                        style={styles.input}
                                                        placeholder="YYYY-MM-DD HH:mm"
                                                        placeholderTextColor={placeholderColor}
                                                        value={scheduledReleaseInput}
                                                        onChangeText={setScheduledReleaseInput}
                                                        autoCapitalize="none"
                                                    />
                                                    <Text style={styles.scheduleHint}>
                                                        Stored in UTC and shown as Upcoming until release.
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    <View style={styles.inputGroup}>
                                        <Text style={styles.label}>Folder</Text>
                                        <TouchableOpacity
                                            style={styles.pickerTrigger}
                                            onPress={() => setShowFolderPicker(true)}
                                        >
                                            <Text style={[styles.pickerText, !selectedFolderId && { color: placeholderColor }]}>
                                                {selectedFolderId
                                                    ? (folders.find((f) => f.id === selectedFolderId)?.name || 'Selected Folder')
                                                    : 'Folders/File'}
                                            </Text>
                                            <ChevronDown size={18} color={iconMuted} />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.publishActionsRow}>
                                    <TouchableOpacity
                                        style={styles.secondaryActionButton}
                                        onPress={() => handleUpload('saveDraft')}
                                        disabled={uploading}
                                    >
                                        {uploading && activeUploadAction === 'saveDraft' ? (
                                            <ActivityIndicator color={iconPrimary} />
                                        ) : (
                                            <Text style={styles.secondaryActionText}>Save Draft</Text>
                                        )}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.publishButton, { marginTop: 0 }]}
                                        onPress={() => handleUpload('publish')}
                                        disabled={uploading}
                                    >
                                        <LinearGradient
                                            colors={['#EC5C39', '#863420']}
                                            style={styles.publishGradient}
                                        >
                                            {uploading && activeUploadAction === 'publish' ? (
                                                <ActivityIndicator color={iconPrimary} />
                                            ) : (
                                                <View style={styles.buttonContent}>
                                                    <UploadIcon size={18} color={iconPrimary} style={{ marginRight: 8 }} />
                                                    <Text style={styles.publishText}>Publish Track</Text>
                                                </View>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
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
                                    <X size={24} color={iconPrimary} />
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
                                    <X size={24} color={iconPrimary} />
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
                                    <X size={24} color={iconPrimary} />
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
                    <Animated.View style={[styles.modalOverlay, { opacity: trackPickerFade }]}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFill}
                            activeOpacity={1}
                            onPress={() => setShowTrackPicker(false)}
                        />
                        <Animated.View style={[styles.pickerContent, { transform: [{ translateY: trackPickerSlide }] }]}>
                            <View style={styles.pickerHeader}>
                                <Text style={styles.pickerTitle}>Select Tracks</Text>
                                <TouchableOpacity onPress={() => setShowTrackPicker(false)}>
                                    <X size={24} color={iconPrimary} />
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

const legacyStyles = {
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
    scheduleCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 10,
    },
    scheduleHint: {
        color: 'rgba(255,255,255,0.52)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        marginTop: 4,
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
        flex: 1,
    },
    publishActionsRow: {
        marginTop: 40,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    secondaryActionButton: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryActionText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 15,
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
};
