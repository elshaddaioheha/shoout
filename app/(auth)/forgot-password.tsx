import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useToastStore } from '@/store/useToastStore';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { getFriendlyErrorMessage } from '@/utils/errorHandler';
import { sendEmailOtp } from '@/utils/emailOtp';

function useForgotPasswordStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function ForgotPasswordScreen() {
  const appTheme = useAppTheme();
  const styles = useForgotPasswordStyles();
  const placeholderColor = appTheme.colors.textPlaceholder;
  const isLightMode = !appTheme.isDark;
  const lightBackground = '#FFF4EE';
  const lightSurface = '#FFF9F6';
  const lightText = '#2F2624';
  const lightMutedText = '#6F5A53';
  const lightBorder = '#D8B9AD';

  const router = useRouter();
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const { showToast } = useToastStore();
  const [email, setEmail] = useState(String(emailParam || ''));
  const [loading, setLoading] = useState(false);
  const emailFocused = useSharedValue(0);

  const emailInputAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: emailFocused.value ? '#007AFF' : (isLightMode ? lightBorder : '#464646'),
  }));

  const trimmedEmail = useMemo(() => email.trim(), [email]);

  const handleContinue = async () => {
    if (!trimmedEmail) {
      showToast('Please enter your email address.', 'error');
      return;
    }

    setLoading(true);
    try {
      await sendEmailOtp('password_reset', trimmedEmail);
      showToast('Verification code sent to your email.', 'success');
      router.push({ pathname: '/(auth)/forgot-password-code', params: { email: trimmedEmail } });
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={appTheme.colors.textPrimary} size={24} />
        </TouchableOpacity>

        <View style={styles.headerWrap}>
          <Text style={[styles.headerTitle, isLightMode && { color: lightText }]}>Forget Password</Text>
          <Text style={[styles.headerSub, isLightMode && { color: lightMutedText }]}>Enter your email tied to this account</Text>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, isLightMode && { color: lightText }]}>Email Address</Text>
          <Animated.View style={[styles.input, isLightMode && { borderColor: lightBorder, backgroundColor: lightSurface }, emailInputAnimatedStyle]}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={placeholderColor}
              style={[styles.inputText, isLightMode && { color: lightText }]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onFocus={() => {
                emailFocused.value = withTiming(1, { duration: 180 });
              }}
              onBlur={() => {
                emailFocused.value = withTiming(0, { duration: 180 });
              }}
              onSubmitEditing={handleContinue}
            />
          </Animated.View>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
          disabled={loading}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>{loading ? 'Sending...' : 'Continue'}</Text>
        </TouchableOpacity>

        <View style={styles.bottomRow}>
          <Text style={[styles.mutedText, isLightMode && { color: lightMutedText }]}>Back to</Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.linkText}>Login</Text>
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
  backButton: {
    marginTop: 8,
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerWrap: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  headerTitle: {
    color: '#D9D9D9',
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.35,
    fontFamily: 'Poppins-SemiBold',
  },
  headerSub: {
    color: '#4B4B4B',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.41,
    fontFamily: 'Poppins-Regular',
  },
  fieldWrap: {
    marginTop: 28,
    gap: 16,
  },
  label: {
    color: '#FCFCFC',
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
    borderColor: '#464646',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  inputText: {
    color: '#FFFFFF',
    height: '100%',
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    paddingVertical: 0,
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
