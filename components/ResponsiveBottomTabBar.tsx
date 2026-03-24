import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Library, MoreHorizontal, Search, ShoppingCart } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '@/constants/colors';
import { useUserStore } from '@/store/useUserStore';

interface TabConfig {
    name: string;
    icon: React.ComponentType<any>;
    label: string;
}

export default function ResponsiveBottomTabBar(props: BottomTabBarProps) {
    const { state, navigation } = props;
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const viewMode = useUserStore((s) => s.viewMode);
    const role = useUserStore((s) => s.role);
    const bottomPadding = insets.bottom > 0 ? insets.bottom : 10;

    const creatorLabel = viewMode === 'studio' || role.startsWith('studio') || role.startsWith('hybrid')
        ? 'Studio'
        : 'Vault';

    const tabs: TabConfig[] = [
        { name: 'index', icon: Home, label: 'Home' },
        { name: 'search', icon: Search, label: 'Explore' },
        { name: 'marketplace', icon: ShoppingCart, label: 'Market Place' },
        { name: 'library', icon: Library, label: creatorLabel },
        { name: 'more', icon: MoreHorizontal, label: 'More' },
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
        <View style={[styles.container, { paddingBottom: bottomPadding }]}>
            <View style={[styles.tabBar, { width: barWidth }]}>
                {tabs.map((tab) => {
                    if (!tab || !tab.name) return null;

                    const routeIndex = getRouteIndex(tab.name);
                    const isFocused = routeIndex !== -1 && state && state.index === routeIndex;
                    const Icon = tab.icon;

                    const onPress = () => {
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
                            key={tab.name}
                            Icon={Icon}
                            label={tab.label}
                            isFocused={isFocused}
                            tabName={tab.name}
                            onPress={onPress}
                        />
                    );
                })}
            </View>
        </View>
    );
}

function TabButton({ Icon, label, isFocused, tabName, onPress }: any) {
    const activeColor = colors.primary;
    const inactiveColor = 'rgba(255, 255, 255, 0.65)';

    return (
        <TouchableOpacity
            style={[styles.tab, isFocused ? styles.activeTab : styles.inactiveTab]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Icon
                size={21}
                color={isFocused ? '#FFFFFF' : inactiveColor}
                fill={isFocused && tabName === 'index' ? '#FFFFFF' : 'none'}
            />
            {isFocused ? <Text style={styles.labelActive}>{label}</Text> : null}
        </TouchableOpacity>
    );
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
        backgroundColor: colors.background,
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
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
    activeTab: {
        minWidth: 83,
        backgroundColor: colors.primary,
    },
    inactiveTab: {
        width: 36,
    },
    labelActive: {
        color: '#FFFFFF',
        fontFamily: 'Poppins-Medium',
        fontSize: 12,
        lineHeight: 12,
    },
});
