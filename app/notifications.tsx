import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useNotificationStore } from '@/store/useNotificationStore';
import { adaptLegacyColor, adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { useRouter } from 'expo-router';
import { Bell, CheckCheck, ChevronLeft, MessageSquare, Music, ShieldAlert, Zap } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function useNotificationsStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function NotificationsFeedScreen() {
    const appTheme = useAppTheme();
    const styles = useNotificationsStyles();
    const emptyIconColor = adaptLegacyColor('rgba(255,255,255,0.1)', 'color', appTheme);

    const router = useRouter();
    const { notifications, unreadCount, markAsRead, markAllAsRead, startListening } = useNotificationStore();

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
            return;
        }
        router.replace('/(tabs)/more');
    };

    useEffect(() => {
        startListening();
    }, [startListening]);

    const getIconForType = (type: string) => {
        switch (type) {
            case 'message': return <MessageSquare size={20} color="#3B82F6" />;
            case 'artist_update': return <Music size={20} color="#C084FC" />;
            case 'marketplace': return <Zap size={20} color="#10B981" />;
            case 'subscription': return <ShieldAlert size={20} color="#FFD700" />;
            case 'system':
            default: return <Bell size={20} color="#EC5C39" />;
        }
    };

    const handlePressNotification = (item: any) => {
        if (!item.read) markAsRead(item.id);

        switch (item.type) {
            case 'message':
                if (item.meta?.otherUserId) {
                    router.push(`/chat/${item.meta.otherUserId}` as any);
                }
                break;
            case 'artist_update':
            case 'marketplace':
                router.push('/(tabs)/marketplace' as any);
                break;
            case 'subscription':
                router.push('/settings/subscriptions' as any);
                break;
            default:
                break;
        }
    };

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
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
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
                        <Bell size={48} color={emptyIconColor} />
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

const legacyStyles = {
    container: {
        flex: 1,
        backgroundColor: '$background',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '$borderLight',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '$surfaceMuted',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '$textPrimary',
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
        backgroundColor: '$surface',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '$borderLight',
    },
    unreadCard: {
        backgroundColor: 'rgba(236, 92, 57, 0.05)',
        borderColor: 'rgba(236, 92, 57, 0.2)',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '$surfaceMuted',
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
        color: '$textPrimary',
        marginBottom: 4,
    },
    unreadText: {
        fontFamily: 'Poppins-Bold',
        color: '$textPrimary',
    },
    body: {
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
        color: '$textSecondary',
        marginBottom: 8,
    },
    time: {
        fontSize: 11,
        fontFamily: 'Poppins-Regular',
        color: '$textTertiary',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EC5C39',
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
        color: '$textPrimary',
        marginTop: 16,
    },
    emptySub: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: '$textSecondary',
        marginTop: 8,
    },
};
