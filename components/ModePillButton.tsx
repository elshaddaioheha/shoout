/**
 * ModePillButton — tappable pill in the header showing current mode + animated chevron.
 */
import { ViewMode } from '@/store/useUserStore';
import { ChevronDown, Mic2, Music } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface ModePillButtonProps {
    viewMode: ViewMode;
    isOpen: boolean;
    onPress: () => void;
}

const MODE_CONFIG: Record<ViewMode, { label: string; Icon: any; color: string }> = {
    vault: { label: 'Vault', Icon: Music, color: '#EC5C39' },
    studio: { label: 'Studio', Icon: Mic2, color: '#4CAF50' },
};

export default function ModePillButton({ viewMode, isOpen, onPress }: ModePillButtonProps) {
    const chevronAnim = useRef(new Animated.Value(0)).current;
    const config = MODE_CONFIG[viewMode];

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
            style={[styles.pill, { borderColor: config.color + '40' }]}
            onPress={onPress}
            activeOpacity={0.75}
        >
            <config.Icon size={13} color={config.color} />
            <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
            <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
                <ChevronDown size={13} color={config.color} strokeWidth={2.5} />
            </Animated.View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    label: {
        fontSize: 12,
        fontFamily: 'Poppins-SemiBold',
    },
});
