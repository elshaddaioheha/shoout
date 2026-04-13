import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { getFriendlyErrorMessage } from '@/utils/errorHandler';
import { maskEmail } from '@/utils/maskEmail';
import { sendEmailOtp, verifyEmailOtp } from '@/utils/emailOtp';

const PASSWORD_RESET_TOKEN_KEY = 'passwordResetOtpToken';

function useForgotPasswordCodeStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function ForgotPasswordCodeScreen() {
  const appTheme = useAppTheme();
  const styles = useForgotPasswordCodeStyles();
  const placeholderColor = appTheme.colors.textPlaceholder;
  const isLightMode = !appTheme.isDark;
  const lightBackground = '#FFF4EE';
  const lightSurface = '#FFF9F6';
  const lightText = '#2F2624';
  const lightMutedText = '#6F5A53';
  const lightBorder = '#D8B9AD';

  const router = useRouter();
  const { showToast } = useToastStore();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const targetEmail = useMemo(() => String(email || '').trim(), [email]);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const onVerify = async () => {
    if (!targetEmail) {
      showToast('Missing email address.', 'error');
      router.replace('/(auth)/forgot-password');
      return;
    }

    if (code.trim().length !== 6) {
      showToast('Enter the 6-digit code sent to your email.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyEmailOtp('password_reset', targetEmail, code.trim());
      await AsyncStorage.setItem(
        PASSWORD_RESET_TOKEN_KEY,
        JSON.stringify({ email: targetEmail, verificationToken: res.verificationToken, createdAt: Date.now() })
      );
      router.replace('/(auth)/reset-password');
    } catch (error: any) {
      showToast(getFriendlyErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    if (!targetEmail) return;
    setResending(true);
    try {
      await sendEmailOtp('password_reset', targetEmail);
      showToast('A new code has been sent.', 'success');
    } catch (error: any) {
      showToast(getFriendlyErrorMessage(error), 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeScreenWrapper style={[styles.container, isLightMode && { backgroundColor: lightBackground }]}>
      <StatusBar barStyle={appTheme.isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        style={styles.flex}
      >
        <View style={[styles.blurBg, isLightMode && { backgroundColor: 'rgba(255, 236, 224, 0.45)' }]} pointerEvents="none">
          <BlurView intensity={44} tint={appTheme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={appTheme.colors.textPrimary} size={24} />
        </TouchableOpacity>

        <View style={styles.headerWrap}>
          <Text style={[styles.headerTitle, isLightMode && { color: lightText }]}>Confirm Email Address</Text>
          <Text style={[styles.headerSub, isLightMode && { color: lightMutedText }]}>The confirmation code was sent to {maskEmail(targetEmail)}</Text>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, isLightMode && { color: lightText }]}>Enter code</Text>
          <TextInput
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            placeholderTextColor={placeholderColor}
            style={[styles.input, isLightMode && { color: lightText, borderColor: lightBorder, backgroundColor: lightSurface }]}
            keyboardType="number-pad"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={6}
          />
        </View>

        <TouchableOpacity style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]} disabled={loading} onPress={onVerify}>
          <Text style={styles.primaryBtnText}>{loading ? 'Verifying...' : 'Continue'}</Text>
        </TouchableOpacity>

        <View style={styles.bottomRow}>
          <Text style={[styles.mutedText, isLightMode && { color: lightMutedText }]}>Didn't get the code?</Text>
          <TouchableOpacity disabled={resending} onPress={onResend}>
            <Text style={styles.linkText}>{resending ? 'Sending...' : 'Send Again'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeScreenWrapper>
  );
}

const legacyStyles = {
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
    marginTop: 8,
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
    color: '#4B4B4B',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.41,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
    maxWidth: 280,
  },
  fieldWrap: {
    marginTop: 28,
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
    marginTop: 50,
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
    marginTop: 24,
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
};
