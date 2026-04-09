import { useAppTheme } from '@/hooks/use-app-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { authMotionEasing, getAuthMotionDurations } from '@/utils/authMotion';
import { setHasSeenOnboarding } from '@/utils/authFlow';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type OnboardingSlide = {
  key: string;
  kicker?: string;
  lines: Array<Array<{ text: string; accent: boolean }>>;
  body: string;
  asset: any;
  imageScale: number;
};

const AUTO_ADVANCE_MS = 2800;

const slides: OnboardingSlide[] = [
  {
    key: 'heartbeat',
    lines: [
      [{ text: 'Welcome to the', accent: false }],
      [
        { text: 'heartbeat of', accent: false },
        { text: '', accent: false },
      ],
      [{ text: 'Afro music', accent: true }],
    ],
    body: 'Discover. Create. Share. The Afro sound starts with you',
    asset: require('@/assets/images/welcome-1.png'),
    imageScale: 0.98,
  },
  {
    key: 'discover',
    lines: [
      [{ text: 'Discover, Create,', accent: true }],
      [
        { text: 'and ', accent: false },
        { text: 'Share', accent: true },
      ],
    ],
    body: 'the sounds that move the world.',
    asset: require('@/assets/images/welcome-2.png'),
    imageScale: 1.02,
  },
  {
    key: 'journey',
    kicker: "Whether you're an artist or a fan,",
    lines: [
      [
        { text: 'your ', accent: false },
        { text: 'Journey', accent: true },
      ],
      [
        { text: 'Starts ', accent: false },
        { text: 'Here.', accent: true },
      ],
    ],
    body: 'Start with discovery, then shape the ShooutS experience that fits you best.',
    asset: require('@/assets/images/welcome-3.png'),
    imageScale: 0.92,
  },
];

export default function OnboardingScreen() {
  const appTheme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const durations = getAuthMotionDurations(reduceMotion);
  const [index, setIndex] = useState(0);
  const hasCompletedRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(28)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const imageOpacity = useRef(new Animated.Value(1)).current;
  const imageTranslateX = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(slides.map((_, slideIndex) => new Animated.Value(slideIndex === 0 ? 1 : 0))).current;
  const slide = slides[index];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: durations.contentEnter,
        easing: authMotionEasing.standard,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: durations.contentEnter,
        easing: authMotionEasing.emphasized,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, contentTranslateY, durations.contentEnter]);

  const goToIndex = (targetIndex: number) => {
    if (targetIndex === index || isTransitioningRef.current) return;

    isTransitioningRef.current = true;

    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 0.42,
        duration: Math.max(110, durations.slideChange - 110),
        easing: authMotionEasing.standard,
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslateY, {
        toValue: targetIndex > index ? -8 : 8,
        duration: durations.slideChange,
        easing: authMotionEasing.standard,
        useNativeDriver: true,
      }),
      Animated.timing(imageOpacity, {
        toValue: 0,
        duration: Math.max(110, durations.slideChange - 80),
        easing: authMotionEasing.standard,
        useNativeDriver: true,
      }),
      Animated.timing(imageTranslateX, {
        toValue: targetIndex > index ? -16 : 16,
        duration: durations.slideChange,
        easing: authMotionEasing.standard,
        useNativeDriver: true,
      }),
      ...progressAnim.map((anim, slideIndex) =>
        Animated.timing(anim, {
          toValue: slideIndex === targetIndex ? 1 : 0,
          duration: durations.progress,
          easing: authMotionEasing.standard,
          useNativeDriver: false,
        })
      ),
    ]).start(() => {
      headerTranslateY.setValue(targetIndex > index ? 8 : -8);
      imageTranslateX.setValue(targetIndex > index ? 16 : -16);
      setIndex(targetIndex);
      Animated.parallel([
        Animated.timing(headerOpacity, {
          toValue: 1,
          duration: durations.slideChange,
          easing: authMotionEasing.standard,
          useNativeDriver: true,
        }),
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: durations.slideChange,
          easing: authMotionEasing.emphasized,
          useNativeDriver: true,
        }),
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: durations.slideChange,
          easing: authMotionEasing.standard,
          useNativeDriver: true,
        }),
        Animated.timing(imageTranslateX, {
          toValue: 0,
          duration: durations.slideChange,
          easing: authMotionEasing.emphasized,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isTransitioningRef.current = false;
      });
    });
  };

  const finishOnboarding = async () => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    await setHasSeenOnboarding(true);
    router.replace('/(auth)/login');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasCompletedRef.current || isTransitioningRef.current) return;

      if (index < slides.length - 1) {
        goToIndex(index + 1);
        return;
      }

      void finishOnboarding();
    }, AUTO_ADVANCE_MS);

    return () => clearTimeout(timer);
  }, [index]);

  const handleNext = async () => {
    if (index === slides.length - 1) {
      await finishOnboarding();
      return;
    }
    goToIndex(index + 1);
  };

  const progressWidths = useMemo(
    () =>
      progressAnim.map((anim) =>
        anim.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 58],
        })
      ),
    [progressAnim]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <StatusBar barStyle={appTheme.isDark ? 'light-content' : 'dark-content'} />

      <Animated.View
        style={[
          styles.inner,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          {slide.kicker ? <Text style={[styles.kicker, { color: appTheme.colors.textSecondary }]}>{slide.kicker}</Text> : null}

          <View style={styles.titleBlock}>
            {slide.lines.map((line, lineIndex) => (
              <Text key={`${slide.key}-line-${lineIndex}`} style={[styles.title, { color: appTheme.colors.textPrimary }]}>
                {line.map((part, partIndex) => (
                  <Text
                    key={`${slide.key}-part-${lineIndex}-${partIndex}`}
                    style={{ color: part.accent ? appTheme.colors.primary : appTheme.colors.textPrimary }}
                  >
                    {part.text}
                  </Text>
                ))}
              </Text>
            ))}
          </View>

          <Text style={[styles.body, { color: appTheme.colors.textSecondary }]}>{slide.body}</Text>

          <View style={styles.progressRow}>
            {progressWidths.map((width, progressIndex) => (
              <Pressable key={`progress-${progressIndex}`} onPress={() => goToIndex(progressIndex)} hitSlop={10}>
                <Animated.View
                  style={[
                    styles.progressPill,
                    {
                      width,
                      backgroundColor:
                        progressIndex === index ? appTheme.colors.primary : appTheme.isDark ? '#504A4A' : '#D8CFCC',
                    },
                  ]}
                />
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <View style={styles.imageStage}>
          <Animated.View
            style={[
              styles.imageWrap,
              {
                opacity: imageOpacity,
                transform: [{ translateX: imageTranslateX }, { scale: slide.imageScale }],
              },
            ]}
          >
            <Image source={slide.asset} style={styles.image} resizeMode="contain" />
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={finishOnboarding} activeOpacity={0.8}>
            <Text style={[styles.skipText, { color: appTheme.colors.textPrimary }]}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: appTheme.colors.primary }]}
            activeOpacity={0.9}
            onPress={handleNext}
          >
            <Text style={styles.nextText}>{index === slides.length - 1 ? 'Get Started' : 'Next'}</Text>
            <Text style={styles.nextArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
  },
  header: {
    gap: 14,
  },
  kicker: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  titleBlock: {
    gap: 2,
  },
  title: {
    fontFamily: 'Poppins-Bold',
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  body: {
    maxWidth: 320,
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    lineHeight: 26,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  progressPill: {
    height: 4,
    borderRadius: 999,
  },
  imageStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  imageWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    maxWidth: 360,
    height: 360,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  skipText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  nextButton: {
    minHeight: 56,
    paddingHorizontal: 20,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  nextText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },
  nextArrow: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 24,
    marginTop: -1,
  },
});
