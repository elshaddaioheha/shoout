/**
 * ModePillButton — tappable pill in the header showing current subscription tier + animated chevron.
 */
import { UserRole, ViewMode } from '@/store/useUserStore';
import { ChevronDown, Mic2, Music } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface ModePillButtonProps {
    viewMode: ViewMode;
    role: string;
    isOpen: boolean;
    onPress: () => void;
}

const MODE_CONFIG: Record<ViewMode, { Icon: any; color: string }> = {
    vault: { Icon: Music, color: '#EC5C39' },
    studio: { Icon: Mic2, color: '#4CAF50' },
};

const TIER_LABELS: Record<UserRole, string> = {
    vault_free: 'Vault Free',
    vault_creator: 'Vault Creator',
    vault_pro: 'Vault Pro',
    vault_executive: 'Vault Executive',
    studio_free: 'Studio Free',
    studio_pro: 'Studio Pro',
    studio_plus: 'Studio Plus',
    hybrid_creator: 'Hybrid Creator',
    hybrid_executive: 'Hybrid Executive',
};

export default function ModePillButton({ viewMode, role, isOpen, onPress }: ModePillButtonProps) {
    const chevronAnim = useRef(new Animated.Value(0)).current;
    const config = MODE_CONFIG[viewMode];
    const tierLabel = TIER_LABELS[role as UserRole] ?? (viewMode === 'vault' ? 'Vault' : 'Studio');

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
            <Text style={[styles.label, { color: config.color }]}>{tierLabel}</Text>
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
