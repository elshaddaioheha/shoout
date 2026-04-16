import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useVaultWorkspaceData } from '@/hooks/useVaultWorkspaceData';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { useRouter } from 'expo-router';
import { FolderPlus, Link2, Music4, RefreshCw } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function iconForType(type: 'upload' | 'folder' | 'share' | 'update') {
  if (type === 'folder') return FolderPlus;
  if (type === 'share') return Link2;
  if (type === 'update') return RefreshCw;
  return Music4;
}

function formatRelative(createdAtMs: number) {
  if (!createdAtMs) return 'Just now';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - createdAtMs) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function useVaultUpdatesStyles() {
  const appTheme = useAppTheme();
  return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function VaultUpdatesScreen() {
  const appTheme = useAppTheme();
  const styles = useVaultUpdatesStyles();

  const router = useRouter();
  const { recentActivities } = useVaultWorkspaceData();

  return (
    <SafeScreenWrapper>
      <View style={styles.screen}>
        <SettingsHeader title="Vault Updates" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Everything happening in your Vault</Text>
            <Text style={styles.heroSubtitle}>Track uploads, folder creation, sharing activity, and recent edits in one lightweight feed.</Text>
          </View>

          <View style={styles.listCard}>
            {recentActivities.length === 0 ? (
              <Text style={styles.placeholderText}>Vault updates will appear here after you upload, organize, or share your tracks.</Text>
            ) : null}

            {recentActivities.map((item) => {
              const Icon = iconForType(item.type);
              return (
                <TouchableOpacity key={item.id} style={styles.row} activeOpacity={0.85}>
                  <View style={styles.rowIcon}>
                    <Icon size={18} color={appTheme.colors.primary} />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowTitle}>{item.title}</Text>
                    <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Text style={styles.rowMeta}>{formatRelative(item.createdAtMs)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeScreenWrapper>
  );
}

const legacyStyles = {
  screen: { flex: 1, backgroundColor: '#140F10' },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40, gap: 18 },
  heroCard: {
    backgroundColor: '#1A1A1B',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Bold',
    fontSize: 21,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  listCard: {
    backgroundColor: '#1A1A1B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(236,92,57,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: {
    flex: 1,
  },
  rowTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
  },
  rowSubtitle: {
    color: 'rgba(255,255,255,0.68)',
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    marginTop: 2,
  },
  rowMeta: {
    color: 'rgba(255,255,255,0.62)',
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
  },
};
