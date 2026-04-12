import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GoogleAuthProvider, OAuthProvider, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Modal as RNModal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';
import { useToastStore } from '../../store/useToastStore';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { ensureDefaultSubscriptionDoc, hydrateSubscriptionTier } from '../../utils/subscriptionVerification';
import { getFriendlyErrorMessage } from '../../utils/errorHandler';
import { markUserNeedsRoleSelection, resolveAuthenticatedDestination } from '@/utils/authFlow';

const { width } = Dimensions.get('window');

function useLoginStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function LoginScreen() {
    const appTheme = useAppTheme();
    const styles = useLoginStyles();
    const placeholderColor = appTheme.colors.textPlaceholder;
    const isLightMode = !appTheme.isDark;
    const lightBackground = '#FFF4EE';
    const lightSurface = '#FFF9F6';
    const lightText = '#2F2624';
    const lightMutedText = '#6F5A53';
    const lightBorder = '#D8B9AD';

    const router = useRouter();
    const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { showToast } = useToastStore();
    const passwordInputRef = useRef<TextInput>(null);

    const emailFocused = useSharedValue(0);
    const passwordFocused = useSharedValue(0);

    const emailInputAnimatedStyle = useAnimatedStyle(() => ({
        borderColor: emailFocused.value ? '#007AFF' : (isLightMode ? lightBorder : '#464646'),
    }));

    const passwordInputAnimatedStyle = useAnimatedStyle(() => ({
        borderColor: passwordFocused.value ? '#007AFF' : (isLightMode ? lightBorder : '#464646'),
    }));

    const getPostAuthRoute = () => {
        if (typeof redirectTo === 'string' && redirectTo.trim().length > 0) {
            return redirectTo;
        }
        return '/(tabs)';
    };

    const goGuestHome = () => {
        router.replace('/(tabs)');
    };

    const handleForgotPassword = () => {
        const trimmed = email.trim();
        if (trimmed.length > 0) {
            router.push({ pathname: '/(auth)/forgot-password', params: { email: trimmed } });
            return;
        }
        router.push('/(auth)/forgot-password');
    };

    const handleLogin = async () => {
        if (!email || !password) return;
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.replace(await resolveAuthenticatedDestination(getPostAuthRoute()) as any);
        } catch (error: any) {
            console.error('Login error:', error.message);
            showToast(getFriendlyErrorMessage(error), "error");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
        if (!webClientId) {
            showToast('Google Sign-In is not configured. Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.', 'error');
            return;
        }

        try {
            setLoading(true);
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const idToken = userInfo?.data?.idToken;
            if (!idToken) throw new Error("No ID Token found");

            const googleCredential = GoogleAuthProvider.credential(idToken);
            const userCred = await signInWithCredential(auth, googleCredential);
            const userDoc = await getDoc(doc(db, "users", userCred.user.uid));

            if (!userDoc.exists()) {
                await markUserNeedsRoleSelection(userCred.user.uid, {
                    fullName: userCred.user.displayName || "Google User",
                    email: userCred.user.email,
                    createdAt: new Date().toISOString()
                });
                await ensureDefaultSubscriptionDoc(userCred.user.uid);
                await hydrateSubscriptionTier();
                router.replace(await resolveAuthenticatedDestination() as any);
            } else {
                await hydrateSubscriptionTier();
                router.replace(await resolveAuthenticatedDestination(getPostAuthRoute()) as any);
            }
        } catch (error: any) {
            console.error('Google Sign-In error:', error.message);
            const code = String(error?.code || '');
            if (code === statusCodes.SIGN_IN_CANCELLED) return;

            if (code === 'DEVELOPER_ERROR' || code === '10') {
                showToast('Google Sign-In misconfigured. Check OAuth client IDs, SHA-1/SHA-256 fingerprints, package name, and google-services.json.', 'error');
                return;
            }

            showToast(getFriendlyErrorMessage(error), "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAppleLogin = async () => {
        if (Platform.OS !== 'ios') return;

        try {
            setLoading(true);
            const appleResult = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            if (!appleResult.identityToken) {
                throw new Error('Apple Sign-In failed: no identity token returned.');
            }

            const provider = new OAuthProvider('apple.com');
            const credential = provider.credential({
                idToken: appleResult.identityToken,
            });

            const userCred = await signInWithCredential(auth, credential);
            const userDoc = await getDoc(doc(db, 'users', userCred.user.uid));

            if (!userDoc.exists()) {
                const fullNameFromApple = [appleResult.fullName?.givenName, appleResult.fullName?.familyName]
                    .filter(Boolean)
                    .join(' ')
                    .trim();

                await markUserNeedsRoleSelection(userCred.user.uid, {
                    fullName: fullNameFromApple || userCred.user.displayName || 'Apple User',
                    email: userCred.user.email || '',
                    createdAt: new Date().toISOString(),
                });
                await ensureDefaultSubscriptionDoc(userCred.user.uid);
                await hydrateSubscriptionTier();
                router.replace(await resolveAuthenticatedDestination() as any);
            } else {
                await hydrateSubscriptionTier();
                router.replace(await resolveAuthenticatedDestination(getPostAuthRoute()) as any);
            }
        } catch (error: any) {
            if (error?.code === 'ERR_REQUEST_CANCELED') {
                return;
            }
            console.error('Apple Sign-In error:', error?.message || error);
            showToast(getFriendlyErrorMessage(error), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, isLightMode && { backgroundColor: lightBackground }]}>
            <StatusBar barStyle={appTheme.isDark ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.guestRow}>
                        <TouchableOpacity onPress={goGuestHome}>
                            <Text style={[styles.guestText, isLightMode && { color: lightMutedText }]}>Continue as Guest</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.logoContainer}>
                        <Text style={[styles.logoText, isLightMode && { color: lightText }]}>ShooutS</Text>
                    </View>

                    <Text style={[styles.title, isLightMode && { color: lightText }]}>Welcome Back</Text>
                    <Text style={[styles.subtitle, isLightMode && { color: lightMutedText }]}>Log in to your account using email or social networks</Text>

                    <View style={styles.socialContainer}>
                        {Platform.OS === 'ios' ? (
                            <SocialButton icon={<AppleIcon color={isLightMode ? '#2F2624' : '#FFFFFF'} />} text="Login with Apple" onPress={handleAppleLogin} />
                        ) : null}
                        <SocialButton icon={<GoogleIcon />} text="Login with Google" onPress={handleGoogleLogin} />
                    </View>

                    <View style={styles.dividerContainer}>
                        <View style={[styles.dividerLine, isLightMode && { backgroundColor: lightBorder }]} />
                        <Text style={[styles.dividerText, isLightMode && { color: lightMutedText }]}>Or continue with social account</Text>
                        <View style={[styles.dividerLine, isLightMode && { backgroundColor: lightBorder }]} />
                    </View>

                    <View style={styles.form}>
                        <Animated.View style={[styles.input, isLightMode && { backgroundColor: lightSurface, borderColor: lightBorder }, emailInputAnimatedStyle]}>
                            <TextInput
                                style={[styles.inputText, isLightMode && { color: lightText }]}
                                placeholder="Email Address"
                                placeholderTextColor={placeholderColor}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                returnKeyType="next"
                                onFocus={() => {
                                    emailFocused.value = withTiming(1, { duration: 180 });
                                }}
                                onBlur={() => {
                                    emailFocused.value = withTiming(0, { duration: 180 });
                                }}
                                onSubmitEditing={() => passwordInputRef.current?.focus()}
                            />
                        </Animated.View>

                        <Animated.View style={[styles.passwordContainer, isLightMode && { backgroundColor: lightSurface, borderColor: lightBorder }, passwordInputAnimatedStyle]}>
                            <TextInput
                                ref={passwordInputRef}
                                style={[styles.inputText, { paddingRight: 50 }, isLightMode && { color: lightText }]}
                                placeholder="Password"
                                placeholderTextColor={placeholderColor}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                onFocus={() => {
                                    passwordFocused.value = withTiming(1, { duration: 180 });
                                }}
                                onBlur={() => {
                                    passwordFocused.value = withTiming(0, { duration: 180 });
                                }}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeIcon}
                            >
                                {showPassword ? <Eye color={isLightMode ? lightMutedText : appTheme.colors.textPrimary} size={24} /> : <EyeOff color={isLightMode ? lightMutedText : appTheme.colors.textPrimary} size={24} />}
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    <View style={styles.actionContainer}>
                        <TouchableOpacity onPress={handleForgotPassword}>
                            <Text style={styles.forgotPasswordText}>Forgot Password ?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleLogin}
                            style={[styles.loginButton, isLightMode && { backgroundColor: '#EC5C39', shadowColor: '#A54934' }]}
                            activeOpacity={0.8}
                            disabled={loading}
                        >
                            <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Login'}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, isLightMode && { color: lightMutedText }]}>Didn't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                            <Text style={styles.registerText}>Register</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

function SocialButton({ icon, text, onPress }: { icon: React.ReactNode, text: string, onPress?: () => void }) {
    const appTheme = useAppTheme();
    const styles = useLoginStyles();
    const isLightMode = !appTheme.isDark;

    return (
        <TouchableOpacity style={[styles.socialButton, isLightMode && { borderColor: '#D8B9AD', backgroundColor: '#FFF9F6' }]} onPress={onPress}>
            {icon}
            <Text style={[styles.socialButtonText, isLightMode && { color: '#2F2624' }]}>{text}</Text>
        </TouchableOpacity>
    );
}

function AppleIcon({ color = '#FFFFFF' }: { color?: string }) {
    return (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill={color} />
        </Svg>
    );
}

function GoogleIcon() {
    return (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </Svg>
    );
}

function ActionModal({ children, visible, onClose }: { children: React.ReactNode, visible: boolean, onClose: () => void }) {
    const styles = useLoginStyles();

    return (
        <RNModal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {children}
                </View>
            </View>
        </RNModal>
    );
}

const legacyStyles = {
    container: {
        flex: 1,
        backgroundColor: '#140F10',
    },
    scrollContent: {
        paddingHorizontal: 33,
        paddingTop: 60,
        paddingBottom: 40,
        alignItems: 'center',
    },
    guestRow: {
        width: '100%',
        alignItems: 'flex-end',
        marginBottom: 12,
    },
    guestText: {
        color: '#B7B7B7',
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
    },
    logoContainer: {
        width: 256,
        height: 56,
        marginBottom: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        color: 'white',
        fontSize: 24,
        fontFamily: 'Poppins-Bold',
    },
    title: {
        color: 'white',
        fontSize: 32,
        fontFamily: 'Poppins-Bold',
        lineHeight: 51,
        textAlign: 'center',
        letterSpacing: -0.5,
        marginBottom: 15,
    },
    subtitle: {
        color: 'white',
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
        lineHeight: 25,
        textAlign: 'center',
        letterSpacing: -0.5,
        marginBottom: 27,
    },
    socialContainer: {
        width: '100%',
        gap: 12,
        marginBottom: 17,
    },
    socialButton: {
        width: '100%',
        height: 56,
        borderWidth: 1.5,
        borderColor: '#464646',
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    socialButtonText: {
        color: 'white',
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
        letterSpacing: -0.5,
    },
    dividerContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 1,
        marginBottom: 16,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#464646',
    },
    dividerText: {
        flex: 2,
        color: '#676767',
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    form: {
        width: '100%',
        gap: 16,
        marginBottom: 23,
    },
    input: {
        width: '100%',
        height: 56,
        paddingHorizontal: 16,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#464646',
        borderRadius: 10,
        justifyContent: 'center',
    },
    inputText: {
        color: 'white',
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
        height: '100%',
        paddingVertical: 0,
    },
    passwordContainer: {
        position: 'relative',
        width: '100%',
        height: 56,
        paddingHorizontal: 16,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#464646',
        borderRadius: 10,
        justifyContent: 'center',
    },
    eyeIcon: {
        position: 'absolute',
        right: 15,
        top: 16,
    },
    actionContainer: {
        width: '100%',
        alignItems: 'flex-end',
        gap: 24,
        marginBottom: 23,
    },
    forgotPasswordText: {
        color: '#EC5C39',
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
        lineHeight: 25,
        letterSpacing: -0.5,
    },
    loginButton: {
        width: '100%',
        height: 48,
        backgroundColor: '#EC5C39',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#D32626',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    loginButtonText: {
        color: 'white',
        fontSize: 14,
        fontFamily: 'Poppins-SemiBold',
    },
    footer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    footerText: {
        color: 'white',
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
        lineHeight: 25,
        letterSpacing: -0.5,
    },
    registerText: {
        color: '#EC5C39',
        fontSize: 15,
        fontFamily: 'Poppins-SemiBold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: width * 0.85,
        backgroundColor: '#140F10',
        borderRadius: 20,
        padding: 34,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    modalContent: {
        alignItems: 'center',
        width: '100%',
    },
    modalLabel: {
        color: 'white',
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
        lineHeight: 25,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    modalEmail: {
        color: 'white',
        fontSize: 20,
        fontFamily: 'Poppins-Bold',
        lineHeight: 40,
        textAlign: 'center',
        letterSpacing: -0.5,
        marginVertical: 10,
    },
    modalDescription: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
        lineHeight: 25,
        textAlign: 'center',
        letterSpacing: -0.5,
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 15,
        width: '100%',
        justifyContent: 'center',
    },
    modalButton: {
        width: width * 0.3,
        height: 44,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        borderWidth: 1,
        borderColor: '#EC5C39',
    },
    continueButton: {
        backgroundColor: '#EC5C39',
    },
    cancelButtonText: {
        color: '#EC5C39',
        fontFamily: 'Poppins-SemiBold',
    },
    continueButtonText: {
        color: 'white',
        fontFamily: 'Poppins-SemiBold',
    },
    otpTitle: {
        color: 'white',
        fontSize: 32,
        fontFamily: 'Poppins-Bold',
        lineHeight: 51,
    },
    otpInputsContainer: {
        flexDirection: 'row',
        gap: 10,
        marginVertical: 20,
    },
    otpInput: {
        width: 60,
        height: 60,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#E1E1E1',
        borderRadius: 30,
        color: 'white',
        fontSize: 17,
        fontFamily: 'Poppins-Bold',
        textAlign: 'center',
    },
    verifyButton: {
        width: '100%',
        height: 48,
        backgroundColor: '#EC5C39',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        marginBottom: 15,
    },
    verifyButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
    },
    resendText: {
        color: 'white',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
    },
    successIconContainer: {
        width: 140,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    successCircleOuter: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#40302C',
        borderRadius: 70,
        borderWidth: 10,
        borderColor: '#40302C',
    },
    successCircleInner: {
        width: 120,
        height: 120,
        backgroundColor: '#EC5C39',
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    successTitle: {
        color: 'white',
        fontSize: 24,
        fontFamily: 'Poppins-Bold',
        textAlign: 'center',
        marginBottom: 10,
    },
};
