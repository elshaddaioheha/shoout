import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { UserRole, useUserStore } from '@/store/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import { Check, ChevronLeft, CreditCard, ShieldCheck, Sparkles, Star } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { usePaystack } from 'react-native-paystack-webview';

const { width } = Dimensions.get('window');

type GradientColors = readonly [string, string, ...string[]];

const PLANS = [
    {
        id: 'vault_free',
        name: 'Vault Free',
        price: 'NGN 0',
        numericPrice: 0,
        period: '/month',
        features: ['50MB Cloud Storage', 'Private Links', 'Basic Stats', 'Safe Transfer'],
        color: '#767676',
        category: 'Vault',
        gradient: ['rgba(118,118,118,0.1)', 'rgba(0,0,0,0)'] as unknown as GradientColors,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    {
        id: 'vault_pro',
        name: 'Vault Pro',
        price: 'NGN 5,000',
        numericPrice: 5000,
        period: '/month',
        features: ['1GB Cloud Storage', 'Advanced Analytics', 'Custom Branding', 'Priority Support'],
        color: '#EC5C39',
        category: 'Vault',
        recommended: true,
        gradient: ['rgba(236, 92, 57, 0.15)', 'rgba(236, 92, 57, 0.05)', 'rgba(0,0,0,0)'] as unknown as GradientColors,
        borderColor: '#EC5C39'
    },
    {
        id: 'studio_pro',
        name: 'Studio Pro',
        price: 'NGN 10,000',
        numericPrice: 10000,
        period: '/month',
        features: ['Sell Unlimited Tracks', 'Lower Transaction Fees', 'Studio Dashboard', 'Artist Verification'],
        color: '#4CAF50',
        category: 'Studio',
        gradient: ['rgba(76, 175, 80, 0.15)', 'rgba(76, 175, 80, 0.05)', 'rgba(0,0,0,0)'] as unknown as GradientColors,
        borderColor: '#4CAF50'
    },
    {
        id: 'hybrid_executive',
        name: 'Executive Hybrid',
        price: 'NGN 25,000',
        numericPrice: 25000,
        period: '/month',
        features: ['10GB Cloud Storage', 'Team Collaboration', '0% Transaction Fees', 'VIP Promotion'],
        color: '#FFD700',
        category: 'Hybrid',
        gradient: ['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)', 'rgba(0,0,0,0)'] as unknown as GradientColors,
        borderColor: '#FFD700'
    }
];

// Note: PAYSTACK_KEY moved to app/_layout.tsx for the PaystackProvider

export default function SubscriptionsScreen() {
    const router = useRouter();
    const { role, setRole } = useUserStore();

    const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const { popup } = usePaystack();

    const handleUpgradePress = (plan: typeof PLANS[0]) => {
        if (plan.numericPrice === 0) {
            completeUpgrade(plan.id);
            return;
        }
        setSelectedPlan(plan);
        setShowPaymentModal(true);
    };

    const completeUpgrade = async (planId: string) => {
        try {
            setRole(planId as UserRole);

            // Log to Firebase 
            if (auth.currentUser) {
                await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                    role: planId,
                    lastSubscribedAt: new Date().toISOString()
                });
            }
            Alert.alert("Welcome to Premium", `Your subscription has been successfully updated to the ${planId.replace('_', ' ').toUpperCase()} plan.`);
        } catch (error) {
            console.error("Upgrade error: ", error);
        }
    };

    const handlePaystackPayment = () => {
        setShowPaymentModal(false);
        if (selectedPlan) {
            popup.checkout({
                amount: selectedPlan.numericPrice,
                email: auth.currentUser?.email || "customer@shoouts.com",
                onSuccess: (res: any) => completeUpgrade(selectedPlan.id),
                onCancel: () => console.log('Paystack Cancelled')
            });
        }
    };

    const handleStripePayment = () => {
        setShowPaymentModal(false);
        setIsVerifying(true);
        // Simulate Stripe API call to backend, since we need Node backend for Client Secret
        setTimeout(() => {
            setIsVerifying(false);
            if (selectedPlan) {
                completeUpgrade(selectedPlan.id);
            }
        }, 2000);
    };

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Premium Plans</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.introSection}>
                        <Sparkles size={40} color="#EC5C39" />
                        <Text style={styles.introTitle}>Elevate your Music Journey</Text>
                        <Text style={styles.introSubtitle}>Choose the plan that fits your growth on Shoouts.</Text>
                    </View>

                    {PLANS.map((plan) => {
                        const isCurrentPlan = role === plan.id;

                        return (
                            <View key={plan.id} style={[styles.cardWrapper, { borderColor: plan.borderColor }]}>
                                <LinearGradient
                                    colors={plan.gradient}
                                    style={StyleSheet.absoluteFillObject}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                />

                                {plan.recommended && (
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
                                        <Text style={styles.planPrice}>{plan.price}</Text>
                                        <Text style={styles.planPeriod}>{plan.period}</Text>
                                    </View>
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
                                    onPress={() => handleUpgradePress(plan)}
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
                        <Text style={styles.footerText}>Secure payment processing via Stripe and Paystack.</Text>
                    </View>
                    <View style={{ height: 40 }} />
                </ScrollView>

                {/* Paystack Integration using new Provider logic is handled by popup.checkout() */}

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
                                Total Due: {selectedPlan?.price}
                            </Text>

                            <TouchableOpacity style={styles.paymentOption} onPress={handlePaystackPayment}>
                                <CreditCard color="#EC5C39" size={24} />
                                <View style={styles.payOptionTexts}>
                                    <Text style={styles.payOptionTitle}>Pay with Paystack</Text>
                                    <Text style={styles.payOptionSub}>Secured localized payment (NGN)</Text>
                                </View>
                                <ChevronLeft size={20} color="rgba(255,255,255,0.2)" style={{ transform: [{ rotate: '180deg' }] }} />
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.paymentOption, { marginBottom: 10 }]} onPress={handleStripePayment}>
                                <CreditCard color="#635BFF" size={24} />
                                <View style={styles.payOptionTexts}>
                                    <Text style={styles.payOptionTitle}>Pay with Stripe</Text>
                                    <Text style={styles.payOptionSub}>International Credit/Debit Card</Text>
                                </View>
                                <ChevronLeft size={20} color="rgba(255,255,255,0.2)" style={{ transform: [{ rotate: '180deg' }] }} />
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.paymentOption, { marginBottom: 10 }]} onPress={handleStripePayment}>
                                <CreditCard color="#4285F4" size={24} />
                                <View style={styles.payOptionTexts}>
                                    <Text style={styles.payOptionTitle}>Pay with Google Pay</Text>
                                    <Text style={styles.payOptionSub}>Fast and Secure Checkout</Text>
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
            </View>
        </SafeScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#140F10' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#FFF' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
    introSection: { alignItems: 'center', marginBottom: 35, textAlign: 'center' },
    introTitle: { fontSize: 24, fontFamily: 'Poppins-Bold', color: '#FFF', marginTop: 15, textAlign: 'center' },
    introSubtitle: { fontSize: 15, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.5)', marginTop: 8, textAlign: 'center' },
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
    planPeriod: { fontSize: 15, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.5)', marginLeft: 6 },
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
    loadingText: { color: '#FFF', fontFamily: 'Poppins-Bold', marginTop: 16, fontSize: 16 }
});
