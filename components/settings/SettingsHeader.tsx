import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/constants/typography';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { PremiumBackButton } from '@/components/ui/PremiumBackButton';
import { ROUTES } from '@/utils/routes';

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
    const styles = useSettingsHeaderStyles();
    const router = useRouter();

    const handleBackPress = React.useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);

        if (onBack) {
            onBack();
            return;
        }

        if (router.canGoBack()) {
            router.back();
            return;
        }

        router.replace(ROUTES.tabs.home as any);
    }, [onBack, router]);

    return (
        <View style={[styles.header, style]}>
            <PremiumBackButton
                onPressOverride={handleBackPress}
                variant="transparent"
                containerStyle={styles.backButtonTouchable}
            />
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
    backButtonTouchable: {
        position: 'relative',
        top: 0,
        left: 0,
    },
    headerTitle: {
        ...typography.title,
        color: '#FFF',
    },
    rightPlaceholder: {
        width: 44,
    },
};
