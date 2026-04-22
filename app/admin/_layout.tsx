import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useAppTheme } from '@/hooks/use-app-theme';
import { verifyRoleViaCustomClaims } from '@/utils/subscriptionVerification';
import { Slot, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

const ALLOWED_ROLES = ['admin', 'moderator', 'auditor'];

export default function AdminLayout() {
  const appTheme = useAppTheme();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    (async () => {
      const role = await verifyRoleViaCustomClaims();
      const hasAccess = !!role && ALLOWED_ROLES.includes(role);
      setIsAuthorized(hasAccess);
      setIsLoading(false);

      if (!hasAccess) {
        // Redirect unauthorized users back to the main app
        router.replace('/(tabs)');
      }
    })();
  }, [router]);

  if (isLoading) {
    return (
      <SafeScreenWrapper>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={appTheme.colors.primary} />
          <Text style={{ marginTop: 16, color: appTheme.colors.textSecondary }}>Verifying access...</Text>
        </View>
      </SafeScreenWrapper>
    );
  }

  if (!isAuthorized) {
    return (
      <SafeScreenWrapper>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Access denied</Text>
          <Text style={{ textAlign: 'center', marginBottom: 20, color: appTheme.colors.textSecondary }}>
            This section of the app is restricted to administrators and moderators.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: appTheme.colors.primary, borderRadius: 10 }}
          >
            <Text style={{ color: appTheme.colors.textPrimary, fontWeight: '600' }}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeScreenWrapper>
    );
  }

  return <Slot />;
}
