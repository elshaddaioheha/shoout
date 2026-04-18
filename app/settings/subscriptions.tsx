import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { auth } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAuthStore } from '@/store/useAuthStore';
import { useToastStore } from '@/store/useToastStore';
import { useUserStore } from '@/store/useUserStore';
import { adaptLegacyColor, adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { hydrateSubscriptionTier } from '@/utils/subscriptionVerification';
import { formatUsd, usdToNgn } from '@/utils/pricing';
import { getSubscriptionPlan, SUBSCRIPTION_PLANS, type SubscriptionPlanId } from '@/utils/subscriptions';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { PayWithFlutterwave } from 'flutterwave-react-native';
import { Check, CreditCard, PartyPopper, ShieldCheck, Sparkles, Star, ChevronLeft } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

const SUBSCRIPTION_VERIFY_URL =
    process.env.EXPO_PUBLIC_SUBSCRIPTION_VERIFY_URL ||
    `${String(process.env.EXPO_PUBLIC_FUNCTIONS_URL || '').replace(/\/$/, '')}/activateSubscriptionTier`;

type PlanCategory = 'Shoouts' | 'Vault' | 'Studio' | 'Hybrid';

const CATEGORY_TABS: { id: PlanCategory; label: string; color: string }[] = [
    { id: 'Shoouts', label: 'Shoouts', color: '#6AA7FF' },
    { id: 'Vault', label: 'Vault', color: '#EC5C39' },
    { id: 'Studio', label: 'Studio', color: '#4CAF50' },
    { id: 'Hybrid', label: 'Hybrid', color: '#D4AF37' },
];

const PLANS = SUBSCRIPTION_PLANS.map((plan) => ({
    id: plan.id,
    name: plan.label,
    monthlyPriceUsd: plan.monthlyPriceUsd,
    annualPerMonthUsd: plan.annualPerMonthUsd,
    annualTotalUsd: plan.annualTotalUsd,
    features: plan.features,
    color: plan.color,
    category: plan.category,
    recommended: plan.recommended,
    gradient: plan.gradient,
    borderColor: plan.borderColor,
    description: plan.description,
}));

function hexToRgba(hex: string, alpha: number) {
    const value = hex.replace('#', '');
    const safe = value.length === 3
        ? value.split('').map((char) => char + char).join('')
        : value;
    const int = Number.parseInt(safe, 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function SubscriptionsScreen() {
    const appTheme = useAppTheme();
    const styles = useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);

    const router = useRouter();
    const { showToast } = useToastStore();
    const { role, activeAppMode, setActiveAppMode } = useUserStore();
    const { actualRole } = useAuthStore();

    const currentPlan = (actualRole || role || 'shoout') as SubscriptionPlanId;
    const [activeCategory, setActiveCategory] = useState<PlanCategory>('Shoouts');
    const [selectedPlan, setSelectedPlan] = useState<(typeof PLANS)[0] | null>(null);
    const [isAnnual, setIsAnnual] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [showSuccessSplash, setShowSuccessSplash] = useState(false);
    const [splashPlanName, setSplashPlanName] = useState('');
    const [splashAccent, setSplashAccent] = useState('#EC5C39');
    const [pendingTxRef, setPendingTxRef] = useState<string>('');
    const splashAnim = React.useRef(new Animated.Value(0)).current;

    const activeCategoryColor = CATEGORY_TABS.find((tab) => tab.id === activeCategory)?.color || '#EC5C39';

    const visiblePlans = useMemo(
        () => PLANS.filter((plan) => plan.category === activeCategory),
        [activeCategory]
    );

    const buildSubscriptionTxRef = () => `shoouts_sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const showUpgradeSuccess = (planId: string) => {
        setSplashPlanName(planId.replace('_', ' ').toUpperCase());
        setSplashAccent(getSubscriptionPlan(planId as SubscriptionPlanId).color);
        setShowSuccessSplash(true);
        Animated.sequence([
            Animated.timing(splashAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.delay(2500),
            Animated.timing(splashAnim, { toValue: 0, duration: 400, useNativeDriver: true })
        ]).start(() => setShowSuccessSplash(false));
    };

    const activatePlanOnServer = async (planId: SubscriptionPlanId, txRef?: string) => {
        if (!auth.currentUser) {
            throw new Error('You must be logged in to upgrade.');
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
                billingCycle: isAnnual ? 'annual' : 'monthly',
                txRef: txRef || null,
            }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
            throw new Error(payload?.error || 'Subscription activation failed.');
        }
    };

    const handlePaymentVerifiedUpgrade = async (planId: SubscriptionPlanId, txRef?: string) => {
        try {
            setIsVerifying(true);
            // For free upgrades (e.g., 'shoout' plan or $0 price), activate immediately
            // For paid plans, the client must WAIT for the webhook to process before calling this
            // DO NOT call activatePlanOnServer() on the Flutterwave callback - that's a security vulnerability!
            // Instead, rely on the backend webhook and Firestore listener below
            
            if (!txRef) {
                // Free upgrade path - safe to activate immediately
                await activatePlanOnServer(planId, txRef);
                await hydrateSubscriptionTier();
                setActiveAppMode(planId);
                showUpgradeSuccess(planId);
            } else {
                // Paid upgrade path - DO NOT activate on client callback
                // The webhook will process the transaction and update Firestore
                // We'll listen to Firestore and show splash when backend confirms
                console.info('Payment received - awaiting webhook validation for txRef:', txRef);
                // For now, just show a waiting message
                showToast('Payment received. Confirming with our server...', 'info');
            }
        } catch (error: any) {
            showToast(error?.message || 'Could not verify your payment.', 'error');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleUpgradePress = (plan: (typeof PLANS)[0], dueUsd: number) => {
        if (plan.id === 'shoout' || dueUsd === 0) {
            handlePaymentVerifiedUpgrade(plan.id as SubscriptionPlanId);
            return;
        }
        
        // Validate Flutterwave configuration before proceeding
        if (!process.env.EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY) {
            throw new Error('EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY is not configured. Payment cannot be processed.');
        }
        
        setSelectedPlan(plan);
        setPendingTxRef(buildSubscriptionTxRef());
        setShowPaymentModal(true);
    };

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <SettingsHeader title="Premium Plans" onBack={() => router.back()} />

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <BlurView intensity={Platform.OS === 'ios' ? 80 : 0} style={styles.introBlurWrapper}>
                        <View style={styles.introSection}>
                            <Sparkles size={40} color={activeCategoryColor} />
                            <Text style={styles.introTitle}>Choose Your Shoouts Experience</Text>
                            <Text style={styles.introSubtitle}>One switcher. Five experiences. Upgrade when you are ready.</Text>

                            <View style={styles.categoryTabsRow}>
                                {CATEGORY_TABS.map((tab) => {
                                    const isActive = activeCategory === tab.id;
                                    return (
                                        <TouchableOpacity
                                            key={tab.id}
                                            style={[
                                                styles.categoryTab,
                                                isActive && { backgroundColor: tab.color + '22', borderColor: tab.color },
                                            ]}
                                            onPress={() => setActiveCategory(tab.id)}
                                            activeOpacity={0.75}
                                        >
                                            <Text style={[
                                                styles.categoryTabText,
                                                isActive && { color: tab.color, fontFamily: 'Poppins-Bold' },
                                            ]}>
                                                {tab.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={styles.hybridNote}>Current plan: {currentPlan.replace('_', ' ').toUpperCase()} | Active switcher mode: {activeAppMode.replace('_', ' ').toUpperCase()}</Text>

                            <View style={styles.billingToggleRow}>
                                <Text style={[styles.billingToggleText, !isAnnual && styles.activeBillingText]}>Monthly</Text>
                                <Switch
                                    value={isAnnual}
                                    onValueChange={setIsAnnual}
                                    trackColor={{ false: appTheme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(23,18,19,0.18)', true: activeCategoryColor }}
                                    thumbColor={appTheme.colors.backgroundElevated}
                                    style={styles.billingToggleSwitch}
                                />
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={[styles.billingToggleText, isAnnual && styles.activeBillingText]}>Annually </Text>
                                    <View style={[styles.discountBadge, { backgroundColor: hexToRgba(activeCategoryColor, 0.2) }]}>
                                        <Text style={[styles.discountBadgeText, { color: activeCategoryColor }]}>Switcher Ready</Text>
                                    </View>
                                </View>
                            </View>
                            <Text style={[styles.discountNote, { color: hexToRgba(activeCategoryColor, 0.8) }]}>All five subscriptions are represented in the app switcher.</Text>
                        </View>
                    </BlurView>

                    {visiblePlans.map((plan) => {
                        const isCurrentPlan = currentPlan === plan.id;
                        const isHybridPlan = plan.id === 'hybrid';
                        const planColor = isHybridPlan ? (appTheme.isDark ? '#E5C158' : '#D4AF37') : plan.color;
                        const planTextAccent = isHybridPlan ? (appTheme.isDark ? '#F4D03F' : '#B8860B') : plan.color;
                        const planBorderColor = isHybridPlan ? planColor : plan.borderColor;
                        const planGradient = isHybridPlan
                            ? (appTheme.isDark
                                ? (['rgba(244, 208, 63, 0.22)', 'rgba(212, 175, 55, 0.1)', 'rgba(0,0,0,0)'] as const)
                                : (['rgba(212, 175, 55, 0.18)', 'rgba(170, 119, 28, 0.08)', 'rgba(0,0,0,0)'] as const))
                            : plan.gradient;
                        const dueUsd = isAnnual ? plan.annualTotalUsd : plan.monthlyPriceUsd;
                        const priceDisplay = dueUsd === 0 ? 'Free' : `${formatUsd(isAnnual ? plan.annualPerMonthUsd : plan.monthlyPriceUsd)}`;

                        return (
                            <View key={plan.id} style={[styles.cardWrapper, { borderColor: planBorderColor }]}> 
                                <LinearGradient
                                    colors={planGradient as readonly [string, string, ...string[]]}
                                    style={StyleSheet.absoluteFillObject}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />

                                {plan.recommended && (
                                    <View style={[styles.recommendedBadge, { backgroundColor: planColor }]}> 
                                        <Star
                                            size={12}
                                            color={adaptLegacyColor('#140F10', 'color', appTheme)}
                                            fill={adaptLegacyColor('#140F10', 'color', appTheme)}
                                        />
                                        <Text style={styles.recommendedText}>MOST POPULAR</Text>
                                    </View>
                                )}

                                <View style={styles.planHeader}>
                                    <View style={[styles.categoryBadge, { backgroundColor: planColor + '20' }]}> 
                                        <Text style={[styles.categoryText, { color: planTextAccent }]}>{plan.category}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={styles.planName}>{plan.name}</Text>
                                        {isCurrentPlan && (
                                            <View style={styles.activeBadge}>
                                                <Check size={12} color={appTheme.colors.textPrimary} />
                                                <Text style={styles.activeText}>Current Plan</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.planDescription}>{plan.description}</Text>
                                    <View style={styles.priceRow}>
                                        <Text style={styles.planPrice}>{priceDisplay}</Text>
                                        {dueUsd > 0 && <Text style={styles.planPeriod}>/{isAnnual ? 'month (annual billing)' : 'month'}</Text>}
                                    </View>
                                    {isAnnual && plan.annualTotalUsd > 0 ? (
                                        <Text style={[styles.annualTotalText, { color: hexToRgba(planTextAccent, 0.95) }]}>Billed as {formatUsd(plan.annualTotalUsd)} per year (charged in NGN)</Text>
                                    ) : null}
                                </View>

                                <View style={styles.featuresList}>
                                    {plan.features.map((feature, idx) => (
                                        <View key={idx} style={styles.featureItem}>
                                            <View style={[styles.checkCircle, { backgroundColor: planColor + '15' }]}> 
                                                <Check size={14} color={planTextAccent} strokeWidth={3} />
                                            </View>
                                            <Text style={styles.featureText}>{feature}</Text>
                                        </View>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        isCurrentPlan ? styles.disabledButton : (isHybridPlan ? styles.hybridActionButton : { backgroundColor: planColor })
                                    ]}
                                    onPress={() => handleUpgradePress(plan, dueUsd)}
                                    disabled={isCurrentPlan}
                                >
                                    {!isCurrentPlan && isHybridPlan && appTheme.isDark ? (
                                        <LinearGradient
                                            colors={['#F4D03F', '#D4AF37']}
                                            style={StyleSheet.absoluteFillObject}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        />
                                    ) : null}
                                    <Text style={[styles.actionButtonText, isCurrentPlan && { color: appTheme.colors.textDisabled }, isHybridPlan && !isCurrentPlan ? { color: '#121212' } : null]}> 
                                        {isCurrentPlan ? 'Current Plan' : plan.id === 'shoout' ? 'Switch to Shoouts' : 'Select Plan'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })}

                    <View style={styles.footerInfo}>
                        <ShieldCheck size={20} color={appTheme.colors.textDisabled} />
                        <Text style={styles.footerText}>Flutterwave is live for paid plans. Shoouts and Vault free flows switch instantly.</Text>
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>

                <Modal visible={showPaymentModal} transparent animationType="slide">
                    <BlurView intensity={appTheme.isDark ? 30 : 20} tint={appTheme.isDark ? 'dark' : 'light'} style={styles.modalOverlay}>
                        <View style={[styles.modalOverlayDim, { backgroundColor: appTheme.isDark ? 'rgba(10,10,16,0.44)' : 'rgba(20,15,16,0.32)' }]} />
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Payment Method</Text>
                                <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                                    <Text style={styles.closeText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.paymentAmountInfo}>
                                Total: {formatUsd(isAnnual ? (selectedPlan?.annualTotalUsd ?? 0) : (selectedPlan?.monthlyPriceUsd ?? 0))} (NGN {usdToNgn(isAnnual ? (selectedPlan?.annualTotalUsd ?? 0) : (selectedPlan?.monthlyPriceUsd ?? 0)).toLocaleString()} via Flutterwave)
                            </Text>

                            {Platform.OS === 'web' ? (
                                <View style={styles.webPaymentNotice}>
                                    <CreditCard color={appTheme.colors.textTertiary} size={28} />
                                    <Text style={styles.webPaymentTitle}>Mobile Payment Required</Text>
                                    <Text style={styles.webPaymentSub}>
                                        Flutterwave payments are not supported in the browser.{"\n"}
                                        Please open the Shoouts app on your Android or iOS device to subscribe.
                                    </Text>
                                </View>
                            ) : (
                                <PayWithFlutterwave
                                    onRedirect={(data) => {
                                        setShowPaymentModal(false);
                                        // === CRITICAL SECURITY FIX ===
                                        // DO NOT activate the subscription here based on client-side callback
                                        // The Flutterwave callback can be spoofed with network interception tools
                                        // INSTEAD:
                                        // 1. The backend webhook will validate the payment
                                        // 2. The webhook updates subscriptionTier in Firestore
                                        // 3. The client listens to Firestore and shows splash when backend confirms
                                        
                                        if (data.status === 'successful' && selectedPlan) {
                                            // Payment callback received - now wait for webhook confirmation
                                            const txRef = data?.tx_ref || pendingTxRef;
                                            showToast('Payment processing... Please wait for confirmation', 'info');
                                            console.info('Flutterwave callback received, awaiting backend webhook verification:', txRef);
                                            // Do NOT call handlePaymentVerifiedUpgrade here!
                                            // The backend webhook will handle the actual plan activation
                                        } else {
                                            showToast('Payment was not successful.', 'error');
                                        }
                                    }}
                                    options={{
                                        tx_ref: pendingTxRef || buildSubscriptionTxRef(),
                                        authorization: process.env.EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY!,
                                        customer: {
                                            email: auth.currentUser?.email || 'customer@shoouts.com'
                                        },
                                        amount: usdToNgn(isAnnual ? (selectedPlan?.annualTotalUsd ?? 0) : (selectedPlan?.monthlyPriceUsd ?? 0)),
                                        currency: 'NGN',
                                        payment_options: 'card'
                                    }}
                                    customButton={(props) => (
                                        <TouchableOpacity style={styles.paymentOption} onPress={props.onPress} disabled={props.disabled}>
                                            <CreditCard color={appTheme.colors.textSecondary} size={24} />
                                            <View style={styles.payOptionTexts}>
                                                <Text style={styles.payOptionTitle}>Pay with Flutterwave</Text>
                                                <Text style={styles.payOptionSub}>Secured localized payment (NGN)</Text>
                                            </View>
                                            <ChevronLeft size={20} color={appTheme.colors.textTertiary} style={{ transform: [{ rotate: '180deg' }] }} />
                                        </TouchableOpacity>
                                    )}
                                />
                            )}

                            <View style={styles.disabledPaymentNotice}>
                                <CreditCard color="rgba(99,91,255,0.6)" size={20} />
                                <Text style={styles.disabledPaymentNoticeText}>Stripe is temporarily unavailable. Flutterwave is currently the active checkout option.</Text>
                            </View>
                        </View>
                    </BlurView>
                </Modal>

                {isVerifying && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator color={appTheme.colors.textPrimary} size="large" />
                        <Text style={styles.loadingText}>Processing Secure Payment...</Text>
                    </View>
                )}

                {showSuccessSplash && (
                    <Animated.View style={[styles.splashOverlay, { opacity: splashAnim }]}> 
                        <LinearGradient
                            colors={[appTheme.colors.background, hexToRgba(splashAccent, 0.72), appTheme.colors.background]}
                            style={StyleSheet.absoluteFillObject}
                        />
                        <PartyPopper size={80} color={splashAccent} style={{ marginBottom: 20 }} />
                        <Text style={styles.splashTitle}>Welcome to Premium!</Text>
                        <Text style={[styles.splashSub, { color: splashAccent }]}>You are now on the {splashPlanName} experience.</Text>
                    </Animated.View>
                )}
            </View>
        </SafeScreenWrapper>
    );
}

const legacyStyles = {
    container: { flex: 1, backgroundColor: '#140F10' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
    introBlurWrapper: { borderRadius: 16, overflow: 'hidden', marginBottom: 8 },
    introSection: { alignItems: 'center', marginBottom: 35, textAlign: 'center', paddingVertical: 12 },
    introTitle: { fontSize: 24, fontFamily: 'Poppins-Bold', color: '#FFF', marginTop: 15, textAlign: 'center' },
    introSubtitle: { fontSize: 15, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.72)', marginTop: 8, textAlign: 'center' },
    categoryTabsRow: { flexDirection: 'row', marginTop: 20, gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
    categoryTab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center' },
    categoryTabText: { fontSize: 13, fontFamily: 'Poppins-SemiBold', color: 'rgba(255,255,255,0.7)' },
    hybridNote: { marginTop: 12, fontSize: 12, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingHorizontal: 8 },
    billingToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20, backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, gap: 12 },
    billingToggleText: { fontSize: 14, fontFamily: 'Poppins-Medium', color: 'rgba(255,255,255,0.74)' },
    activeBillingText: { color: '#FFF', fontFamily: 'Poppins-Bold' },
    billingToggleSwitch: { transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] },
    discountBadge: { backgroundColor: 'rgba(236, 92, 57, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 4 },
    discountBadgeText: { color: '#EC5C39', fontSize: 10, fontFamily: 'Poppins-Bold' },
    discountNote: { marginTop: 8, fontSize: 11, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.72)' },
    cardWrapper: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 24, marginBottom: 20, borderWidth: 1, position: 'relative', overflow: 'hidden' },
    recommendedBadge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: 12, paddingVertical: 6, borderBottomLeftRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 10 },
    recommendedText: { color: '#140F10', fontSize: 10, fontFamily: 'Poppins-Bold', letterSpacing: 1 },
    planHeader: { marginBottom: 20 },
    categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 12 },
    categoryText: { fontSize: 10, fontFamily: 'Poppins-Bold', textTransform: 'uppercase', letterSpacing: 1 },
    activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    activeText: { color: '#FFF', fontSize: 12, fontFamily: 'Poppins-Bold' },
    planName: { fontSize: 26, fontFamily: 'Poppins-Bold', color: '#FFF' },
    planDescription: { marginTop: 8, color: 'rgba(255,255,255,0.78)', fontSize: 13, fontFamily: 'Poppins-Regular' },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
    planPrice: { fontSize: 32, fontFamily: 'Poppins-Bold', color: '#FFF', letterSpacing: -0.5 },
    planPeriod: { fontSize: 13, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.72)', marginLeft: 6 },
    annualTotalText: { fontSize: 12, fontFamily: 'Poppins-Medium', color: 'rgba(236, 92, 57, 0.9)', marginTop: 4 },
    featuresList: { gap: 14, marginBottom: 26 },
    featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    featureText: { fontSize: 15, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.85)' },
    actionButton: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    hybridActionButton: { backgroundColor: '#D4AF37', overflow: 'hidden' },
    disabledButton: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    actionButtonText: { color: '#FFF', fontSize: 16, fontFamily: 'Poppins-Bold' },
    footerInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 20, backgroundColor: 'rgba(255,255,255,0.03)', padding: 18, borderRadius: 16 },
    footerText: { flex: 1, fontSize: 13, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.74)', textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
    modalOverlayDim: { ...StyleSheet.absoluteFillObject },
    modalContent: { backgroundColor: 'rgba(30, 26, 27, 0.76)', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderBottomWidth: 0 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#FFF' },
    closeText: { fontSize: 14, fontFamily: 'Poppins-Bold', color: 'rgba(255,255,255,0.8)' },
    paymentAmountInfo: { fontSize: 24, fontFamily: 'Poppins-Bold', color: '#FFF', marginBottom: 24, textAlign: 'center' },
    paymentOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    payOptionTexts: { flex: 1, marginLeft: 16 },
    payOptionTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', color: '#FFF' },
    payOptionSub: { fontSize: 13, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.76)' },
    disabledPaymentNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(99, 91, 255, 0.25)',
        backgroundColor: 'rgba(99, 91, 255, 0.08)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 10,
    },
    disabledPaymentNoticeText: {
        flex: 1,
        color: 'rgba(255,255,255,0.7)',
        fontFamily: 'Poppins-Regular',
        fontSize: 12,
    },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
    loadingText: { color: '#FFF', fontFamily: 'Poppins-Bold', marginTop: 16, fontSize: 16 },
    splashOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 1000, backgroundColor: '#140F10' },
    splashTitle: { color: '#FFF', fontSize: 28, fontFamily: 'Poppins-Bold', textAlign: 'center', marginHorizontal: 20 },
    splashSub: { color: '#D4AF37', fontSize: 16, fontFamily: 'Poppins-Medium', textAlign: 'center', marginTop: 10, marginHorizontal: 20 },
    webPaymentNotice: { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16, gap: 10, backgroundColor: 'rgba(236, 92, 57, 0.08)', borderWidth: 1, borderColor: 'rgba(236, 92, 57, 0.25)' },
    webPaymentTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', color: '#FFF', textAlign: 'center' },
    webPaymentSub: { fontSize: 13, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 20 },
};
