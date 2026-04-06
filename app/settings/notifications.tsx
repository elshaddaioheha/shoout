import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsDivider from '@/components/settings/SettingsDivider';
import SettingsHeader from '@/components/settings/SettingsHeader';
import SettingsSwitchRow from '@/components/settings/SettingsSwitchRow';
import { auth, db } from '@/firebaseConfig';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Bell } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';

function useSettingsNotificationsStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function NotificationsScreen() {
    const appTheme = useAppTheme();
    const styles = useSettingsNotificationsStyles();

    const router = useRouter();
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [pushNotifs, setPushNotifs] = useState(true);
    const [newReleases, setNewReleases] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);

    const handleTestNotification = async () => {
        if (!auth.currentUser) return;
        setSendingTest(true);
        try {
            const types = ['message', 'artist_update', 'marketplace', 'subscription', 'system'];
            const titles = ['New Chat Message', 'Wizkid dropped a new beat', 'Flash Sale on Market', 'Tier Upgraded', 'System Maintenance'];
            const randIdx = Math.floor(Math.random() * types.length);

            await addDoc(collection(db, 'notifications'), {
                userId: auth.currentUser.uid,
                type: types[randIdx],
                title: titles[randIdx],
                body: `This is a live test notification generated at ${new Date().toLocaleTimeString()}`,
                read: false,
                createdAt: serverTimestamp(),
            });
        } catch (e) {
            console.error('Test notif err', e);
        } finally {
            setSendingTest(false);
        }
    };

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <SettingsHeader title="Notifications" onBack={() => router.back()} />

                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Bell size={48} color={appTheme.colors.primary} />
                    </View>

                    <Text style={styles.sectionTitle}>General Notifications</Text>

                    <SettingsCard>
                        <SettingsSwitchRow
                            title="Push Notifications"
                            subtitle="Receive updates on your device"
                            value={pushNotifs}
                            onValueChange={setPushNotifs}
                        />
                        <SettingsDivider />
                        <SettingsSwitchRow
                            title="Email Alerts"
                            subtitle="News, updates, and offers"
                            value={emailAlerts}
                            onValueChange={setEmailAlerts}
                        />
                        <SettingsDivider />
                        <SettingsSwitchRow
                            title="New Releases"
                            subtitle="When artists you follow upload"
                            value={newReleases}
                            onValueChange={setNewReleases}
                        />
                    </SettingsCard>
                </View>

                {/* Developer/Test Action for Live Data validation */}
                <TouchableOpacity
                    style={styles.testBtn}
                    onPress={handleTestNotification}
                    disabled={sendingTest}
                >
                    {sendingTest ? <ActivityIndicator color={appTheme.colors.textPrimary} /> : <Text style={styles.testBtnText}>Send Test Live Notification</Text>}
                </TouchableOpacity>
            </View>
        </SafeScreenWrapper>
    );
}

const legacyStyles = {
    container: { flex: 1, backgroundColor: '#140F10' },
    content: { padding: 20 },
    iconContainer: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
    sectionTitle: { fontSize: 14, fontFamily: 'Poppins-Bold', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 16, marginLeft: 8 },
    testBtn: {
        marginTop: 40,
        backgroundColor: '#EC5C39',
        borderRadius: 25,
        paddingVertical: 15,
        alignItems: 'center',
    },
    testBtnText: {
        color: '#FFF',
        fontFamily: 'Poppins-Bold',
        fontSize: 14,
    }
};
