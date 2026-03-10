import { useToastStore } from '@/store/useToastStore';
import { AlertCircle, CheckCircle, Info } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function GlobalToast() {
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

    let backgroundColor = '#2A2A2A'; // Info (Dark theme neutral)
    let icon = <Info size={20} color="#3AB0FF" />;

    if (type === 'success') {
        backgroundColor = '#1E3329'; // Dark greenish
        icon = <CheckCircle size={20} color="#4CAF50" />;
    } else if (type === 'error') {
        backgroundColor = '#382020'; // Dark reddish
        icon = <AlertCircle size={20} color="#FF5252" />;
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
                <Text style={styles.messageText}>{message}</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
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
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        flexShrink: 1,
    },
});
