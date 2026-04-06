import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsDivider from '@/components/settings/SettingsDivider';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppearanceStore, type ThemePreference } from '@/store/useAppearanceStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { useRouter } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function useAppearanceStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function AppearanceScreen() {
  const router = useRouter();
  const appTheme = useAppTheme();
  const styles = useAppearanceStyles();
  const resolvedScheme = useColorScheme();
  const preference = useAppearanceStore((state) => state.preference);
  const setPreference = useAppearanceStore((state) => state.setPreference);

  const resolvedLabel = resolvedScheme === 'dark' ? 'Dark' : 'Light';
  const subtitle =
    preference === 'system'
      ? `Currently following your device setting (${resolvedLabel})`
      : `Manual override active (${resolvedLabel})`;

  return (
    <SafeScreenWrapper>
      <View style={styles.container}>
        <SettingsHeader title="Appearance" onBack={() => router.back()} />

        <View style={styles.content}>
          <View style={styles.heroIconWrap}>
            <Sparkles size={34} color={appTheme.colors.primary} />
          </View>
          <Text style={styles.title}>Theme Mode</Text>
          <Text style={styles.subtitle}>Choose how Shoouts looks on this device.</Text>

          <SettingsCard>
            <View style={styles.segmentedWrap}>
              {OPTIONS.map((option) => {
                const selected = preference === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.segmentButton,
                      selected && styles.segmentButtonActive,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setPreference(option.value)}
                  >
                    <Text
                      style={[
                        styles.segmentLabel,
                        selected && styles.segmentLabelActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <SettingsDivider />

            <View style={styles.currentRow}>
              <Text style={styles.currentLabel}>Active mode</Text>
              <Text style={styles.currentValue}>{resolvedLabel}</Text>
            </View>
          </SettingsCard>

          <Text style={styles.note}>{subtitle}</Text>
        </View>
      </View>
    </SafeScreenWrapper>
  );
}

const legacyStyles = {
  container: {
    flex: 1,
    backgroundColor: '#140F10',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heroIconWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
    fontSize: 22,
    lineHeight: 30,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 20,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  segmentedWrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  segmentButtonActive: {
    backgroundColor: '#EC5C39',
    borderColor: '#EC5C39',
  },
  segmentLabel: {
    color: 'rgba(255,255,255,0.86)',
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    lineHeight: 16,
  },
  segmentLabelActive: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  currentRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  currentValue: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
  },
  note: {
    marginTop: 14,
    color: 'rgba(255,255,255,0.56)',
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
};
