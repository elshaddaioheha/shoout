import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { verifyRoleViaCustomClaims } from '@/utils/subscriptionVerification';
import { theme } from '@/constants/theme';

const ALLOWED_ROLES = ['admin', 'moderator', 'auditor'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 16, color: theme.colors.textSecondary }}>Verifying access...</Text>
        </View>
      </SafeScreenWrapper>
    );
  }

  if (!isAuthorized) {
    return (
      <SafeScreenWrapper>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Access denied</Text>
          <Text style={{ textAlign: 'center', marginBottom: 20, color: theme.colors.textSecondary }}>
            This section of the app is restricted to administrators and moderators.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={{ paddingVertical: 12, paddingHorizontal: 24, backgroundColor: theme.colors.primary, borderRadius: 10 }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeScreenWrapper>
    );
  }

  return <>{children}</>;
}
