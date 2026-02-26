import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Search, Mic2, User } from 'lucide-react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useUserStore } from '@/store/useUserStore';

interface TabConfig {
    name: string;
    icon: any;
    label: string;
}

export default function ResponsiveBottomTabBar(props: BottomTabBarProps) {
    const { state, navigation } = props;
    const insets = useSafeAreaInsets();
    const bottomPadding = insets.bottom > 0 ? insets.bottom : 16;
    const role = useUserStore((s) => s.role);

    // Build tabs based on role
    const tabs: TabConfig[] = [
        { name: 'index', icon: Home, label: 'Home' },
        { name: 'search', icon: Search, label: 'Search' },
    ];

    if (role === 'artist') {
        tabs.push({ name: 'studio', icon: Mic2, label: 'Studio' });
    }

    tabs.push({ name: 'profile', icon: User, label: 'Profile' });

    // Robust route lookup
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
            <View style={styles.tabBar}>
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
                        <AnimatedTab
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

function AnimatedTab({ Icon, label, isFocused, tabName, onPress }: any) {
    const scaleAnim = useRef(new Animated.Value(isFocused ? 1.15 : 1)).current;
    const dotWidth = useRef(new Animated.Value(isFocused ? 24 : 0)).current;
    const opacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0.5)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: isFocused ? 1.15 : 1,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.spring(dotWidth, {
                toValue: isFocused ? 24 : 0,
                friction: 8,
                useNativeDriver: false,
            }),
            Animated.timing(opacityAnim, {
                toValue: isFocused ? 1 : 0.5,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start();
    }, [isFocused]);

    const activeColor = '#EC5C39';
    const inactiveColor = 'rgba(255,255,255,0.45)';

    return (
        <TouchableOpacity
            style={styles.tab}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Active indicator dot */}
            <Animated.View style={[styles.activeDot, {
                width: dotWidth,
                opacity: isFocused ? 1 : 0
            }]} />

            <Animated.View style={{
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim
            }}>
                {Icon && (
                    <Icon
                        size={24}
                        color={isFocused ? activeColor : inactiveColor}
                        fill={
                            isFocused && (tabName === 'index' || tabName === 'profile')
                                ? activeColor
                                : 'none'
                        }
                    />
                )}
            </Animated.View>
            <Text style={[styles.label, isFocused && styles.labelActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1A1518',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.07)',
    },
    tabBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingTop: 10,
        height: 56,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        position: 'relative',
        paddingTop: 4,
    },
    activeDot: {
        position: 'absolute',
        top: -10,
        height: 3,
        borderRadius: 2,
        backgroundColor: '#EC5C39',
    },
    label: {
        fontSize: 10,
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.4)',
    },
    labelActive: {
        color: '#EC5C39',
        fontFamily: 'Poppins-SemiBold',
    },
});
