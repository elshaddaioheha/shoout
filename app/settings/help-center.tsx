import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { useRouter } from 'expo-router';
import { CircleHelp, FileText, Mail, MessageCircleQuestion, ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function useHelpCenterStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function HelpCenterScreen() {
  const appTheme = useAppTheme();
  const styles = useHelpCenterStyles();

  const router = useRouter();

  const openEmail = async () => {
    const email = 'support@shoouts.com';
    const subject = encodeURIComponent('Shoouts Support Request');
    const body = encodeURIComponent('Hi Shoouts support team,\n\nI need help with:\n');
    const mailto = `mailto:${email}?subject=${subject}&body=${body}`;
    const canOpen = await Linking.canOpenURL(mailto);
    if (!canOpen) {
      Alert.alert('Email unavailable', 'Please email support@shoouts.com from your preferred mail app.');
      return;
    }
    await Linking.openURL(mailto);
  };

  return (
    <SafeScreenWrapper>
      <View style={styles.container}>
        <SettingsHeader title="Help Center" onBack={() => router.back()} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.heroIcon}><CircleHelp size={24} color={appTheme.colors.primary} /></View>
            <Text style={styles.heroTitle}>Need help?</Text>
            <Text style={styles.heroSub}>Find quick answers or contact support for account, billing, and creator tools.</Text>
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.item} activeOpacity={0.85} onPress={() => Alert.alert('Account & Login', 'Use Profile > Log Out to switch account. For sign-in issues, contact support@shoouts.com.') }>
              <MessageCircleQuestion size={18} color={appTheme.colors.primary} />
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemTitle}>Account & Login</Text>
                <Text style={styles.itemSub}>Sign-in help, account recovery, role access</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} activeOpacity={0.85} onPress={() => Alert.alert('Purchases & Billing', 'Purchase records are in your account purchases. Subscription issues can be resolved by support.') }>
              <FileText size={18} color={appTheme.colors.primary} />
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemTitle}>Purchases & Billing</Text>
                <Text style={styles.itemSub}>Subscriptions, receipts, failed checkout</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} activeOpacity={0.85} onPress={() => Alert.alert('Privacy & Security', 'Manage privacy in Settings > Privacy. Report suspicious activity immediately.') }>
              <ShieldCheck size={18} color={appTheme.colors.primary} />
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemTitle}>Privacy & Security</Text>
                <Text style={styles.itemSub}>Data controls, account safety, suspicious access</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.supportButton} onPress={openEmail}>
            <Mail size={18} color={appTheme.colors.textPrimary} />
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>Average response time: within 24 hours.</Text>
          <View style={{ height: 80 }} />
        </ScrollView>
      </View>
    </SafeScreenWrapper>
  );
}

const legacyStyles = {
  container: { flex: 1, backgroundColor: '#140F10' },
  content: { paddingHorizontal: 20, paddingTop: 10 },
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 18,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(236,92,57,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroTitle: { color: '#FFF', fontFamily: 'Poppins-Bold', fontSize: 18 },
  heroSub: { color: 'rgba(255,255,255,0.62)', fontFamily: 'Poppins-Regular', fontSize: 13, marginTop: 6 },
  section: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  itemTextWrap: { flex: 1 },
  itemTitle: { color: '#FFF', fontFamily: 'Poppins-SemiBold', fontSize: 14 },
  itemSub: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Poppins-Regular', fontSize: 12, marginTop: 1 },
  supportButton: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
  },
  supportButtonText: { color: '#FFF', fontFamily: 'Poppins-Bold', fontSize: 14 },
  footerText: {
    marginTop: 10,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
  },
};
