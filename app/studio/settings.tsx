import React, { useState } from 'react';
import {
    Alert,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Image,
    Dimensions,
    Switch
} from 'react-native';
import {
    Camera,
    Image as ImageIcon,
    Globe,
    Twitter,
    Instagram,
    Youtube,
    Music2,
    Settings as SettingsIcon,
    ChevronRight,
    Save,
    ExternalLink,
    Lock,
    Bell,
    Shield
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useRouter } from 'expo-router';
import { useUserStore } from '@/store/useUserStore';
import { auth, db } from '@/firebaseConfig';
import { adaptLegacyColor, adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

function useStudioSettingsStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function ArtistSettingsScreen() {
    const appTheme = useAppTheme();
    const styles = useStudioSettingsStyles();
    const placeholderColor = appTheme.colors.textPlaceholder;
    const mutedIconColor = adaptLegacyColor('rgba(255,255,255,0.6)', 'color', appTheme);
    const weakIconColor = adaptLegacyColor('rgba(255,255,255,0.2)', 'color', appTheme);

    const router = useRouter();
    // Seed display name from the global store so it matches the rest of the app.
    const storeName = useUserStore((s) => s.name);
    const setNameInStore = useUserStore((s) => s.setName);
    const [name, setName] = useState(storeName || '');
    const [bio, setBio] = useState('');
    const [website, setWebsite] = useState('');
    const [instagram, setInstagram] = useState('');
    const [twitter, setTwitter] = useState('');
    const [youtube, setYoutube] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [notifications, setNotifications] = useState(true);
    const [saving, setSaving] = useState(false);

    const saveSettings = async () => {
        const uid = auth.currentUser?.uid;
        const nextName = name.trim();
        if (!uid) {
            Alert.alert('Sign in required', 'Please sign in again to update studio settings.');
            return;
        }
        if (!nextName) {
            Alert.alert('Display name required', 'Please enter a display name.');
            return;
        }

        try {
            setSaving(true);
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { displayName: nextName });
            }
            await setDoc(doc(db, 'users', uid), {
                fullName: nextName,
                displayName: nextName,
                bio,
                socialLinks: {
                    website,
                    instagram,
                    twitter,
                    youtube,
                },
                preferences: {
                    isPrivate,
                    notifications,
                },
                updatedAt: new Date().toISOString(),
            }, { merge: true });
            setNameInStore(nextName);
            Alert.alert('Saved', 'Studio settings updated successfully.');
        } catch (error) {
            console.error('Failed to save studio settings:', error);
            Alert.alert('Save failed', 'Could not save settings right now. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const suspendAccount = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        Alert.alert(
            'Suspend account',
            'Your studio profile will be hidden and payouts paused until you reactivate it. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Suspend',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await setDoc(doc(db, 'users', uid), {
                                accountStatus: 'suspended',
                                suspensionRequestedAt: new Date().toISOString(),
                            }, { merge: true });
                            Alert.alert('Account suspended', 'Your suspension request is active. You can contact support to reactivate.');
                        } catch (error) {
                            console.error('Suspend request failed:', error);
                            Alert.alert('Request failed', 'Could not suspend account right now.');
                        }
                    },
                },
            ]
        );
    };

    const requestDeletion = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        Alert.alert(
            'Delete account',
            'This requests permanent account deletion. This action is irreversible after review. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Request deletion',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await setDoc(doc(db, 'users', uid), {
                                deletionRequestedAt: new Date().toISOString(),
                                accountStatus: 'deletion_requested',
                            }, { merge: true });
                            Alert.alert('Deletion requested', 'Your request was submitted. Support will contact you if verification is required.');
                        } catch (error) {
                            console.error('Delete request failed:', error);
                            Alert.alert('Request failed', 'Could not submit deletion request right now.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <SettingsHeader
                    title="Studio Settings"
                    onBack={() => router.back()}
                    rightElement={(
                        <TouchableOpacity style={styles.saveButton} onPress={saveSettings} disabled={saving}>
                            <Save size={20} color={appTheme.colors.primary} />
                        </TouchableOpacity>
                    )}
                />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Banner and Profile Section */}
                    <View style={styles.imagesSection}>
                        <TouchableOpacity style={styles.bannerContainer} onPress={() => Alert.alert('Coming Soon')}>
                            <View style={styles.bannerPlaceholder}>
                                <ImageIcon size={32} color={weakIconColor} />
                                <View style={styles.camIcon}>
                                    <Camera size={16} color="#FFF" />
                                </View>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.profilePicContainer} onPress={() => Alert.alert('Coming Soon')}>
                            <View style={styles.profilePicPlaceholder}>
                                <Music2 size={32} color="#EC5C39" />
                                <View style={styles.camIconSmall}>
                                    <Camera size={14} color="#FFF" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Basic Info Form */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Profile Info</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Display Name</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your artist name"
                                placeholderTextColor={placeholderColor}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Bio</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={bio}
                                onChangeText={setBio}
                                multiline
                                numberOfLines={3}
                                placeholder="Tell your fans about yourself"
                                placeholderTextColor={placeholderColor}
                            />
                        </View>
                    </View>

                    {/* Social Links */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Social Links</Text>

                        <SocialInput icon={<Globe size={18} color={appTheme.colors.textPrimary} />} value={website} onChangeText={setWebsite} label="Website" styles={styles} appTheme={appTheme} />
                        <SocialInput icon={<Instagram size={18} color="#E4405F" />} value={instagram} onChangeText={setInstagram} label="Instagram" styles={styles} appTheme={appTheme} />
                        <SocialInput icon={<Twitter size={18} color="#1DA1F2" />} value={twitter} onChangeText={setTwitter} label="Twitter" styles={styles} appTheme={appTheme} />
                        <SocialInput icon={<Youtube size={18} color="#FF0000" />} value={youtube} onChangeText={setYoutube} label="YouTube" styles={styles} appTheme={appTheme} />
                    </View>

                    {/* Preferences */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Preferences</Text>

                        <View style={styles.preferenceRow}>
                            <View style={styles.preferenceInfo}>
                                <Lock size={20} color={mutedIconColor} />
                                <Text style={styles.preferenceLabel}>Private Profile</Text>
                            </View>
                            <Switch
                                value={isPrivate}
                                onValueChange={setIsPrivate}
                                trackColor={{ false: appTheme.isDark ? '#333' : '#C8BFBD', true: appTheme.colors.primary }}
                            />
                        </View>

                        <View style={styles.preferenceRow}>
                            <View style={styles.preferenceInfo}>
                                <Bell size={20} color={mutedIconColor} />
                                <Text style={styles.preferenceLabel}>Studio Notifications</Text>
                            </View>
                            <Switch
                                value={notifications}
                                onValueChange={setNotifications}
                                trackColor={{ false: appTheme.isDark ? '#333' : '#C8BFBD', true: appTheme.colors.primary }}
                            />
                        </View>
                    </View>

                    {/* Danger Zone */}
                    <View style={[styles.section, { marginBottom: 40 }]}>
                        <Text style={styles.sectionTitle}>Account Safety</Text>

                        <TouchableOpacity style={styles.warningButton} onPress={suspendAccount}>
                            <Shield size={18} color="#FF4D4D" style={{ marginRight: 10 }} />
                            <Text style={styles.warningText}>Suspend Account</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.dangerButton} onPress={requestDeletion}>
                            <Shield size={18} color="#FF4D4D" style={{ marginRight: 10 }} />
                            <Text style={styles.dangerText}>Request Account Deletion</Text>
                        </TouchableOpacity>

                        <Text style={styles.recommendedTitle}>Recommended in Studio Settings</Text>
                        <Text style={styles.recommendedText}>1. Payout account details and tax information.</Text>
                        <Text style={styles.recommendedText}>2. Verification status and identity checks.</Text>
                        <Text style={styles.recommendedText}>3. Release defaults (genre, pricing, licensing).</Text>
                        <Text style={styles.recommendedText}>4. Team access and permissions for collaborators.</Text>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
        </SafeScreenWrapper>
    );
}

function SocialInput({ icon, value, label, onChangeText, styles, appTheme }: { icon: React.ReactNode; value: string; label: string; onChangeText?: (text: string) => void; styles: any; appTheme: any }) {
    const socialPlaceholder = adaptLegacyColor('rgba(255,255,255,0.2)', 'color', appTheme);
    const externalIconColor = adaptLegacyColor('rgba(255,255,255,0.3)', 'color', appTheme);

    return (
        <View style={styles.socialInputContainer}>
            <View style={styles.socialIcon}>
                {icon}
            </View>
            <View style={styles.socialInfo}>
                <Text style={styles.socialLabel}>{label}</Text>
                <TextInput
                    style={styles.socialTextInput}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={`Enter ${label} link`}
                    placeholderTextColor={socialPlaceholder}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>
            <ExternalLink size={16} color={externalIconColor} />
        </View>
    );
}

const legacyStyles = {
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    saveButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(236, 92, 57, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    imagesSection: {
        height: 200,
        marginBottom: 60,
    },
    bannerContainer: {
        width: '100%',
        height: 150,
        borderRadius: 20,
        overflow: 'hidden',
    },
    bannerPlaceholder: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    camIcon: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    profilePicContainer: {
        position: 'absolute',
        bottom: 0,
        left: 20,
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#140F10',
        overflow: 'hidden',
    },
    profilePicPlaceholder: {
        flex: 1,
        backgroundColor: 'rgba(236, 92, 57, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    camIconSmall: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(236, 92, 57, 0.8)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        fontFamily: 'Poppins-Medium',
        marginBottom: 8,
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
    socialInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    socialIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    socialInfo: {
        flex: 1,
        marginLeft: 15,
    },
    socialLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontFamily: 'Poppins-Bold',
        textTransform: 'uppercase',
    },
    socialTextInput: {
        color: '#FFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
        padding: 0,
        marginTop: -2,
    },
    preferenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    preferenceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    preferenceLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 15,
        fontFamily: 'Poppins-Medium',
    },
    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 77, 77, 0.05)',
        marginTop: 10,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 77, 77, 0.1)',
    },
    warningButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 165, 0, 0.08)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 165, 0, 0.24)',
    },
    warningText: {
        color: '#FFB84D',
        fontSize: 15,
        fontFamily: 'Poppins-Bold',
    },
    dangerText: {
        color: '#FF4D4D',
        fontSize: 15,
        fontFamily: 'Poppins-Bold',
    },
    recommendedTitle: {
        marginTop: 16,
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontFamily: 'Poppins-SemiBold',
    },
    recommendedText: {
        marginTop: 6,
        color: 'rgba(255,255,255,0.58)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
    },
};
