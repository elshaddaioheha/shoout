import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { hydrateSubscriptionTier } from '@/utils/subscriptionVerification';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, setDoc } from 'firebase/firestore';
import { Check, ImagePlus, Music2, User } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
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

type SelectedRole = 'studio' | 'hybrid';
type CreatorType = 'artist' | 'producer' | 'record_label';

const GENRES = ['Hip hop', 'Afro beats', 'Reggae', 'Gospel', 'R&B', 'Pop', 'Rock', 'Latin', 'Others'];

const CREATOR_TYPES: Array<{
  id: CreatorType;
  title: string;
  subtitle: string;
}> = [
  { id: 'artist', title: 'Artist', subtitle: 'Perform and record music' },
  { id: 'producer', title: 'Producer', subtitle: 'Create and sell beats' },
  { id: 'record_label', title: 'Record Label', subtitle: 'Manage multiple artist' },
];

const STEP_PROGRESS = [70, 150, 245, 336];

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

  const router = useRouter();
  const { showToast } = useToastStore();
  const params = useLocalSearchParams<{ role?: string }>();

  const selectedRole: SelectedRole = params.role === 'hybrid' ? 'hybrid' : 'studio';

  const [step, setStep] = useState(1);
  const [creatorName, setCreatorName] = useState(auth.currentUser?.displayName || '');
  const [studioName, setStudioName] = useState('');
  const [profileImageName, setProfileImageName] = useState('');
  const [profileImageUri, setProfileImageUri] = useState('');
  const [bannerImageName, setBannerImageName] = useState('');
  const [bannerImageUri, setBannerImageUri] = useState('');
  const [creatorType, setCreatorType] = useState<CreatorType | null>(null);
  const [primaryGenre, setPrimaryGenre] = useState('');
  const [loading, setLoading] = useState(false);

  const stepTitle = useMemo(() => {
    if (step === 1) return 'Let’s Start with Basics';
    if (step === 2) return 'Personalize your studio';
    if (step === 3) return 'What type of Creator are you?';
    return 'Studio Created!';
  }, [step]);

  const stepSubtitle = useMemo(() => {
    if (step === 1) return 'Tell us more about yourself.';
    if (step === 2) return 'Add images to make your studio stand out';
    if (step === 3) return 'This would help us personalize your experience more.';
    return `Welcome to ${studioName || 'your studio'}`;
  }, [step, studioName]);

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
    } catch (e) {
      showToast('Could not select image right now.', 'error');
    }
  };

  const validateAndContinue = async () => {
    if (step === 1) {
      if (!creatorName.trim() || !studioName.trim()) {
        showToast('Please enter your name and studio name.', 'error');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!creatorType || !primaryGenre) {
        showToast('Please choose a creator type and primary genre.', 'error');
        return;
      }
      setStep(4);
      return;
    }

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
          role: selectedRole,
          studioProfileImageName: profileImageName || null,
          studioProfileImageUri: profileImageUri || null,
          studioBannerImageName: bannerImageName || null,
          studioBannerImageUri: bannerImageUri || null,
          studioSetupCompletedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await setDoc(
        doc(db, 'users', uid, 'subscription', 'current'),
        {
          tier: selectedRole,
          status: 'trial',
          isSubscribed: false,
          billingCycle: null,
          expiresAt: null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await hydrateSubscriptionTier();
      showToast('Studio setup complete.', 'success');
      router.replace('/(tabs)');
    } catch (e) {
      showToast('Could not complete studio setup. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeScreenWrapper style={styles.container}>
      <StatusBar barStyle={appTheme.isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {step < 4 ? (
            <View style={styles.frameStage}>
              <View style={styles.headerWrapAbsolute}>
                <View style={styles.headerRow}>
                  <Text style={styles.headerTitle}>Create your Studio</Text>
                  <Text style={styles.stepText}>Step {step}/4</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: STEP_PROGRESS[step - 1] }]} />
                </View>
              </View>

              <View style={styles.introWrapAbsolute}>
                <Text style={styles.introTitle}>{stepTitle}</Text>
                <Text
                  style={[
                    styles.introSub,
                    step === 1 && styles.introSubStepOne,
                    step === 2 && styles.introSubStepTwo,
                    step === 3 && styles.introSubStepThree,
                  ]}
                >
                  {stepSubtitle}
                </Text>
              </View>

              {step === 1 && (
                <View style={styles.sectionStepOne}>
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
              )}

              {step === 2 && (
                <View style={styles.sectionStepTwo}>
                  <View style={styles.fieldWrap}>
                    <Text style={styles.label}>Profile</Text>
                    <TouchableOpacity style={styles.uploadBox} activeOpacity={0.85} onPress={() => pickImage('profile')}>
                      <ImagePlus size={28} color={uploadIconColor} />
                      <Text style={styles.uploadText}>{profileImageName || 'Upload img Jpegs and Pngs only'}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.fieldWrap}>
                    <Text style={styles.label}>Studio Banner</Text>
                    <TouchableOpacity style={styles.uploadBox} activeOpacity={0.85} onPress={() => pickImage('banner')}>
                      <ImagePlus size={28} color={uploadIconColor} />
                      <Text style={styles.uploadText}>{bannerImageName || 'Upload img Jpegs and Pngs only'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {step === 3 && (
                <>
                  <View style={styles.sectionStepThreeType}>
                    <View style={styles.fieldWrap}>
                      <Text style={styles.metaLabel}>Creator Type</Text>
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
                  </View>

                  <View style={styles.sectionStepThreeGenre}>
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
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.continueBtn,
                  step === 1 && styles.continueBtnStepOne,
                  (step === 2 || step === 3) && styles.continueBtnStepTwoThree,
                  loading && styles.continueBtnDisabled,
                ]}
                activeOpacity={0.9}
                onPress={validateAndContinue}
                disabled={loading}
              >
                <Text style={styles.continueBtnText}>{loading ? 'Please wait...' : 'Continue'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.finalWrap}>
              <View style={styles.successCircle}>
                <Check size={40} color="#FFFFFF" />
              </View>
              <Text style={styles.finalTitle}>Studio Created!</Text>
              <Text style={styles.finalSub}>{stepSubtitle}</Text>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Your Studio Details</Text>
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

              <Text style={styles.finalHint}>Next, choose a subscription plan that fits your needs</Text>

              <TouchableOpacity
                style={[styles.continueBtn, styles.continueBtnStepFour, loading && styles.continueBtnDisabled]}
                activeOpacity={0.9}
                onPress={validateAndContinue}
                disabled={loading}
              >
                <Text style={styles.continueBtnText}>{loading ? 'Please wait...' : 'Choose Plan'}</Text>
              </TouchableOpacity>
            </View>
          )}
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
    minHeight: 812,
    paddingBottom: 24,
  },
  frameStage: {
    width: 375,
    height: 812,
    alignSelf: 'center',
    position: 'relative',
  },
  headerWrapAbsolute: {
    position: 'absolute',
    width: 336,
    left: 19,
    top: 74,
    gap: 6,
  },
  introWrapAbsolute: {
    position: 'absolute',
    left: 19,
    top: 130,
    gap: 6,
  },
  sectionStepOne: {
    position: 'absolute',
    width: 337,
    left: 19,
    top: 196,
    gap: 16,
  },
  sectionStepTwo: {
    position: 'absolute',
    width: 337,
    left: 19,
    top: 196,
    gap: 16,
  },
  sectionStepThreeType: {
    position: 'absolute',
    width: 277,
    left: 19,
    top: 196,
  },
  sectionStepThreeGenre: {
    position: 'absolute',
    width: 337,
    left: 19,
    top: 368,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.5,
  },
  stepText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    lineHeight: 20,
    letterSpacing: -0.5,
  },
  progressTrack: {
    width: 336,
    height: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.75)',
    overflow: 'hidden',
  },
  progressFill: {
    height: 10,
    borderRadius: 20,
    backgroundColor: '#EC5C39',
  },
  introTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.5,
  },
  introSub: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 20,
    letterSpacing: -0.5,
    textAlign: 'left',
  },
  introSubStepOne: {
    width: 151,
    textAlign: 'center',
  },
  introSubStepTwo: {
    width: 237,
    textAlign: 'center',
  },
  introSubStepThree: {
    width: 296,
    textAlign: 'center',
  },
  fieldWrap: {
    gap: 8,
  },
  label: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
    lineHeight: 20,
    letterSpacing: -0.5,
  },
  input: {
    width: '100%',
    height: 41,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#737373',
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
  uploadBox: {
    height: 133,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#767676',
    backgroundColor: '#4E544C',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  uploadText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },
  metaLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 10,
    lineHeight: 20,
    letterSpacing: -0.5,
  },
  creatorTypeCol: {
    width: 277,
    gap: 12,
  },
  creatorTypeCard: {
    width: 277,
    height: 44,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#737373',
    backgroundColor: '#292727',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 12,
  },
  creatorTypeCardSelected: {
    borderColor: '#EC5C39',
  },
  creatorIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 5,
    backgroundColor: '#737373',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: -0.5,
  },
  creatorTypeSub: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 8,
    lineHeight: 12,
    letterSpacing: -0.5,
  },
  genreGrid: {
    width: 337,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  genreChip: {
    width: 99,
    height: 32,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#737373',
    backgroundColor: '#292727',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  genreChipSelected: {
    borderColor: '#EC5C39',
    backgroundColor: '#3A241D',
  },
  genreChipText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: -0.5,
  },
  genreChipTextSelected: {
    color: '#EC5C39',
  },
  finalWrap: {
    marginTop: 30,
    alignItems: 'center',
  },
  successCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalTitle: {
    marginTop: 12,
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  finalSub: {
    marginTop: 4,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 20,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  summaryCard: {
    marginTop: 18,
    width: '100%',
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: '#737373',
    backgroundColor: '#292727',
    padding: 12,
    gap: 8,
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    lineHeight: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryKey: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'Poppins-Regular',
    fontSize: 9,
    lineHeight: 12,
  },
  summaryVal: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 9,
    lineHeight: 12,
  },
  finalHint: {
    marginTop: 14,
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
  continueBtn: {
    position: 'absolute',
    left: 41,
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
  continueBtnDisabled: {
    opacity: 0.7,
  },
  continueBtnStepOne: {
    top: 450,
  },
  continueBtnStepTwoThree: {
    top: 634,
  },
  continueBtnStepFour: {
    position: 'relative',
    left: 0,
    marginTop: 30,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    lineHeight: 16,
  },
};