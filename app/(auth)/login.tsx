import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { GoogleAuthProvider, OAuthProvider, sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
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
import Svg, { Path } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';
import { useToastStore } from '../../store/useToastStore';
import { useUserStore } from '../../store/useUserStore';
import { getFriendlyErrorMessage } from '../../utils/errorHandler';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { setRole } = useUserStore();
    const { showToast } = useToastStore();
    const [resetLoading, setResetLoading] = useState(false);

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            showToast('Please enter your email address to reset password.', 'error');
            return;
        }
        setResetLoading(true);
        try {
            await sendPasswordResetEmail(auth, email.trim());
            showToast(`A password reset link has been sent to ${email.trim()}.`, 'success');
        } catch (e: any) {
            showToast(getFriendlyErrorMessage(e), 'error');
        } finally {
            setResetLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!email || !password) return;
        setLoading(true);
        try {
            // 1. Authenticate with Firebase securely
            const userCred = await signInWithEmailAndPassword(auth, email, password);

            // 2. Fetch their metadata (Role, etc) from Firestore
            const userDoc = await getDoc(doc(db, "users", userCred.user.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.role) {
                    setRole(userData.role);
                } else {
                    setRole('vault_free'); // fallback
                }
            } else {
                setRole('vault_free');
            }

            router.replace('/(tabs)');
        } catch (error: any) {
            console.error('Login error:', error.message);
            showToast(getFriendlyErrorMessage(error), "error");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const idToken = userInfo?.data?.idToken;
            if (!idToken) throw new Error("No ID Token found");

            // Create a Google credential with the token
            const googleCredential = GoogleAuthProvider.credential(idToken);

            // Sign-in the user with the credential
            const userCred = await signInWithCredential(auth, googleCredential);

            // Fetch or create user document in Firestore
            const userDoc = await getDoc(doc(db, "users", userCred.user.uid));

            if (!userDoc.exists()) {
                await setDoc(doc(db, "users", userCred.user.uid), {
                    fullName: userCred.user.displayName || "Google User",
                    email: userCred.user.email,
                    role: 'vault_free', // default initial role for social login
                    createdAt: new Date().toISOString()
                });
                setRole('vault_free');
                router.replace('/(auth)/role-selection');
            } else {
                const userData = userDoc.data();
                setRole(userData.role || 'vault_free');
                router.replace('/(tabs)');
            }

        } catch (error: any) {
            console.error('Google Sign-In error:', error.message);
            if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
                showToast(getFriendlyErrorMessage(error), "error");
            }
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

                await setDoc(doc(db, 'users', userCred.user.uid), {
                    fullName: fullNameFromApple || userCred.user.displayName || 'Apple User',
                    email: userCred.user.email || '',
                    role: 'vault_free',
                    createdAt: new Date().toISOString(),
                });
                setRole('vault_free');
                router.replace('/(auth)/role-selection');
            } else {
                const userData = userDoc.data();
                setRole(userData.role || 'vault_free');
                router.replace('/(tabs)');
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
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    {/* Logo Section */}
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>ShooutS</Text>
                    </View>

                    {/* Welcome Text */}
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Log in to your account using email or social networks</Text>

                    {/* Social Login Buttons */}
                    <View style={styles.socialContainer}>
                        {Platform.OS === 'ios' ? (
                            <SocialButton icon={<AppleIcon />} text="Login with Apple" onPress={handleAppleLogin} />
                        ) : null}
                        <SocialButton icon={<GoogleIcon />} text="Login with Google" onPress={handleGoogleLogin} />
                    </View>

                    {/* Divider */}
                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>Or continue with social account</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Form */}
                    <View style={styles.form}>
                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            placeholderTextColor="rgba(255, 255, 255, 0.6)"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={[styles.input, { paddingRight: 50 }]}
                                placeholder="Password"
                                placeholderTextColor="rgba(255, 255, 255, 0.6)"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeIcon}
                            >
                                {showPassword ? <Eye color="white" size={24} /> : <EyeOff color="white" size={24} />}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Forgot Password & Login */}
                    <View style={styles.actionContainer}>
                        <TouchableOpacity onPress={handleForgotPassword} disabled={resetLoading}>
                            <Text style={styles.forgotPasswordText}>Forgot Password ?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleLogin}
                            style={styles.loginButton}
                            activeOpacity={0.8}
                            disabled={loading}
                        >
                            <Text style={styles.loginButtonText}>{loading ? 'Logging in...' : 'Login'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Register Link */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Didn't have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                            <Text style={styles.registerText}>Register</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Modals Removed for Firebase Auth Native UI */}
        </View>
    );
}

// Sub-components
function SocialButton({ icon, text, onPress }: { icon: React.ReactNode, text: string, onPress?: () => void }) {
    return (
        <TouchableOpacity style={styles.socialButton} onPress={onPress}>
            {icon}
            <Text style={styles.socialButtonText}>{text}</Text>
        </TouchableOpacity>
    );
}

function AppleIcon() {
    return (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="white" />
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

const styles = StyleSheet.create({
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
        color: 'white',
        fontSize: 15,
        fontFamily: 'Poppins-Regular',
    },
    passwordContainer: {
        position: 'relative',
        width: '100%',
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
});
