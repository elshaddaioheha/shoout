import { useNotificationStore } from '@/store/useNotificationStore';
import { useUserStore } from '@/store/useUserStore';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, Menu, MessageSquare, ShoppingCart } from 'lucide-react-native';
import React from 'react';
import { Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SharedHeaderProps {
    onMenuPress: () => void;
    title?: string;
    showSearch?: boolean;
    showCart?: boolean;
    cartCount?: number;
    showMessages?: boolean;
}

export default function SharedHeader({ onMenuPress, title, showCart, cartCount, showMessages }: SharedHeaderProps) {
    const router = useRouter();
    const { role } = useUserStore();
    const { unreadCount } = useNotificationStore();

    const getRoleGradient = () => {
        if (role === 'vault_pro') return ['rgba(236, 92, 57, 0.25)', 'rgba(20, 15, 16, 1)'];
        if (role.startsWith('studio')) return ['rgba(76, 175, 80, 0.25)', 'rgba(20, 15, 16, 1)'];
        if (role.startsWith('hybrid')) return ['rgba(255, 215, 0, 0.25)', 'rgba(20, 15, 16, 1)'];
        return ['#140F10', '#140F10'];
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <LinearGradient
                colors={getRoleGradient() as unknown as readonly [string, string, ...string[]]}
                style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.header}>
                <View style={styles.headerLeft}>
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
                    {title && <Text style={styles.headerTitle}>{title}</Text>}
                </View>
                <View style={styles.headerRight}>
                    {showMessages && (
                        <TouchableOpacity
                            style={[styles.iconButton, { marginRight: 12 }]}
                            onPress={() => router.push('/chat' as any)}
                        >
                            <MessageSquare size={20} color="white" />
                        </TouchableOpacity>
                    )}
                    {showCart && (
                        <TouchableOpacity
                            style={[styles.iconButton, { marginRight: 12 }]}
                            onPress={() => router.push('/cart' as any)}
                        >
                            <ShoppingCart size={20} color="white" />
                            {cartCount && cartCount > 0 ? (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{cartCount}</Text>
                                </View>
                            ) : null}
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => router.push('/notifications' as any)}
                    >
                        <Bell size={20} color="white" />
                        {unreadCount > 0 ? (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                            </View>
                        ) : null}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.iconButton, { marginLeft: 12 }]}
                        onPress={onMenuPress}
                    >
                        <Menu size={20} color="white" />
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
        paddingHorizontal: 20,
        height: 60,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logoWrapper: {
        paddingVertical: 10,
    },
    logoImage: {
        width: 60,
        height: 30,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        marginLeft: 12,
    },
    iconButton: {
        padding: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EC5C39',
        borderRadius: 8,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#140F10',
    },
    badgeText: {
        color: 'white',
        fontSize: 9,
        fontFamily: 'Poppins-Bold',
    },
});
