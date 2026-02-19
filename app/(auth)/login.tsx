import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    StatusBar,
    Dimensions,
    Modal as RNModal,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { Eye, EyeOff, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Rect, Path, Ellipse } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showEmailVerifyModal, setShowEmailVerifyModal] = useState(false);
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '']);
    const [resendTimer, setResendTimer] = useState(38);

    const otpRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

    // OTP Resend Timer
    useEffect(() => {
        if (showOTPModal && resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [showOTPModal, resendTimer]);

    const handleOTPChange = (index: number, value: string) => {
        if (value.length <= 1 && /^\d*$/.test(value)) {
            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);

            // Auto-focus next input
            if (value && index < 3) {
                otpRefs[index + 1].current?.focus();
            }
        }
    };

    const handleLogin = () => {
        if (email && password) {
            setShowEmailVerifyModal(true);
        }
    };

    const handleVerifyEmail = () => {
        setShowEmailVerifyModal(false);
        setShowOTPModal(true);
        setResendTimer(38);
    };

    const handleVerifyOTP = () => {
        setShowOTPModal(false);
        setShowSuccessModal(true);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Logo Section */}
                    <View style={styles.logoContainer}>
                        <Text style={styles.logoText}>ShooutS</Text>
                    </View>

                    {/* Welcome Text */}
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Log in to your account using email or social networks</Text>

                    {/* Social Login Buttons */}
                    <View style={styles.socialContainer}>
                        <SocialButton icon={<AppleIcon />} text="Login with Apple" />
                        <SocialButton icon={<GoogleIcon />} text="Login with Google" />
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
                        <TouchableOpacity>
                            <Text style={styles.forgotPasswordText}>Forgot Password ?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleLogin}
                            style={styles.loginButton}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.loginButtonText}>Login</Text>
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

            {/* Home Indicator Mimic */}
            <View style={styles.homeIndicator} />

            {/* Modals */}
            <ActionModal visible={showEmailVerifyModal} onClose={() => setShowEmailVerifyModal(false)}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalLabel}>Verify Your Email Address</Text>
                    <Text style={styles.modalEmail}>{email || 'Breezy@example.com'}</Text>
                    <Text style={styles.modalDescription}>
                        We will send the authentication code to your email address you entered. Do you want to continue?
                    </Text>

                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            onPress={() => setShowEmailVerifyModal(false)}
                            style={[styles.modalButton, styles.cancelButton]}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleVerifyEmail}
                            style={[styles.modalButton, styles.continueButton]}
                        >
                            <Text style={styles.continueButtonText}>Continue</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ActionModal>

            <ActionModal visible={showOTPModal} onClose={() => setShowOTPModal(false)}>
                <View style={styles.modalContent}>
                    <Text style={styles.otpTitle}>Enter OTP</Text>
                    <Text style={styles.modalDescription}>
                        A verification code has been sent to {email || 'breezy@example.com'}
                    </Text>

                    <View style={styles.otpInputsContainer}>
                        {[0, 1, 2, 3].map((index) => (
                            <TextInput
                                key={index}
                                ref={otpRefs[index]}
                                style={styles.otpInput}
                                maxLength={1}
                                keyboardType="number-pad"
                                value={otp[index]}
                                onChangeText={(val) => handleOTPChange(index, val)}
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        onPress={handleVerifyOTP}
                        style={styles.verifyButton}
                    >
                        <Text style={styles.verifyButtonText}>Verify</Text>
                    </TouchableOpacity>

                    <Text style={styles.resendText}>
                        Didn't receive the code? <Text style={styles.registerText}>Resend ({resendTimer}s)</Text>
                    </Text>
                </View>
            </ActionModal>

            <ActionModal visible={showSuccessModal} onClose={() => setShowSuccessModal(false)}>
                <View style={styles.modalContent}>
                    <View style={styles.successIconContainer}>
                        <View style={styles.successCircleOuter} />
                        <View style={styles.successCircleInner}>
                            <Svg width="50" height="50" viewBox="0 0 50 50">
                                <Path d="M10 25 L20 35 L40 15" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </View>
                    </View>

                    <Text style={styles.successTitle}>Account Created Successfully</Text>
                    <Text style={styles.modalDescription}>
                        Your account has been verified and created successfully
                    </Text>

                    <TouchableOpacity
                        onPress={() => {
                            setShowSuccessModal(false);
                            router.replace('/(tabs)');
                        }}
                        style={styles.verifyButton}
                    >
                        <Text style={styles.verifyButtonText}>Continue to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            </ActionModal>
        </View>
    );
}

// Sub-components
function SocialButton({ icon, text }: { icon: React.ReactNode, text: string }) {
    return (
        <TouchableOpacity style={styles.socialButton}>
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
    homeIndicator: {
        position: 'absolute',
        bottom: 8,
        alignSelf: 'center',
        width: 134,
        height: 5,
        backgroundColor: 'white',
        borderRadius: 3,
        opacity: 0.5,
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
