import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';

interface SettingsHeaderProps {
    title: string;
    onBack: () => void;
    rightElement?: React.ReactNode;
    style?: ViewStyle;
}

function useSettingsHeaderStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function SettingsHeader({ title, onBack, rightElement, style }: SettingsHeaderProps) {
    const appTheme = useAppTheme();
    const styles = useSettingsHeaderStyles();

    return (
        <View style={[styles.header, style]}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <ChevronLeft size={24} color={appTheme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            {rightElement ?? <View style={styles.rightPlaceholder} />}
        </View>
    );
}

const legacyStyles = {
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
    },
    rightPlaceholder: {
        width: 40,
    },
};
