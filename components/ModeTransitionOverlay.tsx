/**
 * ModeTransitionOverlay - full-screen animated welcome surface for app-mode switching.
 */
import { ViewMode } from '@/store/useUserStore';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/constants/typography';
import { colors } from '@/constants/colors';
import { Icon, IconName } from '@/components/ui/Icon';
import React from 'react';
import { Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface ModeTransitionOverlayProps {
    transitioning: boolean;
    previousMode: ViewMode;
    newMode: ViewMode;
    waitingForRender: boolean;
    overlayProgress: SharedValue<number>;
    overlayTranslateX: SharedValue<number>;
    welcomeProgress: SharedValue<number>;
}

const MODE_CONFIG: Record<ViewMode, { label: string; badge: string; iconName: IconName; color: string; subtitle: string; accent: string }> = {
    shoout: { label: 'Shoouts', badge: 'Marketplace Mode', iconName: 'disc3', color: colors.shooutPrimary, accent: '#D8E8FF', subtitle: 'Marketplace mode for discovery, buying, and digging through fresh sounds.' },
    vault: { label: 'Vault', badge: 'Private Workspace', iconName: 'music', color: '#EC5C39', accent: '#F8D8D0', subtitle: 'Your private music universe for uploads, folders, and secure sharing.' },
    vault_pro: { label: 'Vault Pro', badge: 'Expanded Private Workspace', iconName: 'folder-lock', color: '#EC5C39', accent: '#F6D8CF', subtitle: 'The same private Vault workflow with higher limits and deeper control.' },
    studio: { label: 'Studio', badge: 'Seller Workspace', iconName: 'mic2', color: '#4CAF50', accent: '#DCEFD9', subtitle: 'Create, upload, and sell your music with a focused creator dashboard.' },
    hybrid: { label: 'Hybrid', badge: 'Unified Creator Mode', iconName: 'library', color: '#C99A06', accent: '#F8EAB8', subtitle: 'A combined creator workspace across Vault and Studio for everything in one place.' },
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
    previousMode,
    newMode,
    waitingForRender,
    overlayProgress,
    overlayTranslateX,
    welcomeProgress,
}: ModeTransitionOverlayProps) {
    const appTheme = useAppTheme();
    const styles = useModeTransitionStyles();
    const previousConfig = MODE_CONFIG[previousMode];
    const config = MODE_CONFIG[newMode];
    const overlayStyle = useAnimatedStyle(() => ({
        opacity: overlayProgress.value,
        transform: [
            { translateX: overlayTranslateX.value },
            { scale: interpolate(welcomeProgress.value, [0, 1], [0.985, 1]) },
        ],
    }));

    const accentGraphicStyle = useAnimatedStyle(() => ({
        opacity: welcomeProgress.value,
        transform: [{ translateX: interpolate(welcomeProgress.value, [0, 1], [-40, 0]) }],
    }));

    const motionGhostStyle = useAnimatedStyle(() => ({
        opacity: interpolate(welcomeProgress.value, [0, 1], [0, 0.14]),
        transform: [{ translateX: interpolate(welcomeProgress.value, [0, 1], [-16, 0]) }],
    }));

    const contentStyle = useAnimatedStyle(() => ({
        opacity: welcomeProgress.value,
        transform: [
            { translateX: interpolate(welcomeProgress.value, [0, 1], [-40, 0]) },
            { translateY: interpolate(welcomeProgress.value, [0, 1], [18, 0]) },
        ],
    }));

    const cardStyle = useAnimatedStyle(() => ({
        opacity: welcomeProgress.value,
        transform: [
            { translateY: interpolate(welcomeProgress.value, [0, 1], [28, 0]) },
            { scale: interpolate(welcomeProgress.value, [0, 1], [0.96, 1]) },
        ],
    }));

    if (!transitioning) return null;

    return (
        <Animated.View
            style={[
                StyleSheet.absoluteFill,
                styles.overlay,
                Platform.OS === 'web' ? ({ pointerEvents: 'none' } as any) : null,
                { backgroundColor: appTheme.colors.background },
                overlayStyle,
            ]}
        >
            {DOODLE_POSITIONS.map((doodle, index) => (
                <ModeDoodle
                    key={`${newMode}-doodle-${index}`}
                    doodle={doodle}
                    welcomeProgress={welcomeProgress}
                    iconName={config.iconName}
                    color={config.color}
                    styles={styles}
                />
            ))}

            <Animated.View
                style={[
                    styles.accentGraphic,
                    accentGraphicStyle,
                ]}
            >
                <View style={[styles.accentHalo, { backgroundColor: config.accent }]} />
                <View style={[styles.accentRingOuter, { borderColor: `${config.color}30` }]} />
                <View style={[styles.accentRingInner, { borderColor: `${config.color}45` }]} />
                <View style={[styles.accentCore, { backgroundColor: config.color }]}>
                    <Icon name={config.iconName} size={40} color="#FFFFFF" />
                </View>
            </Animated.View>

            <Animated.View
                style={[
                    styles.motionGhostBlock,
                    motionGhostStyle,
                ]}
            >
                <Text style={[styles.motionGhostLabel, { color: config.color }]}>Welcome to</Text>
                <Text style={[styles.motionGhostMode, { color: config.color }]}>{config.label}</Text>
            </Animated.View>

            <Animated.View style={[styles.content, contentStyle]}>
                <Animated.View
                    style={[
                        styles.transitionCard,
                        {
                            backgroundColor: appTheme.isDark ? 'rgba(18, 14, 15, 0.82)' : 'rgba(255, 255, 255, 0.88)',
                            borderColor: appTheme.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(20,15,16,0.08)',
                        },
                        cardStyle,
                    ]}
                >
                    <View style={styles.transitionHeader}>
                        <View style={[styles.badge, { borderColor: `${config.color}2A`, backgroundColor: `${config.color}10` }]}>
                            <View style={[styles.badgeDot, { backgroundColor: config.color }]} />
                            <Text style={[styles.badgeText, { color: config.color }]}>{config.badge}</Text>
                        </View>
                        <Text style={[styles.transitionStatus, { color: config.color }]}>
                            {waitingForRender ? `Preparing ${config.label}` : 'Switching Experience'}
                        </Text>
                    </View>

                    <View style={styles.modeRail}>
                        <View
                            style={[
                                styles.modeChip,
                                {
                                    borderColor: `${previousConfig.color}30`,
                                    backgroundColor: `${previousConfig.color}12`,
                                },
                            ]}
                        >
                            <Icon name={previousConfig.iconName} size={16} color={previousConfig.color} />
                            <Text style={[styles.modeChipLabel, { color: appTheme.colors.textPrimary }]}>
                                {previousConfig.label}
                            </Text>
                        </View>
                        <View style={styles.modeConnector}>
                            <View style={[styles.modeConnectorLine, { backgroundColor: `${config.color}35` }]} />
                            <View style={[styles.modeConnectorDot, { backgroundColor: config.color }]} />
                        </View>
                        <View
                            style={[
                                styles.modeChip,
                                styles.modeChipActive,
                                {
                                    borderColor: `${config.color}40`,
                                    backgroundColor: `${config.color}18`,
                                },
                            ]}
                        >
                            <Icon name={config.iconName} size={16} color={config.color} />
                            <Text style={[styles.modeChipLabel, { color: appTheme.colors.textPrimary }]}>
                                {config.label}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.textBlock}>
                        <Text style={[styles.welcomeLabel, { color: appTheme.colors.textSecondary }]}>Now entering</Text>
                        <Text style={[styles.welcomeMode, { color: appTheme.colors.textPrimary }]}>{config.label}</Text>
                        <Text style={[styles.welcomeSubtitle, { color: appTheme.colors.textSecondary }]}>
                            {config.subtitle}
                        </Text>
                        <Text style={[styles.renderHint, { color: appTheme.colors.textSecondary }]}>
                            {waitingForRender
                                ? `Rendering the ${config.label} workspace before the transition clears.`
                                : `The ${config.label} experience is ready.`}
                        </Text>
                    </View>
                </Animated.View>
            </Animated.View>
        </Animated.View>
    );
}

function ModeDoodle({
    doodle,
    welcomeProgress,
    iconName,
    color,
    styles,
}: {
    doodle: { top: string; left: string; size: number; rotate: string; opacity: number };
    welcomeProgress: SharedValue<number>;
    iconName: IconName;
    color: string;
    styles: ReturnType<typeof useModeTransitionStyles>;
}) {
    const doodleStyle = useAnimatedStyle(() => ({
        opacity: interpolate(welcomeProgress.value, [0, 1], [0, doodle.opacity]),
        transform: [
            { translateX: interpolate(welcomeProgress.value, [0, 1], [-40, 0]) },
            { rotate: doodle.rotate },
            { scale: interpolate(welcomeProgress.value, [0, 1], [0.82, 1]) },
        ],
    }));

    return (
        <Animated.View
            style={[
                styles.doodleWrap,
                {
                    top: doodle.top as any,
                    left: doodle.left as any,
                },
                doodleStyle,
            ]}
        >
            <Icon name={iconName} size={doodle.size} color={color} strokeWidth={1.8} />
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
        ...typography.body,
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    motionGhostMode: {
        ...typography.display,
        fontSize: 52,
        lineHeight: 58,
        letterSpacing: -1.2,
    },
    content: {
        position: 'absolute',
        left: 28,
        right: 28,
        bottom: 52,
        maxWidth: Math.min(width - 56, 520),
    },
    transitionCard: {
        borderRadius: 28,
        borderWidth: 1,
        paddingHorizontal: 22,
        paddingVertical: 22,
    },
    transitionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 18,
    },
    transitionStatus: {
        ...typography.label,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    modeRail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 18,
    },
    modeChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
    },
    modeChipActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
    },
    modeChipLabel: {
        ...typography.label,
    },
    modeConnector: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 36,
    },
    modeConnectorLine: {
        flex: 1,
        height: 1,
    },
    modeConnectorDot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        marginLeft: -1,
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
        ...typography.label,
        letterSpacing: 0.15,
    },
    textBlock: {
        maxWidth: '100%',
    },
    welcomeLabel: {
        ...typography.body,
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    welcomeMode: {
        ...typography.display,
        fontSize: 52,
        lineHeight: 58,
        letterSpacing: -1.2,
    },
    welcomeSubtitle: {
        ...typography.body,
        lineHeight: 23,
        marginTop: 10,
    },
    renderHint: {
        ...typography.caption,
        marginTop: 12,
        lineHeight: 18,
    },
};
