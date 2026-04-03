import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SharedHeader from '@/components/SharedHeader';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { useUserStore } from '@/store/useUserStore';
import { canUseHybridServices, canUseStudioServices, getEffectivePlan } from '@/utils/subscriptions';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { Banknote, Bell, ChevronRight, CircleHelp, CreditCard, History, Library, Link2, LogOut, Share2, Shield, ShoppingCart, Sparkles, UploadCloud, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../../firebaseConfig';

export default function MoreScreen() {
    const router = useRouter();
    const { role, name, reset, activeAppMode } = useUserStore();
    const currentPlan = getEffectivePlan(useAuthStore((state) => state.actualRole || state.subscriptionTier || role));
    const { showToast } = useToastStore();
    const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
    const [isLoggedIn, setIsLoggedIn] = useState(!!auth.currentUser);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => setIsLoggedIn(!!user));
        return unsub;
    }, []);

    const isStudioOrHybrid = role?.startsWith('studio') || role?.startsWith('hybrid');
    const isVaultMode = activeAppMode === 'vault' || activeAppMode === 'vault_pro';
    const isShooutMode = activeAppMode === 'shoout';
    const isStudioMode = activeAppMode === 'studio';
    const isHybridMode = activeAppMode === 'hybrid';
    const canUseStudioTools = canUseStudioServices(currentPlan);
    const canUseHybridTools = canUseHybridServices(currentPlan);

    const pushSubscriptions = () => router.push('/settings/subscriptions' as any);

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
                <SharedHeader
                    viewMode={viewMode}
                    isModeSheetOpen={isModeSheetOpen}
                    onModePillPress={openSheet}
                    showCart={isShooutMode}
                />
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    <View style={styles.greetingRow}>
                        <View style={styles.avatarBubble}>
                            <Text style={styles.avatarBubbleText}>{getInitials(name)}</Text>
                        </View>
                        <Text style={styles.greetingText}>Hi, {name || 'Creator'}</Text>
                    </View>

                    <View style={styles.menuContainer}>
                        {isVaultMode ? (
                            <>
                                <MenuItem icon={Library} label="Vault Home" color="#EC5C39" onPress={() => router.push('/(tabs)/index' as any)} />
                                <MenuItem icon={UploadCloud} label="Upload Track" color="#EC5C39" onPress={() => router.push('/vault/upload' as any)} />
                                <MenuItem icon={Link2} label="Shared Links" color="#EC5C39" onPress={() => router.push('/vault/links' as any)} />
                                <MenuItem icon={Bell} label="Vault Updates" color="#EC5C39" onPress={() => router.push('/vault/updates' as any)} />
                            </>
                        ) : isStudioMode ? (
                            <>
                                <MenuItem icon={Library} label="Studio Home" color="#4CAF50" onPress={() => router.push('/(tabs)/index' as any)} />
                                <MenuItem icon={UploadCloud} label="Publish" color="#4CAF50" onPress={() => canUseStudioTools ? router.push('/(tabs)/search' as any) : pushSubscriptions()} />
                                <MenuItem icon={Banknote} label="Royalties & Earnings" color="#4CAF50" onPress={() => canUseStudioTools ? router.push('/studio/earnings' as any) : pushSubscriptions()} />
                                <MenuItem icon={Bell} label="Promote & Ads" color="#4CAF50" onPress={() => canUseStudioTools ? router.push('/(tabs)/marketplace' as any) : pushSubscriptions()} />
                            </>
                        ) : isHybridMode ? (
                            <>
                                <MenuItem icon={Library} label="Hybrid Home" color="#FFD700" onPress={() => router.push('/(tabs)/index' as any)} />
                                <MenuItem icon={UploadCloud} label="Vault Uploads" color="#FFD700" onPress={() => canUseHybridTools ? router.push('/vault/upload' as any) : pushSubscriptions()} />
                                <MenuItem icon={Banknote} label="Creator Earnings" color="#FFD700" onPress={() => canUseHybridTools ? router.push('/studio/earnings' as any) : pushSubscriptions()} />
                                <MenuItem icon={Bell} label="Promotions" color="#FFD700" onPress={() => canUseHybridTools ? router.push('/studio/ads-intro' as any) : pushSubscriptions()} />
                            </>
                        ) : (
                            <>
                                <MenuItem icon={Library} label="Library" color="#EC5C39" onPress={() => router.push('/(tabs)/library' as any)} />
                                <MenuItem icon={ShoppingCart} label="My Cart" color="#EC5C39" onPress={() => router.push('/cart' as any)} />
                                <MenuItem icon={History} label="History" color="#EC5C39" onPress={() => showToast('Coming soon', 'info')} />
                                <MenuItem icon={Bell} label="Updates" color="#EC5C39" onPress={() => router.push('/updates' as any)} />
                            </>
                        )}
                    </View>

                    <View style={styles.menuContainer}>
                        <MenuItem icon={User} label="Account" color="#EC5C39" onPress={() => router.push('/(tabs)/profile' as any)} />
                        {!isVaultMode && <MenuItem icon={CreditCard} label="Payment Methods" color="#EC5C39" onPress={() => router.push('/settings/payment-methods' as any)} />}
                        <MenuItem icon={Banknote} label="Subscription" value={role.replace('_', ' ').toUpperCase()} color="#EC5C39" onPress={() => router.push('/settings/subscriptions' as any)} />
                        {isStudioMode && <MenuItem icon={Sparkles} label="Studio Analytics" color="#4CAF50" onPress={() => canUseStudioTools ? router.push('/studio/analytics' as any) : pushSubscriptions()} />}
                        {isStudioMode && <MenuItem icon={CircleHelp} label="Studio Settings" color="#4CAF50" onPress={() => canUseStudioTools ? router.push('/studio/settings' as any) : pushSubscriptions()} />}
                        {isHybridMode && <MenuItem icon={Sparkles} label="Hybrid Analytics" color="#FFD700" onPress={() => canUseHybridTools ? router.push('/studio/analytics' as any) : pushSubscriptions()} />}
                        <MenuItem icon={Share2} label="Share" color="#EC5C39" onPress={() => showToast('Coming soon', 'info')} />
                        <MenuItem icon={CircleHelp} label="Support" color="#EC5C39" onPress={() => showToast('Support coming soon', 'info')} />
                        <MenuItem icon={Shield} label="Privacy & Security" color="#EC5C39" onPress={() => router.push('/settings/privacy' as any)} />
                        <MenuItem icon={Link2} label="Notifications" color="#EC5C39" onPress={() => router.push('/notifications' as any)} />
                        <MenuItem icon={LogOut} label="Log Out" color="#EF4444" onPress={handleLogout} hideChevron />
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
                                    <Text style={styles.upgradeSubtitle}>{isVaultMode ? 'Unlock more Vault storage and higher upload limits' : 'Unlock uploads and richer creator access'}</Text>
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

function getInitials(name: string) {
    const initials = String(name || 'Creator')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
    return initials || 'C';
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
    content: { padding: 20, paddingTop: 12, gap: 20 },
    greetingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 4,
    },
    avatarBubble: {
        width: 33,
        height: 35,
        borderRadius: 17,
        backgroundColor: '#EC5C39',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarBubbleText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
    },
    greetingText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-Medium',
        fontSize: 16,
        lineHeight: 20,
        letterSpacing: -0.5,
    },
    menuContainer: {
        backgroundColor: '#1A1A1B',
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    menuIconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    menuTextContainer: { flex: 1, marginLeft: 16 },
    menuLabel: { fontSize: 12, lineHeight: 14, fontFamily: 'Poppins-Medium', color: 'rgba(255,255,255,0.88)' },
    menuValue: { fontSize: 12, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.4)', marginTop: 1 },
    upgradeCard: { borderRadius: 24, overflow: 'hidden' },
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
