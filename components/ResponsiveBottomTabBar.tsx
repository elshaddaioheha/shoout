import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Library, Megaphone, MoreHorizontal, Search, ShoppingCart, Upload } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { usePathname, useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { useUserStore } from '@/store/useUserStore';

interface TabConfig {
    key: string;
    name?: string;
    routePath?: string;
    icon: React.ComponentType<any>;
    label: string;
}

export default function ResponsiveBottomTabBar(props: BottomTabBarProps) {
    const { state, navigation } = props;
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const activeAppMode = useUserStore((s) => s.activeAppMode);
    const role = useUserStore((s) => s.role);
    const bottomPadding = insets.bottom > 0 ? insets.bottom : 10;
    const isVaultMode = activeAppMode === 'vault' || activeAppMode === 'vault_pro';

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
            { key: 'cart', routePath: '/cart', icon: ShoppingCart, label: 'Cart' },
            { key: 'more', name: 'more', icon: MoreHorizontal, label: 'More' },
        ]
        : [
            { key: 'index', name: 'index', icon: Home, label: 'Home' },
            { key: 'search', name: 'search', icon: Search, label: 'Explore' },
            { key: 'marketplace', name: 'marketplace', icon: ShoppingCart, label: 'Market Place' },
            { key: 'library', name: 'library', icon: Library, label: role === 'studio' || role === 'hybrid' ? 'Studio' : 'Vault' },
            { key: 'more', name: 'more', icon: MoreHorizontal, label: 'More' },
        ];

    const barWidth = isVaultMode ? Math.min(210, width - 80) : Math.min(335, width - 28);

    const getRouteIndex = (tabName: string) => {
        if (!state || !state.routes) return -1;
        return state.routes.findIndex(r =>
            r.name === tabName ||
            r.name === `(tabs)/${tabName}` ||
            r.name.endsWith(`/${tabName}`)
        );
    };

    return (
        <View style={[styles.container, { paddingBottom: bottomPadding }]}>
            <View style={[styles.tabBar, isVaultMode && styles.vaultTabBar, { width: barWidth }]}>
                <BlurView intensity={34} tint="dark" style={styles.tabBarBlur} />
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
                            isFocused={isFocused}
                            tabKey={tab.key}
                            isCompact={isVaultMode}
                            onPress={onPress}
                        />
                    );
                })}
            </View>
        </View>
    );
}

function TabButton({ Icon, label, isFocused, tabKey, isCompact, onPress }: any) {
    const inactiveColor = 'rgba(255, 255, 255, 0.65)';

    return (
        <TouchableOpacity
            style={[
                styles.tab,
                isCompact && styles.compactTab,
                isFocused ? styles.activeTab : styles.inactiveTab,
                isCompact && isFocused && styles.compactActiveTab,
                isCompact && !isFocused && styles.compactInactiveTab,
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Icon
                size={isCompact ? 18 : 21}
                color={isFocused ? '#FFFFFF' : inactiveColor}
                fill={isFocused && tabKey === 'index' ? '#FFFFFF' : 'none'}
            />
            {isFocused ? <Text style={[styles.labelActive, isCompact && styles.compactLabelActive]}>{label}</Text> : null}
        </TouchableOpacity>
    );
}

function UploadCloudIcon(props: any) {
    return <Upload {...props} />;
}

function MegaphoneIcon(props: any) {
    return <Megaphone {...props} />;
}

const styles = StyleSheet.create({
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
        backgroundColor: 'rgba(20, 15, 16, 0.46)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.18)',
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
        height: 36,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 2,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    compactTab: {
        height: 30,
        gap: 4,
        paddingHorizontal: 8,
    },
    activeTab: {
        minWidth: 83,
        backgroundColor: colors.primary,
    },
    compactActiveTab: {
        minWidth: 74,
    },
    inactiveTab: {
        width: 36,
    },
    compactInactiveTab: {
        width: 30,
    },
    labelActive: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-Medium',
        fontSize: 12,
        lineHeight: 12,
    },
    compactLabelActive: {
        fontSize: 11,
        lineHeight: 11,
    },
});
