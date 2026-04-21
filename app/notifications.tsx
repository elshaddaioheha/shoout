import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useNotificationStore } from '@/store/useNotificationStore';
import { ROUTES } from '@/utils/routes';
import { useRouter } from 'expo-router';
import { Bell, CheckCheck, ChevronLeft, MessageSquare, Music, ShieldAlert, Zap } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NotificationsFeedScreen() {
    const appTheme = useAppTheme();
    const router = useRouter();
    const { notifications, unreadCount, markAsRead, markAllAsRead, startListening } = useNotificationStore();

    useEffect(() => {
        startListening();
    }, [startListening]);

    const getIconForType = (type: string) => {
        switch (type) {
            case 'message': return <MessageSquare size={20} color={appTheme.colors.primary} />;
            case 'artist_update': return <Music size={20} color={appTheme.colors.primary} />;
            case 'marketplace': return <Zap size={20} color={appTheme.colors.primary} />;
            case 'subscription': return <ShieldAlert size={20} color={appTheme.colors.primary} />;
            case 'system':
            default: return <Bell size={20} color={appTheme.colors.primary} />;
        }
    };

    const handlePressNotification = (item: any) => {
        if (!item.read) markAsRead(item.id);

        switch (item.type) {
            case 'message':
                if (item.meta?.otherUserId) {
                    router.push(ROUTES.chat.thread(String(item.meta.otherUserId)) as any);
                }
                break;
            case 'artist_update':
            case 'marketplace':
                router.push(ROUTES.tabs.marketplace as any);
                break;
            case 'subscription':
                router.push(ROUTES.settings.subscriptions as any);
                break;
            default:
                break;
        }
    };

    const styles = useMemo(() => {
        const unreadCardBg = appTheme.isDark ? 'rgba(236, 92, 57, 0.15)' : 'rgba(236, 92, 57, 0.05)';
        const unreadCardBorder = appTheme.isDark ? 'rgba(236, 92, 57, 0.3)' : 'rgba(236, 92, 57, 0.2)';

        return StyleSheet.create({
            container: {
                flex: 1,
                backgroundColor: appTheme.colors.background,
            },
            header: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 15,
                borderBottomWidth: 1,
                borderBottomColor: appTheme.colors.border,
            },
            backBtn: {
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: appTheme.colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
            },
            headerTitle: {
                fontSize: 18,
                fontFamily: 'Poppins-Bold',
                color: appTheme.colors.textPrimary,
            },
            markAllBtn: {
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
            },
            listContent: {
                padding: 20,
                paddingBottom: 40,
            },
            notificationCard: {
                flexDirection: 'row',
                padding: 16,
                backgroundColor: appTheme.colors.surface,
                borderRadius: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: appTheme.colors.border,
            },
            unreadCard: {
                backgroundColor: unreadCardBg,
                borderColor: unreadCardBorder,
            },
            iconContainer: {
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: appTheme.colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
            },
            contentContainer: {
                flex: 1,
            },
            title: {
                fontSize: 15,
                fontFamily: 'Poppins-Medium',
                color: appTheme.colors.textPrimary,
                marginBottom: 4,
            },
            unreadText: {
                fontFamily: 'Poppins-Bold',
                color: appTheme.colors.textPrimary,
            },
            body: {
                fontSize: 13,
                fontFamily: 'Poppins-Regular',
                color: appTheme.colors.textSecondary,
                marginBottom: 8,
            },
            time: {
                fontSize: 11,
                fontFamily: 'Poppins-Regular',
                color: appTheme.colors.textTertiary,
            },
            unreadDot: {
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: appTheme.colors.primary,
                marginLeft: 12,
                marginTop: 6,
            },
            emptyContainer: {
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingBottom: 100,
            },
            emptyTitle: {
                fontSize: 18,
                fontFamily: 'Poppins-Bold',
                color: appTheme.colors.textPrimary,
                marginTop: 16,
            },
            emptySub: {
                fontSize: 14,
                fontFamily: 'Poppins-Regular',
                color: appTheme.colors.textSecondary,
                marginTop: 8,
            },
        });
    }, [appTheme]);

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.notificationCard, !item.read && styles.unreadCard]}
            onPress={() => handlePressNotification(item)}
        >
            <View style={styles.iconContainer}>
                {getIconForType(item.type)}
            </View>
            <View style={styles.contentContainer}>
                <Text style={[styles.title, !item.read && styles.unreadText]}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
                {item.createdAt && (
                    <Text style={styles.time}>
                        {item.createdAt.toDate?.().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                )}
            </View>
            {!item.read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace(ROUTES.tabs.more as any)} style={styles.backBtn}>
                        <ChevronLeft size={24} color={appTheme.colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    {unreadCount > 0 ? (
                        <TouchableOpacity onPress={() => markAllAsRead()} style={styles.markAllBtn}>
                            <CheckCheck size={20} color={appTheme.colors.primary} />
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 40 }} />
                    )}
                </View>

                {notifications.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Bell size={48} color={appTheme.colors.surfaceMuted} />
                        <Text style={styles.emptyTitle}>You're all caught up!</Text>
                        <Text style={styles.emptySub}>No new notifications right now.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                    />
                )}
            </View>
        </SafeScreenWrapper>
    );
}
