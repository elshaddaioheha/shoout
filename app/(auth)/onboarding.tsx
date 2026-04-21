import { useAppTheme } from '@/hooks/use-app-theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { setHasSeenOnboarding } from '@/utils/authFlow';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    Image,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewToken,
} from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    interpolateColor,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    type SharedValue
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type OnboardingSlide = {
  key: string;
  kicker?: string;
  lines: Array<Array<{ text: string; accent: boolean }>>;
  body: string;
  asset: any;
  imageScale: number;
};

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
    body: 'Start with discovery, then shape the Shoouts experience that fits you best.',
    asset: require('@/assets/images/welcome-3.png'),
    imageScale: 0.92,
  },
];

const ProgressPill = ({
  index,
  scrollX,
  appTheme,
  slidesCount,
}: {
  index: number;
  scrollX: SharedValue<number>;
  appTheme: any;
  slidesCount: number;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const minWidth = 8;
    const maxWidth = 58;

    const width = interpolate(
      scrollX.value,
      [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH],
      [minWidth, maxWidth, minWidth],
      Extrapolation.CLAMP
    );

    const backgroundColor = interpolateColor(
      scrollX.value,
      [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH],
      [
        appTheme.isDark ? '#504A4A' : '#D8CFCC',
        appTheme.colors.primary,
        appTheme.isDark ? '#504A4A' : '#D8CFCC',
      ]
    );

    return {
      width,
      backgroundColor,
    };
  });

  return <Animated.View style={[styles.progressPill, animatedStyle]} />;
};

const SlideItem = ({ slide, index, appTheme }: { slide: OnboardingSlide; index: number; appTheme: any }) => {
  return (
    <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
      <View style={styles.header}>
        {slide.kicker ? (
          <Text style={[styles.kicker, { color: appTheme.colors.textSecondary }]}>{slide.kicker}</Text>
        ) : null}

        <View style={styles.titleBlock}>
          {slide.lines.map((line, lineIndex) => (
            <Text
              key={`${slide.key}-line-${lineIndex}`}
              style={[styles.title, { color: appTheme.colors.textPrimary }]}
            >
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
      </View>

      <View style={styles.imageStage}>
        <View style={[styles.imageWrap, { transform: [{ scale: slide.imageScale }] }]}>
          <Image source={slide.asset} style={styles.image} resizeMode="contain" />
        </View>
      </View>
    </View>
  );
};

export default function OnboardingScreen() {
  const appTheme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<Animated.FlatList<OnboardingSlide>>(null);
  const scrollX = useSharedValue(0);

  const hasCompletedRef = useRef(false);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const finishOnboarding = async () => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    await setHasSeenOnboarding(true);
    router.replace('/(auth)/login');
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: !reduceMotion,
      });
    } else {
      void finishOnboarding();
    }
  };

  const goToIndex = (index: number) => {
    flatListRef.current?.scrollToIndex({
      index,
      animated: !reduceMotion,
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appTheme.colors.background }]}>
      <StatusBar barStyle={appTheme.isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.inner}>
        <Animated.FlatList
          ref={flatListRef}
          data={slides}
          renderItem={({ item, index }) => <SlideItem slide={item} index={index} appTheme={appTheme} />}
          keyExtractor={(item) => item.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
        
        <View style={styles.bottomSection}>
          <View style={styles.progressRow}>
            {slides.map((_, index) => (
              <Pressable key={`progress-${index}`} onPress={() => goToIndex(index)} hitSlop={10}>
                <ProgressPill index={index} scrollX={scrollX} appTheme={appTheme} slidesCount={slides.length} />
              </Pressable>
            ))}
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
              <Text style={styles.nextText}>{currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}</Text>
              <Text style={styles.nextArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingTop: 24,
    paddingBottom: 36,
  },
  slideContainer: {
    paddingHorizontal: 20,
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
  bottomSection: {
    paddingHorizontal: 20,
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
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },
});
