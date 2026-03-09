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
    Zap,
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

interface Mode {
    id: ViewMode;
    label: string;
    description: string;
    Icon: any;
    color: string;
    requiresPremium: boolean;
}

const MODES: Mode[] = [
    {
        id: 'vault',
        label: 'Vault',
        description: 'Discover music, manage your library & playlists',
        Icon: Music,
        color: '#EC5C39',
        requiresPremium: false,
    },
    {
        id: 'studio',
        label: 'Studio',
        description: 'Upload beats, sell music & manage your artist profile',
        Icon: Mic2,
        color: '#4CAF50',
        requiresPremium: true,
    },
];

interface ModeSelectorSheetProps {
    visible: boolean;
    currentMode: ViewMode;
    isModeAccessible: (mode: ViewMode) => boolean;
    onSelect: (mode: ViewMode) => void;
    onClose: () => void;
}

export default function ModeSelectorSheet({
    visible,
    currentMode,
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
                    speed: 20,
                    bounciness: 3,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 400,
                    duration: 280,
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

                <Text style={styles.sheetTitle}>Switch Mode</Text>
                <Text style={styles.sheetSubtitle}>Select how you want to experience Shoouts</Text>

                <View style={styles.modeList}>
                    {MODES.map((mode) => {
                        const accessible = isModeAccessible(mode.id);
                        const isActive = mode.id === currentMode;

                        return (
                            <TouchableOpacity
                                key={mode.id}
                                style={[
                                    styles.modeRow,
                                    isActive && { borderColor: mode.color + '55', backgroundColor: mode.color + '10' },
                                ]}
                                onPress={() => accessible ? onSelect(mode.id) : undefined}
                                activeOpacity={accessible ? 0.7 : 1}
                            >
                                {/* Icon */}
                                <View style={[styles.modeIconBg, { backgroundColor: mode.color + '18' }]}>
                                    <mode.Icon size={22} color={mode.color} />
                                </View>

                                {/* Info */}
                                <View style={styles.modeInfo}>
                                    <View style={styles.modeLabelRow}>
                                        <Text style={styles.modeLabel}>{mode.label}</Text>
                                        {mode.requiresPremium && (
                                            <View style={[styles.premiumBadge, { backgroundColor: mode.color + '22', borderColor: mode.color + '44' }]}>
                                                <Zap size={10} color={mode.color} />
                                                <Text style={[styles.premiumText, { color: mode.color }]}>PRO</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.modeDesc}>{mode.description}</Text>
                                </View>

                                {/* Right indicator */}
                                <View style={styles.modeRight}>
                                    {isActive ? (
                                        <CheckCircle2 size={22} color={mode.color} fill={mode.color} />
                                    ) : !accessible ? (
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
    modeRight: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
    },
    premiumText: {
        fontSize: 10,
        fontFamily: 'Poppins-Bold',
        letterSpacing: 0.5,
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
