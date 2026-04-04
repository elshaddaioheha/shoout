import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUserStore } from '@/store/useUserStore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore';
import {
    Bell,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Crown,
    Download,
    LogOut,
    Music,
    Settings,
    Share2,
    Shield,
    Sparkles,
    User
} from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const router = useRouter();
    const { name, role, isPremium, reset } = useUserStore();
    const { actualRole } = useAuthStore();
        const [followingCount, setFollowingCount] = React.useState(0);
        const [followersCount, setFollowersCount] = React.useState(0);
        const [playlistCount, setPlaylistCount] = React.useState(0);

    const isStudioPaid = (actualRole?.startsWith('studio') || actualRole?.startsWith('hybrid')) ?? false;

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.96)).current;

    const getRoleGradient = () => {
        if (role === 'vault_pro') return ['rgba(236, 92, 57, 0.15)', 'rgba(0,0,0,0)'];
        if (role.startsWith('studio')) return ['rgba(76, 175, 80, 0.15)', 'rgba(0,0,0,0)'];
        if (role.startsWith('hybrid')) return ['rgba(255, 215, 0, 0.15)', 'rgba(0,0,0,0)'];
        return ['rgba(255,255,255,0.02)', 'rgba(0,0,0,0)'];
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
        Alert.alert('Edit Profile', "Profile editing coming soon. You'll be able to update your photo, bio, and display name.");
    };

    const performLogout = async () => {
        // 1. Stop Firestore notification listener first — prevents it from
        //    continuing to emit events for the signed-out user.
        useNotificationStore.getState().stopListening();

        // 2. Revoke Google Sign-In session so the next login always
        //    shows the account picker instead of silently reusing the
        //    previous session (critical on shared devices).
        try {
            const hadPreviousSignIn = GoogleSignin.hasPreviousSignIn();
            if (hadPreviousSignIn) {
                await GoogleSignin.revokeAccess();
                await GoogleSignin.signOut();
            }
        } catch (e) {
            // Non-fatal: Google session revocation failure should not block logout
            console.warn('Google sign-out error:', e);
        }

        // 3. Sign out of Firebase
        try {
            await auth.signOut();
        } catch (e) {
            console.warn('Firebase signOut error:', e);
        } finally {
            // 4. Clear all stores — prevents data leaking to the next user
            //    who signs in on the same device.
            reset();                                        // useUserStore
            useAuthStore.getState().reset();               // auth / subscription
            useCartStore.getState().clearCart();           // cart items (persisted)
            await usePlaybackStore.getState().clearTrack(); // stop audio + unload
            router.replace('/(auth)/login');
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log Out', style: 'destructive', onPress: performLogout },
            ]
        );
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
                        <ChevronLeft size={22} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                        <Share2 size={22} color="#FFF" />
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
                        <View style={styles.avatar}>
                            <User size={40} color="#FFF" />
                        </View>
                        <TouchableOpacity style={styles.editBadge} onPress={handleEditProfile}>
                            <Settings size={14} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.userName}>{name}</Text>
                    <View style={[
                        styles.roleBadge,
                        isPremium && styles.rolePremium,
                        (role.startsWith('studio') || role.startsWith('hybrid')) && styles.roleArtist
                    ]}>
                        {isPremium && <Crown size={12} color="#FFD700" style={{ marginRight: 4 }} />}
                        <Text style={[
                            styles.roleText,
                            isPremium && { color: '#FFD700' },
                            (role.startsWith('studio') || role.startsWith('hybrid')) && { color: '#C084FC' }
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
                </Animated.View>

                {/* Account Section */}
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.menuContainer}>
                    <MenuItem
                        icon={Crown}
                        label="Subscription"
                        value={role.replace('_', ' ').toUpperCase()}
                        color="#FFD700"
                        onPress={() => router.push('/settings/subscriptions' as any)}
                    />
                    <MenuItem
                        icon={CreditCard}
                        label="Payment Methods"
                        color="#3B82F6"
                        onPress={() => router.push('/settings/payment-methods' as any)}
                    />
                    <MenuItem
                        icon={Music}
                        label="Artist Dashboard"
                        color="#9333EA"
                        onPress={() => {
                            if (isStudioPaid) {
                                router.push('/studio/analytics' as any);
                            } else {
                                Alert.alert(
                                    "Upgrade Required",
                                    "Studio Pro unlocks the Artist Dashboard. Upgrade to access analytics and payouts.",
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        { text: "Upgrade", onPress: () => router.push('/settings/subscriptions' as any) }
                                    ]
                                );
                            }
                        }}
                    />
                </View>

                {/* Preferences Section */}
                <Text style={styles.sectionTitle}>Preferences</Text>
                <View style={styles.menuContainer}>
                    <MenuItem icon={Bell} label="Notifications" color="#EC5C39" onPress={() => router.push('/settings/notifications' as any)} />
                    <MenuItem icon={Download} label="Downloads" color="#10B981" />
                    <MenuItem icon={Shield} label="Privacy & Security" color="#64748B" onPress={() => router.push('/settings/privacy' as any)} />
                </View>

                {/* Support Section */}
                <Text style={styles.sectionTitle}>Support</Text>
                <View style={styles.menuContainer}>
                    <MenuItem icon={Sparkles} label="Help Center" color="#EC5C39" />
                    <MenuItem icon={LogOut} label="Log Out" color="#EF4444" onPress={handleLogout} hideChevron />
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeScreenWrapper>
    );
}

function MenuItem({ icon: Icon, label, value, color, onPress, hideChevron }: any) {
    return (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={[styles.menuIconContainer, { backgroundColor: `${color}15` }]}>
                <Icon size={20} color={color} />
            </View>
            <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>{label}</Text>
                {value && <Text style={styles.menuValue}>{value}</Text>}
            </View>
            {!hideChevron && <ChevronRight size={18} color="rgba(255,255,255,0.3)" />}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
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
    roleArtist: {
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
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
    menuContainer: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuTextContainer: {
        flex: 1,
        marginLeft: 16,
    },
    menuLabel: {
        fontSize: 15,
        fontFamily: 'Poppins-Medium',
        color: '#FFF',
    },
    menuValue: {
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.4)',
        marginTop: 1,
    },
});
