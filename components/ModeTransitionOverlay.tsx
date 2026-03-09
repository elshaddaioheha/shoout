/**
 * ModeTransitionOverlay — full-screen dimming overlay with "Welcome to [Mode]" card.
 * Rendered globally in the tab layout so it covers everything including the tab bar.
 */
import { ViewMode } from '@/store/useUserStore';
import { Mic2, Music } from 'lucide-react-native';
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

const MODE_CONFIG = {
    vault: { label: 'Vault', Icon: Music, color: '#EC5C39', subtitle: 'Your personal music universe' },
    studio: { label: 'Studio', Icon: Mic2, color: '#4CAF50', subtitle: 'Create, upload & sell your music' },
};

export default function ModeTransitionOverlay({
    transitioning,
    newMode,
    overlayAnim,
    welcomeSlideAnim,
    welcomeOpacityAnim,
}: ModeTransitionOverlayProps) {
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
            {/* Welcome Card animates from bottom-left */}
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

const styles = StyleSheet.create({
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
});
