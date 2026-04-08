import type { UserRole } from '@/store/useUserStore';
import { hydrateSubscriptionTier } from '@/utils/subscriptionVerification';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { auth, db } from '@/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import {
    ChevronRight,
    Crown,
    Download,
    Headphones,
    Mic2,
    Star,
    TrendingUp,
    Zap
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import SafeScreenWrapper from '../../components/SafeScreenWrapper';
import { theme } from '../../constants/theme';
import { formatUsd, ngnToUsd } from '../../utils/pricing';
import { normalize } from '../../utils/responsive';

const SUBSCRIPTION_TIERS = [
    // --- VAULT PLANS ---
    {
        id: 'vault' as UserRole,
        title: 'Vault',
        subtitle: `For Active Creators (${formatUsd(ngnToUsd(6981))}/mo)`,
        welcomeTitle: 'Welcome to Vault',
        welcomeLine: 'Private space for your masters, demos, and folders.',
        illustrationAssetName: 'welcome-tier-vault.png',
        icon: Headphones,
        gradient: [theme.colors.surface, '#3D2A1F'] as [string, string],
        accentColor: theme.colors.primary,
        features: ['Private Folder Sharing', 'Shareable Secure Links', 'Basic Tracking'],
        featureIcons: [Download, Mic2, Zap, TrendingUp],
    },
    {
        id: 'vault_pro' as UserRole,
        title: 'Vault Pro',
        subtitle: `Professional tier (${formatUsd(ngnToUsd(13962))}/mo)`,
        welcomeTitle: 'Welcome to Vault Pro',
        welcomeLine: 'Higher limits and deeper control for your private catalog.',
        illustrationAssetName: 'welcome-tier-vault-pro.png',
        icon: Crown,
        gradient: ['#863420', '#4A1D13'] as [string, string],
        accentColor: '#FFD700',
        features: ['Advanced Tracking', 'File Locking & Permissions'],
        featureIcons: [Zap, TrendingUp, Crown],
    },
    {
        id: 'studio' as UserRole,
        title: 'Studio',
        subtitle: `Active Sellers (${formatUsd(ngnToUsd(27000))}/mo)`,
        welcomeTitle: 'Welcome to Studio',
        welcomeLine: 'Publish, sell, and scale your beat business.',
        illustrationAssetName: 'welcome-tier-studio.png',
        icon: TrendingUp,
        gradient: ['#7C3AED', '#4C1D95'] as [string, string],
        accentColor: '#C4B5FD',
        features: ['Unlimited Listings', 'Buyer-Seller Chat', 'Pricing & License Control', 'Payout Access', 'Standard Visibility'],
        featureIcons: [Zap, Mic2, Star, Download, TrendingUp],
    },

    // --- HYBRID PLANS ---
    {
        id: 'hybrid' as UserRole,
        title: 'Hybrid',
        subtitle: `The Ultimate Plan (${formatUsd(ngnToUsd(34906))}/mo)`,
        welcomeTitle: 'Welcome to Hybrid',
        welcomeLine: 'One workspace to publish, promote, and manage your vault.',
        illustrationAssetName: 'welcome-tier-hybrid.png',
        icon: Zap,
        gradient: ['#221133', '#4A0E17'] as [string, string],
        accentColor: '#FFD700',
        features: ['Team Collaboration', 'Dedicated Support', '10% Transaction Fee'],
        featureIcons: [Download, Crown, Star, TrendingUp],
    },
];

const TIER_ILLUSTRATIONS: Record<UserRole, number> = {
    vault: require('@/assets/images/welcome-1.png'),
    vault_pro: require('@/assets/images/welcome-2.png'),
    studio: require('@/assets/images/welcome-3.png'),
    hybrid: require('@/assets/images/welcome-3.png'),
};

function useRoleSelectionStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function RoleSelectionScreen() {
    const appTheme = useAppTheme();
    const styles = useRoleSelectionStyles();

    const router = useRouter();
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

    // Staggered entry animations
    const headerAnim = useRef(new Animated.Value(0)).current;
    const cardAnims = useRef(SUBSCRIPTION_TIERS.map(() => new Animated.Value(0))).current;
    const buttonAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Header fades in first
        Animated.timing(headerAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();

        // Cards stagger in
        const cardAnimations = cardAnims.map((anim, i) =>
            Animated.timing(anim, {
                toValue: 1,
                duration: 500,
                delay: 200 + i * 120,
                easing: Easing.out(Easing.back(1.2)),
                useNativeDriver: true,
            })
        );
        Animated.stagger(120, cardAnimations).start();

        // Button fades in last
        Animated.timing(buttonAnim, {
            toValue: 1,
            duration: 400,
            delay: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, []);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const selectedTier = SUBSCRIPTION_TIERS.find((tier) => tier.id === selectedRole) || null;
    useEffect(() => {
        if (selectedRole) {
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
            ]).start();
        }
    }, [selectedRole]);

    const handleContinue = async () => {
        if (!selectedRole) return;

        if (selectedRole === 'studio' || selectedRole === 'hybrid') {
            router.push({
                pathname: '/(auth)/studio-creation',
                params: { role: selectedRole },
            });
            return;
        }

        if (auth.currentUser) {
            await setDoc(
                doc(db, 'users', auth.currentUser.uid, 'subscription', 'current'),
                {
                    tier: selectedRole,
                    isSubscribed: false,
                    expiresAt: null,
                    updatedAt: new Date().toISOString(),
                },
                { merge: true }
            );
        }

        await hydrateSubscriptionTier();
        router.replace('/(tabs)');
    };

    const selectedTierImage = selectedTier ? TIER_ILLUSTRATIONS[selectedTier.id] : null;

    return (
        <SafeScreenWrapper>
            <StatusBar barStyle={appTheme.isDark ? 'light-content' : 'dark-content'} />

            {/* Background decorative circles */}
            <Animated.View style={[styles.bgCircle1, { opacity: headerAnim }]} />
            <Animated.View style={[styles.bgCircle2, { opacity: headerAnim }]} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
            >
                {/* Header */}
                <Animated.View style={[styles.header, {
                    opacity: headerAnim,
                    transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }]
                }]}>
                    <Text style={styles.title} allowFontScaling={false}>How will you use{'\n'}ShooutS?</Text>
                    <Text style={styles.subtitle} allowFontScaling={false}>Choose your experience. You can always change this later.</Text>
                </Animated.View>

                {selectedTier ? (
                    <View style={styles.selectedWelcomeWrap}>
                        <LinearGradient
                            colors={selectedTier.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.selectedWelcomeGradient}
                        >
                            <View style={styles.selectedWelcomeHeader}>
                                <Text style={styles.selectedWelcomeTitle}>{selectedTier.welcomeTitle}</Text>
                                <Text style={styles.selectedWelcomeLine}>{selectedTier.welcomeLine}</Text>
                            </View>
                            {selectedTierImage ? (
                                <View style={[styles.illustrationImageCard, { borderColor: `${selectedTier.accentColor}66` }]}>
                                    <Image
                                        source={selectedTierImage}
                                        style={styles.illustrationImage}
                                        contentFit="contain"
                                    />
                                </View>
                            ) : null}
                        </LinearGradient>
                    </View>
                ) : null}

                {/* Role Cards */}
                <View style={styles.cardsContainer}>
                    {SUBSCRIPTION_TIERS.map((role, index) => {
                        const isSelected = selectedRole === role.id;
                        const Icon = role.icon;
                        const cardAnim = cardAnims[index];
                        const selectedGradient: readonly [string, string] = role.id === 'vault'
                            ? [appTheme.colors.surface, appTheme.isDark ? '#3D2A1F' : '#F1D8D0']
                            : role.gradient;
                        const cardGradient: readonly [string, string] = isSelected
                            ? selectedGradient
                            : [appTheme.colors.surface, appTheme.colors.surface];

                        return (
                            <Animated.View
                                key={role.id}
                                style={[{
                                    opacity: cardAnim,
                                    transform: [
                                        { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                                        { scale: isSelected ? pulseAnim : 1 }
                                    ]
                                }]}
                            >
                                <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() => setSelectedRole(role.id)}
                                >
                                    <LinearGradient
                                        colors={cardGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={[
                                            styles.roleCard,
                                            isSelected && styles.roleCardSelected,
                                        ]}
                                    >
                                        <View style={styles.roleCardContent}>
                                            <View style={[styles.roleIconContainer, isSelected && { backgroundColor: appTheme.isDark ? 'rgba(255,255,255,0.2)' : 'rgba(23,18,19,0.12)' }]}>
                                                <Icon size={theme.iconSize.lg} color={isSelected ? appTheme.colors.textPrimary : appTheme.colors.primary} />
                                            </View>
                                            <View style={styles.roleTextContent}>
                                                <Text style={styles.roleTitle} allowFontScaling={false}>{role.title}</Text>
                                                <Text style={[styles.roleSubtitle, isSelected && { color: appTheme.colors.textSecondary }]} allowFontScaling={false}>
                                                    {role.subtitle}
                                                </Text>
                                            </View>
                                            <View style={styles.checkIndicatorContainer}>
                                                {isSelected && (
                                                    <Image
                                                        source={require('@/assets/images/check-circle.png')}
                                                        style={styles.checkImage}
                                                        contentFit="contain"
                                                    />
                                                )}
                                            </View>
                                        </View>

                                        {/* Expanded features */}
                                        {isSelected && (
                                            <View style={styles.featuresContainer}>
                                                {role.features.map((feature, fi) => {
                                                    const FeatureIcon = role.featureIcons[fi];
                                                    return (
                                                        <View key={fi} style={styles.featureRow}>
                                                            <FeatureIcon size={theme.iconSize.sm} color={appTheme.colors.textSecondary} />
                                                            <Text style={styles.featureText} allowFontScaling={false}>{feature}</Text>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                </View>

                {/* Continue Button */}
                <Animated.View style={[styles.buttonContainer, {
                    opacity: buttonAnim,
                    transform: [{ translateY: buttonAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }]
                }]}>
                    <TouchableOpacity
                        onPress={handleContinue}
                        activeOpacity={0.85}
                        disabled={!selectedRole}
                        style={[styles.continueButton, !selectedRole && { opacity: 0.4 }]}
                    >
                        <LinearGradient
                            colors={selectedRole ? [appTheme.colors.primary, appTheme.isDark ? '#863420' : '#B74227'] : [appTheme.colors.borderLight, appTheme.colors.border]}
                            style={styles.continueGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.continueText} allowFontScaling={false}>Continue</Text>
                            <ChevronRight size={theme.iconSize.md} color={appTheme.colors.textPrimary} />
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </SafeScreenWrapper>
    );
}

const legacyStyles = {
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.screenPadding,
        paddingTop: theme.spacing.xxl,
        paddingBottom: theme.spacing.xxl * 2,
    },
    bgCircle1: {
        position: 'absolute',
        top: -normalize(80),
        right: -normalize(60),
        width: normalize(200),
        height: normalize(200),
        borderRadius: theme.radius.full,
        backgroundColor: 'rgba(236, 92, 57, 0.04)',
    },
    bgCircle2: {
        position: 'absolute',
        bottom: -normalize(100),
        left: -normalize(80),
        width: normalize(250),
        height: normalize(250),
        borderRadius: theme.radius.full,
        backgroundColor: 'rgba(147, 51, 234, 0.03)',
    },
    header: {
        marginBottom: theme.spacing.xl,
    },
    title: {
        color: theme.colors.textPrimary,
        fontFamily: 'Poppins-Bold',
        fontSize: theme.typography.h1.fontSize,
        lineHeight: theme.typography.h1.lineHeight,
        letterSpacing: -0.5,
    },
    subtitle: {
        color: theme.colors.textSecondary,
        fontFamily: 'Poppins-Regular',
        fontSize: theme.typography.body.fontSize,
        marginTop: theme.spacing.sm,
        lineHeight: theme.typography.body.lineHeight,
    },
    cardsContainer: {
        gap: theme.spacing.md,
    },
    selectedWelcomeWrap: {
        marginBottom: theme.spacing.lg,
    },
    selectedWelcomeGradient: {
        borderRadius: theme.radius.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        padding: theme.spacing.md,
        gap: theme.spacing.md,
    },
    selectedWelcomeHeader: {
        gap: 4,
    },
    selectedWelcomeTitle: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-Bold',
        fontSize: theme.typography.h3.fontSize,
    },
    selectedWelcomeLine: {
        color: 'rgba(255,255,255,0.82)',
        fontFamily: 'Poppins-Regular',
        fontSize: theme.typography.caption.fontSize,
    },
    illustrationImageCard: {
        borderWidth: 1,
        borderRadius: theme.radius.lg,
        backgroundColor: 'rgba(20,15,16,0.46)',
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
        alignItems: 'center',
    },
    illustrationImage: {
        width: '100%',
        height: normalize(170),
        borderRadius: theme.radius.md,
    },
    roleCard: {
        borderRadius: theme.radius.xl,
        padding: theme.spacing.md,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    roleCardSelected: {
        borderColor: 'rgba(255,255,255,0.15)',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    roleCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    roleIconContainer: {
        width: normalize(48),
        height: normalize(48),
        borderRadius: theme.radius.lg,
        backgroundColor: 'rgba(236, 92, 57, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleTextContent: {
        flex: 1,
        marginLeft: theme.spacing.md,
    },
    roleTitle: {
        color: theme.colors.textPrimary,
        fontFamily: 'Poppins-Bold',
        fontSize: theme.typography.h3.fontSize,
    },
    roleSubtitle: {
        color: theme.colors.textDisabled,
        fontFamily: 'Poppins-Regular',
        fontSize: theme.typography.caption.fontSize,
        marginTop: 1,
    },
    checkIndicatorContainer: {
        width: normalize(32),
        height: normalize(32),
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkImage: {
        width: normalize(32),
        height: normalize(32),
    },
    featuresContainer: {
        marginTop: theme.spacing.md,
        paddingTop: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.15)',
        gap: theme.spacing.sm,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    featureText: {
        color: 'rgba(255,255,255,0.85)',
        fontFamily: 'Poppins-Regular',
        fontSize: theme.typography.caption.fontSize,
    },
    buttonContainer: {
        marginTop: theme.spacing.xl,
    },
    continueButton: {
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        height: normalize(56),
    },
    continueGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
    },
    continueText: {
        color: theme.colors.textPrimary,
        fontFamily: 'Poppins-Bold',
        fontSize: theme.typography.button.fontSize,
        letterSpacing: theme.typography.button.letterSpacing,
    },
};
