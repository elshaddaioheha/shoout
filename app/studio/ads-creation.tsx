import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { typography } from '@/constants/typography';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useToastStore } from '@/store/useToastStore';
import { getModeSurfaceTheme } from '@/utils/appModeTheme';
import { adaptLegacyColor, adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { notifyError } from '@/utils/notify';
import { formatUsd } from '@/utils/pricing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ChevronDown, Image as ImageIcon, Megaphone, Play, Repeat2, Shuffle, SkipBack, SkipForward, Target } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type StepCard = {
  id: string;
  title: string;
  subtitle: string;
  color: string;
};

const STEP1_GOALS: StepCard[] = [
  {
    id: 'streams',
    title: 'Get more Streams',
    subtitle: 'Increase track plays and grow your audience organically.',
    color: '#319F43',
  },
  {
    id: 'sales',
    title: 'Sell Beats/ Premium Music',
    subtitle: 'Drive sales and license your music to other creators.',
    color: '#1E1B86',
  },
  {
    id: 'followers',
    title: 'Grow Followers',
    subtitle: 'Build your fanbase and increase profile engagement.',
    color: '#9C671A',
  },
];

const STEP2_TYPES: StepCard[] = [
  {
    id: 'display',
    title: 'In-Music Display Ad',
    subtitle: 'Banner ads show while users listen to music.',
    color: '#2C74F2',
  },
  {
    id: 'audio',
    title: 'Audio Shout-out Ad',
    subtitle: 'Short audio clip played between tracks.',
    color: '#EE3788',
  },
  {
    id: 'featured',
    title: 'Featured Artist Placement',
    subtitle: 'Get featured in discovery and trending section.',
    color: '#7E2FE5',
  },
];

const GENRES = ['Afrobeats', 'Amapiano', 'Gospel', 'Hip-Hop', 'R&B'];
const LOCATIONS = ['Nigeria', 'Ghana', 'South Africa', 'UK', 'US'];
const BUDGETS = [formatUsd(2), formatUsd(3.13), formatUsd(6.25)];
const DURATIONS = ['7 days', '10 days', '14 days'];

const STEP_TITLES = {
  1: { title: 'Select your Goal', subtitle: 'What do you want to achieve?' },
  2: { title: 'Choose your Ad Type', subtitle: 'Select the best format to achieve your goal' },
  3: { title: 'Target and Budget', subtitle: 'Define your audience and spend' },
  4: { title: 'Create your Ad', subtitle: 'Design your campaign creative' },
  5: { title: 'Payment', subtitle: 'Complete your campaign setup' },
} as const;

function useAdsStyles() {
  const appTheme = useAppTheme();
  const modeTheme = getModeSurfaceTheme('studio', appTheme.isDark);
  return useMemo(() => {
    const baseStyles = adaptLegacyStyles(legacyStyles, appTheme) as Record<string, any>;
    const overrides: Record<string, any> = {
      container: { backgroundColor: appTheme.colors.background },
      trackBanner: { backgroundColor: modeTheme.actionSurface, borderColor: modeTheme.actionBorder },
      trackBannerText: { color: appTheme.colors.textSecondary },
      profileDot: { backgroundColor: modeTheme.accent },
      profileLetter: { color: modeTheme.onAccent },
      stepTitle: { color: appTheme.colors.textPrimary },
      stepSub: { color: appTheme.colors.textSecondary },
      optionCard: { borderColor: appTheme.colors.borderStrong, backgroundColor: appTheme.colors.backgroundElevated },
      optionCardActive: { borderColor: modeTheme.accent },
      optionTitle: { color: appTheme.colors.textPrimary },
      optionSub: { color: appTheme.colors.textSecondary },
      formLabel: { color: appTheme.colors.textPrimary },
      dropdown: { borderColor: appTheme.colors.borderStrong, backgroundColor: appTheme.colors.backgroundElevated },
      dropdownText: { color: appTheme.colors.textPrimary },
      previewTitle: { color: appTheme.colors.textPrimary },
      compactPreview: { borderColor: modeTheme.actionBorder, backgroundColor: appTheme.colors.backgroundElevated },
      sponsoredText: { color: modeTheme.accentLabel },
      previewHeadline: { color: appTheme.colors.textPrimary },
      previewSub: { color: appTheme.colors.textSecondary },
      listenBtn: { backgroundColor: modeTheme.accent },
      listenText: { color: modeTheme.onAccent },
      uploadBox: { borderColor: appTheme.colors.borderStrong, backgroundColor: appTheme.colors.surfaceMuted },
      uploadText: { color: appTheme.colors.textSecondary },
      inputWrap: { borderColor: appTheme.colors.borderStrong, backgroundColor: appTheme.colors.backgroundElevated },
      input: { color: appTheme.colors.textPrimary },
      counterText: { color: appTheme.colors.textTertiary },
      audioWrap: { backgroundColor: appTheme.colors.backgroundElevated },
      audioCover: { backgroundColor: appTheme.colors.surfaceMuted },
      audioTitle: { color: appTheme.colors.textPrimary },
      audioArtist: { color: appTheme.colors.textSecondary },
      timeText: { color: appTheme.colors.textSecondary },
      playBtn: { backgroundColor: modeTheme.accent },
      summaryCard: { borderColor: appTheme.colors.borderStrong, backgroundColor: appTheme.colors.backgroundElevated },
      summaryLabel: { color: appTheme.colors.textTertiary },
      summaryKey: { color: appTheme.colors.textTertiary },
      summaryValue: { color: appTheme.colors.textPrimary },
      summaryBold: { color: appTheme.colors.textPrimary },
      summaryDivider: { backgroundColor: appTheme.colors.borderStrong },
      paymentTitle: { color: appTheme.colors.textPrimary },
      paymentCard: { borderColor: appTheme.colors.borderStrong, backgroundColor: appTheme.colors.backgroundElevated },
      paymentCardActive: { borderColor: modeTheme.accent },
      paymentMain: { color: appTheme.colors.textPrimary },
      paymentSub: { color: appTheme.colors.textTertiary },
      walletBadge: { backgroundColor: modeTheme.accent },
      ctaButton: { borderColor: modeTheme.actionBorder, backgroundColor: modeTheme.accent },
      ctaText: { color: modeTheme.onAccent },
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

export default function AdsCreationScreen() {
  const appTheme = useAppTheme();
  const modeTheme = getModeSurfaceTheme('studio', appTheme.isDark);
  const styles = useAdsStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string; trackId?: string; trackTitle?: string; coverUrl?: string }>();
  const paramStep = Number(params.step || '1');
  const step = paramStep >= 1 && paramStep <= 5 ? paramStep : 1;

  // Track context — set when launched from the upload success splash
  const promotingTrackId = params.trackId || '';
  const promotingTrackTitle = params.trackTitle || '';
  const promotingTrackCoverUrl = params.coverUrl || '';

  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [genre, setGenre] = useState(GENRES[0]);
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [budget, setBudget] = useState(BUDGETS[0]);
  const [duration, setDuration] = useState(DURATIONS[1]);
  const [headline, setHeadline] = useState(
    promotingTrackTitle ? `Listen to "${promotingTrackTitle}" now!` : 'New Heat out now!!!'
  );
  const [walletSelected, setWalletSelected] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToastStore();

  const progressColors = useMemo(() => {
    return Array.from({ length: 5 }, (_, index) => {
      const idx = index + 1;
      if (idx === step) return modeTheme.accent;
      if (idx < step) return modeTheme.actionBorder;
      return appTheme.isDark ? 'rgba(255,255,255,0.85)' : 'rgba(23,18,19,0.16)';
    });
  }, [appTheme.isDark, modeTheme.accent, modeTheme.actionBorder, step]);

  const canContinue = useMemo(() => {
    if (step === 1) return selectedGoal.length > 0;
    if (step === 2) return selectedType.length > 0;
    if (step === 3) return !!genre && !!location && !!budget && !!duration;
    if (step === 4) return headline.trim().length > 0;
    return true;
  }, [budget, duration, genre, headline, location, selectedGoal, selectedType, step]);

  const goBack = () => {
    if (step > 1) {
      router.replace(`/studio/ads-creation?step=${step - 1}` as any);
      return;
    }
    router.back();
  };

  const goNext = async () => {
    if (!canContinue || saving) return;

    if (step < 5) {
      router.replace(`/studio/ads-creation?step=${step + 1}` as any);
      return;
    }

    // Step 5 — persist campaign to Firestore then navigate
    const uid = auth.currentUser?.uid;
    if (!uid) {
      showToast('Please log in to create a campaign.', 'error');
      return;
    }

    try {
      setSaving(true);
      const daily = Number((budget.match(/[\d.]+/)?.[0] || '2'));
      const days = Number(duration.split(' ')[0]) || 10;

      await addDoc(collection(db, `users/${uid}/campaigns`), {
        goal: selectedGoal,
        adType: selectedType || 'display',
        genre,
        location,
        budget,
        dailyBudget: daily,
        duration,
        totalBudget: daily * days,
        headline,
        paymentMethod: walletSelected ? 'wallet' : 'card',
        status: 'active',
        // Link to the promoted track when launched from upload success
        ...(promotingTrackId ? { trackId: promotingTrackId, trackTitle: promotingTrackTitle } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      router.replace({
        pathname: '/studio/ads-success' as any,
        params: {
          headline,
          adType: selectedType || 'display',
        },
      });
    } catch (err: any) {
      notifyError('Campaign save error', err);
      showToast('Failed to publish campaign. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalBudget = useMemo(() => {
    const daily = Number((budget.match(/[\d.]+/)?.[0] || '2'));
    const days = Number(duration.split(' ')[0]) || 10;
    return { daily, total: daily * days };
  }, [budget, duration]);

  const showAudioPreview = selectedType === 'audio';

  return (
    <SafeScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SettingsHeader
          title="Ads Creation"
          onBack={goBack}
          rightElement={
            <View style={styles.profileDot}>
              <Text style={styles.profileLetter}>C</Text>
            </View>
          }
          style={{ paddingHorizontal: 0 }}
        />

        {/* Track context banner — shown when promoting a specific track */}
        {promotingTrackTitle ? (
          <View style={styles.trackBanner}>
            <Megaphone size={14} color={modeTheme.accentLabel} />
            <Text style={styles.trackBannerText} numberOfLines={1}>
              Promoting: <Text style={{ color: modeTheme.accentLabel }}>{promotingTrackTitle}</Text>
            </Text>
          </View>
        ) : null}
        <View style={styles.stepWrap}>
          <Text style={styles.stepTitle}>{STEP_TITLES[step as 1 | 2 | 3 | 4 | 5].title}</Text>
          <Text style={styles.stepSub}>{STEP_TITLES[step as 1 | 2 | 3 | 4 | 5].subtitle}</Text>
        </View>

        <View style={styles.progressRow}>
          {progressColors.map((color, idx) => (
            <View key={idx} style={[styles.progressBar, { backgroundColor: color }]} />
          ))}
        </View>

        {step === 1 ? (
          <StepCards cards={STEP1_GOALS} selected={selectedGoal} onSelect={setSelectedGoal} />
        ) : null}

        {step === 2 ? (
          <StepCards cards={STEP2_TYPES} selected={selectedType} onSelect={setSelectedType} />
        ) : null}

        {step === 3 ? (
          <View style={styles.sectionWrap}>
            <LabeledField label="Genre" value={genre} onPress={() => cycleChoice(genre, GENRES, setGenre)} />
            <LabeledField label="Location" value={location} onPress={() => cycleChoice(location, LOCATIONS, setLocation)} />
            <LabeledField label="Budget" value={budget} onPress={() => cycleChoice(budget, BUDGETS, setBudget)} />
            <LabeledField label="Day" value={duration} onPress={() => cycleChoice(duration, DURATIONS, setDuration)} />

            <Text style={styles.previewTitle}>Preview</Text>
            <CompactAdPreview headline={headline} trackTitle={promotingTrackTitle} coverUrl={promotingTrackCoverUrl} />
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.sectionWrap}>
            <Text style={styles.formLabel}>Add Image</Text>
            {promotingTrackCoverUrl ? (
                <View style={[styles.uploadBox, { overflow: 'hidden' }]}>
                    <Image source={{ uri: promotingTrackCoverUrl }} style={{ width: '100%', height: '100%' }} />
                </View>
            ) : (
                <TouchableOpacity style={styles.uploadBox} activeOpacity={0.9} onPress={() => showToast('Image upload is not enabled in this flow yet. Use your promoted track cover for now.', 'info')}>
                  <ImageIcon size={28} color={appTheme.colors.textTertiary} />
                  <Text style={styles.uploadText}>Upload img Jpegs and Pngs only</Text>
                </TouchableOpacity>
            )}

            <Text style={styles.formLabel}>Headline</Text>
            <View style={styles.inputWrap}>
              <TextInput
                value={headline}
                onChangeText={(text) => setHeadline(text.slice(0, 50))}
                style={styles.input}
                placeholder="e.g New album out now"
                placeholderTextColor={appTheme.colors.textPlaceholder}
              />
              <Text style={styles.counterText}>{headline.length}/50</Text>
            </View>

            <Text style={styles.previewTitle}>Preview</Text>
            {showAudioPreview ? (
                <AudioAdPreview trackTitle={promotingTrackTitle} coverUrl={promotingTrackCoverUrl} />
            ) : (
                <CompactAdPreview headline={headline} trackTitle={promotingTrackTitle} coverUrl={promotingTrackCoverUrl} />
            )}
          </View>
        ) : null}

        {step === 5 ? (
          <View style={styles.sectionWrap}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Campaign Summary</Text>
              <SummaryRow label="Daily Budget" value={formatUsd(totalBudget.daily)} />
              <SummaryRow label="Total Budget" value={formatUsd(totalBudget.total)} />
              <SummaryRow label="Duration" value={duration} />
              <View style={styles.summaryDivider} />
              <SummaryRow label="Total Amount" value={formatUsd(totalBudget.total)} bold />
            </View>

            <Text style={styles.paymentTitle}>Payment Method</Text>
            <TouchableOpacity
              style={[styles.paymentCard, walletSelected && styles.paymentCardActive]}
              activeOpacity={0.9}
              onPress={() => setWalletSelected(true)}
            >
              <View>
                <Text style={styles.paymentMain}>Pay using Shoutout wallet</Text>
                <Text style={styles.paymentSub}>Available balance: {formatUsd(21.88)}</Text>
              </View>
              <View style={styles.walletBadge} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentCard, !walletSelected && styles.paymentCardActive]}
              activeOpacity={0.9}
              onPress={() => setWalletSelected(false)}
            >
              <View>
                <Text style={styles.paymentMain}>Pay using Card</Text>
                <Text style={styles.paymentSub}>Credit/Debit card</Text>
              </View>
              <View style={styles.masterWrap}>
                <View style={styles.masterOne} />
                <View style={styles.masterTwo} />
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.ctaButton, (!canContinue || saving) && styles.ctaDisabled]}
          disabled={!canContinue || saving}
          activeOpacity={0.88}
          onPress={goNext}
        >
          {saving ? (
            <ActivityIndicator size="small" color={appTheme.colors.textPrimary} />
          ) : (
            <Text style={styles.ctaText}>{step === 5 ? 'Create Ad' : 'Continue'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeScreenWrapper>
  );
}

function StepCards({
  cards,
  selected,
  onSelect,
}: {
  cards: StepCard[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const styles = useAdsStyles();
  const appTheme = useAppTheme();

  return (
    <View style={styles.cardsWrap}>
      {cards.map((card) => {
        const active = selected === card.id;
        return (
          <TouchableOpacity
            key={card.id}
            style={[styles.optionCard, active && styles.optionCardActive]}
            activeOpacity={0.9}
            onPress={() => onSelect(card.id)}
          >
            <View style={[styles.optionIcon, { backgroundColor: card.color }]}>
              <Target size={20} color={adaptLegacyColor('#FFFFFF', 'color', appTheme)} />
            </View>

            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>{card.title}</Text>
              <Text style={styles.optionSub}>{card.subtitle}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function LabeledField({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const styles = useAdsStyles();
  const appTheme = useAppTheme();

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.formLabel}>{label}</Text>
      <TouchableOpacity style={styles.dropdown} activeOpacity={0.85} onPress={onPress}>
        <Text style={styles.dropdownText}>{value}</Text>
        <ChevronDown size={16} color={appTheme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

function CompactAdPreview({ headline, trackTitle, coverUrl }: { headline: string; trackTitle?: string; coverUrl?: string }) {
  const styles = useAdsStyles();

  return (
    <View style={styles.compactPreview}>
      <View style={styles.compactLeft}>
        {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.previewImage} />
        ) : (
            <View style={styles.previewImage} />
        )}
        <View style={styles.previewTextWrap}>
          <Text style={styles.sponsoredText}>Sponsored</Text>
          <Text style={styles.previewHeadline} numberOfLines={1}>{headline || 'New Heat out now!!!'}</Text>
          <Text style={styles.previewSub} numberOfLines={1}>{trackTitle ? `Check out ${trackTitle}` : 'Check out Wizkid latest single'}</Text>
        </View>
      </View>
      <View style={styles.listenBtn}>
        <Text style={styles.listenText}>Listen</Text>
      </View>
    </View>
  );
}

function AudioAdPreview({ trackTitle, coverUrl }: { trackTitle?: string; coverUrl?: string }) {
  const styles = useAdsStyles();
  const appTheme = useAppTheme();

  return (
    <View style={styles.audioWrap}>
      {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.audioCover} />
      ) : (
          <View style={styles.audioCover} />
      )}
      <Text style={styles.audioTitle}>{trackTitle || 'Ojoro'}</Text>
      <Text style={styles.audioArtist}>Sounds of Salem</Text>

      <View style={styles.waveRow}>
        {Array.from({ length: 52 }).map((_, idx) => {
          const height = 4 + ((idx * 7) % 22);
          const active = idx < 18;
          return (
            <View
              key={idx}
              style={[
                styles.waveBar,
                {
                  height,
                  backgroundColor: active
                    ? modeTheme.accent
                    : (appTheme.isDark ? '#747578' : 'rgba(23,18,19,0.28)'),
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.timeRow}>
        <Text style={styles.timeText}>0:15</Text>
        <Text style={styles.timeText}>0:30</Text>
      </View>

      <View style={styles.playerRow}>
        <Shuffle size={17} color={appTheme.colors.textSecondary} />
        <SkipBack size={17} color={appTheme.colors.textSecondary} />
        <View style={styles.playBtn}><Play size={16} color={modeTheme.onAccent} fill={modeTheme.onAccent} /></View>
        <SkipForward size={17} color={appTheme.colors.textSecondary} />
        <Repeat2 size={17} color={appTheme.colors.textSecondary} />
      </View>
    </View>
  );
}

function SummaryRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  const styles = useAdsStyles();

  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryKey, bold && styles.summaryBold]}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.summaryBold]}>{value}</Text>
    </View>
  );
}

function cycleChoice(current: string, list: string[], setter: (value: string) => void) {
  const idx = list.indexOf(current);
  const nextIdx = idx === -1 || idx === list.length - 1 ? 0 : idx + 1;
  setter(list[nextIdx]);
}

const legacyStyles = {
  container: { flex: 1, backgroundColor: '#140F10' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 140 },
  trackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(236,92,57,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(236,92,57,0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  trackBannerText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    flex: 1,
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
    ...typography.title,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  stepWrap: { marginTop: 16, gap: 4 },
  stepTitle: {
    ...typography.section,
    lineHeight: 20,
    letterSpacing: -0.5,
  },
  stepSub: {
    ...typography.small,
    lineHeight: 16,
    letterSpacing: -0.5,
  },
  progressRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressBar: {
    width: 60,
    height: 10,
    borderRadius: 5,
  },
  cardsWrap: {
    marginTop: 20,
    gap: 20,
  },
  optionCard: {
    minHeight: 107,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: '#4E544C',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optionCardActive: {
    borderColor: '#EC5C39',
    borderWidth: 1,
  },
  optionIcon: {
    width: 50,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    lineHeight: 18,
  },
  optionSub: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 8,
    lineHeight: 12,
  },
  sectionWrap: {
    marginTop: 20,
    gap: 16,
  },
  fieldWrap: {
    gap: 8,
  },
  formLabel: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 24,
  },
  dropdown: {
    height: 41,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: '#737373',
    paddingHorizontal: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dropdownText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    lineHeight: 15,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 4,
  },
  compactPreview: {
    width: '100%',
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
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '76%',
  },
  previewImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#9C9C9C',
  },
  previewTextWrap: {
    width: 104,
    gap: 2,
  },
  sponsoredText: {
    color: 'rgba(236, 92, 57, 0.75)',
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: -0.5,
  },
  previewHeadline: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    lineHeight: 11,
    letterSpacing: -0.5,
  },
  previewSub: {
    color: 'rgba(255,255,255,0.85)',
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
    ...typography.small,
    lineHeight: 11,
    letterSpacing: -0.5,
  },
  uploadBox: {
    minHeight: 133,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#767676',
    backgroundColor: '#4E544C',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadText: {
    fontSize: 8,
    lineHeight: 12,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  inputWrap: {
    height: 41,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: '#737373',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    ...typography.small,
    lineHeight: 15,
  },
  counterText: {
    color: '#737373',
    ...typography.small,
    lineHeight: 15,
  },
  audioWrap: {
    marginTop: 6,
    width: '100%',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#181617',
    minHeight: 420,
  },
  audioCover: {
    width: 187,
    height: 166,
    borderRadius: 12,
    backgroundColor: '#D9D9D9',
    marginBottom: 10,
  },
  audioTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  audioArtist: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    lineHeight: 11,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  waveRow: {
    width: 300,
    height: 30,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  waveBar: {
    width: 3,
    borderRadius: 6,
  },
  timeRow: {
    marginTop: 8,
    width: 176,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    lineHeight: 11,
    letterSpacing: -0.5,
  },
  playerRow: {
    marginTop: 12,
    width: 190,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playBtn: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  summaryCard: {
    minHeight: 152,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: '#737373',
    backgroundColor: '#292727',
    paddingHorizontal: 12,
    paddingVertical: 13,
    gap: 8,
  },
  summaryLabel: {
    ...typography.small,
    lineHeight: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryKey: {
    color: 'rgba(255,255,255,0.65)',
    ...typography.small,
    lineHeight: 12,
  },
  summaryValue: {
    ...typography.small,
    lineHeight: 12,
  },
  summaryBold: {
    fontSize: 10,
    lineHeight: 15,
  },
  summaryDivider: {
    marginTop: 4,
    marginBottom: 2,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  paymentTitle: {
    ...typography.h3,
    lineHeight: 24,
  },
  paymentCard: {
    minHeight: 52,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: '#737373',
    backgroundColor: '#292727',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentCardActive: {
    borderColor: '#EC5C39',
  },
  paymentMain: {
    ...typography.small,
    lineHeight: 15,
  },
  paymentSub: {
    color: 'rgba(255,255,255,0.65)',
    ...typography.small,
    lineHeight: 9,
  },
  walletBadge: {
    width: 20,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#EC5C39',
  },
  masterWrap: {
    width: 27,
    height: 20,
    justifyContent: 'center',
  },
  masterOne: {
    position: 'absolute',
    left: 0,
    width: 20,
    height: 20,
    borderRadius: 100,
    backgroundColor: '#EB001B',
  },
  masterTwo: {
    position: 'absolute',
    left: 7,
    width: 20,
    height: 20,
    borderRadius: 100,
    opacity: 0.9,
    backgroundColor: '#F79E1B',
  },
  ctaButton: {
    marginTop: 30,
    width: 293,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#767676',
    backgroundColor: '#EC5C39',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaText: {
    ...typography.body,
    lineHeight: 16,
  },
};
