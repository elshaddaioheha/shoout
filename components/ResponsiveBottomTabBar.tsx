import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Library, Megaphone, MoreHorizontal, Search, ShoppingCart, Upload } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { usePathname, useRouter } from 'expo-router';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useCartStore } from '@/store/useCartStore';
import { useLayoutMetricsStore } from '@/store/useLayoutMetricsStore';
import { useUserStore } from '@/store/useUserStore';
import { getModeSurfaceTheme } from '@/utils/appModeTheme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';

interface TabConfig {
    key: string;
    name?: string;
    routePath?: string;
    icon: React.ComponentType<any>;
    label: string;
}

function useResponsiveBottomTabBarStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function ResponsiveBottomTabBar(props: BottomTabBarProps) {
    const styles = useResponsiveBottomTabBarStyles();
    const { state, navigation } = props;
    const router = useRouter();
    const pathname = usePathname();
    const appTheme = useAppTheme();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const activeAppMode = useUserStore((s) => s.activeAppMode);
    const role = useUserStore((s) => s.role);
    const setBottomTabBarHeight = useLayoutMetricsStore((s) => s.setBottomTabBarHeight);
    const cartCount = useCartStore((s) => s.items.length);
    const bottomPadding = insets.bottom > 0 ? insets.bottom : 10;
    const isVaultMode = activeAppMode === 'vault' || activeAppMode === 'vault_pro';

    if (isVaultMode) {
        return null;
    }

    const tabs: TabConfig[] = activeAppMode === 'studio'
        ? [
            { key: 'index', name: 'index', icon: Home, label: 'Home' },
            { key: 'search', name: 'search', icon: UploadCloudIcon, label: 'Publish' },
            { key: 'marketplace', name: 'marketplace', icon: MegaphoneIcon, label: 'Promote' },
            { key: 'more', name: 'more', icon: MoreHorizontal, label: 'More' },
        ]
        : activeAppMode === 'hybrid'
        ? [
            { key: 'index', name: 'index', icon: Home, label: 'Home' },
            { key: 'search', name: 'search', icon: UploadCloudIcon, label: 'Publish' },
            { key: 'marketplace', name: 'marketplace', icon: MegaphoneIcon, label: 'Promote' },
            { key: 'library', name: 'library', icon: Library, label: 'Vault' },
            { key: 'more', name: 'more', icon: MoreHorizontal, label: 'More' },
        ]
        : (activeAppMode === 'vault' || activeAppMode === 'vault_pro')
        ? [
            { key: 'index', name: 'index', icon: Home, label: 'Home' },
            { key: 'more', name: 'more', icon: MoreHorizontal, label: 'More' },
        ]
        : activeAppMode === 'shoout'
        ? [
            { key: 'index', name: 'index', icon: Home, label: 'Home' },
            { key: 'search', name: 'search', icon: Search, label: 'Search' },
            { key: 'cart', name: 'cart', icon: ShoppingCart, label: 'Cart' },
            { key: 'more', name: 'more', icon: MoreHorizontal, label: 'More' },
        ]
        : [
            { key: 'index', name: 'index', icon: Home, label: 'Home' },
            { key: 'search', name: 'search', icon: Search, label: 'Explore' },
            { key: 'marketplace', name: 'marketplace', icon: ShoppingCart, label: 'Market Place' },
            { key: 'library', name: 'library', icon: Library, label: role === 'studio' || role === 'hybrid' ? 'Studio' : 'Vault' },
            { key: 'more', name: 'more', icon: MoreHorizontal, label: 'More' },
        ];

    const barWidth = Math.min(335, width - 28);

    const getRouteIndex = (tabName: string) => {
        if (!state || !state.routes) return -1;
        return state.routes.findIndex(r =>
            r.name === tabName ||
            r.name === `(tabs)/${tabName}` ||
            r.name.endsWith(`/${tabName}`)
        );
    };

    return (
        <View
            style={[styles.container, { paddingBottom: bottomPadding }]}
            onLayout={(event) => {
                setBottomTabBarHeight(event.nativeEvent.layout.height);
            }}
        >
            <View
                style={[
                    styles.tabBar,
                    isVaultMode && styles.vaultTabBar,
                    {
                        width: barWidth,
                        backgroundColor: appTheme.isDark ? 'rgba(20, 15, 16, 0.46)' : 'rgba(255,255,255,0.72)',
                        borderColor: appTheme.colors.borderStrong,
                    },
                ]}
            >
                <BlurView intensity={34} tint={appTheme.isDark ? 'dark' : 'light'} style={styles.tabBarBlur} />
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const routeIndex = tab.name ? getRouteIndex(tab.name) : -1;
                    const isFocused = tab.routePath
                        ? pathname === tab.routePath
                        : (routeIndex !== -1 && state && state.index === routeIndex);

                    const onPress = () => {
                        if (tab.routePath) {
                            router.push(tab.routePath as any);
                            return;
                        }

                        if (!tab.name) return;

                        const targetIndex = getRouteIndex(tab.name);
                        if (targetIndex === -1) {
                            navigation.navigate(tab.name as any);
                            return;
                        }

                        const event = navigation.emit({
                            type: 'tabPress',
                            target: state.routes[targetIndex].key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(tab.name as any);
                        }
                    };

                    return (
                        <TabButton
                            key={tab.key}
                            Icon={Icon}
                            label={tab.label}
                            badgeCount={tab.key === 'cart' ? cartCount : 0}
                            isFocused={isFocused}
                            tabKey={tab.key}
                            isCompact={isVaultMode}
                            activeAppMode={activeAppMode}
                            appTheme={appTheme}
                            styles={styles}
                            onPress={onPress}
                        />
                    );
                })}
            </View>
        </View>
    );
}

function TabButton({ Icon, label, badgeCount, isFocused, tabKey, isCompact, activeAppMode, appTheme, styles, onPress }: any) {
    const modeTheme = getModeSurfaceTheme(activeAppMode, appTheme.isDark);
    const inactiveColor = appTheme.colors.textTertiary;
    const activeFgColor = modeTheme.accentLabel;

    return (
        <TouchableOpacity
            style={[
                styles.tab,
                isFocused ? [styles.activeTab, { backgroundColor: modeTheme.actionSurface, borderColor: modeTheme.actionBorder }] : styles.inactiveTab,
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Icon
                size={18}
                color={isFocused ? activeFgColor : inactiveColor}
                fill={isFocused && tabKey === 'index' ? activeFgColor : 'none'}
            />
            <Text style={[styles.labelActive, { color: isFocused ? activeFgColor : inactiveColor }]} numberOfLines={1}>
                {label}
            </Text>
            {badgeCount > 0 && (
                <View style={[styles.cartBadge, { backgroundColor: modeTheme.accent, borderColor: appTheme.colors.background }]}> 
                    <Text style={styles.cartBadgeText}>{badgeCount > 99 ? '99+' : String(badgeCount)}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

function UploadCloudIcon(props: any) {
    return <Upload {...props} />;
}

function MegaphoneIcon(props: any) {
    return <Megaphone {...props} />;
}

const legacyStyles = {
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingTop: 8,
    },
    tabBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        height: 60,
        borderRadius: 40,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#000000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
    },
    vaultTabBar: {
        height: 48,
        paddingHorizontal: 8,
        borderRadius: 28,
    },
    tabBarBlur: {
        ...StyleSheet.absoluteFillObject,
    },
    tab: {
        flex: 1,
        minWidth: 0,
        height: 44,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
        paddingHorizontal: 4,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeTab: {
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    inactiveTab: {
        backgroundColor: 'transparent',
    },
    labelActive: {
        fontFamily: 'Poppins-Medium',
        fontSize: 10,
        lineHeight: 12,
    },
    cartBadge: {
        position: 'absolute',
        top: 2,
        right: 8,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        paddingHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    cartBadgeText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 9,
        lineHeight: 11,
    },
};
