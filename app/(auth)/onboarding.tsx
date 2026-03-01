import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

const screens = [
    {
        title: "Welcome to the heartbeat of Afro music",
        description: "Discover. Create. Share. The Afro sound starts with you",
        illustration: "african",
        titleColor: "#FFFFFF"
    },
    {
        title: "Discover, Create, and Share",
        description: "the sounds that move the world.",
        illustration: "discover",
        titleColor: "#F15A3B"
    },
    {
        title: "your Journey Starts Here.",
        subtitle: "Whether you're an artist or a fan,",
        illustration: "journey",
        titleColor: "#FFFFFF"
    }
];

export default function OnboardingFlow() {
    const [currentScreen, setCurrentScreen] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const router = useRouter();

    const handleNext = () => {
        if (currentScreen < screens.length - 1) {
            // Transition out
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 20,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start(() => {
                setCurrentScreen(prev => prev + 1);
                // Reset and Transition in
                slideAnim.setValue(-20);
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    })
                ]).start();
            });
        }
    };

    const handleGetStarted = () => {
        router.push('/(auth)/login');
    };

    const currentScreenData = screens[currentScreen];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Content Section */}
            <Animated.View style={[
                styles.content,
                {
                    opacity: fadeAnim,
                    transform: [{ translateX: slideAnim }]
                }
            ]}>

                {/* Header/Title Area */}
                <View style={styles.headerArea}>
                    {currentScreen === 2 && (
                        <Text style={styles.subtitle}>
                            {currentScreenData.subtitle}
                        </Text>
                    )}
                    <Text style={[styles.title, { color: currentScreenData.titleColor }]}>
                        {currentScreenData.title}
                    </Text>
                </View>

                {/* Description */}
                {currentScreen < 2 && (
                    <Text style={styles.description}>
                        {currentScreenData.description}
                    </Text>
                )}

                {/* Navigation Dots */}
                <View style={styles.pagination}>
                    {[0, 1, 2, 3].map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                currentScreen === index ? styles.activeDot : null,
                                index === 3 && styles.inactiveDot
                            ]}
                        />
                    ))}
                </View>

                {/* Action Button */}
                <View style={styles.buttonContainer}>
                    {currentScreen < screens.length - 1 ? (
                        <TouchableOpacity
                            onPress={handleNext}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#ED5639', '#C96F6F']}
                                style={styles.nextButton}
                            >
                                <ChevronRight color="white" size={24} strokeWidth={2.5} />
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={handleGetStarted}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#ED5639', '#C96F6F']}
                                style={styles.getStartedButton}
                            >
                                <Text style={styles.getStartedText}>Get Started</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Illustration Container */}
                <View style={styles.illustrationContainer}>
                    {currentScreen === 0 && (
                        <Image
                            source={require('@/assets/images/welcome-1.png')}
                            style={styles.illustrationImage}
                            contentFit="contain"
                        />
                    )}
                    {currentScreen === 1 && (
                        <Image
                            source={require('@/assets/images/welcome-2.png')}
                            style={styles.illustrationImage}
                            contentFit="contain"
                        />
                    )}
                    {currentScreen === 2 && (
                        <Image
                            source={require('@/assets/images/welcome-3.png')}
                            style={styles.illustrationImage}
                            contentFit="contain"
                        />
                    )}
                </View>

            </Animated.View>
        </View>
    );
}

// SVG illustrations removed in favor of images

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#140F10',
    },
    content: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 80,
    },
    headerArea: {
        marginBottom: 10,
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
    },
    description: {
        color: '#FFFFFF',
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
        lineHeight: 25,
        marginTop: 20,
        maxWidth: 280,
    },
    pagination: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 30,
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
    inactiveDot: {
        opacity: 0.5,
    },
    buttonContainer: {
        marginTop: 40,
    },
    nextButton: {
        width: 45,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    getStartedButton: {
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 30,
        alignSelf: 'flex-start',
    },
    getStartedText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
        fontWeight: '600',
    },
    illustrationContainer: {
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: -1,
    },
    illustrationImage: {
        width: width * 0.8,
        height: width * 0.8,
    }
});
