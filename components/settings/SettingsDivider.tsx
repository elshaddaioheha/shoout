import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';

function useSettingsDividerStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function SettingsDivider() {
    const styles = useSettingsDividerStyles();

    return <View style={styles.divider} />;
}

const legacyStyles = {
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
};
