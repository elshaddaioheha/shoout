/**
 * ModeSelectorSheet - bottom sheet listing all available product experiences.
 */
import { Icon } from '@/components/ui/Icon';
import { FontFamily, typography } from '@/constants/typography';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useAuthStore } from '@/store/useAuthStore';
import { ViewMode } from '@/store/useUserStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { formatPlanLabel, getSubscriptionPlan, type AppMode } from '@/utils/subscriptions';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Easing,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ViewModeEntry {
    id: ViewMode;
    label: string;
    description: string;
    icon: 'refresh' | 'music' | 'mic' | 'library';
    color: string;
}

const VIEW_MODES: ViewModeEntry[] = [
    {
        id: 'shoout',
        label: 'Shoouts',
        description: 'Discover, cart and buy beats in the marketplace',
        icon: 'refresh',
        color: '#6AA7FF',
    },
    {
        id: 'vault',
        label: 'Vault',
        description: 'Upload, store and share your music privately',
        icon: 'music',
        color: '#EC5C39',
    },
    {
        id: 'studio',
        label: 'Studio',
        description: 'Sell beats, manage listings and earnings',
        icon: 'mic',
        color: '#4CAF50',
    },
    {
        id: 'hybrid',
        label: 'Hybrid',
        description: 'Combined creator mode across Vault and Studio',
        icon: 'library',
        color: '#D4AF37',
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

function useModeSelectorStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function ModeSelectorSheet({
    visible,
    currentMode,
    currentPlan,
    isModeAccessible,
    onSelect,
    onClose,
}: ModeSelectorSheetProps) {
    const appTheme = useAppTheme();
    const styles = useModeSelectorStyles();
    const sheetBackgroundColor = appTheme.colors.backgroundElevated;
    const sheetBorderColor = appTheme.colors.borderStrong;
    const sheetTextColor = appTheme.colors.textPrimary;
    const sheetSubTextColor = appTheme.colors.textSecondary;
    const rowBackgroundColor = appTheme.colors.surface;
    const rowBorderColor = appTheme.colors.border;
    const handleColor = appTheme.colors.borderStrong;
    const radioBorderColor = appTheme.colors.borderStrong;

    const insets = useSafeAreaInsets();
    const router = useRouter();
    const hasAuthenticatedUser = useAuthStore((state) => state.hasAuthenticatedUser);
    const { width, height } = useWindowDimensions();
    const compactLayout = width < 390 || height < 760;
    const modeListMaxHeight = Math.max(260, Math.floor(height * (compactLayout ? 0.48 : 0.58)));
    const hiddenOffset = Math.max(height, 520);
    const visibleModes = hasAuthenticatedUser
        ? VIEW_MODES.filter((mode) => mode.id !== currentMode)
        : VIEW_MODES;
    const slideAnim = useRef(new Animated.Value(hiddenOffset)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            slideAnim.setValue(hiddenOffset);
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 260,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
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
                    toValue: hiddenOffset,
                    duration: 220,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible, hiddenOffset, slideAnim, fadeAnim]);

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
                    <BlurView intensity={30} tint={appTheme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                    <View style={[styles.backdropDim, { backgroundColor: appTheme.colors.overlay }]} />
                </Pressable>
            </Animated.View>

            <Animated.View
                style={[
                    styles.sheet,
                    compactLayout && styles.sheetCompact,
                    {
                        paddingBottom: insets.bottom + (compactLayout ? 14 : 24),
                        transform: [{ translateY: slideAnim }],
                        backgroundColor: sheetBackgroundColor,
                        borderColor: sheetBorderColor,
                    },
                ]}
            >
                <View style={[styles.sheetSurface, compactLayout && styles.sheetSurfaceCompact]}>
                    <View style={[styles.handle, compactLayout && styles.handleCompact, { backgroundColor: handleColor }]} />

                    <Text style={[styles.sheetTitle, compactLayout && styles.sheetTitleCompact, { color: sheetTextColor }]}>Switch Experience</Text>
                    <Text style={[styles.sheetSubtitle, compactLayout && styles.sheetSubtitleCompact, { color: sheetSubTextColor }]}>Current subscription: {formatPlanLabel(currentPlan)}</Text>

                    <ScrollView
                        style={[styles.modeListScroll, { maxHeight: modeListMaxHeight }]}
                        contentContainerStyle={[styles.modeList, compactLayout && styles.modeListCompact]}
                        showsVerticalScrollIndicator={false}
                    >
                        {visibleModes.map((mode) => {
                            const accessible = isModeAccessible(mode.id);
                            const isActive = mode.id === currentMode;
                            const plan = getSubscriptionPlan(mode.id);

                            return (
                                <TouchableOpacity
                                    key={mode.id}
                                    style={[
                                        styles.modeRow,
                                        compactLayout && styles.modeRowCompact,
                                        { backgroundColor: rowBackgroundColor, borderColor: rowBorderColor },
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
                                    accessibilityRole="button"
                                    accessibilityLabel={`${mode.label} mode`}
                                    accessibilityHint={accessible ? `Switches to ${mode.label} experience.` : `Locked. Opens subscriptions to unlock ${mode.label}.`}
                                    accessibilityState={{ selected: isActive, disabled: !accessible }}
                                >
                                    <View
                                        style={[
                                            styles.modeRowGlassLayer,
                                            Platform.OS === 'web' ? ({ pointerEvents: 'none' } as any) : null,
                                        ]}
                                    >
                                        <BlurView intensity={16} tint={appTheme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
                                        <LinearGradient
                                            colors={appTheme.isDark ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.02)'] : ['rgba(255,255,255,0.58)', 'rgba(255,255,255,0.18)']}
                                            start={{ x: 0.08, y: 0 }}
                                            end={{ x: 0.92, y: 1 }}
                                            style={StyleSheet.absoluteFillObject}
                                        />
                                    </View>
                                    {isActive ? (
                                        <View
                                            style={[
                                                styles.modeRowTopSheen,
                                                { backgroundColor: mode.color + '7A' },
                                                Platform.OS === 'web' ? ({ pointerEvents: 'none' } as any) : null,
                                            ]}
                                        />
                                    ) : null}

                                    <View style={[styles.modeIconBg, compactLayout && styles.modeIconBgCompact, { backgroundColor: mode.color + '18' }]}> 
                                        <Icon name={mode.icon} size={compactLayout ? 19 : 22} color={mode.color} />
                                    </View>

                                    <View style={styles.modeInfo}>
                                        <View style={styles.modeLabelRow}>
                                            <Text style={[styles.modeLabel, compactLayout && styles.modeLabelCompact, { color: sheetTextColor }]}>{mode.label}</Text>
                                            {!accessible ? (
                                                <View style={[styles.planBadge, { backgroundColor: mode.color + '22' }]}>
                                                    <Text style={[styles.planBadgeText, { color: mode.color }]}>Locked</Text>
                                                </View>
                                            ) : null}
                                        </View>
                                        <Text style={[styles.modeDesc, compactLayout && styles.modeDescCompact, { color: sheetSubTextColor }]}>{mode.description}</Text>
                                        <Text style={[styles.modePrice, compactLayout && styles.modePriceCompact, { color: sheetSubTextColor }] }>
                                            {plan.monthlyPriceUsd === 0 ? 'Free' : `$${plan.monthlyPriceUsd.toFixed(2)}/mo`}
                                        </Text>
                                    </View>

                                    <View style={styles.modeRight}>
                                        {isActive ? (
                                            <Icon name="check" size={22} color={mode.color} fill />
                                        ) : !accessible ? (
                                            <View style={[styles.unlockBtn, { borderColor: mode.color + '60' }]}>
                                                <Icon name="lock" size={11} color={mode.color} />
                                                <Text style={[styles.unlockText, { color: mode.color }]}>Unlock</Text>
                                            </View>
                                        ) : (
                                            <View style={[styles.radioOuter, { borderColor: radioBorderColor }]}> 
                                                <View style={styles.radioInner} />
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            </Animated.View>
        </Modal>
    );
}

const legacyStyles = {
    backdropDim: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: 1,
        overflow: 'hidden',
    },
    sheetCompact: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    sheetSurface: {
        paddingTop: 12,
        paddingHorizontal: 20,
    },
    sheetSurfaceCompact: {
        paddingTop: 8,
        paddingHorizontal: 14,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    handleCompact: {
        width: 34,
        marginBottom: 12,
    },
    sheetTitle: {
        ...typography.h3,
        fontFamily: FontFamily.bold,
        marginBottom: 4,
    },
    sheetTitleCompact: {
        fontSize: 18,
        marginBottom: 2,
    },
    sheetSubtitle: {
        ...typography.caption,
        fontFamily: FontFamily.regular,
        marginBottom: 20,
    },
    sheetSubtitleCompact: {
        fontSize: 12,
        marginBottom: 12,
    },
    modeListScroll: {
        width: '100%',
    },
    modeList: {
        gap: 12,
    },
    modeListCompact: {
        gap: 8,
    },
    planBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    planBadgeText: {
        ...typography.small,
        fontFamily: FontFamily.semiBold,
    },
    modeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        gap: 14,
        overflow: 'hidden',
        position: 'relative',
    },
    modeRowCompact: {
        borderRadius: 14,
        padding: 10,
        gap: 10,
    },
    modeIconBg: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeIconBgCompact: {
        width: 40,
        height: 40,
        borderRadius: 12,
    },
    modeRowGlassLayer: {
        ...StyleSheet.absoluteFillObject,
    },
    modeRowTopSheen: {
        position: 'absolute',
        top: 0,
        left: 16,
        right: 16,
        height: 1,
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
        ...typography.button,
        fontFamily: FontFamily.semiBold,
    },
    modeLabelCompact: {
        fontSize: 14,
    },
    modeDesc: {
        ...typography.caption,
        fontFamily: FontFamily.regular,
    },
    modeDescCompact: {
        fontSize: 11,
        lineHeight: 15,
    },
    modePrice: {
        ...typography.small,
        fontFamily: FontFamily.semiBold,
        marginTop: 6,
    },
    modePriceCompact: {
        marginTop: 4,
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
        ...typography.small,
        fontFamily: FontFamily.semiBold,
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'transparent',
    },
};
