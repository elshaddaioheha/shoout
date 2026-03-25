import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SharedHeader from '@/components/SharedHeader';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUserStore } from '@/store/useUserStore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { Bell, ChevronRight, CreditCard, Crown, DollarSign, Library, LogOut, Shield, ShoppingCart, Sparkles, TrendingUp, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../../firebaseConfig';

export default function MoreScreen() {
    const router = useRouter();
    const { role, reset } = useUserStore();
    const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
    const [isLoggedIn, setIsLoggedIn] = useState(!!auth.currentUser);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => setIsLoggedIn(!!user));
        return unsub;
    }, []);

    const isStudioOrHybrid = role?.startsWith('studio') || role?.startsWith('hybrid');

    const performLogout = async () => {
        useNotificationStore.getState().stopListening();

        try {
            const hadPreviousSignIn = GoogleSignin.hasPreviousSignIn();
            if (hadPreviousSignIn) {
                await GoogleSignin.revokeAccess();
                await GoogleSignin.signOut();
            }
        } catch (e) {
            console.warn('Google sign-out error:', e);
        }

        try {
            await auth.signOut();
        } catch (e) {
            console.warn('signOut error:', e);
        } finally {
            reset();
            useAuthStore.getState().reset();
            useCartStore.getState().clearCart();
            await usePlaybackStore.getState().clearTrack();
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

    if (!isLoggedIn) {
        return (
            <SafeScreenWrapper>
                <View style={styles.container}>
                    <SharedHeader viewMode={viewMode} isModeSheetOpen={isModeSheetOpen} onModePillPress={openSheet} />
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                        <View style={styles.guestCard}>
                            <Text style={styles.guestTitle}>Welcome to Shoouts</Text>
                            <Text style={styles.guestSubtitle}>Sign up or log in to manage your library, cart, and profile.</Text>
                            <View style={styles.guestActions}>
                                <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(auth)/signup' as any)}>
                                    <Text style={styles.primaryButtonText}>Create account</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(auth)/login' as any)}>
                                    <Text style={styles.secondaryButtonText}>Log in</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={{ height: 120 }} />
                    </ScrollView>
                </View>
            </SafeScreenWrapper>
        );
    }

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <SharedHeader viewMode={viewMode} isModeSheetOpen={isModeSheetOpen} onModePillPress={openSheet} />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    {/* Role Specific Section */}
                    {isStudioOrHybrid && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Business</Text>
                            <View style={styles.menuContainer}>
                                <MenuItem icon={DollarSign} label="Earnings" color="#10B981" />
                                <MenuItem icon={TrendingUp} label="Analytics" color="#3B82F6" />
                            </View>
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Profile & Updates</Text>
                        <View style={styles.menuContainer}>
                            <MenuItem icon={User} label="Profile" color="#EC5C39" onPress={() => router.push('/(tabs)/profile' as any)} />
                            <MenuItem icon={Bell} label="Notifications" color="#3B82F6" onPress={() => router.push('/notifications' as any)} />
                            <MenuItem icon={Sparkles} label="Updates" color="#C084FC" onPress={() => router.push('/updates' as any)} />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Library</Text>
                        <View style={styles.menuContainer}>
                            <MenuItem icon={ShoppingCart} label="Cart" color="#EC5C39" onPress={() => router.push('/cart' as any)} />
                            <MenuItem icon={Library} label="My Storage" color="#3B82F6" onPress={() => router.push('/(tabs)/library' as any)} />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Account</Text>
                        <View style={styles.menuContainer}>
                            <MenuItem icon={Crown} label="Subscription" value={role.replace('_', ' ').toUpperCase()} color="#FFD700" onPress={() => router.push('/settings/subscriptions' as any)} />
                            <MenuItem icon={CreditCard} label="Payment Methods" color="#EC5C39" onPress={() => router.push('/settings/payment-methods' as any)} />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Settings</Text>
                        <View style={styles.menuContainer}>
                            <MenuItem icon={Shield} label="Privacy & Security" color="#64748B" onPress={() => router.push('/settings/privacy' as any)} />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.menuContainer}>
                            <MenuItem icon={LogOut} label="Log Out" color="#EF4444" onPress={handleLogout} hideChevron />
                        </View>
                    </View>

                    {!isStudioOrHybrid && (
                        <TouchableOpacity style={styles.upgradeCard} onPress={() => router.push('/settings/subscriptions' as any)}>
                            <LinearGradient
                                colors={['#EC5C39', '#863420']}
                                style={styles.upgradeGradient}
                            >
                                <Sparkles size={24} color="#FFF" />
                                <View style={styles.upgradeTextContainer}>
                                    <Text style={styles.upgradeTitle}>Upgrade Your Plan</Text>
                                    <Text style={styles.upgradeSubtitle}>Unlock uploads & marketplace access</Text>
                                </View>
                                <ChevronRight size={20} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>


            </View>
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
    container: { flex: 1, backgroundColor: '#140F10' },
    content: { padding: 24, paddingTop: 12 },
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 13, fontFamily: 'Poppins-Bold', color: 'rgba(255,255,255,0.3)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
    menuContainer: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    menuIconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    menuTextContainer: { flex: 1, marginLeft: 16 },
    menuLabel: { fontSize: 15, fontFamily: 'Poppins-Medium', color: '#FFF' },
    menuValue: { fontSize: 12, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.4)', marginTop: 1 },
    upgradeCard: { borderRadius: 24, overflow: 'hidden', marginTop: 8 },
    upgradeGradient: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
    upgradeTextContainer: { flex: 1 },
    upgradeTitle: { color: '#FFF', fontSize: 18, fontFamily: 'Poppins-Bold' },
    upgradeSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'Poppins-Regular' },
    guestCard: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        gap: 12,
    },
    guestTitle: { color: '#FFF', fontSize: 20, fontFamily: 'Poppins-Bold' },
    guestSubtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontFamily: 'Poppins-Regular' },
    guestActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    primaryButton: { flex: 1, backgroundColor: '#EC5C39', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    primaryButtonText: { color: '#FFF', fontFamily: 'Poppins-SemiBold', fontSize: 14 },
    secondaryButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    secondaryButtonText: { color: '#FFF', fontFamily: 'Poppins-Medium', fontSize: 14 },
});
