import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { auth } from '@/firebaseConfig';
import { useUserStore } from '@/store/useUserStore';
import { hydrateSubscriptionTier } from '@/utils/subscriptionVerification';
import { formatUsd, ngnToUsd, usdToNgn } from '@/utils/pricing';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { PayWithFlutterwave } from 'flutterwave-react-native';
import { Check, CreditCard, PartyPopper, ShieldCheck, Sparkles, Star, ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

const SUBSCRIPTION_VERIFY_URL = process.env.EXPO_PUBLIC_SUBSCRIPTION_VERIFY_URL;

type GradientColors = readonly [string, string, ...string[]];
type PlanCategory = 'Vault' | 'Studio' | 'Hybrid';

const CATEGORY_TABS: { id: PlanCategory; label: string; color: string }[] = [
    { id: 'Vault', label: 'Vault', color: '#EC5C39' },
    { id: 'Studio', label: 'Studio', color: '#4CAF50' },
    { id: 'Hybrid', label: 'Hybrid', color: '#FFD700' },
];

/** USD list prices; NGN charged at checkout = usdToNgn(...) to match Cloud Functions. */
const PLANS = [
    {
        id: 'vault',
        name: 'Vault',
        monthlyPriceUsd: 0,
        annualPerMonthUsd: 0,
        annualTotalUsd: 0,
        features: ['Private Folder Sharing', 'Shareable Secure Links', 'Basic Tracking'],
        color: '#EC5C39',
        category: 'Vault',
        gradient: ['rgba(236, 92, 57, 0.15)', 'rgba(236, 92, 57, 0.05)', 'rgba(0,0,0,0)'] as unknown as GradientColors,
        borderColor: '#EC5C39'
    },
    {
        id: 'vault_pro',
        name: 'Vault Pro',
        monthlyPriceUsd: ngnToUsd(13962),
        annualPerMonthUsd: ngnToUsd(13962),
        annualTotalUsd: ngnToUsd(13962 * 12),
        features: ['Advanced Tracking', 'File Locking & Permissions'],
        color: '#EC5C39',
        category: 'Vault',
        gradient: ['rgba(236, 92, 57, 0.15)', 'rgba(236, 92, 57, 0.05)', 'rgba(0,0,0,0)'] as unknown as GradientColors,
        borderColor: '#EC5C39'
    },
    {
        id: 'studio',
        name: 'Studio',
        monthlyPriceUsd: ngnToUsd(27000),
        annualPerMonthUsd: ngnToUsd(22950),
        annualTotalUsd: ngnToUsd(22950 * 12),
        features: ['Unlimited Listings', 'Buyer-Seller Chat', 'Pricing & License Control', 'Payout Access', 'Standard Visibility'],
        color: '#4CAF50',
        category: 'Studio',
        recommended: true,
        gradient: ['rgba(76, 175, 80, 0.15)', 'rgba(76, 175, 80, 0.05)', 'rgba(0,0,0,0)'] as unknown as GradientColors,
        borderColor: '#4CAF50'
    },
    {
        id: 'hybrid',
        name: 'Hybrid',
        monthlyPriceUsd: ngnToUsd(34906),
        annualPerMonthUsd: ngnToUsd(29670),
        annualTotalUsd: ngnToUsd(29670 * 12),
        features: ['Team Collaboration', 'Dedicated Support', '10% Transaction Fee'],
        color: '#FFD700',
        category: 'Hybrid',
        gradient: ['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)', 'rgba(0,0,0,0)'] as unknown as GradientColors,
        borderColor: '#FFD700'
    }
];

// Note: Flutterwave implementation is rendered as a component

export default function SubscriptionsScreen() {
    const router = useRouter();
    const { role } = useUserStore();

    const [activeCategory, setActiveCategory] = useState<PlanCategory>('Vault');
    const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
    const [isAnnual, setIsAnnual] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [showSuccessSplash, setShowSuccessSplash] = useState(false);
    const [splashPlanName, setSplashPlanName] = useState("");
    const [pendingTxRef, setPendingTxRef] = useState<string>('');
    const splashAnim = React.useRef(new Animated.Value(0)).current;

    const buildSubscriptionTxRef = () => {
        return `shoouts_sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    };

    const handleUpgradePress = (plan: typeof PLANS[0], dueUsd: number) => {
        if (dueUsd === 0) {
            handlePaymentVerifiedUpgrade(plan.id);
            return;
        }
        setSelectedPlan(plan);
        setPendingTxRef(buildSubscriptionTxRef());
        setShowPaymentModal(true);
    };

    const showUpgradeSuccess = (planId: string) => {
        setSplashPlanName(planId.replace('_', ' ').toUpperCase());
        setShowSuccessSplash(true);
        Animated.sequence([
            Animated.timing(splashAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.delay(2500),
            Animated.timing(splashAnim, { toValue: 0, duration: 400, useNativeDriver: true })
        ]).start(() => setShowSuccessSplash(false));
    };

    const activatePlanOnServer = async (planId: string, txRef?: string) => {
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

    const handlePaymentVerifiedUpgrade = async (planId: string, txRef?: string) => {
        try {
            setIsVerifying(true);
            await activatePlanOnServer(planId, txRef);
            await hydrateSubscriptionTier();
            showUpgradeSuccess(planId);
        } catch (error: any) {
            Alert.alert('Payment verification failed', error?.message || 'Could not verify your payment.');
        } finally {
            setIsVerifying(false);
        }
    };



    const handleStripePayment = () => {
        setShowPaymentModal(false);
        Alert.alert(
            'Stripe unavailable',
            'Stripe/Google Pay checkout is disabled until secure backend verification is deployed. Use Flutterwave for now.'
        );
    };

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                {/* Header */}
                <SettingsHeader title="Premium Plans" onBack={() => router.back()} />

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.introSection}>
                        <Sparkles size={40} color="#EC5C39" />
                        <Text style={styles.introTitle}>Elevate your Music Journey</Text>
                        <Text style={styles.introSubtitle}>Choose the plan that fits your growth on Shoouts.</Text>

                        {/* Category Tabs */}
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

                        {activeCategory === 'Hybrid' && (
                            <Text style={styles.hybridNote}>
                                Hybrid plans unlock both Vault &amp; Studio. Switch freely between modes at any time.
                            </Text>
                        )}

                        {/* Annual Billing Toggle */}
                        <View style={styles.billingToggleRow}>
                            <Text style={[styles.billingToggleText, !isAnnual && styles.activeBillingText]}>Monthly</Text>
                            <Switch
                                value={isAnnual}
                                onValueChange={setIsAnnual}
                                trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#EC5C39' }}
                                thumbColor="#FFF"
                                style={styles.billingToggleSwitch}
                            />
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[styles.billingToggleText, isAnnual && styles.activeBillingText]}>Annually </Text>
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountBadgeText}>Save 15%*</Text>
                                </View>
                            </View>
                        </View>
                        <Text style={styles.discountNote}>*Vault Pro annual billing has no discount.</Text>
                    </View>

                    {PLANS.filter(p => p.category === activeCategory).map((plan) => {
                        const isCurrentPlan = role === plan.id;
                        const dueUsd = isAnnual ? plan.annualPerMonthUsd : plan.monthlyPriceUsd;
                        const priceDisplay = dueUsd === 0 ? 'Free' : `${formatUsd(dueUsd)}`;
                        const isDiscounted = isAnnual && dueUsd > 0 && plan.id !== 'vault_pro';

                        return (
                            <View key={plan.id} style={[styles.cardWrapper, { borderColor: plan.borderColor }]}>
                                <LinearGradient
                                    colors={plan.gradient}
                                    style={StyleSheet.absoluteFillObject}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />

                                {(plan as any).recommended && (
                                    <View style={[styles.recommendedBadge, { backgroundColor: plan.color }]}>
                                        <Star size={12} color="#140F10" fill="#140F10" />
                                        <Text style={styles.recommendedText}>MOST POPULAR</Text>
                                    </View>
                                )}

                                <View style={styles.planHeader}>
                                    <View style={[styles.categoryBadge, { backgroundColor: plan.color + '20' }]}>
                                        <Text style={[styles.categoryText, { color: plan.color }]}>{plan.category}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={styles.planName}>{plan.name}</Text>
                                        {isCurrentPlan && (
                                            <View style={styles.activeBadge}>
                                                <Check size={12} color="#FFF" />
                                                <Text style={styles.activeText}>Active</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.priceRow}>
                                        <Text style={styles.planPrice}>{priceDisplay}</Text>
                                        {dueUsd > 0 && <Text style={styles.planPeriod}>/{isAnnual ? 'month (annual billing)' : 'month'}</Text>}
                                    </View>
                                    {isAnnual && plan.annualTotalUsd > 0 ? (
                                        <Text style={styles.annualTotalText}>Billed as {formatUsd(plan.annualTotalUsd)} per year (charged in NGN)</Text>
                                    ) : null}
                                </View>

                                <View style={styles.featuresList}>
                                    {plan.features.map((feature, idx) => (
                                        <View key={idx} style={styles.featureItem}>
                                            <View style={[styles.checkCircle, { backgroundColor: plan.color + '15' }]}>
                                                <Check size={14} color={plan.color} strokeWidth={3} />
                                            </View>
                                            <Text style={styles.featureText}>{feature}</Text>
                                        </View>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        isCurrentPlan ? styles.disabledButton : { backgroundColor: plan.color }
                                    ]}
                                    onPress={() => handleUpgradePress(plan, isAnnual ? plan.annualTotalUsd : plan.monthlyPriceUsd)}
                                    disabled={isCurrentPlan}
                                >
                                    <Text style={[styles.actionButtonText, isCurrentPlan && { color: 'rgba(255,255,255,0.4)' }]}>
                                        {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        );
                    })}

                    <View style={styles.footerInfo}>
                        <ShieldCheck size={20} color="rgba(255,255,255,0.4)" />
                        <Text style={styles.footerText}>Secure payment processing via Stripe and Flutterwave.</Text>
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>

                {/* Flutterwave Integration */}

                {/* Overaly Modal for Payment Selection */}
                <Modal visible={showPaymentModal} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
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
                                    <CreditCard color="#EC5C39" size={28} />
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
                                        if (data.status === 'successful' && selectedPlan) {
                                            const txRef = data?.tx_ref || pendingTxRef;
                                            handlePaymentVerifiedUpgrade(selectedPlan.id, txRef);
                                        } else {
                                            Alert.alert('Payment not completed', 'Your payment was not successful.');
                                        }
                                    }}
                                    options={{
                                        tx_ref: pendingTxRef || buildSubscriptionTxRef(),
                                        authorization: process.env.EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || "FLWPUBK_TEST-dummy-X",
                                        customer: {
                                            email: auth.currentUser?.email || "customer@shoouts.com"
                                        },
                                        amount: usdToNgn(isAnnual ? (selectedPlan?.annualTotalUsd ?? 0) : (selectedPlan?.monthlyPriceUsd ?? 0)),
                                        currency: 'NGN',
                                        payment_options: 'card'
                                    }}
                                    customButton={(props) => (
                                        <TouchableOpacity style={styles.paymentOption} onPress={props.onPress} disabled={props.disabled}>
                                            <CreditCard color="#EC5C39" size={24} />
                                            <View style={styles.payOptionTexts}>
                                                <Text style={styles.payOptionTitle}>Pay with Flutterwave</Text>
                                                <Text style={styles.payOptionSub}>Secured localized payment (NGN)</Text>
                                            </View>
                                            <ChevronLeft size={20} color="rgba(255,255,255,0.2)" style={{ transform: [{ rotate: '180deg' }] }} />
                                        </TouchableOpacity>
                                    )}
                                />
                            )}

                            <TouchableOpacity style={[styles.paymentOption, { marginBottom: 10 }]} onPress={handleStripePayment}>
                                <CreditCard color="#635BFF" size={24} />
                                <View style={styles.payOptionTexts}>
                                    <Text style={styles.payOptionTitle}>Pay with Stripe</Text>
                                    <Text style={styles.payOptionSub}>Disabled until backend verification is live</Text>
                                </View>
                                <ChevronLeft size={20} color="rgba(255,255,255,0.2)" style={{ transform: [{ rotate: '180deg' }] }} />
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.paymentOption, { marginBottom: 10 }]} onPress={handleStripePayment}>
                                <CreditCard color="#4285F4" size={24} />
                                <View style={styles.payOptionTexts}>
                                    <Text style={styles.payOptionTitle}>Pay with Google Pay</Text>
                                    <Text style={styles.payOptionSub}>Disabled until backend verification is live</Text>
                                </View>
                                <ChevronLeft size={20} color="rgba(255,255,255,0.2)" style={{ transform: [{ rotate: '180deg' }] }} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Loading state for Stripe simulation */}
                {isVerifying && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator color="#FFF" size="large" />
                        <Text style={styles.loadingText}>Processing Secure Payment...</Text>
                    </View>
                )}

                {/* Success Splash Overlay */}
                {showSuccessSplash && (
                    <Animated.View style={[styles.splashOverlay, { opacity: splashAnim }]}>
                        <LinearGradient
                            colors={['#140F10', '#EC5C39', '#140F10']}
                            style={StyleSheet.absoluteFillObject}
                        />
                        <PartyPopper size={80} color="#FFD700" style={{ marginBottom: 20 }} />
                        <Text style={styles.splashTitle}>Welcome to Premium!</Text>
                        <Text style={styles.splashSub}>You are now on the {splashPlanName} plan.</Text>
                    </Animated.View>
                )}
            </View>
        </SafeScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#140F10' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
    introSection: { alignItems: 'center', marginBottom: 35, textAlign: 'center' },
    introTitle: { fontSize: 24, fontFamily: 'Poppins-Bold', color: '#FFF', marginTop: 15, textAlign: 'center' },
    introSubtitle: { fontSize: 15, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.5)', marginTop: 8, textAlign: 'center' },

    categoryTabsRow: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 8,
    },
    categoryTab: {
        flex: 1,
        paddingVertical: 9,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        alignItems: 'center',
    },
    categoryTabText: {
        fontSize: 13,
        fontFamily: 'Poppins-SemiBold',
        color: 'rgba(255,255,255,0.45)',
    },
    hybridNote: {
        marginTop: 12,
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,215,0,0.7)',
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    billingToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        backgroundColor: 'rgba(255,255,255,0.03)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        gap: 12,
    },
    billingToggleText: { fontSize: 14, fontFamily: 'Poppins-Medium', color: 'rgba(255,255,255,0.5)' },
    activeBillingText: { color: '#FFF', fontFamily: 'Poppins-Bold' },
    billingToggleSwitch: { transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] },
    discountBadge: { backgroundColor: 'rgba(236, 92, 57, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 4 },
    discountBadgeText: { color: '#EC5C39', fontSize: 10, fontFamily: 'Poppins-Bold' },
    discountNote: { marginTop: 8, fontSize: 11, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.45)' },

    cardWrapper: {
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        position: 'relative',
        overflow: 'hidden',
    },
    recommendedBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderBottomLeftRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        zIndex: 10,
    },
    recommendedText: { color: '#140F10', fontSize: 10, fontFamily: 'Poppins-Bold', letterSpacing: 1 },
    planHeader: { marginBottom: 20 },
    categoryBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 12,
    },
    categoryText: { fontSize: 10, fontFamily: 'Poppins-Bold', textTransform: 'uppercase', letterSpacing: 1 },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    activeText: { color: '#FFF', fontSize: 12, fontFamily: 'Poppins-Bold' },
    planName: { fontSize: 26, fontFamily: 'Poppins-Bold', color: '#FFF' },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
    planPrice: { fontSize: 32, fontFamily: 'Poppins-Bold', color: '#FFF', letterSpacing: -0.5 },
    planPeriod: { fontSize: 13, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.5)', marginLeft: 6 },
    annualTotalText: { fontSize: 12, fontFamily: 'Poppins-Medium', color: 'rgba(236, 92, 57, 0.9)', marginTop: 4 },
    featuresList: { gap: 14, marginBottom: 26 },
    featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureText: { fontSize: 15, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.85)' },
    actionButton: {
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledButton: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    actionButtonText: { color: '#FFF', fontSize: 16, fontFamily: 'Poppins-Bold' },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginTop: 20,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 18,
        borderRadius: 16,
    },
    footerText: { flex: 1, fontSize: 13, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.4)', textAlign: 'center' },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1E1A1A',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#FFF' },
    closeText: { fontSize: 14, fontFamily: 'Poppins-Bold', color: 'rgba(255,255,255,0.5)' },
    paymentAmountInfo: { fontSize: 24, fontFamily: 'Poppins-Bold', color: '#FFF', marginBottom: 24, textAlign: 'center' },
    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    payOptionTexts: {
        flex: 1,
        marginLeft: 16,
    },
    payOptionTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', color: '#FFF' },
    payOptionSub: { fontSize: 13, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.5)' },

    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999
    },
    loadingText: { color: '#FFF', fontFamily: 'Poppins-Bold', marginTop: 16, fontSize: 16 },
    splashOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backgroundColor: '#140F10'
    },
    splashTitle: { color: '#FFF', fontSize: 28, fontFamily: 'Poppins-Bold', textAlign: 'center', marginHorizontal: 20 },
    splashSub: { color: '#FFD700', fontSize: 16, fontFamily: 'Poppins-Medium', textAlign: 'center', marginTop: 10, marginHorizontal: 20 },

    // Web-only: Flutterwave CORS notice
    webPaymentNotice: {
        backgroundColor: 'rgba(236, 92, 57, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(236, 92, 57, 0.25)',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    webPaymentTitle: { fontSize: 16, fontFamily: 'Poppins-Bold', color: '#FFF', textAlign: 'center' },
    webPaymentSub: { fontSize: 13, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 20 },
});
