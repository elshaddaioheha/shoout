import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

const screens = [
    {
        title: "Welcome to the heartbeat of Afro music",
        description: "Discover, create, and share. The Afro sound starts with you.",
        illustration: "african",
    },
    {
        title: "Discover, create, and share",
        description: "The sounds that move the world.",
        illustration: "discover",
    },
    {
        title: "Your journey starts here.",
        subtitle: "Whether you're an artist or a fan,",
        illustration: "journey",
    }
];

function useOnboardingStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function OnboardingFlow() {
    const appTheme = useAppTheme();
    const styles = useOnboardingStyles();

    const [currentScreen, setCurrentScreen] = useState(0);
    const scrollRef = useRef<ScrollView | null>(null);
    const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const router = useRouter();

    const handleComplete = React.useCallback(() => {
        if (autoTimer.current) {
            clearTimeout(autoTimer.current);
            autoTimer.current = null;
        }
        router.replace('/(auth)/login');
    }, [router]);

    useEffect(() => {
        if (autoTimer.current) {
            clearTimeout(autoTimer.current);
        }

        // Do not auto-advance from the final screen; let user finish manually.
        if (currentScreen < screens.length - 1) {
            autoTimer.current = setTimeout(() => {
                const next = currentScreen + 1;
                setCurrentScreen(next);
                scrollRef.current?.scrollTo({ x: next * width, animated: true });
            }, 3000);
        }

        return () => {
            if (autoTimer.current) {
                clearTimeout(autoTimer.current);
                autoTimer.current = null;
            }
        };
    }, [currentScreen]);

    const handleMomentumEnd = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / width);
        setCurrentScreen(index);
    };

    const handleSkip = () => handleComplete();

    const handleNext = () => {
        if (currentScreen === screens.length - 1) {
            handleComplete();
            return;
        }
        const next = currentScreen + 1;
        setCurrentScreen(next);
        scrollRef.current?.scrollTo({ x: next * width, animated: true });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle={appTheme.isDark ? 'light-content' : 'dark-content'} />

            {/* Content Section */}
            <View style={styles.content}>
                <ScrollView
                    ref={(ref) => { scrollRef.current = ref; }}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleMomentumEnd}
                    onScrollBeginDrag={() => {
                        if (autoTimer.current) {
                            clearTimeout(autoTimer.current);
                            autoTimer.current = null;
                        }
                    }}
                    contentContainerStyle={{ alignItems: 'flex-start', height: '100%' }}
                >
                    {screens.map((screen, idx) => (
                        <View key={screen.title} style={[styles.slide, { width }]}>                            
                            <View style={styles.headerArea}>
                                {idx === 2 && screen.subtitle && (
                                    <Text style={styles.subtitle}>
                                        {screen.subtitle}
                                    </Text>
                                )}
                                <Text style={[styles.title, { color: idx === 1 ? appTheme.colors.primary : appTheme.colors.textPrimary }]}> 
                                    {screen.title}
                                </Text>
                            </View>

                            {screen.description && (
                                <Text style={styles.description}>
                                    {screen.description}
                                </Text>
                            )}

                            <View style={styles.illustrationContainer} pointerEvents="none">
                                {idx === 0 && (
                                    <Image
                                        source={require('@/assets/images/welcome-1.png')}
                                        style={styles.illustrationImage}
                                        contentFit="contain"
                                    />
                                )}
                                {idx === 1 && (
                                    <Image
                                        source={require('@/assets/images/welcome-2.png')}
                                        style={styles.illustrationImage}
                                        contentFit="contain"
                                    />
                                )}
                                {idx === 2 && (
                                    <Image
                                        source={require('@/assets/images/welcome-3.png')}
                                        style={styles.illustrationImage}
                                        contentFit="contain"
                                    />
                                )}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.paginationRow}>
                {screens.map((_, dotIdx) => (
                    <View
                        key={dotIdx}
                        style={[
                            styles.dot,
                            currentScreen === dotIdx ? styles.activeDot : null,
                        ]}
                    />
                ))}
            </View>

            <View style={styles.footerRow}>
                <TouchableOpacity onPress={handleSkip} hitSlop={10}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleNext} activeOpacity={0.8} style={styles.nextButton}>
                    <Text style={styles.nextText}>{currentScreen === screens.length - 1 ? 'Get Started' : 'Next'}</Text>
                    <View style={[styles.arrow, { borderColor: appTheme.colors.textPrimary }]} />
                </TouchableOpacity>
            </View>

            <View style={styles.homeIndicator} />
        </View>
    );
}

// SVG illustrations removed in favor of images

const legacyStyles = {
    container: {
        flex: 1,
        backgroundColor: '#140F10',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 72,
    },
    slide: {
        flex: 1,
    },
    skipText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Poppins-Medium',
        letterSpacing: -0.5,
        textDecorationLine: 'underline',
    },
    headerArea: {
        marginBottom: 12,
        gap: 8,
    },
    subtitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        lineHeight: 25,
        letterSpacing: -0.5,
    },
    title: {
        fontSize: 32,
        fontFamily: 'Poppins-Bold',
        fontWeight: 'bold',
        lineHeight: 51,
        letterSpacing: -0.5,
        maxWidth: 264,
    },
    description: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
        lineHeight: 25,
        marginTop: 8,
        maxWidth: 286,
        letterSpacing: -0.5,
    },
    paginationRow: {
        position: 'absolute',
        left: 20,
        top: 306,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        width: 90,
        height: 4,
    },
    dot: {
        height: 4,
        width: 5,
        borderRadius: 10,
        backgroundColor: '#464646',
    },
    activeDot: {
        width: 62,
        backgroundColor: '#F15A3B',
    },
    footerRow: {
        position: 'absolute',
        left: 20,
        right: 20,
        top: 709,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 36,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: '#EC5C39',
        borderRadius: 100,
        gap: 8,
        height: 36,
    },
    nextText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Poppins-Medium',
        letterSpacing: -0.5,
    },
    arrow: {
        width: 8,
        height: 8,
        borderRightWidth: 2,
        borderBottomWidth: 2,
        borderColor: '#FFFFFF',
        transform: [{ rotate: '-45deg' }],
    },
    homeIndicator: {
        position: 'absolute',
        left: '50%',
        bottom: 8,
        width: 134,
        height: 5,
        backgroundColor: '#FFFFFF',
        borderRadius: 100,
        transform: [{ translateX: -67 }],
        opacity: 0.9,
    },
    illustrationContainer: {
        position: 'absolute',
        top: 340,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: -1,
    },
    illustrationImage: {
        width: 352,
        height: 329,
    }
};

