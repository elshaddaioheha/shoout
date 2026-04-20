import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUserStore } from '@/store/useUserStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { getModeTheme } from '@/utils/appModeTheme';
import { updateProfile } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { Icon } from '@/components/ui/Icon';
import React, { useEffect, useRef } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

function useProfileStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function ProfileScreen() {
    const appTheme = useAppTheme();
    const styles = useProfileStyles();
    const placeholderColor = appTheme.colors.textPlaceholder;

    const router = useRouter();
    const { name, role, isPremium, reset, setName, activeAppMode } = useUserStore();
    const { actualRole } = useAuthStore();
    const [followingCount, setFollowingCount] = React.useState(0);
    const [followersCount, setFollowersCount] = React.useState(0);
    const [playlistCount, setPlaylistCount] = React.useState(0);
    const [profileBio, setProfileBio] = React.useState('');
    const [editModalVisible, setEditModalVisible] = React.useState(false);
    const [editName, setEditName] = React.useState(name);
    const [editBio, setEditBio] = React.useState('');
    const [isSavingProfile, setIsSavingProfile] = React.useState(false);

    const isStudioPaid = (actualRole?.startsWith('studio') || actualRole?.startsWith('hybrid')) ?? false;
    const modeTheme = getModeTheme(activeAppMode);
    const accentColor = modeTheme.accent;
    const accentTint = modeTheme.accentTint;
    const accentSoft = modeTheme.accentSoft;

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.96)).current;

    const getRoleGradient = () => {
        if (activeAppMode === 'vault' || activeAppMode === 'vault_pro') return ['rgba(236, 92, 57, 0.15)', 'rgba(0,0,0,0)'];
        if (activeAppMode === 'studio') return ['rgba(76, 175, 80, 0.15)', 'rgba(0,0,0,0)'];
        if (activeAppMode === 'hybrid') return ['rgba(255, 215, 0, 0.15)', 'rgba(0,0,0,0)'];
        if (activeAppMode === 'shoout') return [`${colors.shooutPrimary}26`, 'rgba(0,0,0,0)'];
        return [appTheme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(23,18,19,0.04)', 'rgba(0,0,0,0)'];
    };

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 220,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 240,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    useEffect(() => {
        const loadProfileStats = async () => {
            if (!auth.currentUser) return;

            const uid = auth.currentUser.uid;

            try {
                const unsubUser = onSnapshot(doc(db, 'users', uid), (userSnap) => {
                    const userData = userSnap.data() || {};

                    const nextFollowers = Array.isArray(userData.followers)
                        ? userData.followers.length
                        : Number(userData.followers) || 0;
                    const nextFollowing = Array.isArray(userData.following)
                        ? userData.following.length
                        : Number(userData.following) || 0;

                    setFollowersCount(nextFollowers);
                    setFollowingCount(nextFollowing);
                    setProfileBio(String(userData.bio || userData.profileBio || ''));
                    setEditBio(String(userData.bio || userData.profileBio || ''));
                    setEditName(String(userData.fullName || userData.displayName || auth.currentUser?.displayName || name));

                    if (playlistCount === 0) {
                        setPlaylistCount(Number(userData.playlists) || 0);
                    }
                });

                const playlistsSnap = await getDocs(collection(db, 'users', uid, 'playlists'));
                if (!playlistsSnap.empty) {
                    setPlaylistCount(playlistsSnap.size);
                    return unsubUser;
                }

                const uploadsSnap = await getDocs(collection(db, 'users', uid, 'uploads'));
                if (!uploadsSnap.empty) {
                    setPlaylistCount(uploadsSnap.size);
                    return unsubUser;
                }

                return unsubUser;
            } catch (error) {
                console.error('Failed to load profile stats', error);
            }
        };

        let unsub: undefined | (() => void);
        loadProfileStats().then((cleanup) => {
            unsub = cleanup;
        });

        return () => {
            if (typeof unsub === 'function') {
                unsub();
            }
        };
    }, []);

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out ${name}'s profile on Shoouts! 🎵`,
                title: `${name} on Shoouts`,
            });
        } catch (e) { }
    };

    const handleEditProfile = () => {
        setEditName(name || auth.currentUser?.displayName || '');
        setEditBio(profileBio || '');
        setEditModalVisible(true);
    };

    const handleSaveProfile = async () => {
        const uid = auth.currentUser?.uid;
        const nextName = editName.trim();
        const nextBio = editBio.trim();

        if (!uid) {
            Alert.alert('Sign in required', 'Please sign in to update your profile.');
            return;
        }
        if (!nextName) {
            Alert.alert('Name required', 'Display name cannot be empty.');
            return;
        }

        try {
            setIsSavingProfile(true);
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, { displayName: nextName });
            }

            await setDoc(doc(db, 'users', uid), {
                fullName: nextName,
                displayName: nextName,
                bio: nextBio,
                profileBio: nextBio,
                updatedAt: new Date().toISOString(),
            }, { merge: true });

            setName(nextName);
            setProfileBio(nextBio);
            setEditModalVisible(false);
            Alert.alert('Profile updated', 'Your profile changes were saved successfully.');
        } catch (error) {
            console.error('Failed to save profile', error);
            Alert.alert('Update failed', 'Could not save your profile right now. Please try again.');
        } finally {
            setIsSavingProfile(false);
        }
    };


    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
            return;
        }
        router.replace('/(tabs)/more');
    };

    return (
        <SafeScreenWrapper>
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
                        <Icon name="chevron-left" size={22} color={appTheme.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                        <Icon name="share" size={22} color={appTheme.colors.textPrimary} />
                    </TouchableOpacity>
                </View>

                {/* Profile Card */}
                <Animated.View style={[styles.profileCard, { opacity: fadeAnim, transform: [{ scale: scaleAnim }], overflow: 'hidden' }]}>
                    <LinearGradient
                        colors={getRoleGradient() as unknown as readonly [string, string, ...string[]]}
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                    />
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatar, { backgroundColor: accentSoft, borderColor: accentColor }]}>
                            <Icon name="user" size={40} color={appTheme.colors.textPrimary} />
                        </View>
                    </View>

                    <Text style={styles.userName}>{name}</Text>
                    {!!profileBio && <Text style={styles.profileBio}>{profileBio}</Text>}
                    <View style={[
                        styles.roleBadge,
                        isPremium && styles.rolePremium,
                        ((role.startsWith('studio') || role.startsWith('hybrid') || role === 'shoout') || isPremium) && {
                            backgroundColor: accentSoft,
                            borderWidth: 1,
                            borderColor: accentTint,
                        }
                    ]}>
                        {isPremium && <Icon name="crown" size={12} color={accentColor} style={{ marginRight: 4 }} />}
                        <Text style={[
                            styles.roleText,
                            ((role.startsWith('studio') || role.startsWith('hybrid') || role === 'shoout') || isPremium) && { color: accentColor },
                        ]}>
                            {role.replace('_', ' ').charAt(0).toUpperCase() + role.replace('_', ' ').slice(1)} Member
                        </Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{followingCount}</Text>
                            <Text style={styles.statLabel}>Following</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{followersCount}</Text>
                            <Text style={styles.statLabel}>Followers</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{playlistCount}</Text>
                            <Text style={styles.statLabel}>Playlists</Text>
                        </View>
                    </View>

                    <View style={styles.actionButtonsRow}>
                        <TouchableOpacity style={[styles.primaryActionButton, { backgroundColor: accentColor }]} onPress={handleEditProfile} activeOpacity={0.85}>
                            <Icon name="edit-2" size={16} color="#FFF" />
                            <Text style={styles.actionButtonText}>Edit Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.secondaryActionButton} onPress={handleShare} activeOpacity={0.85}>
                            <Icon name="share" size={16} color="#FFF" />
                            <Text style={styles.actionButtonText}>Share</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Your Content Section */}
                <View style={styles.contentSection}>
                    <Text style={styles.sectionTitle}>Your Content</Text>
                    <View style={styles.emptyContentCard}>
                        <View style={[styles.emptyContentIconWrap, { backgroundColor: `${accentColor}1A` }]}>
                            <Icon name="music" size={32} color={accentColor} />
                        </View>
                        <Text style={styles.emptyContentTitle}>No public tracks</Text>
                        <Text style={styles.emptyContentSub}>Your published tracks and public playlists will appear here.</Text>
                        <TouchableOpacity style={[styles.ghostUploadButton, { borderColor: `${accentColor}40` }]} onPress={() => router.push('/vault/upload' as any)}>
                            <Text style={[styles.ghostUploadText, { color: accentColor }]}>Upload new track</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Edit Profile</Text>

                        <Text style={styles.inputLabel}>Display name</Text>
                        <TextInput
                            value={editName}
                            onChangeText={setEditName}
                            style={styles.textInput}
                            placeholder="Your display name"
                            placeholderTextColor={placeholderColor}
                            editable={!isSavingProfile}
                            maxLength={40}
                        />

                        <Text style={styles.inputLabel}>Bio</Text>
                        <TextInput
                            value={editBio}
                            onChangeText={setEditBio}
                            style={[styles.textInput, styles.bioInput]}
                            placeholder="Tell people about your music"
                            placeholderTextColor={placeholderColor}
                            editable={!isSavingProfile}
                            multiline
                            maxLength={180}
                        />

                        <View style={styles.modalActionsRow}>
                            <TouchableOpacity style={styles.modalGhostButton} onPress={() => setEditModalVisible(false)} disabled={isSavingProfile}>
                                <Text style={styles.modalGhostLabel}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalSaveButton, { backgroundColor: accentColor }, isSavingProfile && styles.modalSaveButtonDisabled]} onPress={handleSaveProfile} disabled={isSavingProfile}>
                                <Text style={styles.modalSaveLabel}>{isSavingProfile ? 'Saving...' : 'Save'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeScreenWrapper>
    );
}


const legacyStyles = {
    container: {
        flex: 1,
        backgroundColor: '#140F10',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileCard: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 32,
        padding: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 40,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 20,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(236, 92, 57, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#EC5C39',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EC5C39',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#140F10',
    },
    userName: {
        fontSize: 22,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
    },
    profileBio: {
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.65)',
        textAlign: 'center',
        marginTop: 8,
        paddingHorizontal: 8,
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 8,
    },
    rolePremium: {
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
    },
    roleText: {
        fontSize: 12,
        fontFamily: 'Poppins-SemiBold',
        color: 'rgba(255,255,255,0.6)',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 32,
        width: '100%',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
        marginBottom: 16,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginTop: 32,
        width: '100%',
    },
    primaryActionButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    secondaryActionButton: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.06)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    actionButtonText: {
        color: '#FFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
    },
    contentSection: {
        marginTop: 0,
        marginBottom: 32,
    },
    emptyContentCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 24,
        paddingHorizontal: 24,
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    emptyContentIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyContentTitle: {
        color: '#FFF',
        fontFamily: 'Poppins-Bold',
        fontSize: 18,
        marginBottom: 8,
    },
    emptyContentSub: {
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 16,
        marginBottom: 20,
        lineHeight: 20,
    },
    ghostUploadButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    ghostUploadText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.62)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: '#1D1818',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 22,
        paddingBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.09)',
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 12,
        fontFamily: 'Poppins-SemiBold',
        color: 'rgba(255,255,255,0.62)',
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.05)',
        color: '#FFF',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        marginBottom: 14,
    },
    bioInput: {
        minHeight: 92,
        textAlignVertical: 'top',
    },
    modalActionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        marginTop: 8,
    },
    modalGhostButton: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.16)',
        backgroundColor: 'rgba(255,255,255,0.04)',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
    },
    modalGhostLabel: {
        color: 'rgba(255,255,255,0.85)',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },
    modalSaveButton: {
        backgroundColor: '#EC5C39',
        paddingHorizontal: 22,
        paddingVertical: 10,
        borderRadius: 12,
    },
    modalSaveButtonDisabled: {
        opacity: 0.55,
    },
    modalSaveLabel: {
        color: '#FFF',
        fontFamily: 'Poppins-Bold',
        fontSize: 13,
    },
};
