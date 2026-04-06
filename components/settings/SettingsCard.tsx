import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';

interface SettingsCardProps extends ViewProps {
    children: React.ReactNode;
}

function useSettingsCardStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function SettingsCard({ children, style, ...rest }: SettingsCardProps) {
    const styles = useSettingsCardStyles();

    return (
        <View style={[styles.card, style]} {...rest}>
            {children}
        </View>
    );
}

const legacyStyles = {
    card: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
};
