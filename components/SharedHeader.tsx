import ModePillButton from '@/components/ModePillButton';
import { useNotificationStore } from '@/store/useNotificationStore';
import { ViewMode } from '@/store/useUserStore';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, MessageSquare, ShoppingCart } from 'lucide-react-native';
import React from 'react';
import { Platform, SafeAreaView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';

interface SharedHeaderProps {
    /** Current active view mode — drives pill button display */
    viewMode: ViewMode;
    /** Whether the mode sheet is open (animates chevron) */
    isModeSheetOpen: boolean;
    /** Called when the mode pill is tapped */
    onModePillPress: () => void;
    showCart?: boolean;
    cartCount?: number;
    showMessages?: boolean;
    /** role for gradient tinting */
    role?: string;
}

export default function SharedHeader({
    viewMode,
    isModeSheetOpen,
    onModePillPress,
    showCart,
    cartCount,
    showMessages,
    role = 'vault',
}: SharedHeaderProps) {
    const router = useRouter();
    const { unreadCount } = useNotificationStore();

    const getRoleGradient = (): readonly [string, string, ...string[]] => {
        if (role === 'vault_pro') return ['rgba(236, 92, 57, 0.25)', 'rgba(20, 15, 16, 1)'];
        if (role.startsWith('studio')) return ['rgba(76, 175, 80, 0.25)', 'rgba(20, 15, 16, 1)'];
        if (role.startsWith('hybrid')) return ['rgba(255, 215, 0, 0.25)', 'rgba(20, 15, 16, 1)'];
        return ['#140F10', '#140F10'];
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <LinearGradient colors={getRoleGradient()} style={StyleSheet.absoluteFillObject} />
            <View style={styles.header}>
                {/* Left — Logo */}
                <TouchableOpacity
                    style={styles.logoWrapper}
                    onPress={() => router.push('/profile')}
                    activeOpacity={0.7}
                >
                    <Image
                        source={require('@/assets/images/logo-rings.png')}
                        style={styles.logoImage}
                        contentFit="contain"
                    />
                </TouchableOpacity>

                {/* Centre — Mode Pill */}
                <ModePillButton
                    viewMode={viewMode}
                    role={role}
                    isOpen={isModeSheetOpen}
                    onPress={onModePillPress}
                />

                {/* Right — Actions */}
                <View style={styles.headerRight}>
                    {showMessages && (
                        <TouchableOpacity
                            style={[styles.iconButton, { marginRight: 8 }]}
                            onPress={() => router.push('/chat' as any)}
                        >
                            <MessageSquare size={18} color="white" />
                        </TouchableOpacity>
                    )}
                    {showCart && (
                        <TouchableOpacity
                            style={[styles.iconButton, { marginRight: 8 }]}
                            onPress={() => router.push('/cart' as any)}
                        >
                            <ShoppingCart size={18} color="white" />
                            {cartCount != null && cartCount > 0 && (
                                <View style={styles.badge} />
                            )}
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => router.push('/notifications' as any)}
                    >
                        <Bell size={18} color="white" />
                        {unreadCount > 0 && (
                            <View style={styles.badge} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#140F10',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 60,
    },
    logoWrapper: {
        paddingVertical: 10,
    },
    logoImage: {
        width: 55,
        height: 28,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        padding: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: 3,
        right: 3,
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#EC5C39',
        borderWidth: 1,
        borderColor: '#140F10',
    },
});
