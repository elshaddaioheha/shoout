import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/constants/typography';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';

interface SettingsSwitchRowProps {
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
}

function useSettingsSwitchStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function SettingsSwitchRow({
    title,
    subtitle,
    value,
    onValueChange,
}: SettingsSwitchRowProps) {
    const appTheme = useAppTheme();
    const styles = useSettingsSwitchStyles();

    return (
        <View style={styles.row}>
            <View style={styles.textContainer}>
                <Text style={styles.settingTitle}>{title}</Text>
                <Text style={styles.settingSub}>{subtitle}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: appTheme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(23,18,19,0.18)', true: appTheme.colors.primary }}
                thumbColor={appTheme.colors.backgroundElevated}
            />
        </View>
    );
}

const legacyStyles = {
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    textContainer: {
        flex: 1,
        paddingRight: 16,
    },
    settingTitle: {
        ...typography.bodyBold,
        color: '#FFF',
    },
    settingSub: {
        ...typography.caption,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
    },
};
