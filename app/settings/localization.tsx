import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsDivider from '@/components/settings/SettingsDivider';
import SettingsHeader from '@/components/settings/SettingsHeader';
import SettingsSwitchRow from '@/components/settings/SettingsSwitchRow';
import { typography } from '@/constants/typography';
import { useAppTheme } from '@/hooks/use-app-theme';
import { A11Y_TEXT_SCALE, useAccessibilityStore } from '@/store/useAccessibilityStore';
import { useLocalizationStore, useTranslation } from '@/store/useLocalizationStore';
import { SUPPORTED_LOCALES } from '@/utils/i18n/types';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { useRouter } from 'expo-router';
import { Eye, Globe, Type } from 'lucide-react-native';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function useLocalizationStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function LocalizationAccessibilityScreen() {
  const appTheme = useAppTheme();
  const styles = useLocalizationStyles();
  const router = useRouter();
  const t = useTranslation();

  // Localization
  const { locale, setLocale } = useLocalizationStore();

  // Accessibility
  const { textSize, setTextSize, reduceMotion, setReduceMotion, highContrast, setHighContrast } = useAccessibilityStore();

  const handleLocaleSelect = async () => {
    const locales = Object.keys(SUPPORTED_LOCALES) as Array<keyof typeof SUPPORTED_LOCALES>;
    const options = locales.map((loc) => SUPPORTED_LOCALES[loc]);

    Alert.alert(t('settings.language'), t('settings.language'), [
      ...options.map((label, index) => ({
        text: label,
        onPress: async () => {
          const selectedLocale = locales[index];
          await setLocale(selectedLocale);
        },
      })),
      { text: t('common.cancel'), onPress: () => {}, style: 'cancel' as const },
    ]);
  };

  const handleTextSizeSelect = () => {
    const sizes: Array<'small' | 'normal' | 'large' | 'extraLarge'> = ['small', 'normal', 'large', 'extraLarge'];
    Alert.alert(t('settings.largeText'), 'Select text size', [
      ...sizes.map((size) => ({
        text: `${size.charAt(0).toUpperCase() + size.slice(1)} (${Math.round(A11Y_TEXT_SCALE[size] * 100)}%)`,
        onPress: () => setTextSize(size),
      })),
      { text: t('common.cancel'), onPress: () => {}, style: 'cancel' as const },
    ]);
  };

  const handleHighContrastToggle = (mode: 'on' | 'off') => {
    setHighContrast(mode);
  };

  return (
    <SafeScreenWrapper>
      <View style={styles.container}>
        <SettingsHeader
          title="Localization & Accessibility"
          onBack={() => router.back()}
        />

        <ScrollView contentContainerStyle={styles.content}>
          {/* Localization Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Globe size={24} color={appTheme.colors.textPrimary} />
              <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
            </View>

            <SettingsCard>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={handleLocaleSelect}
                accessible={true}
                accessibilityLabel={`Language: ${SUPPORTED_LOCALES[locale]}`}
                accessibilityRole="button"
                accessibilityHint="Double tap to select language"
              >
                <Text style={styles.settingLabel}>{t('settings.language')}</Text>
                <Text style={styles.settingValue}>{SUPPORTED_LOCALES[locale]}</Text>
              </TouchableOpacity>
            </SettingsCard>
          </View>

          <SettingsDivider />

          {/* Accessibility Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Eye size={24} color={appTheme.colors.textPrimary} />
              <Text style={styles.sectionTitle}>{t('settings.accessibility')}</Text>
            </View>

            <SettingsCard>
              {/* Text Size */}
              <TouchableOpacity
                style={styles.settingRow}
                onPress={handleTextSizeSelect}
                accessible={true}
                accessibilityLabel={`Text size: ${textSize}`}
                accessibilityRole="button"
                accessibilityHint="Double tap to change text size"
              >
                <View style={styles.textSizeIcon}>
                  <Type size={20} color={appTheme.colors.textPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>{t('settings.largeText')}</Text>
                  <Text style={styles.settingValue}>
                    {textSize.charAt(0).toUpperCase() + textSize.slice(1)} ({Math.round(A11Y_TEXT_SCALE[textSize] * 100)}%)
                  </Text>
                </View>
              </TouchableOpacity>

              <SettingsDivider />

              {/* Reduce Motion */}
              <SettingsSwitchRow
                title={t('settings.reduceMotion')}
                subtitle="Reduce animations and motion effects across the app"
                value={reduceMotion}
                onValueChange={setReduceMotion}
                accessibilityLabel={`Reduce motion: ${reduceMotion ? 'enabled' : 'disabled'}`}
              />

              <SettingsDivider />

              {/* High Contrast */}
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>High Contrast</Text>
                <View style={styles.contrastButtonGroup}>
                  <TouchableOpacity
                    style={[styles.contrastButton, highContrast === 'off' && styles.contrastButtonActive]}
                    onPress={() => handleHighContrastToggle('off')}
                    accessible={true}
                    accessibilityLabel="High contrast off"
                    accessibilityRole="radio"
                    accessibilityState={{ selected: highContrast === 'off' }}
                  >
                    <Text style={styles.contrastButtonText}>Off</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contrastButton, highContrast === 'on' && styles.contrastButtonActive]}
                    onPress={() => handleHighContrastToggle('on')}
                    accessible={true}
                    accessibilityLabel="High contrast on"
                    accessibilityRole="radio"
                    accessibilityState={{ selected: highContrast === 'on' }}
                  >
                    <Text style={styles.contrastButtonText}>On</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SettingsCard>
          </View>
        </ScrollView>
      </View>
    </SafeScreenWrapper>
  );
}

const legacyStyles = {
  container: { flex: 1, backgroundColor: '#0A0809' },
  content: { paddingHorizontal: 16, paddingVertical: 20 },
  section: { marginBottom: 16 },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    ...typography.section,
    marginLeft: 8,
    textTransform: 'uppercase' as const,
  },
  settingRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  settingLabel: {
    ...typography.body,
  },
  settingValue: {
    ...typography.caption,
    marginTop: 2,
  },
  textSizeIcon: {
    marginRight: 12,
  },
  contrastButtonGroup: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  contrastButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  contrastButtonActive: {
    backgroundColor: 'rgba(236, 92, 57, 0.3)',
    borderColor: 'rgba(236, 92, 57, 0.6)',
  },
  contrastButtonText: {
    ...typography.caption,
  },
};
