/**
 * ModeSelectorSheet - bottom sheet listing all available product experiences.
 */
import { ViewMode } from '@/store/useUserStore';
import { formatPlanLabel, getSubscriptionPlan, type AppMode } from '@/utils/subscriptions';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import {
    CheckCircle2,
    Disc3,
    FolderLock,
    Layers3,
    Lock,
    Mic2,
    Music,
} from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
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
        id: 'shoout',
        label: 'Shoout',
        description: 'Discover, cart and buy beats in the marketplace',
        Icon: Disc3,
        color: '#6AA7FF',
    },
    {
        id: 'vault',
        label: 'Vault',
        description: 'Upload, store and share your music privately',
        Icon: Music,
        color: '#EC5C39',
    },
    {
        id: 'vault_pro',
        label: 'Vault Pro',
        description: 'The same private Vault workflow with much higher limits',
        Icon: FolderLock,
        color: '#EC5C39',
    },
    {
        id: 'studio',
        label: 'Studio',
        description: 'Sell beats, manage listings and earnings',
        Icon: Mic2,
        color: '#4CAF50',
    },
    {
        id: 'hybrid',
        label: 'Hybrid',
        description: 'Combined creator mode across Vault and Studio',
        Icon: Layers3,
        color: '#FFD700',
    },
];

interface ModeSelectorSheetProps {
    visible: boolean;
    currentMode: ViewMode;
    currentPlan: AppMode;
    isModeAccessible: (mode: ViewMode) => boolean;
    studioAccessLevel: 'free' | 'pro';
    isStudioPaid: boolean;
    onSelect: (mode: ViewMode) => void;
    onClose: () => void;
}

export default function ModeSelectorSheet({
    visible,
    currentMode,
    currentPlan,
    isModeAccessible,
    onSelect,
    onClose,
}: ModeSelectorSheetProps) {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const slideAnim = useRef(new Animated.Value(400)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

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

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.backdropDim} />
                </Pressable>
            </Animated.View>

            <Animated.View
                style={[
                    styles.sheet,
                    { paddingBottom: insets.bottom + 24, transform: [{ translateY: slideAnim }] },
                ]}
            >
                <View style={styles.handle} />

                <Text style={styles.sheetTitle}>Switch Experience</Text>
                <Text style={styles.sheetSubtitle}>Current subscription: {formatPlanLabel(currentPlan)}</Text>

                <View style={styles.modeList}>
                    {VIEW_MODES.map((mode) => {
                        const accessible = isModeAccessible(mode.id);
                        const isActive = mode.id === currentMode;
                        const plan = getSubscriptionPlan(mode.id);

                        return (
                            <TouchableOpacity
                                key={mode.id}
                                style={[
                                    styles.modeRow,
                                    isActive && { borderColor: mode.color + '55', backgroundColor: mode.color + '10' },
                                    !accessible && { opacity: 0.72 },
                                ]}
                                onPress={() => {
                                    if (!accessible) {
                                        onClose();
                                        router.push('/settings/subscriptions' as any);
                                        return;
                                    }
                                    onSelect(mode.id);
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.modeIconBg, { backgroundColor: mode.color + '18' }]}>
                                    <mode.Icon size={22} color={mode.color} />
                                </View>

                                <View style={styles.modeInfo}>
                                    <View style={styles.modeLabelRow}>
                                        <Text style={styles.modeLabel}>{mode.label}</Text>
                                        {!accessible ? (
                                            <View style={[styles.planBadge, { backgroundColor: mode.color + '22' }]}>
                                                <Text style={[styles.planBadgeText, { color: mode.color }]}>Locked</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    <Text style={styles.modeDesc}>{mode.description}</Text>
                                    <Text style={styles.modePrice}>
                                        {plan.monthlyPriceUsd === 0 ? 'Free' : `$${plan.monthlyPriceUsd.toFixed(2)}/mo`}
                                    </Text>
                                </View>

                                <View style={styles.modeRight}>
                                    {isActive ? (
                                        <CheckCircle2 size={22} color={mode.color} fill={mode.color} />
                                    ) : !accessible ? (
                                        <View style={[styles.unlockBtn, { borderColor: mode.color + '60' }]}>
                                            <Lock size={11} color={mode.color} />
                                            <Text style={[styles.unlockText, { color: mode.color }]}>Unlock</Text>
                                        </View>
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
    modeLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 3,
    },
    modeLabel: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
    },
    modeDesc: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        lineHeight: 17,
    },
    modePrice: {
        color: 'rgba(255,255,255,0.72)',
        fontSize: 11,
        fontFamily: 'Poppins-SemiBold',
        marginTop: 6,
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
