import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useToastStore } from '@/store/useToastStore';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
    ChevronDown,
    ChevronLeft,
    Image as ImageIcon,
    Music,
    Upload as UploadIcon,
    X
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db, storage } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

const GENRES = ['Afrobeat', 'Amapiano', 'Trap', 'Drill', 'R&B', 'Dancehall'];
const ASSET_TYPES = ['Beat', 'Sample', 'Loop', 'Drum Kit', 'Vocal Pack', 'Preset', 'Other'];

type AssetType = typeof ASSET_TYPES[number];

export default function UploadScreen() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [genre, setGenre] = useState('');
    const [assetType, setAssetType] = useState<AssetType | ''>('');
    const [bpm, setBpm] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [uploading, setUploading] = useState(false);
    const [showGenrePicker, setShowGenrePicker] = useState(false);
    const [showAssetTypePicker, setShowAssetTypePicker] = useState(false);

    const [audioFile, setAudioFile] = useState<any>(null);
    const { showToast } = useToastStore();

    const handleBack = () => {
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
            }
        } catch (error) {
            console.error('Document picker error:', error);
            showToast('Failed to pick file.', 'error');
        }
    };

    const handleUpload = async () => {
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
        if (!auth.currentUser) {
            showToast("Authentication error - Please log in again", "error");
            return;
        }

        setUploading(true);
        try {
            // 🔒 SECURITY: Validate storage limit before uploading
            const validateStorageLimit = httpsCallable(getFunctions(), 'validateStorageLimit');
            const storageValidation = await validateStorageLimit({
                fileSizeBytes: audioFile.size,
            });

            const validationData = storageValidation.data as { allowed: boolean };
            if (!validationData.allowed) {
                showToast("Storage limit exceeded. Please upgrade your plan.", "error");
                setUploading(false);
                return;
            }

            // 1. Convert local URI into a blob that Firebase Cloud Storage can digest
            const response = await fetch(audioFile.uri);
            const blob = await response.blob();

            // 2. Reference in Cloud Storage bucket (/vaults/userId/trackName_timestamp.mp3)
            const safeFileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
            const storageRef = ref(storage, `vaults/${auth.currentUser.uid}/${safeFileName}`);

            // 3. Upload bytes to bucket
            const uploadTask = await uploadBytesResumable(storageRef, blob);

            // 4. Get the permanent streamable URL
            const downloadUrl = await getDownloadURL(uploadTask.ref);

            // 5. Save the metadata pointer natively into Firestore Collections
            // 🔒 SECURITY: Firestore rules will block pricing if user lacks canSell permission
            await addDoc(collection(db, `users/${auth.currentUser.uid}/uploads`), {
                title,
                genre: genre || "Unknown",
                assetType,
                bpm: parseInt(bpm) || 0,
                price: parseFloat(price) || 0,
                description,
                audioUrl: downloadUrl,
                fileName: audioFile.name,
                fileSizeBytes: audioFile.size,
                listenCount: 0,
                createdAt: serverTimestamp(),
                isPublic: true,
                userId: auth.currentUser.uid,
                uploaderName: auth.currentUser.displayName || "Shoouter",
            });

            showToast("Track uploaded to your Vault successfully!", "success");
            router.back();
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

    return (
        <SafeScreenWrapper>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                            <ChevronLeft size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Upload Music</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* Artwork Upload */}
                        <TouchableOpacity style={styles.artworkUpload}>
                            <LinearGradient
                                colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                                style={styles.artworkGradient}
                            >
                                <ImageIcon size={32} color="rgba(255,255,255,0.4)" />
                                <Text style={styles.uploadArtText}>Tap to add Cover Art</Text>
                                <Text style={styles.uploadArtSub}>1:1 Ratio recommended</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* File Upload Section */}
                        <TouchableOpacity style={styles.fileUploadBox} onPress={handleSelectFile}>
                            <View style={styles.fileIconContainer}>
                                <Music size={24} color="#EC5C39" />
                            </View>
                            <View style={styles.fileInfo}>
                                <Text style={styles.fileTitle} numberOfLines={1}>{audioFile ? audioFile.name : 'Select Audio File'}</Text>
                                <Text style={styles.fileSub}>{audioFile && audioFile.size ? `${(audioFile.size / (1024 * 1024)).toFixed(2)} MB` : 'MP3, WAV or FLAC (Max 50MB)'}</Text>
                            </View>
                            <UploadIcon size={20} color={audioFile ? "#EC5C39" : "rgba(255,255,255,0.4)"} />
                        </TouchableOpacity>

                        {/* Form Fields */}
                        <View style={styles.form}>
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

                            <View style={styles.rowInputs}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.label}>Genre</Text>
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
                                <View style={[styles.inputGroup, { width: 100 }]}>
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
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Asset Type</Text>
                                <TouchableOpacity
                                    style={styles.pickerTrigger}
                                    onPress={() => setShowAssetTypePicker(true)}
                                >
                                    <Text style={[styles.pickerText, !assetType && { color: 'rgba(255,255,255,0.3)' }]}>
                                        {assetType || 'Select Asset Type'}
                                    </Text>
                                    <ChevronDown size={18} color="rgba(255,255,255,0.6)" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Price (optional)</Text>
                                <View style={styles.priceInputWrapper}>
                                    <Text style={styles.currencyPrefix}>$</Text>
                                    <TextInput
                                        style={[styles.input, { paddingLeft: 30 }]}
                                        placeholder="29.99"
                                        placeholderTextColor="rgba(255,255,255,0.3)"
                                        keyboardType="decimal-pad"
                                        value={price}
                                        onChangeText={setPrice}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Description</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Write something about your track..."
                                    placeholderTextColor="rgba(255,255,255,0.3)"
                                    multiline
                                    numberOfLines={4}
                                    value={description}
                                    onChangeText={setDescription}
                                />
                            </View>
                        </View>

                        {/* Upload Button */}
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
                                        <Image
                                            source={require('@/assets/images/check-circle.png')}
                                            style={{ width: 20, height: 20, marginRight: 8 }}
                                            contentFit="contain"
                                        />
                                        <Text style={styles.publishText}>Publish Track</Text>
                                    </View>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

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
            </KeyboardAvoidingView>
        </SafeScreenWrapper>
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
    scrollContent: {
        paddingBottom: 40,
    },
    artworkUpload: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 25,
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
    }
});
