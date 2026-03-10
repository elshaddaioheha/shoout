import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';
import { useToastStore } from '../../store/useToastStore';
import { useUserStore } from '../../store/useUserStore';
import { getFriendlyErrorMessage } from '../../utils/errorHandler';

export default function SignupScreen() {
    const router = useRouter();
    const [fullName, setFullName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const { setRole } = useUserStore();
    const { showToast } = useToastStore();

    const handleSignup = async () => {
        if (!email || !password || !fullName) return;
        if (password !== confirmPassword) {
            showToast("Passwords don't match", "error");
            return;
        }

        setLoading(true);
        try {
            // 1. Create secure Auth account
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            if (userCred.user) {
                await updateProfile(userCred.user, { displayName: fullName });

                // 2. Save physical user metadata to Firestore Database
                await setDoc(doc(db, "users", userCred.user.uid), {
                    fullName,
                    email,
                    role: 'vault_free', // Default initial role
                    createdAt: new Date().toISOString()
                });

                setRole('vault_free');
                // Route to real role selection 
                router.replace('/(auth)/role-selection');
            }
        } catch (error: any) {
            console.error('Signup error:', error.message);
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

            const googleCredential = GoogleAuthProvider.credential(idToken);
            const userCred = await signInWithCredential(auth, googleCredential);
            const userDoc = await getDoc(doc(db, "users", userCred.user.uid));

            if (!userDoc.exists()) {
                await setDoc(doc(db, "users", userCred.user.uid), {
                    fullName: userCred.user.displayName || "Google User",
                    email: userCred.user.email,
                    role: 'vault_free',
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

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <Text style={styles.title}>Join ShooutS</Text>
                    <Text style={styles.subtitle}>Create an account to start sharing your sound</Text>

                    {/* Social Login Buttons */}
                    <View style={styles.socialContainer}>
                        <SocialButton icon={<AppleIcon />} text="Signup with Apple" />
                        <SocialButton icon={<GoogleIcon />} text="Signup with Google" onPress={handleGoogleLogin} />
                    </View>

                    {/* Divider */}
                    <View style={styles.dividerContainer}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>Or register with email</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.form}>
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor="#666"
                            value={fullName}
                            onChangeText={setFullName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            placeholderTextColor="#666"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            placeholderTextColor="#666"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm Password"
                            placeholderTextColor="#666"
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />

                        <TouchableOpacity
                            onPress={handleSignup}
                            activeOpacity={0.8}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={['#ED5639', '#C96F6F']}
                                style={styles.button}
                            >
                                <Text style={styles.buttonText}>{loading ? 'Signing Up...' : 'Sign Up'}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                            <Text style={styles.linkText}>Log In</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#140F10',
    },
    content: {
        paddingHorizontal: 28,
        paddingVertical: 60,
    },
    title: {
        fontSize: 32,
        fontFamily: 'Poppins-Bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Poppins-Regular',
        color: '#A0A0A0',
        marginBottom: 40,
    },
    form: {
        gap: 16,
    },
    input: {
        backgroundColor: '#1E1A1B',
        borderRadius: 12,
        padding: 16,
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Poppins-Regular',
    },
    button: {
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 24,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: 'Poppins-SemiBold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 40,
    },
    footerText: {
        color: '#A0A0A0',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
    },
    linkText: {
        color: '#ED5639',
        fontSize: 14,
        fontFamily: 'Poppins-SemiBold',
    },
    socialContainer: {
        width: '100%',
        gap: 12,
        marginBottom: 17,
        marginTop: -15, // Bring closer to title headers
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
});

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
