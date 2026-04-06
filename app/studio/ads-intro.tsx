import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { useRouter } from 'expo-router';
import { Megaphone } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function useAdsIntroStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function AdsIntroScreen() {
  const appTheme = useAppTheme();
  const styles = useAdsIntroStyles();

  const router = useRouter();

  return (
    <SafeScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Promote</Text>
          <View style={styles.profileDot}>
            <Text style={styles.profileLetter}>C</Text>
          </View>
        </View>

        <View style={styles.heroCircle}>
          <Megaphone size={60} color={appTheme.colors.textPrimary} strokeWidth={2.2} />
        </View>

        <View style={styles.heroTextWrap}>
          <Text style={styles.heroTitle}>Reach Larger Audience</Text>
          <Text style={styles.heroSub}>
            Place your ad inside music playback, feeds, and shoutouts so it connects naturally, not interruptively.
          </Text>
        </View>

        <View style={styles.whyWrap}>
          <Text style={styles.whyTitle}>Why advertise on Shoutouts?</Text>
          <View style={styles.whyCard}>
            <Text style={styles.whyText}>
              Get your sound or brand in front of highly engaged listeners. Ads feel native to the music experience, not forced.
              Reach fans based on listening behavior and interests. Drive streams, clicks, and real engagement. Work with artists
              for authentic, creator-led promotion.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.88}
          onPress={() => router.push('/studio/ads-creation?step=1' as any)}
        >
          <Text style={styles.ctaText}>Create Ad</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeScreenWrapper>
  );
}

const legacyStyles = {
  container: { flex: 1, backgroundColor: '#140F10' },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },
  headerRow: { height: 57, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  profileDot: {
    width: 33,
    height: 35,
    borderRadius: 50,
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLetter: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  heroCircle: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 100,
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  heroTextWrap: { marginTop: 20, alignItems: 'center', gap: 12 },
  heroTitle: {
    color: '#EC5C39',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 1,
    textAlign: 'center',
  },
  heroSub: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.5,
    textAlign: 'center',
    maxWidth: 309,
  },
  whyWrap: { marginTop: 34, alignItems: 'center', gap: 16 },
  whyTitle: {
    color: '#EC5C39',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 1,
    textAlign: 'center',
  },
  whyCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#EC5C39',
    borderRadius: 10,
    backgroundColor: '#40302C',
    paddingHorizontal: 13,
    paddingVertical: 16,
  },
  whyText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    lineHeight: 22,
    letterSpacing: -0.5,
  },
  ctaButton: {
    marginTop: 26,
    alignSelf: 'center',
    width: 293,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#767676',
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    lineHeight: 16,
  },
};
