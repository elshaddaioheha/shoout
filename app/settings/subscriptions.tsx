import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { UserRole, useUserStore } from '@/store/useUserStore';
import { useRouter } from 'expo-router';
import { Check, ChevronLeft, Sparkles, Star, Zap } from 'lucide-react-native';
import React from 'react';
import { Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const PLANS = [
    {
        id: 'vault_free',
        name: 'Vault Free',
        price: 'NGN 0',
        period: '/month',
        features: ['50MB Cloud Storage', 'Private Links', 'Basic Stats', 'Safe Transfer'],
        color: '#767676',
        category: 'Vault'
    },
    {
        id: 'vault_pro',
        name: 'Vault Pro',
        price: 'NGN 5,000',
        period: '/month',
        features: ['1GB Cloud Storage', 'Advanced Analytics', 'Custom Branding', 'Priority Support'],
        color: '#EC5C39',
        category: 'Vault',
        recommended: true
    },
    {
        id: 'studio_pro',
        name: 'Studio Pro',
        price: 'NGN 10,000',
        period: '/month',
        features: ['Sell Unlimited Tracks', 'Lower Transaction Fees', 'Studio Dashboard', 'Artist Verification'],
        color: '#4CAF50',
        category: 'Studio'
    },
    {
        id: 'hybrid_executive',
        name: 'Executive Hybrid',
        price: 'NGN 25,000',
        period: '/month',
        features: ['10GB Cloud Storage', 'Team Collaboration', '0% Transaction Fees', 'VIP Promotion'],
        color: '#FFD700',
        category: 'Hybrid'
    }
];

export default function SubscriptionsScreen() {
    const router = useRouter();
    const { role, setRole } = useUserStore();

    const handleUpgrade = (planId: string) => {
        Alert.alert(
            "Confirm Subscription",
            `Would you like to switch to the ${planId.replace('_', ' ').toUpperCase()} plan?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    onPress: () => {
                        setRole(planId as UserRole);
                        Alert.alert("Success", "Your subscription has been updated!");
                    }
                }
            ]
        );
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

                    {PLANS.map((plan) => (
                        <View key={plan.id} style={[styles.planCard, plan.recommended && styles.recommendedCard]}>
                            {plan.recommended && (
                                <View style={styles.recommendedBadge}>
                                    <Star size={12} color="#FFF" fill="#FFF" />
                                    <Text style={styles.recommendedText}>MOST POPULAR</Text>
                                </View>
                            )}

                            <View style={styles.planHeader}>
                                <View style={[styles.categoryBadge, { backgroundColor: plan.color + '20' }]}>
                                    <Text style={[styles.categoryText, { color: plan.color }]}>{plan.category}</Text>
                                </View>
                                <Text style={styles.planName}>{plan.name}</Text>
                                <View style={styles.priceRow}>
                                    <Text style={styles.planPrice}>{plan.price}</Text>
                                    <Text style={styles.planPeriod}>{plan.period}</Text>
                                </View>
                            </View>

                            <View style={styles.featuresList}>
                                {plan.features.map((feature, idx) => (
                                    <View key={idx} style={styles.featureItem}>
                                        <Check size={16} color={plan.color} />
                                        <Text style={styles.featureText}>{feature}</Text>
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    { backgroundColor: role === plan.id ? 'rgba(255,255,255,0.05)' : plan.color },
                                    role === plan.id && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }
                                ]}
                                onPress={() => handleUpgrade(plan.id)}
                                disabled={role === plan.id}
                            >
                                <Text style={[styles.actionButtonText, role === plan.id && { color: 'rgba(255,255,255,0.4)' }]}>
                                    {role === plan.id ? 'Current Plan' : 'Choose Plan'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ))}

                    <View style={styles.footerInfo}>
                        <Zap size={20} color="rgba(255,255,255,0.3)" />
                        <Text style={styles.footerText}>Secure localized payment processing for all African regions.</Text>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
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
    introSection: { alignItems: 'center', marginBottom: 30, textAlign: 'center' },
    introTitle: { fontSize: 22, fontFamily: 'Poppins-Bold', color: '#FFF', marginTop: 15, textAlign: 'center' },
    introSubtitle: { fontSize: 14, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.5)', marginTop: 8, textAlign: 'center' },
    planCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden',
    },
    recommendedCard: {
        borderColor: '#EC5C39',
        backgroundColor: 'rgba(236, 92, 57, 0.05)',
    },
    recommendedBadge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#EC5C39',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderBottomLeftRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    recommendedText: { color: '#FFF', fontSize: 10, fontFamily: 'Poppins-Bold', letterSpacing: 1 },
    planHeader: { marginBottom: 20 },
    categoryBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 12,
    },
    categoryText: { fontSize: 10, fontFamily: 'Poppins-Bold', textTransform: 'uppercase', letterSpacing: 1 },
    planName: { fontSize: 24, fontFamily: 'Poppins-Bold', color: '#FFF' },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
    planPrice: { fontSize: 28, fontFamily: 'Poppins-Bold', color: '#FFF' },
    planPeriod: { fontSize: 14, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.4)', marginLeft: 4 },
    featuresList: { gap: 12, marginBottom: 24 },
    featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    featureText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.7)' },
    actionButton: {
        height: 54,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: { color: '#FFF', fontSize: 16, fontFamily: 'Poppins-Bold' },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginTop: 20,
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 16,
        borderRadius: 16,
    },
    footerText: { flex: 1, fontSize: 12, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
});
