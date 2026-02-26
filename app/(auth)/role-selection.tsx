import { UserRole, useUserStore } from '@/store/useUserStore';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    ChevronRight,
    Crown,
    Download,
    Headphones,
    Mic2,
    Music,
    ShoppingCart,
    Sparkles,
    Star,
    TrendingUp,
    Zap
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');

const ROLES = [
    {
        id: 'vault' as UserRole,
        title: 'Vault',
        subtitle: 'Stream & Discover',
        description: 'Enjoy unlimited streaming and build your musical library with authentic Afro sounds.',
        icon: Headphones,
        gradient: ['#1E1A1B', '#2A2520'] as [string, string],
        accentColor: '#FFF',
        features: ['Unlimited streaming', 'Curated playlists', 'Follow creators'],
        featureIcons: [Music, Star, Headphones],
    },
    {
        id: 'vault_pro' as UserRole,
        title: 'Vault Pro',
        subtitle: 'Pro Listener',
        description: 'Elevated experience with higher song upload limits and premium playback quality.',
        icon: Crown,
        gradient: ['#EC5C39', '#863420'] as [string, string],
        accentColor: '#FFD700',
        features: ['Higher upload limits', 'Lossless audio', 'No advertisements'],
        featureIcons: [Zap, Download, Sparkles],
    },
    {
        id: 'studio' as UserRole,
        title: 'Studio',
        subtitle: 'Artist & Producer',
        description: 'The professional choice. Upload music, sell beats, and access deep analytics.',
        icon: Mic2,
        gradient: ['#9333EA', '#4C1D95'] as [string, string],
        accentColor: '#C084FC',
        features: ['Sell Beats & Music', 'Upload Unlimited', 'Studio Analytics'],
        featureIcons: [Music, TrendingUp, Star],
    },
    {
        id: 'hybrid' as UserRole,
        title: 'Hybrid',
        subtitle: 'Ultimate Experience',
        description: 'The best of both worlds. All Vault Pro benefits plus full Studio capabilities.',
        icon: Sparkles,
        gradient: ['#EC5C39', '#9333EA'] as [string, string],
        accentColor: '#FFD700',
        features: ['Unlimited everything', 'Earning & Analytics', 'Premium Marketplace'],
        featureIcons: [Zap, TrendingUp, ShoppingCart],
    },
];

export default function RoleSelectionScreen() {
    const router = useRouter();
    const { setRole } = useUserStore();
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

    // Staggered entry animations
    const headerAnim = useRef(new Animated.Value(0)).current;
    const cardAnims = useRef(ROLES.map(() => new Animated.Value(0))).current;
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

    // Selection pulse animation
    const pulseAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (selectedRole) {
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
            ]).start();
        }
    }, [selectedRole]);

    const handleContinue = () => {
        if (!selectedRole) return;
        setRole(selectedRole);
        router.replace('/(tabs)');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Background decorative circles */}
            <Animated.View style={[styles.bgCircle1, { opacity: headerAnim }]} />
            <Animated.View style={[styles.bgCircle2, { opacity: headerAnim }]} />

            {/* Header */}
            <Animated.View style={[styles.header, {
                opacity: headerAnim,
                transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }]
            }]}>
                <Text style={styles.title}>How will you use{'\n'}ShooutS?</Text>
                <Text style={styles.subtitle}>Choose your experience. You can always change this later.</Text>
            </Animated.View>

            {/* Role Cards */}
            <View style={styles.cardsContainer}>
                {ROLES.map((role, index) => {
                    const isSelected = selectedRole === role.id;
                    const Icon = role.icon;
                    const cardAnim = cardAnims[index];

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
                                    colors={isSelected ? role.gradient : ['#1E1A1B', '#1E1A1B']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={[
                                        styles.roleCard,
                                        isSelected && styles.roleCardSelected,
                                    ]}
                                >
                                    <View style={styles.roleCardContent}>
                                        <View style={[styles.roleIconContainer, isSelected && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                                            <Icon size={24} color={isSelected ? '#FFF' : '#EC5C39'} />
                                        </View>
                                        <View style={styles.roleTextContent}>
                                            <Text style={styles.roleTitle}>{role.title}</Text>
                                            <Text style={[styles.roleSubtitle, isSelected && { color: 'rgba(255,255,255,0.8)' }]}>
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
                                                        <FeatureIcon size={14} color="rgba(255,255,255,0.7)" />
                                                        <Text style={styles.featureText}>{feature}</Text>
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
                        colors={selectedRole ? ['#EC5C39', '#863420'] : ['#333', '#222']}
                        style={styles.continueGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.continueText}>Continue</Text>
                        <ChevronRight size={20} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#140F10',
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    bgCircle1: {
        position: 'absolute',
        top: -80,
        right: -60,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(236, 92, 57, 0.04)',
    },
    bgCircle2: {
        position: 'absolute',
        bottom: -100,
        left: -80,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(147, 51, 234, 0.03)',
    },
    header: {
        marginBottom: 35,
    },
    title: {
        color: '#FFF',
        fontSize: 30,
        fontFamily: 'Poppins-Bold',
        lineHeight: 38,
        letterSpacing: -0.5,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        marginTop: 10,
        lineHeight: 22,
    },
    cardsContainer: {
        gap: 14,
    },
    roleCard: {
        borderRadius: 20,
        padding: 18,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    roleCardSelected: {
        borderColor: 'rgba(255,255,255,0.15)',
        shadowColor: '#EC5C39',
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
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(236, 92, 57, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleTextContent: {
        flex: 1,
        marginLeft: 16,
    },
    roleTitle: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
    },
    roleSubtitle: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
        marginTop: 1,
    },
    checkIndicatorContainer: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkImage: {
        width: 32,
        height: 32,
    },
    featuresContainer: {
        marginTop: 16,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.15)',
        gap: 10,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    featureText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
    },
    buttonContainer: {
        marginTop: 35,
    },
    continueButton: {
        borderRadius: 16,
        overflow: 'hidden',
        height: 56,
    },
    continueGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    continueText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
    },
});
