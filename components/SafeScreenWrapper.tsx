import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';

interface SafeScreenWrapperProps extends ViewProps {
    children: React.ReactNode;
    transparent?: boolean;
}

export default function SafeScreenWrapper({ children, style, transparent = false, ...props }: SafeScreenWrapperProps) {
    return (
        <SafeAreaView
            style={[styles.container, transparent && styles.transparent, style]}
            edges={['top', 'left', 'right']} // Exclude bottom if handled by tab bar, or adjust dynamically if needed
            {...props}
        >
            <View style={styles.content}>
                {children}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    transparent: {
        backgroundColor: 'transparent',
    },
    content: {
        flex: 1,
    },
});
