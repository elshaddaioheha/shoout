import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useUserStore } from '@/store/useUserStore';
import { useRouter } from 'expo-router';
import {
    Bell,
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
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const router = useRouter();
    const { name, role, isPremium, reset } = useUserStore();

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleLogout = () => {
        reset();
        router.replace('/(auth)/login');
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
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity style={styles.iconButton}>
                        <Share2 size={22} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Profile Card */}
                <Animated.View style={[styles.profileCard, { opacity: fadeAnim }]}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <User size={40} color="#FFF" />
                        </View>
                        <TouchableOpacity style={styles.editBadge}>
                            <Settings size={14} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.userName}>{name}</Text>
                    <View style={[
                        styles.roleBadge,
                        isPremium && styles.rolePremium,
                        (role === 'studio' || role === 'hybrid') && styles.roleArtist
                    ]}>
                        {isPremium && <Crown size={12} color="#FFD700" style={{ marginRight: 4 }} />}
                        <Text style={[
                            styles.roleText,
                            isPremium && { color: '#FFD700' },
                            (role === 'studio' || role === 'hybrid') && { color: '#C084FC' }
                        ]}>
                            {role.replace('_', ' ').charAt(0).toUpperCase() + role.replace('_', ' ').slice(1)} Member
                        </Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>1.2k</Text>
                            <Text style={styles.statLabel}>Following</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>842</Text>
                            <Text style={styles.statLabel}>Followers</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>12</Text>
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
                        value={isPremium ? 'Premium active' : 'Switch to Premium'}
                        color="#FFD700"
                        onPress={() => router.push('/settings/subscriptions')}
                    />
                    <MenuItem
                        icon={CreditCard}
                        label="Payment Methods"
                        color="#3B82F6"
                        onPress={() => router.push('/settings/payment-methods')}
                    />
                    <MenuItem
                        icon={Music}
                        label="Artist Dashboard"
                        color="#9333EA"
                        onPress={() => {
                            if (role.startsWith('studio') || role.startsWith('hybrid')) {
                                router.push('/studio');
                            } else {
                                Alert.alert(
                                    "Upgrade Required",
                                    "You must be a Studio or Hybrid member to access the Artist Dashboard.",
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        { text: "Upgrade", onPress: () => router.push('/settings/subscriptions') }
                                    ]
                                );
                            }
                        }}
                    />
                </View>

                {/* Preferences Section */}
                <Text style={styles.sectionTitle}>Preferences</Text>
                <View style={styles.menuContainer}>
                    <MenuItem icon={Bell} label="Notifications" color="#EC5C39" />
                    <MenuItem icon={Download} label="Downloads" color="#10B981" />
                    <MenuItem icon={Shield} label="Privacy & Security" color="#64748B" />
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
