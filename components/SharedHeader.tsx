import ModePillButton from '@/components/ModePillButton';
import { useNotificationStore } from '@/store/useNotificationStore';
import { ViewMode, useUserStore } from '@/store/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, MessageSquare, ShoppingCart } from 'lucide-react-native';
import React from 'react';
import { Platform, SafeAreaView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';

interface SharedHeaderProps {
    viewMode: ViewMode;
    isModeSheetOpen: boolean;
    onModePillPress: () => void;
    showCart?: boolean;
    cartCount?: number;
    showMessages?: boolean;
    role?: string;
    customRightContent?: React.ReactNode;
}

export default function SharedHeader({
    viewMode,
    isModeSheetOpen,
    onModePillPress,
    showCart,
    cartCount,
    showMessages,
    role,
    customRightContent,
}: SharedHeaderProps) {
    const router = useRouter();
    const { unreadCount } = useNotificationStore();
    const userRole = useUserStore((state) => state.role);
    const effectiveRole = role ?? userRole;
    const isVaultMode = viewMode === 'vault' || viewMode === 'vault_pro';
    const shouldShowCart = Boolean(showCart) && !isVaultMode;
    const shouldShowMessages = Boolean(showMessages) && !isVaultMode;
    const accentColor = effectiveRole === 'hybrid'
        ? '#FFD700'
        : effectiveRole === 'studio'
            ? '#4CAF50'
            : effectiveRole === 'shoout'
                ? '#6AA7FF'
                : '#EC5C39';

    const getRoleGradient = (): readonly [string, string, ...string[]] => {
        if (effectiveRole === 'shoout') return ['rgba(106, 167, 255, 0.2)', 'rgba(20, 15, 16, 1)'];
        if (effectiveRole === 'vault_pro') return ['rgba(236, 92, 57, 0.25)', 'rgba(20, 15, 16, 1)'];
        if (effectiveRole === 'studio') return ['rgba(76, 175, 80, 0.25)', 'rgba(20, 15, 16, 1)'];
        if (effectiveRole === 'hybrid') return ['rgba(255, 215, 0, 0.25)', 'rgba(20, 15, 16, 1)'];
        return ['#140F10', '#140F10'];
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <LinearGradient colors={getRoleGradient()} style={StyleSheet.absoluteFillObject} />
            <View style={styles.header}>
                <ModePillButton
                    viewMode={viewMode}
                    isOpen={isModeSheetOpen}
                    onPress={onModePillPress}
                />

                <View style={styles.headerSpacer} />

                <View style={styles.headerRight}>
                    {customRightContent ?? (
                        <>
                            {shouldShowMessages && (
                                <TouchableOpacity
                                    style={[styles.iconButton, { marginRight: 8 }]}
                                    onPress={() => router.push('/chat' as any)}
                                >
                                    <MessageSquare size={18} color="white" />
                                </TouchableOpacity>
                            )}
                            {shouldShowCart && (
                                <TouchableOpacity
                                    style={[styles.iconButton, { marginRight: 8 }]}
                                    onPress={() => router.push('/cart' as any)}
                                >
                                    <ShoppingCart size={18} color="white" />
                                    {cartCount != null && cartCount > 0 && (
                                        <View style={[styles.badge, { backgroundColor: accentColor }]} />
                                    )}
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={styles.iconButton}
                                onPress={() => router.push('/notifications' as any)}
                            >
                                <Bell size={18} color="white" />
                                {unreadCount > 0 && (
                                    <View style={[styles.badge, { backgroundColor: accentColor }]} />
                                )}
                            </TouchableOpacity>
                        </>
                    )}
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
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 60,
    },
    headerSpacer: {
        flex: 1,
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
