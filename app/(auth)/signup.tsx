import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

export default function SignupScreen() {
    const router = useRouter();
    const [fullName, setFullName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [loading, setLoading] = React.useState(false);

    const handleSignup = async () => {
        if (!email || !password || !fullName) return;
        if (password !== confirmPassword) {
            alert("Passwords don't match");
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
                    role: 'vault', // Default initial role
                    createdAt: new Date().toISOString()
                });

                // Route to real role selection 
                router.replace('/(auth)/role-selection');
            }
        } catch (error: any) {
            console.error('Signup error:', error.message);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Join ShooutS</Text>
                <Text style={styles.subtitle}>Create an account to start sharing your sound</Text>

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
});
