import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ChevronLeft } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { auth, db } from '@/firebaseConfig';
import { authNavigationHandled } from '../_layout';
import { useToastStore } from '@/store/useToastStore';
import { getFriendlyErrorMessage } from '@/utils/errorHandler';
import { sendEmailOtp, verifyEmailOtp } from '@/utils/emailOtp';
import { hydrateSubscriptionTier } from '@/utils/subscriptionVerification';

type SignupSubscriptionTier = 'vault' | 'vault_pro' | 'studio' | 'hybrid';

type PendingSignupPayload = {
  fullName: string;
  email: string;
  password: string;
  redirectTo?: string;
};

const PENDING_SIGNUP_KEY = 'pendingSignupPayload';

function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  const visible = Math.min(2, name.length);
  const masked = `${name.slice(0, visible)}${'*'.repeat(Math.max(0, name.length - visible))}`;
  return `${masked}@${domain}`;
}

async function writeSubscriptionDoc(uid: string, tier: SignupSubscriptionTier) {
  await setDoc(
    doc(db, 'users', uid, 'subscription', 'current'),
    {
      tier,
      status: 'trial',
      isSubscribed: false,
      billingCycle: null,
      expiresAt: null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export default function SignupOtpScreen() {
  const router = useRouter();
  const { showToast } = useToastStore();
  const [pending, setPending] = useState<PendingSignupPayload | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const targetEmail = useMemo(() => pending?.email?.trim() || '', [pending?.email]);

  useEffect(() => {
    const loadPending = async () => {
      const raw = await AsyncStorage.getItem(PENDING_SIGNUP_KEY);
      if (!raw) {
        showToast('Your signup session has expired. Please start again.', 'error');
        router.replace('/(auth)/signup');
        return;
      }

      try {
        const payload = JSON.parse(raw) as PendingSignupPayload;
        if (!payload.email || !payload.password || !payload.fullName) {
          throw new Error('Invalid signup payload');
        }
        setPending(payload);
      } catch {
        await AsyncStorage.removeItem(PENDING_SIGNUP_KEY);
        showToast('Your signup session is invalid. Please start again.', 'error');
        router.replace('/(auth)/signup');
      }
    };

    loadPending();
  }, [router, showToast]);

  const onVerifyAndCreate = async () => {
    if (!pending) return;
    if (code.trim().length !== 6) {
      showToast('Enter the 6-digit code sent to your email.', 'error');
      return;
    }

    setLoading(true);
    try {
      await verifyEmailOtp('signup', targetEmail, code.trim());
      const userCred = await createUserWithEmailAndPassword(auth, targetEmail, pending.password);

      await updateProfile(userCred.user, { displayName: pending.fullName });
      await setDoc(doc(db, 'users', userCred.user.uid), {
        fullName: pending.fullName,
        email: targetEmail,
        createdAt: new Date().toISOString(),
      });

      await writeSubscriptionDoc(userCred.user.uid, 'vault');
      await hydrateSubscriptionTier();
      await AsyncStorage.removeItem(PENDING_SIGNUP_KEY);

      authNavigationHandled.current = true;
      router.replace('/(auth)/role-selection');
    } catch (error: any) {
      authNavigationHandled.current = false;
      showToast(getFriendlyErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!targetEmail) return;
    setResending(true);
    try {
      await sendEmailOtp('signup', targetEmail);
      showToast('A new code has been sent.', 'success');
    } catch (error: any) {
      showToast(getFriendlyErrorMessage(error), 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeScreenWrapper style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={styles.flex}
      >
        <View style={styles.blurBg} pointerEvents="none">
          <BlurView intensity={44} tint="dark" style={StyleSheet.absoluteFill} />
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="#FFFFFF" size={24} />
        </TouchableOpacity>

        <View style={styles.headerWrap}>
          <Text style={styles.headerTitle}>Confirm Email Address</Text>
          <Text style={styles.headerSub}>The confirmation code was sent to {maskEmail(targetEmail)}</Text>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Enter code</Text>
          <TextInput
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            placeholderTextColor="#6B6B6B"
            style={styles.input}
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={6}
          />
        </View>

        <TouchableOpacity style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]} disabled={loading} onPress={onVerifyAndCreate}>
          <Text style={styles.primaryBtnText}>{loading ? 'Verifying...' : 'Continue'}</Text>
        </TouchableOpacity>

        <View style={styles.bottomRow}>
          <Text style={styles.mutedText}>Didn't get the code?</Text>
          <TouchableOpacity disabled={resending} onPress={onResend}>
            <Text style={styles.linkText}>{resending ? 'Sending...' : 'Send Again'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: '#140F10',
    paddingHorizontal: 20,
  },
  blurBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 15, 16, 0.62)',
  },
  backButton: {
    marginTop: 8,
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerWrap: {
    marginTop: 10,
    gap: 8,
    alignItems: 'center',
    width: '100%',
  },
  headerTitle: {
    color: '#D9D9D9',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.35,
    textAlign: 'center',
    fontFamily: 'Poppins-SemiBold',
  },
  headerSub: {
    color: '#6B6B6B',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.41,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    maxWidth: 300,
  },
  fieldWrap: {
    marginTop: 24,
    gap: 13,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.24,
    fontFamily: 'Poppins-SemiBold',
  },
  input: {
    width: '100%',
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#4B4B4B',
    color: '#FFFFFF',
    fontSize: 17,
    letterSpacing: 6,
    paddingHorizontal: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  primaryBtn: {
    marginTop: 44,
    width: '100%',
    height: 50,
    borderRadius: 10,
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: '#FBFBFB',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.41,
    fontFamily: 'Poppins-SemiBold',
  },
  bottomRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  mutedText: {
    color: '#4B4B4B',
    fontSize: 15,
    lineHeight: 25,
    letterSpacing: -0.5,
    fontFamily: 'Poppins-Regular',
  },
  linkText: {
    color: '#EC5C39',
    fontSize: 15,
    lineHeight: 25,
    letterSpacing: -0.5,
    textDecorationLine: 'underline',
    fontFamily: 'Poppins-Regular',
  },
});
