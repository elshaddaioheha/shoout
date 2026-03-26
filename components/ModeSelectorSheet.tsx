/**
 * ModeSelectorSheet — bottom sheet with blurred backdrop listing all available modes.
 * Slides up with Animated.spring, backdrop tap-to-dismiss.
 */
import { ViewMode } from '@/store/useUserStore';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import {
    CheckCircle2,
    Lock,
    Mic2,
    Music,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ViewModeEntry {
    id: ViewMode;
    label: string;
    description: string;
    Icon: any;
    color: string;
}

const VIEW_MODES: ViewModeEntry[] = [
    {
        id: 'vault',
        label: 'Vault',
        description: 'Upload, store and share your music',
        Icon: Music,
        color: '#EC5C39',
    },
    {
        id: 'studio',
        label: 'Studio',
        description: 'Sell beats, manage listings and earnings',
        Icon: Mic2,
        color: '#4CAF50',
    },
];

interface ModeSelectorSheetProps {
    visible: boolean;
    currentMode: ViewMode;
    isModeAccessible: (mode: ViewMode) => boolean;
    studioAccessLevel: 'free' | 'pro';
    isStudioPaid: boolean;
    onSelect: (mode: ViewMode) => void;
    onClose: () => void;
}

export default function ModeSelectorSheet({
    visible,
    currentMode,
    isModeAccessible,
    studioAccessLevel,
    isStudioPaid,
    onSelect,
    onClose,
}: ModeSelectorSheetProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const slideAnim = useRef(new Animated.Value(400)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [showStudioPlans, setShowStudioPlans] = useState(false);

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    speed: 22,
                    bounciness: 2,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 240,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 400,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, slideAnim, fadeAnim]);

    useEffect(() => {
        if (!visible) {
            setShowStudioPlans(false);
        }
    }, [visible]);

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            {/* Blurred backdrop */}
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.backdropDim} />
                </Pressable>
            </Animated.View>

            {/* Sheet */}
            <Animated.View
                style={[
                    styles.sheet,
                    { paddingBottom: insets.bottom + 24, transform: [{ translateY: slideAnim }] },
                ]}
            >
                {/* Handle */}
                <View style={styles.handle} />

                {showStudioPlans ? (
                    <>
                        <Text style={styles.sheetTitle}>Choose your Studio tier</Text>
                        <Text style={styles.sheetSubtitle}>Start free or go Pro for payouts & analytics</Text>

                        <View style={styles.planGrid}>
                            <TouchableOpacity
                                style={[styles.planCard, { borderColor: '#4CAF50' + '50' }]}
                                activeOpacity={0.8}
                                onPress={() => {
                                    onSelect('studio');
                                    setShowStudioPlans(false);
                                }}
                            >
                                <View style={[styles.planBadge, { backgroundColor: '#4CAF50' + '22' }]}>
                                    <Text style={[styles.planBadgeText, { color: '#4CAF50' }]}>Free</Text>
                                </View>
                                <Text style={styles.planTitle}>Studio Free</Text>
                                <Text style={styles.planDesc}>15GB uploads, sell beats, upgrade anytime.</Text>
                                <View style={styles.planFootRow}>
                                    <Text style={styles.planPrice}>$0</Text>
                                    <CheckCircle2 size={18} color="#4CAF50" />
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.planCard, { borderColor: '#EC5C39' + '60' }]}
                                activeOpacity={0.8}
                                onPress={() => {
                                    onClose();
                                    setShowStudioPlans(false);
                                    router.push('/settings/subscriptions' as any);
                                }}
                            >
                                <View style={[styles.planBadge, { backgroundColor: '#EC5C39' + '22' }]}>
                                    <Text style={[styles.planBadgeText, { color: '#EC5C39' }]}>Pro</Text>
                                </View>
                                <Text style={styles.planTitle}>Studio Pro</Text>
                                <Text style={styles.planDesc}>Analytics, payouts, lower fees, team tools.</Text>
                                <View style={styles.planFootRow}>
                                    <Text style={styles.planPrice}>Upgrade</Text>
                                    <Lock size={16} color="#EC5C39" />
                                </View>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.backRow} onPress={() => setShowStudioPlans(false)}>
                            <Text style={styles.backText}>‹ Back to modes</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Text style={styles.sheetTitle}>Switch Mode</Text>
                        <Text style={styles.sheetSubtitle}>Select how you want to experience Shoouts</Text>

                        <View style={styles.modeList}>
                            {VIEW_MODES.map((mode) => {
                                const accessible = isModeAccessible(mode.id);
                                const isActive = mode.id === currentMode;
                                const showFreeTag = mode.id === 'studio' && !isStudioPaid;

                                return (
                                    <TouchableOpacity
                                        key={mode.id}
                                        style={[
                                            styles.modeRow,
                                            isActive && { borderColor: mode.color + '55', backgroundColor: mode.color + '10' },
                                            !accessible && { opacity: 0.6 },
                                        ]}
                                        onPress={() => {
                                            if (!accessible) return;
                                            if (mode.id === 'studio' && !isStudioPaid) {
                                                setShowStudioPlans(true);
                                                return;
                                            }
                                            onSelect(mode.id);
                                        }}
                                        activeOpacity={accessible ? 0.7 : 1}
                                    >
                                        {/* Icon */}
                                        <View style={[styles.modeIconBg, { backgroundColor: mode.color + '18' }]}>
                                            <mode.Icon size={22} color={mode.color} />
                                        </View>

                                        {/* Info */}
                                        <View style={styles.modeInfo}>
                                            <Text style={styles.modeLabel}>{mode.label}</Text>
                                            <Text style={styles.modeDesc}>
                                                {mode.id === 'studio' && showFreeTag
                                                    ? 'Free tier available • Upgrade for payouts & analytics'
                                                    : mode.description}
                                            </Text>
                                        </View>

                                        {/* Right indicator */}
                                        <View style={styles.modeRight}>
                                            {isActive ? (
                                                <CheckCircle2 size={22} color={mode.color} fill={mode.color} />
                                            ) : showFreeTag ? (
                                                <TouchableOpacity
                                                    style={[styles.unlockBtn, { borderColor: mode.color + '60' }]}
                                                    onPress={() => {
                                                        onClose();
                                                        router.push('/settings/subscriptions' as any);
                                                    }}
                                                >
                                                    <Lock size={11} color={mode.color} />
                                                    <Text style={[styles.unlockText, { color: mode.color }]}>Upgrade</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <View style={styles.radioOuter}>
                                                    <View style={styles.radioInner} />
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </>
                )}
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdropDim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10,10,20,0.55)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1A1516',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 12,
        paddingHorizontal: 20,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.07)',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignSelf: 'center',
        marginBottom: 20,
    },
    sheetTitle: {
        color: '#FFF',
        fontSize: 20,
        fontFamily: 'Poppins-Bold',
        marginBottom: 4,
    },
    sheetSubtitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
        marginBottom: 20,
    },
    modeList: {
        gap: 12,
    },
    planGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    planCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        gap: 10,
    },
    planBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    planBadgeText: {
        fontSize: 11,
        fontFamily: 'Poppins-SemiBold',
    },
    planTitle: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
    },
    planDesc: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        lineHeight: 17,
    },
    planFootRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    planPrice: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: 'Poppins-Bold',
    },
    backRow: {
        marginTop: 16,
        alignSelf: 'flex-start',
    },
    backText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontFamily: 'Poppins-SemiBold',
    },
    modeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        gap: 14,
    },
    modeIconBg: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeInfo: {
        flex: 1,
    },
    modeLabel: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
        marginBottom: 3,
    },
    modeDesc: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        lineHeight: 17,
    },
    modeRight: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    unlockBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
    },
    unlockText: {
        fontSize: 11,
        fontFamily: 'Poppins-SemiBold',
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'transparent',
    },
});
