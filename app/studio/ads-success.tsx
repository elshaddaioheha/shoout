import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getModeSurfaceTheme } from '@/utils/appModeTheme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function useAdsSuccessStyles() {
  const appTheme = useAppTheme();
  const modeTheme = getModeSurfaceTheme('studio', appTheme.isDark);
  return React.useMemo(() => {
    const baseStyles = adaptLegacyStyles(legacyStyles, appTheme) as Record<string, any>;
    const overrides: Record<string, any> = {
      screen: { backgroundColor: appTheme.colors.background },
      overlay: { backgroundColor: appTheme.colors.overlay },
      popupWrap: { backgroundColor: appTheme.colors.backgroundElevated, borderColor: appTheme.colors.borderStrong, borderWidth: 1 },
      checkRing: { borderColor: modeTheme.actionBorder, backgroundColor: modeTheme.accent },
      title: { color: appTheme.colors.textPrimary },
      primaryButton: { borderColor: modeTheme.actionBorder, backgroundColor: modeTheme.accent },
      primaryText: { color: modeTheme.onAccent },
    };

    const merged = Object.keys({ ...baseStyles, ...overrides }).reduce<Record<string, any>>((acc, key) => {
      const baseValue = baseStyles[key];
      const overrideValue = overrides[key];

      if (
        baseValue &&
        overrideValue &&
        typeof baseValue === 'object' &&
        typeof overrideValue === 'object' &&
        !Array.isArray(baseValue) &&
        !Array.isArray(overrideValue)
      ) {
        acc[key] = { ...baseValue, ...overrideValue };
        return acc;
      }

      acc[key] = overrideValue ?? baseValue;
      return acc;
    }, {});

    return StyleSheet.create(merged as any);
  }, [appTheme, modeTheme]);
}

export default function AdsSuccessScreen() {
  const appTheme = useAppTheme();
  const modeTheme = getModeSurfaceTheme('studio', appTheme.isDark);
  const styles = useAdsSuccessStyles();

  const router = useRouter();
  const params = useLocalSearchParams<{ headline?: string; adType?: string }>();

  return (
    <SafeScreenWrapper>
      <View style={styles.screen}>
        <View style={styles.overlay} />

        <View style={styles.popupWrap}>
          <View style={styles.popupCard}>
            <View style={styles.checkRing}>
              <View style={styles.checkCore}>
                <Check size={28} color={modeTheme.onAccent} strokeWidth={3.2} />
              </View>
            </View>

            <Text style={styles.title}>Ad Published Successfully</Text>

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.88}
              onPress={() =>
                router.replace({
                  pathname: '/studio/ads-example' as any,
                  params: {
                    headline: params.headline || 'New Heat out now!!!',
                    adType: params.adType || 'display',
                  },
                })
              }
            >
              <Text style={styles.primaryText}>View Ad</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeScreenWrapper>
  );
}

const legacyStyles = {
  screen: {
    flex: 1,
    backgroundColor: '#140F10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(115,115,115,0.4)',
  },
  popupWrap: {
    width: 331,
    minHeight: 393,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#140F10',
  },
  popupCard: {
    paddingHorizontal: 19,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  checkRing: {
    width: 139,
    height: 139,
    borderRadius: 70,
    borderWidth: 10,
    borderColor: '#40302C',
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCore: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 28,
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    lineHeight: 31,
    letterSpacing: -0.5,
  },
  primaryButton: {
    marginTop: 60,
    width: 293,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#767676',
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    lineHeight: 16,
  },
};
