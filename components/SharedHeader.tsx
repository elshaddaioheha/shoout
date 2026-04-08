import ModePillButton from '@/components/ModePillButton';
import { useNotificationStore } from '@/store/useNotificationStore';
import { ViewMode } from '@/store/useUserStore';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { getModeSurfaceTheme } from '@/utils/appModeTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, MessageSquare, ShoppingCart } from 'lucide-react-native';
import React from 'react';
import { Platform, SafeAreaView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';

function withAlpha(hex: string, alphaHex: string) {
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
        return `${hex}${alphaHex}`;
    }
    return hex;
}

function useSharedHeaderStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

interface SharedHeaderProps {
    viewMode: ViewMode;
    isModeSheetOpen: boolean;
    onModePillPress: () => void;
    showCart?: boolean;
    cartCount?: number;
    showMessages?: boolean;
    customRightContent?: React.ReactNode;
}

export default function SharedHeader({
    viewMode,
    isModeSheetOpen,
    onModePillPress,
    showCart,
    cartCount,
    showMessages,
    customRightContent,
}: SharedHeaderProps) {
    const router = useRouter();
    const styles = useSharedHeaderStyles();
    const { unreadCount } = useNotificationStore();
    const appTheme = useAppTheme();
    const isVaultMode = viewMode === 'vault' || viewMode === 'vault_pro';
    const modeKey = viewMode === 'vault_pro' ? 'vault' : viewMode;
    const modeTheme = getModeSurfaceTheme(modeKey as any, appTheme.isDark);
    const accentColor = modeTheme.accent || appTheme.colors.primary;
    const shouldShowCart = Boolean(showCart) && !isVaultMode;
    const shouldShowMessages = Boolean(showMessages) && !isVaultMode;

    const getRoleGradient = (): readonly [string, string, ...string[]] => {
        const startColor = withAlpha(accentColor, appTheme.isDark ? '30' : '18');
        return [startColor, appTheme.colors.background];
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: appTheme.colors.background }]}>
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
                                    style={[styles.iconButton, { marginRight: 8, backgroundColor: modeTheme.actionSurface, borderColor: modeTheme.actionBorder }]}
                                    onPress={() => router.push('/chat' as any)}
                                >
                                    <MessageSquare size={18} color={appTheme.colors.textPrimary} />
                                </TouchableOpacity>
                            )}
                            {shouldShowCart && (
                                <TouchableOpacity
                                    style={[styles.iconButton, { marginRight: 8, backgroundColor: modeTheme.actionSurface, borderColor: modeTheme.actionBorder }]}
                                    onPress={() => router.push('/cart' as any)}
                                >
                                    <ShoppingCart size={18} color={appTheme.colors.textPrimary} />
                                    {cartCount != null && cartCount > 0 && (
                                        <View style={[styles.badge, { backgroundColor: accentColor, borderColor: appTheme.colors.background }]} />
                                    )}
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[styles.iconButton, { backgroundColor: modeTheme.actionSurface, borderColor: modeTheme.actionBorder }]}
                                onPress={() => router.push('/notifications' as any)}
                            >
                                <Bell size={18} color={appTheme.colors.textPrimary} />
                                {unreadCount > 0 && (
                                    <View style={[styles.badge, { backgroundColor: accentColor, borderColor: appTheme.colors.background }]} />
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </SafeAreaView>
    );
}

const legacyStyles = {
    safeArea: {
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
        borderWidth: 1,
        borderRadius: 21,
        width: 42,
        height: 42,
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
        borderWidth: 1,
    },
};
