import React from 'react';
import { StyleSheet, SafeAreaView, View, ViewProps, StatusBar, Platform } from 'react-native';

interface SafeScreenWrapperProps extends ViewProps {
    children: React.ReactNode;
    transparent?: boolean;
}

export default function SafeScreenWrapper({ children, style, transparent = false, ...props }: SafeScreenWrapperProps) {
    return (
        <SafeAreaView style={[styles.container, transparent && styles.transparent, style]} {...props}>
            <View style={styles.content}>
                {children}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#140F10',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    transparent: {
        backgroundColor: 'transparent',
    },
    content: {
        flex: 1,
    },
});
