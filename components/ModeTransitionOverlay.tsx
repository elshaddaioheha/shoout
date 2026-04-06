/**
 * ModeTransitionOverlay - full-screen dimming overlay with "Welcome to [Mode]" card.
 */
import { ViewMode } from '@/store/useUserStore';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { Disc3, FolderLock, Layers3, Mic2, Music } from 'lucide-react-native';
import React from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

interface ModeTransitionOverlayProps {
    transitioning: boolean;
    newMode: ViewMode;
    overlayAnim: Animated.Value;
    welcomeSlideAnim: Animated.Value;
    welcomeOpacityAnim: Animated.Value;
}

const MODE_CONFIG: Record<ViewMode, { label: string; Icon: any; color: string; subtitle: string }> = {
    shoout: { label: 'Shoout', Icon: Disc3, color: '#6AA7FF', subtitle: 'Marketplace mode for discovery and buying' },
    vault: { label: 'Vault', Icon: Music, color: '#EC5C39', subtitle: 'Your personal music universe' },
    vault_pro: { label: 'Vault Pro', Icon: FolderLock, color: '#EC5C39', subtitle: 'The same private Vault workflow with much higher limits' },
    studio: { label: 'Studio', Icon: Mic2, color: '#4CAF50', subtitle: 'Create, upload and sell your music' },
    hybrid: { label: 'Hybrid', Icon: Layers3, color: '#FFD700', subtitle: 'Combined creator workspace across Vault and Studio' },
};

function useModeTransitionStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function ModeTransitionOverlay({
    transitioning,
    newMode,
    overlayAnim,
    welcomeSlideAnim,
    welcomeOpacityAnim,
}: ModeTransitionOverlayProps) {
    const styles = useModeTransitionStyles();

    if (!transitioning) return null;

    const config = MODE_CONFIG[newMode];

    return (
        <Animated.View
            style={[
                StyleSheet.absoluteFill,
                styles.overlay,
                { opacity: overlayAnim },
            ]}
            pointerEvents="none"
        >
            <Animated.View
                style={[
                    styles.welcomeCard,
                    {
                        opacity: welcomeOpacityAnim,
                        transform: [{ translateY: welcomeSlideAnim }],
                        borderColor: config.color + '40',
                    },
                ]}
            >
                <View style={[styles.iconCircle, { backgroundColor: config.color + '20' }]}>
                    <config.Icon size={32} color={config.color} />
                </View>
                <View style={styles.welcomeText}>
                    <Text style={styles.welcomeLabel}>Welcome to</Text>
                    <Text style={[styles.welcomeMode, { color: config.color }]}>{config.label}</Text>
                    <Text style={styles.welcomeSubtitle}>{config.subtitle}</Text>
                </View>
            </Animated.View>
        </Animated.View>
    );
}

const legacyStyles = {
    overlay: {
        zIndex: 99999,
        elevation: 99999,
        backgroundColor: 'rgba(10, 10, 15, 0.92)',
        justifyContent: 'flex-end',
        padding: 28,
        paddingBottom: 120,
    },
    welcomeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E1A1B',
        borderRadius: 24,
        borderWidth: 1,
        padding: 20,
        gap: 16,
        maxWidth: width * 0.85,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 24,
        elevation: 20,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    welcomeText: {
        flex: 1,
    },
    welcomeLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        marginBottom: 2,
    },
    welcomeMode: {
        fontSize: 22,
        fontFamily: 'Poppins-Bold',
        lineHeight: 26,
    },
    welcomeSubtitle: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        marginTop: 3,
    },
};
