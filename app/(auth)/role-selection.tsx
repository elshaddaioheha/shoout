import type { UserRole } from '@/store/useUserStore';
import { useToastStore } from '@/store/useToastStore';
import { hydrateSubscriptionTier } from '@/utils/subscriptionVerification';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { SUBSCRIPTION_TIERS } from '@/constants/subscriptionTiers';
import { markSelectedExperience } from '@/utils/authFlow';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { auth } from '@/firebaseConfig';
import {
    ChevronRight,
    CheckCircle,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    ActivityIndicator,
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
import { normalize } from '../../utils/responsive';

const SUBSCRIPTION_VERIFY_URL =
    process.env.EXPO_PUBLIC_SUBSCRIPTION_VERIFY_URL ||
    `${String(process.env.EXPO_PUBLIC_FUNCTIONS_URL || '').replace(/\/$/, '')}/activateSubscriptionTier`;

function useRoleSelectionStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function RoleSelectionScreen() {
    const appTheme = useAppTheme();
    const styles = useRoleSelectionStyles();

    const router = useRouter();
    const { showToast } = useToastStore();
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Staggered entry animations
    const headerAnim = useRef(new Animated.Value(0)).current;
    const cardAnimsRef = useRef(SUBSCRIPTION_TIERS.map(() => new Animated.Value(0)));
    const buttonAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const cardAnims = cardAnimsRef.current;

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
    const SelectedTierIcon = selectedTier?.icon;

    useEffect(() => {
        if (selectedRole) {
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
            ]).start();
        }
    }, [selectedRole]);

    const handleRolePress = (roleId: UserRole) => {
        if (isSubmitting) return;
        setSelectedRole(roleId);
        Haptics.selectionAsync().catch(() => null);
    };

    const activatePlanOnServer = async (planId: UserRole) => {
        if (!auth.currentUser) {
            throw new Error('Please sign in again to continue.');
        }

        if (!SUBSCRIPTION_VERIFY_URL) {
            throw new Error('Subscription verification endpoint is not configured.');
        }

        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch(SUBSCRIPTION_VERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
                planId,
                billingCycle: 'monthly',
            }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.error || 'Subscription activation failed.');
        }
    };

    const handleContinue = async () => {
        if (!selectedRole || isSubmitting) return;

        setIsSubmitting(true);
        try {
            if (!auth.currentUser) {
                throw new Error('Please sign in again to continue.');
            }

            if (selectedRole === 'studio' || selectedRole === 'hybrid') {
                await markSelectedExperience(auth.currentUser.uid, selectedRole);
                router.push({
                    pathname: '/(auth)/studio-creation',
                    params: { role: selectedRole },
                });
                return;
            }

            await activatePlanOnServer(selectedRole);
            await markSelectedExperience(auth.currentUser.uid, selectedRole);
            await hydrateSubscriptionTier();
            router.replace('/(tabs)');
        } catch (error: any) {
            showToast(error?.message || 'Could not continue right now. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

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
                                <View style={[styles.selectedWelcomeBadge, { backgroundColor: `${selectedTier.accentColor}22` }]}>
                                    <Text style={[styles.selectedWelcomeBadgeText, { color: selectedTier.accentColor }]}>Selected Experience</Text>
                                </View>
                                <Text style={[styles.selectedWelcomeTitle, { color: appTheme.colors.textPrimary }]}>{selectedTier.welcomeTitle}</Text>
                                <Text style={[styles.selectedWelcomeLine, { color: appTheme.isDark ? 'rgba(255,255,255,0.82)' : 'rgba(23,18,19,0.72)' }]}>{selectedTier.welcomeLine}</Text>
                            </View>
                            <View
                                style={[
                                    styles.selectedHeroCard,
                                    {
                                        borderColor: `${selectedTier.accentColor}55`,
                                        backgroundColor: appTheme.isDark ? 'rgba(20,15,16,0.34)' : 'rgba(255,255,255,0.56)',
                                    },
                                ]}
                            >
                                <View style={[styles.selectedHeroBackdrop, { backgroundColor: appTheme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(23,18,19,0.05)' }]} />
                                <View style={[styles.selectedHeroOrb, { backgroundColor: `${selectedTier.accentColor}20`, borderColor: `${selectedTier.accentColor}40` }]}>
                                    {SelectedTierIcon ? <SelectedTierIcon size={normalize(34)} color={selectedTier.accentColor} /> : null}
                                </View>
                                <View style={styles.selectedHeroTextWrap}>
                                    <Text style={[styles.selectedHeroEyebrow, { color: appTheme.isDark ? 'rgba(255,255,255,0.72)' : 'rgba(23,18,19,0.56)' }]}>{selectedTier.title}</Text>
                                    <Text style={[styles.selectedHeroSubhead, { color: appTheme.colors.textPrimary }]}>{selectedTier.subtitle}</Text>
                                </View>
                            </View>
                            <View style={styles.selectedFeatureGrid}>
                                {/* Keep the welcome preview concise so the cards remain visible above the fold. */}
                                {selectedTier.features.slice(0, 3).map((feature, index) => {
                                    const FeatureIcon = selectedTier.featureIcons[index] || selectedTier.icon;
                                    return (
                                        <View
                                            key={`${selectedTier.id}-${feature}`}
                                            style={[
                                                styles.selectedFeaturePill,
                                                {
                                                    borderColor: `${selectedTier.accentColor}33`,
                                                    backgroundColor: appTheme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
                                                },
                                            ]}
                                        >
                                            <FeatureIcon size={theme.iconSize.sm} color={selectedTier.accentColor} />
                                            <Text style={[styles.selectedFeatureText, { color: appTheme.colors.textPrimary }]}>{feature}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </LinearGradient>
                    </View>
                ) : null}

                {/* Role Cards */}
                <View style={styles.cardsContainer}>
                    {SUBSCRIPTION_TIERS.map((role, index) => {
                        const isSelected = selectedRole === role.id;
                        const Icon = role.icon;
                        const cardAnim = cardAnimsRef.current[index];
                        const selectedGradient: readonly [string, string] = role.selectedGradientOverride && !appTheme.isDark
                            ? role.selectedGradientOverride
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
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected: isSelected, disabled: isSubmitting }}
                                    accessibilityLabel={`${role.title} subscription option`}
                                    activeOpacity={0.85}
                                    disabled={isSubmitting}
                                    onPress={() => handleRolePress(role.id)}
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
                                                    <CheckCircle
                                                        size={normalize(24)}
                                                        color={role.accentColor}
                                                        fill={appTheme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}
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
                        accessibilityLabel={selectedRole ? `Continue with ${selectedRole} plan` : 'Select a plan to continue'}
                        onPress={handleContinue}
                        activeOpacity={0.85}
                        disabled={!selectedRole || isSubmitting}
                        style={[styles.continueButton, (!selectedRole || isSubmitting) && { opacity: 0.4 }]}
                    >
                        <LinearGradient
                            colors={selectedRole ? [appTheme.colors.primary, appTheme.isDark ? '#863420' : '#B74227'] : [appTheme.colors.borderLight, appTheme.colors.border]}
                            style={styles.continueGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            {isSubmitting ? (
                                <>
                                    <ActivityIndicator color={appTheme.colors.textPrimary} size="small" />
                                    <Text style={styles.continueText} allowFontScaling={false}>Loading...</Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.continueText} allowFontScaling={false}>Continue</Text>
                                    <ChevronRight size={theme.iconSize.md} color={appTheme.colors.textPrimary} />
                                </>
                            )}
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
    selectedWelcomeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 6,
        borderRadius: theme.radius.full,
        marginBottom: theme.spacing.xs,
    },
    selectedWelcomeBadgeText: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: theme.typography.caption.fontSize,
    },
    selectedWelcomeTitle: {
        fontFamily: 'Poppins-Bold',
        fontSize: theme.typography.h3.fontSize,
    },
    selectedWelcomeLine: {
        fontFamily: 'Poppins-Regular',
        fontSize: theme.typography.caption.fontSize,
    },
    selectedHeroCard: {
        borderWidth: 1,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        minHeight: normalize(120),
    },
    selectedHeroBackdrop: {
        position: 'absolute',
        right: -normalize(22),
        top: -normalize(20),
        width: normalize(120),
        height: normalize(120),
        borderRadius: theme.radius.full,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    selectedHeroOrb: {
        width: normalize(72),
        height: normalize(72),
        borderRadius: theme.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    selectedHeroTextWrap: {
        flex: 1,
        gap: 6,
    },
    selectedHeroEyebrow: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: theme.typography.caption.fontSize,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    selectedHeroSubhead: {
        fontFamily: 'Poppins-Bold',
        fontSize: theme.typography.body.fontSize,
        lineHeight: theme.typography.body.lineHeight,
    },
    selectedFeatureGrid: {
        gap: theme.spacing.sm,
    },
    selectedFeaturePill: {
        borderWidth: 1,
        borderRadius: theme.radius.lg,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    selectedFeatureText: {
        flex: 1,
        fontFamily: 'Poppins-Medium',
        fontSize: theme.typography.caption.fontSize,
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
