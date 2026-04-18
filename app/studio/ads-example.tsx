import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getModeSurfaceTheme } from '@/utils/appModeTheme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MoreHorizontal, Play, Repeat2, Shuffle, SkipBack, SkipForward } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function useAdsExampleStyles() {
  const appTheme = useAppTheme();
  const modeTheme = getModeSurfaceTheme('studio', appTheme.isDark);
  return React.useMemo(() => {
    const baseStyles = adaptLegacyStyles(legacyStyles, appTheme) as Record<string, any>;
    const overrides: Record<string, any> = {
      container: { backgroundColor: appTheme.colors.background },
      coverArt: { backgroundColor: appTheme.colors.surfaceMuted },
      adLabel: { color: appTheme.colors.textPrimary },
      trackTitle: { color: appTheme.colors.textPrimary },
      trackArtist: { color: appTheme.colors.textSecondary },
      timeText: { color: appTheme.colors.textSecondary },
      playBtn: { backgroundColor: modeTheme.accent },
      sponsoredStrip: { borderColor: modeTheme.actionBorder, backgroundColor: appTheme.colors.backgroundElevated },
      stripImage: { backgroundColor: appTheme.colors.surfaceMuted },
      sponsored: { color: modeTheme.accentLabel },
      stripHeadline: { color: appTheme.colors.textPrimary },
      stripSub: { color: appTheme.colors.textSecondary },
      listenBtn: { backgroundColor: modeTheme.accent },
      listenText: { color: modeTheme.onAccent },
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

export default function AdsExampleScreen() {
  const appTheme = useAppTheme();
  const modeTheme = getModeSurfaceTheme('studio', appTheme.isDark);
  const styles = useAdsExampleStyles();

  const router = useRouter();
  const params = useLocalSearchParams<{ headline?: string; adType?: string }>();
  const headline = params.headline || 'Ojoro';

  return (
    <SafeScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsHeader
          title="Ads Example"
          onBack={() => router.back()}
          rightElement={
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85} onPress={() => router.push('/studio/ads-creation' as any)}>
              <MoreHorizontal size={22} color={appTheme.colors.textPrimary} />
            </TouchableOpacity>
          }
          style={{ paddingHorizontal: 0, marginBottom: 18 }}
        />

        <View style={styles.coverArt} />

        <Text style={styles.adLabel}>Ads</Text>

        <View style={styles.trackMetaWrap}>
          <Text style={styles.trackTitle} numberOfLines={1}>{headline === 'New Heat out now!!!' ? 'Ojoro' : headline}</Text>
          <Text style={styles.trackArtist}>Sounds of Salem</Text>
        </View>

        <View style={styles.waveRow}>
          {Array.from({ length: 88 }).map((_, idx) => {
            const height = 5 + ((idx * 13) % 44);
            const active = idx <= 44;
            return <View key={idx} style={[styles.waveBar, { height, backgroundColor: active ? modeTheme.accent : (appTheme.isDark ? '#747578' : 'rgba(23,18,19,0.28)') }]} />;
          })}
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>0:15</Text>
          <Text style={styles.timeText}>0:30</Text>
        </View>

        <View style={styles.controlsRow}>
          <Shuffle size={34} color={appTheme.colors.textSecondary} />
          <SkipBack size={30} color={appTheme.colors.textSecondary} />
          <View style={styles.playBtn}>
            <Play size={28} color={modeTheme.onAccent} fill={modeTheme.onAccent} />
          </View>
          <SkipForward size={30} color={appTheme.colors.textSecondary} />
          <Repeat2 size={34} color={appTheme.colors.textSecondary} />
        </View>

        <View style={styles.sponsoredStrip}>
          <View style={styles.stripLeft}>
            <View style={styles.stripImage} />
            <View style={styles.stripTextWrap}>
              <Text style={styles.sponsored}>Sponsored</Text>
              <Text style={styles.stripHeadline} numberOfLines={1}>New Heat out now!!!</Text>
              <Text style={styles.stripSub} numberOfLines={1}>Check out Wizkid latest single</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.listenBtn} activeOpacity={0.9} onPress={() => router.push('/studio/ads-creation' as any)}>
            <Text style={styles.listenText}>Listen</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeScreenWrapper>
  );
}

const legacyStyles = {
  container: { flex: 1, backgroundColor: '#140F10' },
  content: { paddingTop: 10, paddingBottom: 120 },
  iconBtn: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverArt: {
    alignSelf: 'center',
    width: 334,
    height: 310,
    borderRadius: 12,
    backgroundColor: '#D9D9D9',
  },
  adLabel: {
    marginTop: 8,
    marginLeft: 33,
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  trackMetaWrap: {
    marginTop: 6,
    alignItems: 'center',
    gap: 8,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  trackArtist: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    lineHeight: 11,
    letterSpacing: -0.5,
  },
  waveRow: {
    marginTop: 28,
    marginHorizontal: 18,
    height: 54,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  waveBar: {
    width: 3,
    borderRadius: 80,
  },
  timeRow: {
    marginTop: 16,
    paddingHorizontal: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    lineHeight: 11,
    letterSpacing: -0.5,
  },
  controlsRow: {
    marginTop: 24,
    paddingHorizontal: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playBtn: {
    width: 77,
    height: 77,
    borderRadius: 39,
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsoredStrip: {
    marginTop: 16,
    marginHorizontal: 18,
    height: 60,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(236, 92, 57, 0.85)',
    backgroundColor: '#4A4546',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stripLeft: {
    width: '75%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stripImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#D9D9D9',
  },
  stripTextWrap: {
    width: 104,
  },
  sponsored: {
    color: 'rgba(236, 92, 57, 0.75)',
    fontFamily: 'Poppins-Medium',
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: -0.5,
  },
  stripHeadline: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    lineHeight: 11,
    letterSpacing: -0.5,
  },
  stripSub: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Poppins-Regular',
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: -0.5,
  },
  listenBtn: {
    width: 63,
    height: 23,
    borderRadius: 6,
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listenText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    lineHeight: 11,
    letterSpacing: -0.5,
  },
};
