import { useAppSwitcherContext } from '@/app/(tabs)/_layout';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SharedHeader from '@/components/SharedHeader';
import { Icon } from '@/components/ui/Icon';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useToastStore } from '@/store/useToastStore';
import { useUserStore } from '@/store/useUserStore';
import { useVaultWorkspaceData } from '@/hooks/useVaultWorkspaceData';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { getModeTheme } from '@/utils/appModeTheme';
import { colors } from '@/constants/colors';
import { canUseHybridServices, canUseStudioServices, getEffectivePlan } from '@/utils/subscriptions';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../../firebaseConfig';

function useMoreStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => {
        const adaptedStyles = adaptLegacyStyles(legacyStyles, appTheme) as any;
        
        // Light mode overrides
        if (!appTheme.isDark) {
            adaptedStyles.vaultHeader = {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                height: 60,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(20, 15, 16, 0.12)',
            };
            adaptedStyles.vaultBackButton = {
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(20, 15, 16, 0.06)',
                alignItems: 'center',
                justifyContent: 'center',
            };
            adaptedStyles.vaultHeaderTitle = {
                color: '#171213',
                fontFamily: 'Poppins-SemiBold',
                fontSize: 18,
                flex: 1,
                textAlign: 'center',
            };
        }
        
        return StyleSheet.create(adaptedStyles);
    }, [appTheme]);
}

export default function MoreScreen() {
    const appTheme = useAppTheme();
    const styles = useMoreStyles();

    const router = useRouter();
    const { role, name, reset, activeAppMode, setActiveAppMode } = useUserStore();
    const currentPlan = getEffectivePlan(useAuthStore((state) => state.actualRole || state.subscriptionTier || role));
    const { showToast } = useToastStore();
    const { openSheet, isModeSheetOpen, viewMode } = useAppSwitcherContext();
    const [isLoggedIn, setIsLoggedIn] = useState(!!auth.currentUser);
    const { uploads, folders, loading: vaultLoading } = useVaultWorkspaceData();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => setIsLoggedIn(!!user));
        return unsub;
    }, []);

    const isVaultMode = activeAppMode === 'vault' || activeAppMode === 'vault_pro';
    const isStudioMode = activeAppMode === 'studio';
    const isHybridMode = activeAppMode === 'hybrid';
    const showVaultWorkspaceShortcut = isHybridMode && !vaultLoading && uploads.length === 0 && folders.length === 0;
    const canUseStudioTools = canUseStudioServices(currentPlan);
    const canUseHybridTools = canUseHybridServices(currentPlan);
    const modeTheme = getModeTheme(activeAppMode);
    const accentColor = modeTheme.accent;

    const pushSubscriptions = () => router.push('/settings/subscriptions' as any);
    const goHybridHome = () => {
        setActiveAppMode('hybrid');
        router.push('/' as any);
    };

    const performLogout = async () => {
        useNotificationStore.getState().stopListening();

        try {
            const hadPreviousSignIn = await GoogleSignin.hasPreviousSignIn();
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
            try {
                await usePlaybackStore.getState().clearTrack();
            } catch (e) {
                console.warn('clearTrack error:', e);
            }
            router.replace('/(auth)/login');
        }
    };

    const handleLogout = () => {
        if (Platform.OS === 'web') {
            performLogout();
            return;
        }

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
                {isVaultMode ? (
                    <View style={[styles.vaultHeader, { backgroundColor: appTheme.colors.background }]}>
                        <TouchableOpacity onPress={() => router.push('/' as any)} style={styles.vaultBackButton}>
                            <ChevronLeft size={24} color={appTheme.colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.vaultHeaderTitle}>Settings</Text>
                        <View style={styles.vaultHeaderPlaceholder} />
                    </View>
                ) : (
                    <SharedHeader
                        viewMode={viewMode}
                        isModeSheetOpen={isModeSheetOpen}
                        onModePillPress={openSheet}
                        showCart={activeAppMode === 'shoout'}
                    />
                )}
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    <View style={styles.greetingRow}>
                        <View style={[styles.avatarBubble, { backgroundColor: accentColor }]}>
                            <Text style={styles.avatarBubbleText}>{getInitials(name)}</Text>
                        </View>
                        <Text style={styles.greetingText}>Hi, {name || 'Creator'}</Text>
                    </View>

                    <View style={styles.menuContainer}>
                        {/* Consistent Slot 1: My Content Home */}
                        {isVaultMode && <MenuItem iconName="library" label="Vault Home" color={accentColor} onPress={() => router.push('/' as any)} />}
                        {isStudioMode && <MenuItem iconName="library" label="Studio Home" color={accentColor} onPress={() => router.push('/' as any)} />}
                        {isHybridMode && <MenuItem iconName="library" label="Hybrid Home" color={accentColor} onPress={goHybridHome} />}
                        {!isVaultMode && !isStudioMode && !isHybridMode && <MenuItem iconName="library" label="Library" color={accentColor} onPress={() => router.push('/(tabs)/library' as any)} />}

                        {/* Consistent Slot 2: Create / Upload / Shop */}
                        {isVaultMode && <MenuItem iconName="upload-cloud" label="Upload Track" color={accentColor} onPress={() => router.push('/vault/upload' as any)} />}
                        {isStudioMode && <MenuItem iconName="upload-cloud" label="Publish" color={accentColor} onPress={() => canUseStudioTools ? router.push('/(tabs)/search' as any) : pushSubscriptions()} />}
                        {isHybridMode && <MenuItem iconName="upload-cloud" label="Publish" color={accentColor} onPress={() => canUseHybridTools ? router.push('/(tabs)/search' as any) : pushSubscriptions()} />}
                        {!isVaultMode && !isStudioMode && !isHybridMode && <MenuItem iconName="cart" label="My Cart" color={accentColor} onPress={() => router.push('/cart' as any)} />}

                        {/* Consistent Slot 3: Manage / Access Content */}
                        {isVaultMode && <MenuItem iconName="link-2" label="Shared Links" color={accentColor} onPress={() => router.push('/vault/links' as any)} />}
                        {isStudioMode && <MenuItem iconName="banknote" label="Royalties & Earnings" color={accentColor} onPress={() => canUseStudioTools ? router.push('/studio/earnings' as any) : pushSubscriptions()} />}
                        {isHybridMode && <MenuItem iconName="banknote" label="Creator Earnings" color={accentColor} onPress={() => canUseHybridTools ? router.push('/studio/earnings' as any) : pushSubscriptions()} />}

                        {/* Consistent Slot 4: Notifications / Promotions */}
                        {isVaultMode && <MenuItem iconName="bell" label="Notifications" color={accentColor} onPress={() => router.push('/notifications' as any)} />}
                        {isStudioMode && <MenuItem iconName="bell" label="Promote & Ads" color={accentColor} onPress={() => canUseStudioTools ? router.push('/(tabs)/marketplace' as any) : pushSubscriptions()} />}
                        {isHybridMode && <MenuItem iconName="bell" label="Promote & Ads" color={accentColor} onPress={() => canUseHybridTools ? router.push('/(tabs)/marketplace' as any) : pushSubscriptions()} />}
                        {!isVaultMode && !isStudioMode && !isHybridMode && <MenuItem iconName="bell" label="Notifications" color={accentColor} onPress={() => router.push('/notifications' as any)} />}

                        {/* Secondary Hybrid Vault Access */}
                        {showVaultWorkspaceShortcut && <MenuItem iconName="upload-cloud" label="Vault Workspace" color={accentColor} onPress={() => router.push('/(tabs)/library' as any)} />}
                        {isHybridMode && <MenuItem iconName="link-2" label="Vault Links" color={accentColor} onPress={() => canUseHybridTools ? router.push('/vault/links' as any) : pushSubscriptions()} />}
                    </View>

                    <View style={styles.menuContainer}>
                        <MenuItem iconName="user" label="Account" color={accentColor} onPress={() => router.push('/(tabs)/profile' as any)} />
                        <MenuItem iconName="sparkles" label="Appearance" color={accentColor} onPress={() => router.push('/settings/appearance' as any)} />
                        {!isVaultMode && <MenuItem iconName="credit-card" label="Payment Methods" color={accentColor} onPress={() => router.push('/settings/payment-methods' as any)} />}
                        <MenuItem iconName="banknote" label="Subscription" value={role.replace('_', ' ').toUpperCase()} color={accentColor} onPress={() => router.push('/settings/subscriptions' as any)} />
                        {isStudioMode && <MenuItem iconName="sparkles" label="Studio Analytics" color={accentColor} onPress={() => canUseStudioTools ? router.push('/studio/analytics' as any) : pushSubscriptions()} />}
                        {isStudioMode && <MenuItem iconName="circle-help" label="Studio Settings" color={accentColor} onPress={() => canUseStudioTools ? router.push('/studio/settings' as any) : pushSubscriptions()} />}
                        {isHybridMode && <MenuItem iconName="sparkles" label="Hybrid Analytics" color={accentColor} onPress={() => canUseHybridTools ? router.push('/studio/analytics' as any) : pushSubscriptions()} />}
                        {isHybridMode && <MenuItem iconName="circle-help" label="Studio Settings" color={accentColor} onPress={() => canUseHybridTools ? router.push('/studio/settings' as any) : pushSubscriptions()} />}
                        <MenuItem iconName="share" label="Share" color={accentColor} onPress={() => showToast('Coming soon', 'info')} />
                        <MenuItem iconName="circle-help" label="Support" color={accentColor} onPress={() => showToast('Support coming soon', 'info')} />
                        <MenuItem iconName="shield" label="Privacy & Security" color={accentColor} onPress={() => router.push('/settings/privacy' as any)} />
                        <MenuItem iconName="log-out" label="Log Out" color="#EF4444" onPress={handleLogout} hideChevron />
                    </View>

                    {isStudioMode || isHybridMode ? (
                        <TouchableOpacity style={styles.upgradeCard} onPress={() => router.push('/settings/subscriptions' as any)}>
                            <LinearGradient
                                colors={[modeTheme.accent, modeTheme.accentStrong]}
                                style={styles.upgradeGradient}
                            >
                                <Icon name="credit-card" size={24} color={appTheme.colors.textPrimary} />
                                <View style={styles.upgradeTextContainer}>
                                    <Text style={styles.upgradeTitle}>Manage Subscription</Text>
                                    <Text style={styles.upgradeSubtitle}>Upgrade, downgrade, or view your current plan</Text>
                                </View>
                                <Icon name="chevron-right" size={20} color={appTheme.colors.textPrimary} />
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.upgradeCard} onPress={() => router.push('/settings/subscriptions' as any)}>
                            <LinearGradient
                                colors={[modeTheme.accent, modeTheme.accentStrong]}
                                style={styles.upgradeGradient}
                            >
                                <Icon name="sparkles" size={24} color={appTheme.colors.textPrimary} />
                                <View style={styles.upgradeTextContainer}>
                                    <Text style={styles.upgradeTitle}>Upgrade Your Plan</Text>
                                    <Text style={styles.upgradeSubtitle}>{isVaultMode ? 'Unlock more Vault storage and higher upload limits' : 'Unlock uploads and richer creator access'}</Text>
                                </View>
                                <ChevronRight size={20} color={appTheme.colors.textPrimary} />
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

function MenuItem({ iconName, label, value, color, onPress, hideChevron }: any) {
    const appTheme = useAppTheme();
    const styles = useMoreStyles();

    return (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={[styles.menuIconContainer, { backgroundColor: `${color}15` }]}>
                <Icon name={iconName} size={20} color={color} />
            </View>
            <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>{label}</Text>
                {value && <Text style={styles.menuValue}>{value}</Text>}
            </View>
            {!hideChevron && <Icon name="chevron-right" size={18} color={appTheme.colors.textDisabled} />}
        </TouchableOpacity>
    );
}

const legacyStyles = {
    container: { flex: 1, backgroundColor: '#140F10' },
    content: { padding: 20, paddingTop: 12, gap: 20 },
    vaultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    vaultBackButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.07)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    vaultHeaderTitle: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 18,
        flex: 1,
        textAlign: 'center',
    },
    vaultHeaderPlaceholder: {
        width: 40,
    },
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
        backgroundColor: colors.shooutPrimary,
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
    primaryButton: { flex: 1, backgroundColor: colors.shooutPrimary, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    primaryButtonText: { color: '#FFF', fontFamily: 'Poppins-SemiBold', fontSize: 14 },
    secondaryButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    secondaryButtonText: { color: '#FFF', fontFamily: 'Poppins-Medium', fontSize: 14 },
};
