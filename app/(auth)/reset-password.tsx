import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { getFriendlyErrorMessage } from '@/utils/errorHandler';
import { completePasswordResetWithOtp } from '@/utils/emailOtp';

const PASSWORD_RESET_TOKEN_KEY = 'passwordResetOtpToken';

function useResetPasswordStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function ResetPasswordScreen() {
  const appTheme = useAppTheme();
  const styles = useResetPasswordStyles();
  const placeholderColor = appTheme.colors.textPlaceholder;
  const isLightMode = !appTheme.isDark;
  const lightBackground = '#FFF4EE';
  const lightSurface = '#FFF9F6';
  const lightText = '#2F2624';
  const lightBorder = '#D8B9AD';

  const router = useRouter();
  const { showToast } = useToastStore();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!password || !confirmPassword) {
      showToast('Please fill in all fields.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast("Passwords don't match.", 'error');
      return;
    }

    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem(PASSWORD_RESET_TOKEN_KEY);
      if (!raw) {
        showToast('Password reset session expired. Start again.', 'error');
        router.replace('/(auth)/forgot-password');
        return;
      }

      const parsed = JSON.parse(raw) as { email: string; verificationToken: string; createdAt: number };
      
      // Validate token hasn't expired (verify in backend, but check here as defense in depth)
      const OTP_TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes - must match backend
      const now = Date.now();
      if (now - parsed.createdAt > OTP_TOKEN_EXPIRY_MS) {
        showToast('Password reset session expired. Start again.', 'error');
        await AsyncStorage.removeItem(PASSWORD_RESET_TOKEN_KEY);
        router.replace('/(auth)/forgot-password');
        return;
      }

      await completePasswordResetWithOtp(parsed.email, parsed.verificationToken, password);
      await AsyncStorage.removeItem(PASSWORD_RESET_TOKEN_KEY);
      showToast('Password reset successful. You can now log in.', 'success');
      router.replace('/(auth)/login');
    } catch (error: any) {
      showToast(getFriendlyErrorMessage(error), 'error');
    } finally {
      setLoading(false);
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
          <Text style={[styles.headerTitle, isLightMode && { color: lightText }]}>Enter New Password</Text>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, isLightMode && { color: lightText }]}>New Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={placeholderColor}
              style={[styles.input, isLightMode && { color: lightText, borderColor: lightBorder, backgroundColor: lightSurface }]}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((prev) => !prev)}>
              {showPassword ? <Eye color={appTheme.colors.textPrimary} size={20} /> : <EyeOff color={appTheme.colors.textPrimary} size={20} />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.fieldWrapSecondary}>
          <Text style={[styles.label, isLightMode && { color: lightText }]}>Confirm Password</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter password"
              placeholderTextColor={placeholderColor}
              style={[styles.input, isLightMode && { color: lightText, borderColor: lightBorder, backgroundColor: lightSurface }]}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword((prev) => !prev)}>
              {showConfirmPassword ? <Eye color={appTheme.colors.textPrimary} size={20} /> : <EyeOff color={appTheme.colors.textPrimary} size={20} />}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]} disabled={loading} onPress={onSubmit}>
          <Text style={styles.primaryBtnText}>{loading ? 'Updating...' : 'Continue'}</Text>
        </TouchableOpacity>
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
  fieldWrap: {
    marginTop: 28,
    gap: 13,
  },
  fieldWrapSecondary: {
    marginTop: 16,
    gap: 13,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.24,
    fontFamily: 'Poppins-SemiBold',
  },
  inputRow: {
    position: 'relative',
    width: '100%',
  },
  input: {
    width: '100%',
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#4B4B4B',
    color: '#FFFFFF',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingRight: 46,
    fontFamily: 'Poppins-Regular',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 9,
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
};
