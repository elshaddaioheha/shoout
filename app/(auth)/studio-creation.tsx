import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useUserStore } from '@/store/useUserStore';
import { useToastStore } from '@/store/useToastStore';
import { getAuthMotionDurations } from '@/utils/authMotion';
import { markStudioSetupComplete } from '@/utils/authFlow';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { hydrateSubscriptionTier } from '@/utils/subscriptionVerification';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import { Check, ImagePlus, Music2, User } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type SelectedRole = 'studio' | 'hybrid';
type CreatorType = 'artist' | 'producer' | 'record_label';

const GENRES = ['Hip hop', 'Afro beats', 'Reggae', 'Gospel', 'R&B', 'Pop', 'Rock', 'Latin', 'Others'];

const CREATOR_TYPES: {
  id: CreatorType;
  title: string;
  subtitle: string;
}[] = [
  { id: 'artist', title: 'Artist', subtitle: 'Perform and record music' },
  { id: 'producer', title: 'Producer', subtitle: 'Create and sell beats' },
  { id: 'record_label', title: 'Record Label', subtitle: 'Manage multiple artists' },
];

function useStudioCreationStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

function prettyCreatorType(value: CreatorType | null) {
  if (!value) return 'Not selected';
  if (value === 'record_label') return 'Record Label';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function StudioCreationScreen() {
  const appTheme = useAppTheme();
  const styles = useStudioCreationStyles();
  const placeholderColor = appTheme.colors.textPlaceholder;
  const uploadIconColor = appTheme.colors.textPlaceholder;
  const reduceMotion = useReducedMotion();
  const durations = getAuthMotionDurations(reduceMotion);

  const router = useRouter();
  const { showToast } = useToastStore();
  const setActiveAppMode = useUserStore((state) => state.setActiveAppMode);
  const params = useLocalSearchParams<{ role?: string }>();

  const selectedRole: SelectedRole = params.role === 'hybrid' ? 'hybrid' : 'studio';

  const [step, setStep] = useState(1);
  const [trackWidth, setTrackWidth] = useState(0);
  const [creatorName, setCreatorName] = useState(auth.currentUser?.displayName || '');
  const [studioName, setStudioName] = useState('');
  const [profileImageName, setProfileImageName] = useState('');
  const [profileImageUri, setProfileImageUri] = useState('');
  const [bannerImageName, setBannerImageName] = useState('');
  const [bannerImageUri, setBannerImageUri] = useState('');
  const [creatorType, setCreatorType] = useState<CreatorType | null>(null);
  const [primaryGenre, setPrimaryGenre] = useState('');
  const [loading, setLoading] = useState(false);

  const progressValue = useSharedValue(0.25);
  const contentOpacity = useSharedValue(1);
  const contentTranslateY = useSharedValue(0);
  const stepContextOpacity = useSharedValue(0);
  const stepContextTranslateY = useSharedValue(14);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const stepContextAnimatedStyle = useAnimatedStyle(() => ({
    opacity: stepContextOpacity.value,
    transform: [{ translateY: stepContextTranslateY.value }],
  }));

  const progressFillStyle = useAnimatedStyle(() => {
    const clampedProgress = Math.max(0, Math.min(1, progressValue.value));
    const offset = trackWidth > 0 ? -((1 - clampedProgress) * trackWidth) / 2 : 0;

    return {
      transform: [{ translateX: offset }, { scaleX: clampedProgress }],
    };
  });

  useEffect(() => {
    contentOpacity.value = withTiming(1, {
      duration: durations.contentEnter,
      easing: Easing.out(Easing.cubic),
    });
    contentTranslateY.value = withTiming(0, {
      duration: durations.contentEnter,
      easing: Easing.out(Easing.cubic),
    });
    stepContextOpacity.value = withTiming(1, {
      duration: durations.contentEnter,
      easing: Easing.out(Easing.cubic),
    });
    stepContextTranslateY.value = withTiming(0, {
      duration: durations.contentEnter,
      easing: Easing.out(Easing.cubic),
    });
  }, [contentOpacity, contentTranslateY, durations.contentEnter, stepContextOpacity, stepContextTranslateY]);

  const stepTitle = useMemo(() => {
    if (step === 1) return 'Let’s start with the basics';
    if (step === 2) return 'Personalize your studio';
    if (step === 3) return 'What type of creator are you?';
    return 'Studio created';
  }, [step]);

  const stepSubtitle = useMemo(() => {
    if (step === 1) return 'Tell us who you are so we can set up your creator workspace.';
    if (step === 2) return 'Add optional imagery to give your studio a polished first impression.';
    if (step === 3) return 'We use this to tailor the tools and recommendations inside Studio.';
    return `Welcome to ${studioName || 'your studio'}. Everything is ready for your next step.`;
  }, [step, studioName]);

  const animateToStep = (nextStep: number) => {
    contentOpacity.value = withTiming(0, {
      duration: Math.max(110, durations.slideChange - 80),
      easing: Easing.out(Easing.cubic),
    });
    contentTranslateY.value = withTiming(reduceMotion ? 0 : 18, {
      duration: durations.slideChange,
      easing: Easing.out(Easing.cubic),
    }, (finished) => {
      if (finished) {
        stepContextOpacity.value = 0;
        stepContextTranslateY.value = reduceMotion ? 0 : 14;
        contentTranslateY.value = reduceMotion ? 0 : 18;
        contentOpacity.value = 0;
        progressValue.value = withTiming(nextStep / 4, {
          duration: durations.progress,
          easing: Easing.out(Easing.cubic),
        });
      }
    });
    stepContextOpacity.value = withTiming(0, {
      duration: Math.max(110, durations.slideChange - 80),
      easing: Easing.out(Easing.cubic),
    });
    stepContextTranslateY.value = withTiming(reduceMotion ? 0 : 14, {
      duration: durations.slideChange,
      easing: Easing.out(Easing.cubic),
    }, (finished) => {
      if (finished) {
        runOnJS(setStep)(nextStep);
        contentOpacity.value = withTiming(1, {
          duration: durations.slideChange,
          easing: Easing.out(Easing.cubic),
        });
        contentTranslateY.value = withTiming(0, {
          duration: durations.slideChange,
          easing: Easing.out(Easing.cubic),
        });
        stepContextOpacity.value = withTiming(1, {
          duration: durations.slideChange,
          easing: Easing.out(Easing.cubic),
        });
        stepContextTranslateY.value = withTiming(0, {
          duration: durations.slideChange,
          easing: Easing.out(Easing.cubic),
        });
      }
    });
  };

  const pickImage = async (target: 'profile' | 'banner') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const picked = result.assets[0];
      if (target === 'profile') {
        setProfileImageName(picked.name || 'Selected image');
        setProfileImageUri(picked.uri || '');
      } else {
        setBannerImageName(picked.name || 'Selected image');
        setBannerImageUri(picked.uri || '');
      }
    } catch {
      showToast('Could not select image right now.', 'error');
    }
  };

  const completeSetup = async () => {
    if (!auth.currentUser) {
      showToast('Session expired. Please log in again.', 'error');
      router.replace('/(auth)/login');
      return;
    }

    setLoading(true);
    try {
      const uid = auth.currentUser.uid;

      await setDoc(
        doc(db, 'users', uid),
        {
          fullName: creatorName.trim(),
          studioName: studioName.trim(),
          creatorType,
          primaryGenre,
          creatorIntentRole: selectedRole,
          studioProfileImageName: profileImageName || null,
          studioProfileImageUri: profileImageUri || null,
          studioBannerImageName: bannerImageName || null,
          studioBannerImageUri: bannerImageUri || null,
        },
        { merge: true }
      );

      await markStudioSetupComplete(uid, selectedRole);
      await hydrateSubscriptionTier();
      setActiveAppMode(selectedRole);
      showToast('Studio setup complete.', 'success');
      router.replace('/(tabs)');
    } catch {
      showToast('Could not complete studio setup. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (step === 1) {
      if (!creatorName.trim() || !studioName.trim()) {
        showToast('Please enter your name and studio name.', 'error');
        return;
      }
      animateToStep(2);
      return;
    }

    if (step === 2) {
      animateToStep(3);
      return;
    }

    if (step === 3) {
      if (!creatorType || !primaryGenre) {
        showToast('Please choose a creator type and primary genre.', 'error');
        return;
      }
      animateToStep(4);
      return;
    }

    await completeSetup();
  };

  return (
    <SafeScreenWrapper style={styles.container}>
      <StatusBar barStyle={appTheme.isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.contentStack}>
            <View style={styles.headerWrap}>
              <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>Create your Studio</Text>
                <Text style={styles.stepText}>Step {step}/4</Text>
              </View>
              <View style={styles.progressTrack} onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}>
                <Animated.View style={[styles.progressFill, progressFillStyle]} />
              </View>
            </View>

            <Animated.View
              style={[
                styles.card,
                cardAnimatedStyle,
              ]}
            >
              <Animated.View
                style={[
                  styles.stepContext,
                  stepContextAnimatedStyle,
                ]}
              >
                <View style={styles.introBlock}>
                  <Text style={styles.introTitle}>{stepTitle}</Text>
                  <Text style={styles.introSub}>{stepSubtitle}</Text>
                </View>

                {step === 1 ? (
                  <View style={styles.section}>
                    <View style={styles.fieldWrap}>
                      <Text style={styles.label}>Name</Text>
                      <TextInput
                        style={styles.input}
                        value={creatorName}
                        onChangeText={setCreatorName}
                        placeholder="Your full name"
                        placeholderTextColor={placeholderColor}
                      />
                    </View>

                    <View style={styles.fieldWrap}>
                      <Text style={styles.label}>Studio Name</Text>
                      <TextInput
                        style={styles.input}
                        value={studioName}
                        onChangeText={setStudioName}
                        placeholder="Enter studio name"
                        placeholderTextColor={placeholderColor}
                      />
                    </View>
                  </View>
                ) : null}

                {step === 2 ? (
                  <View style={styles.section}>
                    <View style={styles.fieldWrap}>
                      <Text style={styles.label}>Profile image</Text>
                      <TouchableOpacity style={styles.uploadBox} activeOpacity={0.85} onPress={() => pickImage('profile')}>
                        <ImagePlus size={28} color={uploadIconColor} />
                        <Text style={styles.uploadText}>{profileImageName || 'Upload JPEG or PNG'}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.fieldWrap}>
                      <Text style={styles.label}>Studio banner</Text>
                      <TouchableOpacity style={styles.uploadBox} activeOpacity={0.85} onPress={() => pickImage('banner')}>
                        <ImagePlus size={28} color={uploadIconColor} />
                        <Text style={styles.uploadText}>{bannerImageName || 'Upload JPEG or PNG'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {step === 3 ? (
                  <View style={styles.section}>
                    <View style={styles.fieldWrap}>
                      <Text style={styles.metaLabel}>Creator type</Text>
                      <View style={styles.creatorTypeCol}>
                        {CREATOR_TYPES.map((item) => {
                          const selected = creatorType === item.id;
                          return (
                            <TouchableOpacity
                              key={item.id}
                              style={[styles.creatorTypeCard, selected && styles.creatorTypeCardSelected]}
                              activeOpacity={0.85}
                              onPress={() => setCreatorType(item.id)}
                            >
                              <View style={[styles.creatorIconWrap, selected && styles.creatorIconWrapSelected]}>
                                {item.id === 'producer' ? (
                                  <Music2 size={14} color={selected ? '#FFFFFF' : appTheme.colors.textSecondary} />
                                ) : (
                                  <User size={14} color={selected ? '#FFFFFF' : appTheme.colors.textSecondary} />
                                )}
                              </View>
                              <View style={styles.creatorTextWrap}>
                                <Text style={styles.creatorTypeTitle}>{item.title}</Text>
                                <Text style={styles.creatorTypeSub}>{item.subtitle}</Text>
                              </View>
                              {selected ? <Check size={16} color={appTheme.colors.primary} /> : null}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View style={styles.fieldWrap}>
                      <Text style={styles.metaLabel}>Primary genre</Text>
                      <View style={styles.genreGrid}>
                        {GENRES.map((genre) => {
                          const selected = primaryGenre === genre;
                          return (
                            <TouchableOpacity
                              key={genre}
                              style={[styles.genreChip, selected && styles.genreChipSelected]}
                              activeOpacity={0.85}
                              onPress={() => setPrimaryGenre(genre)}
                            >
                              <Text style={[styles.genreChipText, selected && styles.genreChipTextSelected]}>{genre}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                ) : null}

                {step === 4 ? (
                  <View style={styles.section}>
                    <View style={styles.successCircle}>
                      <Check size={28} color="#FFFFFF" />
                    </View>

                    <View style={styles.summaryCard}>
                      <Text style={styles.summaryTitle}>Your studio details</Text>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryKey}>Creator</Text>
                        <Text style={styles.summaryVal}>{creatorName || '-'}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryKey}>Studio</Text>
                        <Text style={styles.summaryVal}>{studioName || '-'}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryKey}>Type</Text>
                        <Text style={styles.summaryVal}>{prettyCreatorType(creatorType)}</Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryKey}>Genre</Text>
                        <Text style={styles.summaryVal}>{primaryGenre || 'Not selected'}</Text>
                      </View>
                    </View>

                    <Text style={styles.finalHint}>Next up: we’ll take you into the workspace that matches your selected experience.</Text>
                  </View>
                ) : null}
              </Animated.View>
            </Animated.View>

            <View style={styles.footerWrap}>
              <TouchableOpacity
                style={[styles.continueBtn, loading && styles.continueBtnDisabled]}
                activeOpacity={0.9}
                onPress={handleContinue}
                disabled={loading}
              >
                <Text style={styles.continueBtnText}>
                  {loading ? 'Please wait...' : step === 4 ? 'Enter Studio' : 'Continue'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreenWrapper>
  );
}

const legacyStyles = {
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#140F10',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  contentStack: {
    flex: 1,
    gap: 20,
  },
  headerWrap: {
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Poppins-Bold',
  },
  stepText: {
    color: '#B9B0AD',
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#EC5C39',
  },
  card: {
    borderRadius: 28,
    padding: 20,
    gap: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  stepContext: {
    gap: 20,
  },
  introBlock: {
    gap: 8,
  },
  introTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 34,
    fontFamily: 'Poppins-Bold',
  },
  introSub: {
    color: '#C6BCB7',
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'Poppins-Regular',
  },
  section: {
    gap: 18,
  },
  fieldWrap: {
    gap: 10,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins-SemiBold',
  },
  input: {
    width: '100%',
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#4B4B4B',
    color: '#FFFFFF',
    fontSize: 15,
    paddingHorizontal: 16,
    fontFamily: 'Poppins-Regular',
  },
  uploadBox: {
    minHeight: 96,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#4B4B4B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  uploadText: {
    color: '#C6BCB7',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  metaLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins-SemiBold',
  },
  creatorTypeCol: {
    gap: 12,
  },
  creatorTypeCard: {
    borderWidth: 1.5,
    borderColor: '#3F3A39',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  creatorTypeCardSelected: {
    borderColor: '#EC5C39',
    backgroundColor: 'rgba(236,92,57,0.12)',
  },
  creatorIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  creatorIconWrapSelected: {
    backgroundColor: '#EC5C39',
  },
  creatorTextWrap: {
    flex: 1,
    gap: 2,
  },
  creatorTypeTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: 'Poppins-SemiBold',
  },
  creatorTypeSub: {
    color: '#C6BCB7',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Poppins-Regular',
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4B4B4B',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  genreChipSelected: {
    borderColor: '#EC5C39',
    backgroundColor: 'rgba(236,92,57,0.12)',
  },
  genreChipText: {
    color: '#E7E2E0',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Poppins-Regular',
  },
  genreChipTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
  },
  successCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EC5C39',
  },
  summaryCard: {
    borderRadius: 20,
    padding: 16,
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryKey: {
    color: '#B9B0AD',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins-Regular',
  },
  summaryVal: {
    flex: 1,
    textAlign: 'right',
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Poppins-SemiBold',
  },
  finalHint: {
    color: '#C6BCB7',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Poppins-Regular',
    textAlign: 'center',
  },
  footerWrap: {
    paddingTop: 4,
  },
  continueBtn: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    opacity: 0.7,
  },
  continueBtnText: {
    color: '#FBFBFB',
    fontSize: 17,
    lineHeight: 22,
    fontFamily: 'Poppins-SemiBold',
  },
};
