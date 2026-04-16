import { useToastStore } from '@/store/useToastStore';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { AlertCircle, CheckCircle, Info } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

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

    let backgroundColor = appTheme.isDark ? '#2A2A2A' : appTheme.colors.backgroundElevated;
    let icon = <Info size={20} color={appTheme.colors.primary} />;
    let messageColor = appTheme.isDark ? '#FFFFFF' : appTheme.colors.textPrimary;

    if (type === 'success') {
        backgroundColor = appTheme.isDark ? '#1E3329' : 'rgba(46,141,64,0.12)';
        icon = <CheckCircle size={20} color={appTheme.colors.success} />;
        messageColor = appTheme.isDark ? '#E7FFE7' : '#1A4D25';
    } else if (type === 'error') {
        backgroundColor = appTheme.isDark ? '#382020' : 'rgba(211,58,42,0.12)';
        icon = <AlertCircle size={20} color={appTheme.colors.error} />;
        messageColor = appTheme.isDark ? '#FFE9E9' : '#6E1C14';
    }

    return (
        <Animated.View
            style={[
                styles.toastContainer,
                { backgroundColor, transform: [{ translateY }] },
            ]}
            pointerEvents="none"
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
        borderColor: 'rgba(255,255,255,0.1)',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    messageText: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        flexShrink: 1,
    },
};
