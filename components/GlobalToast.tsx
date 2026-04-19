import { useToastStore } from '@/store/useToastStore';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/constants/typography';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { Icon } from '@/components/ui/Icon';
import React, { useEffect } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

function useGlobalToastStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function GlobalToast() {
    const appTheme = useAppTheme();
    const styles = useGlobalToastStyles();

    const { visible, message, type } = useToastStore();
    const translateY = React.useRef(new Animated.Value(-150)).current;

    useEffect(() => {
        if (visible) {
            Animated.timing(translateY, {
                toValue: 60, // Top margin
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(translateY, {
                toValue: -150, // Hide off-screen
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, translateY]);

    if (!visible && message === '') return null;

    // Use tokenized colors only for notification surfaces.
    let backgroundColor = appTheme.colors.backgroundElevated;
    let borderColor = appTheme.colors.borderStrong;
    let icon = <Icon name="info" size={20} color={appTheme.colors.primary} />;
    let messageColor = appTheme.colors.textPrimary;

    if (type === 'success') {
        backgroundColor = appTheme.colors.surfaceMuted;
        borderColor = appTheme.colors.success;
        icon = <Icon name="check-circle" size={20} color={appTheme.colors.success} />;
        messageColor = appTheme.colors.textPrimary;
    } else if (type === 'error') {
        backgroundColor = appTheme.colors.surfaceMuted;
        borderColor = appTheme.colors.error;
        icon = <Icon name="shield-alert" size={20} color={appTheme.colors.error} />;
        messageColor = appTheme.colors.textPrimary;
    }

    return (
        <Animated.View
            style={[
                styles.toastContainer,
                Platform.OS === 'web' ? ({ pointerEvents: 'none' } as any) : null,
                { backgroundColor, borderColor, transform: [{ translateY }] },
            ]}
        >
            <View style={styles.content}>
                {icon}
                <Text style={[styles.messageText, { color: messageColor }]}>{message}</Text>
            </View>
        </Animated.View>
    );
}

const legacyStyles = {
    toastContainer: {
        position: 'absolute',
        top: 0,
        left: '5%',
        width: '90%',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        zIndex: 99999,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        borderWidth: 1,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    messageText: {
        ...typography.caption,
        fontSize: 14,
        lineHeight: 20,
        flexShrink: 1,
    },
};
