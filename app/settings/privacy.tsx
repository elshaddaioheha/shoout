import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsDivider from '@/components/settings/SettingsDivider';
import SettingsHeader from '@/components/settings/SettingsHeader';
import SettingsSwitchRow from '@/components/settings/SettingsSwitchRow';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useRouter } from 'expo-router';
import { ChevronRight, Lock, ShieldCheck, UserX } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';

function usePrivacyStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function PrivacyScreen() {
    const appTheme = useAppTheme();
    const styles = usePrivacyStyles();

    const router = useRouter();
    const [publicProfile, setPublicProfile] = useState(true);
    const [shareData, setShareData] = useState(false);

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <SettingsHeader title="Privacy & Security" onBack={() => router.back()} />

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.iconContainer}>
                        <ShieldCheck size={48} color={appTheme.colors.textTertiary} />
                    </View>

                    <Text style={styles.sectionTitle}>Privacy Settings</Text>

                    <SettingsCard>
                        <SettingsSwitchRow
                            title="Public Profile"
                            subtitle="Allow others to see your profile and listening activity"
                            value={publicProfile}
                            onValueChange={setPublicProfile}
                        />
                        <SettingsDivider />
                        <SettingsSwitchRow
                            title="Share Data & Analytics"
                            subtitle="Help us improve by sharing usage data"
                            value={shareData}
                            onValueChange={setShareData}
                        />
                    </SettingsCard>

                    <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Security</Text>

                    <SettingsCard>
                        <TouchableOpacity style={styles.actionRow}>
                            <View style={styles.actionIconCell}>
                                <Lock size={20} color={appTheme.colors.textPrimary} />
                            </View>
                            <Text style={styles.actionTitle}>Change Password</Text>
                            <ChevronRight size={20} color={appTheme.colors.textDisabled} />
                        </TouchableOpacity>

                        <SettingsDivider />

                        <TouchableOpacity style={styles.actionRow}>
                            <View style={[styles.actionIconCell, { backgroundColor: appTheme.isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(211, 58, 42, 0.12)' }]}>
                                <UserX size={20} color={appTheme.colors.error} />
                            </View>
                            <Text style={[styles.actionTitle, { color: appTheme.colors.error }]}>Delete Account</Text>
                            <ChevronRight size={20} color={appTheme.colors.textDisabled} />
                        </TouchableOpacity>
                    </SettingsCard>
                </ScrollView>
            </View>
        </SafeScreenWrapper>
    );
}

const legacyStyles = {
    container: { flex: 1, backgroundColor: '#140F10' },
    content: { padding: 20, paddingBottom: 60 },
    iconContainer: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
    sectionTitle: { fontSize: 14, fontFamily: 'Poppins-Bold', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 16, marginLeft: 8 },
    actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    actionIconCell: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    actionTitle: { flex: 1, fontSize: 16, fontFamily: 'Poppins-Medium', color: '#FFF', marginLeft: 16 },
};
