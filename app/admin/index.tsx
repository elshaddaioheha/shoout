import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { theme } from '@/constants/theme';

export default function AdminHome() {
  const router = useRouter();

  return (
    <SafeScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>
          Use the links below to review reports, audit payouts, and monitor system health.
        </Text>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/admin/moderation')}>
          <Text style={styles.cardTitle}>Moderation Queue</Text>
          <Text style={styles.cardSubtitle}>Review reported content and take action</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/admin/creators')}>
          <Text style={styles.cardTitle}>Creator Management</Text>
          <Text style={styles.cardSubtitle}>Search creators and manage suspensions/payouts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/admin/payouts')}>
          <Text style={styles.cardTitle}>Payout Ledger</Text>
          <Text style={styles.cardSubtitle}>Audit payouts and reconcile transfers</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card} onPress={() => router.push('/admin/metrics')}>
          <Text style={styles.cardTitle}>System Health</Text>
          <Text style={styles.cardSubtitle}>View key compliance metrics and alerts</Text>
        </TouchableOpacity>
      </View>
    </SafeScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: theme.colors.textSecondary,
  },
});
