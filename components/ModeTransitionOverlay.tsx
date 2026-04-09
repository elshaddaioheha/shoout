/**
 * ModeTransitionOverlay - full-screen animated welcome surface for app-mode switching.
 */
import { ViewMode } from '@/store/useUserStore';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Disc3, FolderLock, Layers3, Mic2, Music } from 'lucide-react-native';
import React from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface ModeTransitionOverlayProps {
    transitioning: boolean;
    newMode: ViewMode;
    overlayAnim: Animated.Value;
    welcomeSlideAnim: Animated.Value;
    welcomeOpacityAnim: Animated.Value;
}

const MODE_CONFIG: Record<ViewMode, { label: string; badge: string; Icon: any; color: string; subtitle: string; accent: string }> = {
    shoout: { label: 'Shoout', badge: 'Marketplace Mode', Icon: Disc3, color: '#6AA7FF', accent: '#D8E8FF', subtitle: 'Marketplace mode for discovery, buying, and digging through fresh sounds.' },
    vault: { label: 'Vault', badge: 'Private Workspace', Icon: Music, color: '#EC5C39', accent: '#F8D8D0', subtitle: 'Your private music universe for uploads, folders, and secure sharing.' },
    vault_pro: { label: 'Vault Pro', badge: 'Expanded Private Workspace', Icon: FolderLock, color: '#EC5C39', accent: '#F6D8CF', subtitle: 'The same private Vault workflow with higher limits and deeper control.' },
    studio: { label: 'Studio', badge: 'Seller Workspace', Icon: Mic2, color: '#4CAF50', accent: '#DCEFD9', subtitle: 'Create, upload, and sell your music with a focused creator dashboard.' },
    hybrid: { label: 'Hybrid', badge: 'Unified Creator Mode', Icon: Layers3, color: '#C99A06', accent: '#F8EAB8', subtitle: 'A combined creator workspace across Vault and Studio for everything in one place.' },
};

const DOODLE_POSITIONS = [
    { top: '10%', left: '8%', size: 18, rotate: '-14deg', opacity: 0.13 },
    { top: '16%', left: '68%', size: 26, rotate: '18deg', opacity: 0.11 },
    { top: '28%', left: '30%', size: 22, rotate: '-8deg', opacity: 0.1 },
    { top: '38%', left: '80%', size: 20, rotate: '12deg', opacity: 0.08 },
    { top: '52%', left: '12%', size: 28, rotate: '-18deg', opacity: 0.09 },
    { top: '58%', left: '58%', size: 16, rotate: '6deg', opacity: 0.12 },
    { top: '70%', left: '76%', size: 24, rotate: '-10deg', opacity: 0.09 },
    { top: '78%', left: '38%', size: 20, rotate: '16deg', opacity: 0.08 },
];

function useModeTransitionStyles() {
    return React.useMemo(() => StyleSheet.create(legacyStyles as any), []);
}

export default function ModeTransitionOverlay({
    transitioning,
    newMode,
    overlayAnim,
    welcomeSlideAnim,
    welcomeOpacityAnim,
}: ModeTransitionOverlayProps) {
    const appTheme = useAppTheme();
    const styles = useModeTransitionStyles();

    if (!transitioning) return null;

    const config = MODE_CONFIG[newMode];
    const contentTranslateX = welcomeSlideAnim.interpolate({
        inputRange: [0, 40],
        outputRange: [0, -40],
    });
    const screenTranslateX = welcomeSlideAnim.interpolate({
        inputRange: [0, 40],
        outputRange: [0, -18],
    });
    const screenScale = welcomeOpacityAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.985, 1],
    });
    const blurGhostTranslate = welcomeSlideAnim.interpolate({
        inputRange: [0, 40],
        outputRange: [0, -16],
    });

    return (
        <Animated.View
            style={[
                StyleSheet.absoluteFill,
                styles.overlay,
                {
                    opacity: overlayAnim,
                    backgroundColor: appTheme.colors.background,
                    transform: [{ translateX: screenTranslateX }, { scale: screenScale }],
                },
            ]}
            pointerEvents="none"
        >
            {DOODLE_POSITIONS.map((doodle, index) => (
                <Animated.View
                    key={`${newMode}-doodle-${index}`}
                    style={[
                        styles.doodleWrap,
                        {
                            top: doodle.top as any,
                            left: doodle.left as any,
                            opacity: welcomeOpacityAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, doodle.opacity],
                            }),
                            transform: [
                                { translateX: contentTranslateX },
                                { rotate: doodle.rotate },
                                {
                                    scale: welcomeOpacityAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.82, 1],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <config.Icon size={doodle.size} color={config.color} strokeWidth={1.8} />
                </Animated.View>
            ))}

            <Animated.View
                style={[
                    styles.accentGraphic,
                    {
                        transform: [{ translateX: contentTranslateX }],
                        opacity: welcomeOpacityAnim,
                    },
                ]}
            >
                <View style={[styles.accentHalo, { backgroundColor: config.accent }]} />
                <View style={[styles.accentRingOuter, { borderColor: `${config.color}30` }]} />
                <View style={[styles.accentRingInner, { borderColor: `${config.color}45` }]} />
                <View style={[styles.accentCore, { backgroundColor: config.color }]}>
                    <config.Icon size={40} color="#FFFFFF" />
                </View>
            </Animated.View>

            <Animated.View
                style={[
                    styles.motionGhostBlock,
                    {
                        opacity: welcomeOpacityAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.14],
                        }),
                        transform: [{ translateX: blurGhostTranslate }],
                    },
                ]}
            >
                <Text style={[styles.motionGhostLabel, { color: config.color }]}>Welcome to</Text>
                <Text style={[styles.motionGhostMode, { color: config.color }]}>{config.label}</Text>
            </Animated.View>

            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: welcomeOpacityAnim,
                        transform: [{ translateX: contentTranslateX }],
                    },
                ]}
            >
                <View style={[styles.badge, { borderColor: `${config.color}2A`, backgroundColor: `${config.color}10` }]}>
                    <View style={[styles.badgeDot, { backgroundColor: config.color }]} />
                    <Text style={[styles.badgeText, { color: config.color }]}>{config.badge}</Text>
                </View>

                <View style={styles.textBlock}>
                    <Text style={[styles.welcomeLabel, { color: appTheme.colors.textSecondary }]}>Welcome to</Text>
                    <Text style={[styles.welcomeMode, { color: appTheme.colors.textPrimary }]}>{config.label}</Text>
                    <Text style={[styles.welcomeSubtitle, { color: appTheme.colors.textSecondary }]}>{config.subtitle}</Text>
                </View>
            </Animated.View>
        </Animated.View>
    );
}

const legacyStyles = {
    overlay: {
        zIndex: 99999,
        elevation: 99999,
        overflow: 'hidden',
    },
    doodleWrap: {
        position: 'absolute',
    },
    accentGraphic: {
        position: 'absolute',
        top: Math.max(54, height * 0.11),
        right: -34,
        width: width * 0.72,
        height: width * 0.72,
        alignItems: 'center',
        justifyContent: 'center',
    },
    accentHalo: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 999,
        opacity: 0.55,
    },
    accentRingOuter: {
        position: 'absolute',
        width: '78%',
        height: '78%',
        borderRadius: 999,
        borderWidth: 1,
    },
    accentRingInner: {
        position: 'absolute',
        width: '58%',
        height: '58%',
        borderRadius: 999,
        borderWidth: 1,
    },
    accentCore: {
        width: 96,
        height: 96,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 18 },
        shadowOpacity: 0.12,
        shadowRadius: 30,
        elevation: 10,
    },
    motionGhostBlock: {
        position: 'absolute',
        left: 28,
        bottom: 76,
    },
    motionGhostLabel: {
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    motionGhostMode: {
        fontSize: 52,
        fontFamily: 'Poppins-Bold',
        lineHeight: 58,
        letterSpacing: -1.2,
    },
    content: {
        position: 'absolute',
        left: 28,
        right: 28,
        bottom: 52,
        maxWidth: width * 0.72,
    },
    badge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 18,
    },
    badgeDot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        marginRight: 8,
    },
    badgeText: {
        fontSize: 12,
        fontFamily: 'Poppins-SemiBold',
        letterSpacing: 0.15,
    },
    textBlock: {
        maxWidth: width * 0.66,
    },
    welcomeLabel: {
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    welcomeMode: {
        fontSize: 52,
        fontFamily: 'Poppins-Bold',
        lineHeight: 58,
        letterSpacing: -1.2,
    },
    welcomeSubtitle: {
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
        lineHeight: 23,
        marginTop: 10,
    },
};
