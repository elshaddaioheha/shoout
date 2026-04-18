/**
 * ModePillButton - top-left app switcher pill with embedded rings logo.
 */
import { Icon } from '@/components/ui/Icon';
import { FontFamily, typography } from '@/constants/typography';
import { useAppTheme } from '@/hooks/use-app-theme';
import { ViewMode } from '@/store/useUserStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

interface ModePillButtonProps {
    viewMode: ViewMode;
    isOpen: boolean;
    onPress: () => void;
}

const MODE_LABELS: Record<ViewMode, string> = {
    shoout: 'Shoouts',
    vault: 'Vault',
    vault_pro: 'Vault Pro',
    studio: 'Studio',
    hybrid: 'Hybrid',
};

const MODE_COLORS: Record<ViewMode, { border: string; text: string; arrowBg: string }> = {
    shoout: {
        border: 'rgba(106, 167, 255, 0.35)',
        text: '#E6F0FF',
        arrowBg: 'rgba(106, 167, 255, 0.2)',
    },
    vault: {
        border: 'rgba(236, 92, 57, 0.35)',
        text: '#F8E5DF',
        arrowBg: 'rgba(236, 92, 57, 0.2)',
    },
    vault_pro: {
        border: 'rgba(236, 92, 57, 0.5)',
        text: '#FFF0EA',
        arrowBg: 'rgba(236, 92, 57, 0.25)',
    },
    studio: {
        border: 'rgba(76, 175, 80, 0.35)',
        text: '#E4F5E4',
        arrowBg: 'rgba(76, 175, 80, 0.2)',
    },
    hybrid: {
        border: 'rgba(255, 215, 0, 0.35)',
        text: '#FFF6C4',
        arrowBg: 'rgba(255, 215, 0, 0.2)',
    },
};

const HYBRID_LIGHT = {
    primary: '#D4AF37',
    text: '#B8860B',
    subtleBg: '#F9F6ED',
};

const HYBRID_DARK = {
    primary: '#E5C158',
    textOnPremium: '#121212',
    charcoal: '#18181B',
    gradient: ['#F4D03F', '#D4AF37'] as const,
};

function useModePillStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function ModePillButton({ viewMode, isOpen, onPress }: ModePillButtonProps) {
    const appTheme = useAppTheme();
    const styles = useModePillStyles();

    const chevronAnim = useRef(new Animated.Value(0)).current;
    const { width } = useWindowDimensions();
    const modeStyle = MODE_COLORS[viewMode];
    const modeLabel = MODE_LABELS[viewMode];
    const isHybridMode = viewMode === 'hybrid';
    const isCompact = width < 390;
    const isHybridDark = isHybridMode && appTheme.isDark;
    const labelColor = isHybridMode ? (isHybridDark ? HYBRID_DARK.textOnPremium : HYBRID_LIGHT.text) : appTheme.colors.textPrimary;
    const chevronBgColor = isHybridMode
        ? (isHybridDark ? 'rgba(18,18,18,0.16)' : 'rgba(184,134,11,0.12)')
        : appTheme.colors.surfaceMuted;
    const pillBackgroundColor = isHybridMode
        ? (isHybridDark ? 'transparent' : HYBRID_LIGHT.subtleBg)
        : appTheme.colors.backgroundElevated;
    const logoBackgroundColor = isHybridMode
        ? (isHybridDark ? HYBRID_DARK.charcoal : 'rgba(212,175,55,0.18)')
        : appTheme.colors.surfaceMuted;
    const pillBorderColor = isHybridMode ? (isHybridDark ? HYBRID_DARK.primary : HYBRID_LIGHT.primary) : modeStyle.border;

    useEffect(() => {
        Animated.spring(chevronAnim, {
            toValue: isOpen ? 1 : 0,
            useNativeDriver: true,
            speed: 20,
            bounciness: 5,
        }).start();
    }, [isOpen, chevronAnim]);

    const chevronRotate = chevronAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '-180deg'],
    });

    return (
        <TouchableOpacity
            style={[
                styles.pill,
                isCompact && styles.pillCompact,
                { backgroundColor: pillBackgroundColor },
                { borderColor: pillBorderColor },
            ]}
            onPress={onPress}
            activeOpacity={0.75}
        >
            {isHybridDark ? (
                <LinearGradient
                    colors={HYBRID_DARK.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />
            ) : null}
            <View style={[styles.logoSlot, isCompact && styles.logoSlotCompact, { backgroundColor: logoBackgroundColor }]}>
                <Image
                    source={require('@/assets/images/logo-rings.png')}
                    style={[styles.logoImage, isCompact && styles.logoImageCompact]}
                    contentFit="contain"
                />
            </View>
            <Text style={[styles.label, isCompact && styles.labelCompact, { color: labelColor }]}>{modeLabel}</Text>
            <Animated.View
                style={[
                    styles.chevronCircle,
                    isCompact && styles.chevronCircleCompact,
                    { backgroundColor: chevronBgColor, transform: [{ rotate: chevronRotate }] },
                ]}
            >
                <Icon name="chevron-down" size={isCompact ? 11 : 12} color={labelColor} strokeWidth={2.5} />
            </Animated.View>
        </TouchableOpacity>
    );
}

const legacyStyles = {
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
        borderWidth: 1,
        borderRadius: 999,
        paddingLeft: 5,
        paddingRight: 9,
        paddingVertical: 5,
        minHeight: 42,
        color: '#FFFFFF',
    },
    pillCompact: {
        paddingLeft: 4,
        paddingRight: 8,
        paddingVertical: 4,
        minHeight: 36,
    },
    logoSlot: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginRight: 8,
    },
    logoSlotCompact: {
        width: 26,
        height: 26,
        borderRadius: 13,
        marginRight: 6,
    },
    logoImage: {
        width: 21,
        height: 21,
    },
    logoImageCompact: {
        width: 18,
        height: 18,
    },
    label: {
        ...typography.buttonSm,
        fontFamily: FontFamily.semiBold,
        marginRight: 8,
        color: '#FFFFFF',
    },
    labelCompact: {
        fontSize: 12,
        lineHeight: 16,
        marginRight: 6,
    },
    chevronCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chevronCircleCompact: {
        width: 22,
        height: 22,
        borderRadius: 11,
    },
};
