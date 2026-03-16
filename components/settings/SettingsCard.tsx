import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

interface SettingsCardProps extends ViewProps {
    children: React.ReactNode;
}

export default function SettingsCard({ children, style, ...rest }: SettingsCardProps) {
    return (
        <View style={[styles.card, style]} {...rest}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
});
