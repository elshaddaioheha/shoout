import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';

function useSafeScreenWrapperStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

interface SafeScreenWrapperProps extends ViewProps {
    children: React.ReactNode;
    transparent?: boolean;
}

export default function SafeScreenWrapper({ children, style, transparent = false, ...props }: SafeScreenWrapperProps) {
    const appTheme = useAppTheme();
    const styles = useSafeScreenWrapperStyles();

    return (
        <SafeAreaView
            style={[
                styles.container,
                { backgroundColor: transparent ? 'transparent' : appTheme.colors.background },
                style,
            ]}
            edges={['top', 'left', 'right']} // Exclude bottom if handled by tab bar, or adjust dynamically if needed
            {...props}
        >
            <View style={styles.content}>
                {children}
            </View>
        </SafeAreaView>
    );
}

const legacyStyles = {
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
};
