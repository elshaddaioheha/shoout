import { Icon, type IconName } from '@/components/ui/Icon';
import { typography } from '@/constants/typography';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useResponsiveBreakpoints } from '@/hooks/use-is-large-screen';
import { useCartStore } from '@/store/useCartStore';
import { useLayoutMetricsStore } from '@/store/useLayoutMetricsStore';
import { useUserStore } from '@/store/useUserStore';
import { getModeSurfaceTheme } from '@/utils/appModeTheme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabConfig {
    key: string;
    name?: string;
    routePath?: string;
    icon: IconName;
    label: string;
    fillOnFocus?: boolean;
}

type TabLayout = {
    x: number;
    y: number;
    width: number;
    height: number;
};

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
    const { width, isLargeScreen } = useResponsiveBreakpoints();
    const isNativeLargeScreen = Platform.OS !== 'web' && isLargeScreen;
    const activeAppMode = useUserStore((s) => s.activeAppMode);
    const role = useUserStore((s) => s.role);
    const useUnifiedPillRoundness = activeAppMode === 'hybrid' || activeAppMode === 'shoout' || activeAppMode === 'studio';
    const setBottomTabBarHeight = useLayoutMetricsStore((s) => s.setBottomTabBarHeight);
    const cartCount = useCartStore((s) => s.items.length);
    const tabLayouts = useSharedValue<Record<number, TabLayout>>({});
    const modeTheme = getModeSurfaceTheme(activeAppMode, appTheme.isDark);
    const bottomPadding = isNativeLargeScreen
        ? Math.max(14, insets.bottom)
        : (insets.bottom > 0 ? insets.bottom : 10);
    const isVaultMode = activeAppMode === 'vault' || activeAppMode === 'vault_pro';
    const maxWidth = 500;
    const horizontalPadding = width > 768 ? 60 : 20;
    const isTablet = width > 768;

    const tabs: TabConfig[] = activeAppMode === 'studio'
        ? [
            { key: 'index', name: 'index', icon: 'home', label: 'Home', fillOnFocus: true },
            { key: 'search', name: 'search', icon: 'upload', label: 'Publish' },
            { key: 'marketplace', name: 'marketplace', icon: 'megaphone', label: 'Promote' },
            { key: 'more', name: 'more', icon: 'more-horizontal', label: 'More' },
        ]
        : activeAppMode === 'hybrid'
        ? [
            { key: 'index', name: 'index', icon: 'home', label: 'Home', fillOnFocus: true },
            { key: 'search', name: 'search', icon: 'upload', label: 'Publish' },
            { key: 'marketplace', name: 'marketplace', icon: 'megaphone', label: 'Promote' },
            { key: 'library', name: 'library', icon: 'library', label: 'Vault', fillOnFocus: true },
            { key: 'more', name: 'more', icon: 'more-horizontal', label: 'More' },
        ]
        : activeAppMode === 'shoout'
        ? [
            { key: 'index', name: 'index', icon: 'home', label: 'Home', fillOnFocus: true },
            { key: 'search', name: 'search', icon: 'search', label: 'Search' },
            { key: 'cart', name: 'cart', icon: 'cart', label: 'Cart', fillOnFocus: true },
            { key: 'more', name: 'more', icon: 'more-horizontal', label: 'More' },
        ]
        : [
            { key: 'index', name: 'index', icon: 'home', label: 'Home', fillOnFocus: true },
            { key: 'search', name: 'search', icon: 'search', label: 'Explore' },
            { key: 'marketplace', name: 'marketplace', icon: 'cart', label: 'Market Place', fillOnFocus: true },
            { key: 'library', name: 'library', icon: 'library', label: role === 'studio' || role === 'hybrid' ? 'Studio' : 'Vault', fillOnFocus: true },
            { key: 'more', name: 'more', icon: 'more-horizontal', label: 'More' },
        ];

    const getRouteIndex = (tabName: string) => {
        if (!state || !state.routes) return -1;
        return state.routes.findIndex(r =>
            r.name === tabName ||
            r.name === `(tabs)/${tabName}` ||
            r.name.endsWith(`/${tabName}`)
        );
    };

    let activeVisualIndex = 0;
    tabs.forEach((tab, index) => {
        const routeIndex = tab.name ? getRouteIndex(tab.name) : -1;
        const isFocused = tab.routePath
            ? pathname === tab.routePath
            : (routeIndex !== -1 && state && state.index === routeIndex);
        if (isFocused) {
            activeVisualIndex = index;
        }
    });

    const activeIndex = useSharedValue(activeVisualIndex);

    React.useEffect(() => {
        if (activeVisualIndex !== -1) {
            activeIndex.value = withTiming(activeVisualIndex, { duration: 260 });
        }
    }, [activeVisualIndex, activeIndex]);

    React.useEffect(() => {
        tabLayouts.value = {};
    }, [tabLayouts, tabs.length]);

    const barWidth = Math.min(maxWidth, Math.max(0, width - horizontalPadding));

    const indicatorStyle = useAnimatedStyle(() => {
        const layouts = tabLayouts.value;
        const layoutCount = Object.keys(layouts).length;

        if (!layoutCount) {
            return { opacity: 0 };
        }

        const maxIndex = tabs.length - 1;
        const rawIndex = Math.max(0, Math.min(maxIndex, activeIndex.value));
        const lowerIndex = Math.floor(rawIndex);
        const upperIndex = Math.min(maxIndex, Math.ceil(rawIndex));
        const progress = rawIndex - lowerIndex;
        const start = layouts[lowerIndex];
        const end = layouts[upperIndex] || start;

        if (!start || !end) {
            return { opacity: 0 };
        }

        const translateX = start.x + (end.x - start.x) * progress;
        const top = start.y + (end.y - start.y) * progress;
        const widthValue = start.width + (end.width - start.width) * progress;
        const heightValue = start.height + (end.height - start.height) * progress;

        return {
            opacity: 1,
            width: widthValue,
            height: heightValue,
            top,
            transform: [{ translateX }],
        };
    });

    if (isVaultMode) {
        return null;
    }

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
                    useUnifiedPillRoundness && styles.unifiedPillBar,
                    isVaultMode && styles.vaultTabBar,
                    isNativeLargeScreen && styles.tabBarLarge,
                    {
                        width: barWidth,
                        height: isTablet ? 70 : 60,
                        paddingHorizontal: isTablet ? 16 : 8,
                        backgroundColor: appTheme.isDark ? '#1A1516' : '#FFFFFF',
                        borderColor: appTheme.isDark
                            ? 'rgba(255,255,255,0.14)'
                            : 'rgba(20,15,16,0.18)',
                    },
                ]}
            >
                <Animated.View
                    pointerEvents="none"
                    style={[
                        {
                            position: 'absolute',
                            left: 0,
                            borderRadius: 40,
                            backgroundColor: modeTheme.accent,
                        },
                        indicatorStyle,
                    ]}
                />
                {tabs.map((tab, index) => {
                    const routeIndex = tab.name ? getRouteIndex(tab.name) : -1;
                    const isFocused = tab.routePath
                        ? pathname === tab.routePath
                        : (routeIndex !== -1 && state && state.index === routeIndex);

                    const handleTabLayout = (event: any) => {
                        const { x, y, width: measuredWidth, height: measuredHeight } = event.nativeEvent.layout;
                        tabLayouts.value = {
                            ...tabLayouts.value,
                            [index]: { x, y, width: measuredWidth, height: measuredHeight },
                        };
                    };

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
                            iconName={tab.icon}
                            label={tab.label}
                            index={index}
                            badgeCount={tab.key === 'cart' ? cartCount : 0}
                            isFocused={isFocused}
                            tabKey={tab.key}
                            fillOnFocus={tab.fillOnFocus}
                            isCompact={isVaultMode}
                            activeAppMode={activeAppMode}
                            appTheme={appTheme}
                            styles={styles}
                            useUnifiedPillRoundness={useUnifiedPillRoundness}
                            onLayout={handleTabLayout}
                            onPress={onPress}
                        />
                    );
                })}
            </View>
        </View>
    );
}

function TabButton({ iconName, label, badgeCount, index, isFocused, tabKey, fillOnFocus, activeAppMode, appTheme, styles, useUnifiedPillRoundness, onLayout, onPress }: any) {
    const modeTheme = getModeSurfaceTheme(activeAppMode, appTheme.isDark);
    const inactiveColor = appTheme.isDark
        ? 'rgba(255,255,255,0.72)'
        : 'rgba(23,18,19,0.72)';
    const activeFgColor = '#FFFFFF';
    const activeTabBgColor = modeTheme.accent;
    const scale = useSharedValue(isFocused ? 1 : 0);
    const pressScale = useSharedValue(1);

    React.useEffect(() => {
        scale.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
    }, [isFocused, scale]);

    const onPressIn = React.useCallback(() => {
        pressScale.value = withTiming(0.92, { duration: 100 });
    }, [pressScale]);

    const onPressOut = React.useCallback(() => {
        pressScale.value = withTiming(1, { duration: 100 });
    }, [pressScale]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            {
                scale: interpolate(scale.value, [0, 1], [0.95, 1]) * pressScale.value,
            },
        ],
        opacity: interpolate(scale.value, [0, 1], [0.7, 1]),
    }));

    const glowAnimatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(scale.value, [0, 1], [0, 1]),
    }));

    const sheenAnimatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(scale.value, [0, 1], [0.8, 0]),
    }));

    return (
        <Animated.View
            onLayout={onLayout}
            style={[
                styles.tab,
                useUnifiedPillRoundness && styles.unifiedPillTab,
                isFocused ? [styles.activeTab, { backgroundColor: activeTabBgColor, borderColor: 'transparent' }] : styles.inactiveTab,
                animatedStyle,
            ]}
        >
            <TouchableOpacity
                style={[
                    StyleSheet.absoluteFillObject,
                    {
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        gap: 2,
                        paddingHorizontal: 6,
                        paddingVertical: 5,
                    },
                ]}
                onPress={onPress}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                activeOpacity={0.78}
            >
                <Animated.View
                    style={[
                        styles.activeGlow,
                        Platform.OS === 'web' ? ({ pointerEvents: 'none' } as any) : null,
                        glowAnimatedStyle,
                        {
                            borderColor: modeTheme.actionBorder,
                            shadowColor: modeTheme.accent,
                        },
                    ]}
                />
                <Animated.View style={[styles.topSheen, sheenAnimatedStyle, { backgroundColor: isFocused ? modeTheme.actionBorder : 'transparent' }]} />

                <Icon
                    name={iconName}
                    size={20}
                    color={isFocused ? activeFgColor : inactiveColor}
                    fill={isFocused && fillOnFocus}
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
        </Animated.View>
    );
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
        paddingHorizontal: 8,
        height: 62,
        borderRadius: 40,
        overflow: 'hidden',
        borderWidth: 1.2,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.24,
        shadowRadius: 16,
        elevation: 12,
    },
    unifiedPillBar: {
        height: 64,
        paddingHorizontal: 10,
        borderRadius: 40,
    },
    tabBarLarge: {
        height: 64,
        borderRadius: 40,
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
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2,
        paddingHorizontal: 6,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: 'transparent',
        overflow: 'hidden',
        position: 'relative',
    },
    unifiedPillTab: {
        height: 46,
        paddingVertical: 4,
        paddingHorizontal: 7,
        gap: 3,
        borderRadius: 23,
    },
    activeTab: {
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    inactiveTab: {
        backgroundColor: 'transparent',
    },
    labelActive: {
        ...typography.label,
        fontSize: 10,
        fontWeight: '600',
        lineHeight: 12,
    },
    tabGlassLayer: {
        ...StyleSheet.absoluteFillObject,
    },
    activeGlow: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderRadius: 16,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    topSheen: {
        position: 'absolute',
        top: 0,
        left: 8,
        right: 8,
        height: 1,
        opacity: 0.8,
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
        ...typography.label,
        color: '#FFFFFF',
        fontSize: 9,
        lineHeight: 11,
    },
};
