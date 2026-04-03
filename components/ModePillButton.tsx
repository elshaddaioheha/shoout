/**
 * ModePillButton - top-left app switcher pill with embedded rings logo.
 */
import { ViewMode } from '@/store/useUserStore';
import { Image } from 'expo-image';
import { ChevronDown } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ModePillButtonProps {
    viewMode: ViewMode;
    isOpen: boolean;
    onPress: () => void;
}

const MODE_LABELS: Record<ViewMode, string> = {
    shoout: 'Shoout',
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

export default function ModePillButton({ viewMode, isOpen, onPress }: ModePillButtonProps) {
    const chevronAnim = useRef(new Animated.Value(0)).current;
    const modeStyle = MODE_COLORS[viewMode];
    const modeLabel = MODE_LABELS[viewMode];

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
            style={[styles.pill, { borderColor: modeStyle.border }]}
            onPress={onPress}
            activeOpacity={0.75}
        >
            <View style={styles.logoSlot}>
                <Image
                    source={require('@/assets/images/logo-rings.png')}
                    style={styles.logoImage}
                    contentFit="contain"
                />
            </View>
            <Text style={[styles.label, { color: modeStyle.text }]}>{modeLabel}</Text>
            <Animated.View
                style={[
                    styles.chevronCircle,
                    { backgroundColor: modeStyle.arrowBg, transform: [{ rotate: chevronRotate }] },
                ]}
            >
                <ChevronDown size={12} color={modeStyle.text} strokeWidth={2.5} />
            </Animated.View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderRadius: 999,
        paddingLeft: 5,
        paddingRight: 9,
        paddingVertical: 5,
        minHeight: 42,
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
    logoImage: {
        width: 21,
        height: 21,
    },
    label: {
        fontSize: 14,
        fontFamily: 'Poppins-SemiBold',
        marginRight: 8,
    },
    chevronCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
