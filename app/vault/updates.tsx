import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { Icon } from '@/components/ui/Icon';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useVaultWorkspaceData } from '@/hooks/useVaultWorkspaceData';
import { ROUTES, resolveModeHomePath } from '@/utils/routes';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function formatRelative(createdAtMs: number) {
  if (!createdAtMs) return 'Just now';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - createdAtMs) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function toMs(value: any) {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function VaultUpdatesScreen() {
  const router = useRouter();
  const appTheme = useAppTheme();
  const { uploads, recentActivities, loading } = useVaultWorkspaceData();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: appTheme.colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 40,
      gap: 16,
    },
    sectionTitle: {
      color: appTheme.colors.textPrimary,
      fontFamily: 'Poppins-SemiBold',
      fontSize: 18,
    },
    helper: {
      color: appTheme.colors.textSecondary,
      fontFamily: 'Poppins-Regular',
      fontSize: 13,
      lineHeight: 18,
    },
    card: {
      borderRadius: 18,
      padding: 16,
      backgroundColor: appTheme.colors.surface,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
      gap: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: appTheme.colors.surfaceMuted,
    },
    rowInfo: {
      flex: 1,
    },
    rowTitle: {
      color: appTheme.colors.textPrimary,
      fontFamily: 'Poppins-Medium',
      fontSize: 14,
    },
    rowSubtitle: {
      color: appTheme.colors.textSecondary,
      fontFamily: 'Poppins-Regular',
      fontSize: 12,
      marginTop: 2,
    },
    rowMeta: {
      color: appTheme.colors.textTertiary,
      fontFamily: 'Poppins-Regular',
      fontSize: 11,
    },
    emptyCard: {
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      gap: 10,
      backgroundColor: appTheme.colors.surface,
      borderWidth: 1,
      borderColor: appTheme.colors.border,
    },
    emptyTitle: {
      color: appTheme.colors.textPrimary,
      fontFamily: 'Poppins-SemiBold',
      fontSize: 16,
    },
    emptySubtitle: {
      color: appTheme.colors.textSecondary,
      fontFamily: 'Poppins-Regular',
      fontSize: 13,
      textAlign: 'center',
    },
    action: {
      marginTop: 4,
      minHeight: 42,
      paddingHorizontal: 18,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: appTheme.colors.primary,
    },
    actionText: {
      color: '#FFFFFF',
      fontFamily: 'Poppins-SemiBold',
      fontSize: 13,
    },
  }), [appTheme]);

  return (
    <SafeScreenWrapper>
      <View style={styles.container}>
        <SettingsHeader
          title="Vault Updates"
          onBack={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }
            router.replace(resolveModeHomePath('vault') as any);
          }}
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.helper}>Review your recent private uploads and Vault activity from one place.</Text>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {recentActivities.length === 0 && !loading ? (
              <Text style={styles.helper}>No recent Vault activity yet.</Text>
            ) : null}
            {recentActivities.map((item) => (
              <View key={item.id} style={styles.row}>
                <View style={styles.iconWrap}>
                  <Icon name={item.type === 'folder' ? 'folder-plus' : item.type === 'share' ? 'link-2' : 'music'} size={16} color={appTheme.colors.textPrimary} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                </View>
                <Text style={styles.rowMeta}>{formatRelative(item.createdAtMs)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>All Uploads</Text>
            {uploads.map((upload) => (
              <TouchableOpacity key={upload.id} style={styles.row} onPress={() => router.push(ROUTES.vault.track(upload.id) as any)} activeOpacity={0.82}>
                <View style={styles.iconWrap}>
                  <Icon name="music" size={16} color={appTheme.colors.textPrimary} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{upload.title || 'Untitled Track'}</Text>
                  <Text style={styles.rowSubtitle}>{upload.artist || upload.uploaderName || 'Private vault track'}</Text>
                </View>
                <Text style={styles.rowMeta}>{formatRelative(Math.max(toMs(upload.updatedAt), toMs(upload.createdAt)))}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!loading && uploads.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="archive" size={42} color={appTheme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>No Vault uploads yet</Text>
              <Text style={styles.emptySubtitle}>Your private uploads will appear here as soon as you add them.</Text>
              <TouchableOpacity style={styles.action} onPress={() => router.push(ROUTES.vault.upload as any)} activeOpacity={0.88}>
                <Text style={styles.actionText}>Upload Track</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </SafeScreenWrapper>
  );
}
