import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useRouter } from 'expo-router';
import { Bell, ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function NotificationsScreen() {
    const router = useRouter();
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [pushNotifs, setPushNotifs] = useState(true);
    const [newReleases, setNewReleases] = useState(false);

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Notifications</Text>
                    <View style={{ width: 40 }} />
                </View>

                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Bell size={48} color="#EC5C39" />
                    </View>

                    <Text style={styles.sectionTitle}>General Notifications</Text>

                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View style={styles.textContainer}>
                                <Text style={styles.settingTitle}>Push Notifications</Text>
                                <Text style={styles.settingSub}>Receive updates on your device</Text>
                            </View>
                            <Switch
                                value={pushNotifs}
                                onValueChange={setPushNotifs}
                                trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#EC5C39' }}
                                thumbColor="#FFF"
                            />
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.row}>
                            <View style={styles.textContainer}>
                                <Text style={styles.settingTitle}>Email Alerts</Text>
                                <Text style={styles.settingSub}>News, updates, and offers</Text>
                            </View>
                            <Switch
                                value={emailAlerts}
                                onValueChange={setEmailAlerts}
                                trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#EC5C39' }}
                                thumbColor="#FFF"
                            />
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.row}>
                            <View style={styles.textContainer}>
                                <Text style={styles.settingTitle}>New Releases</Text>
                                <Text style={styles.settingSub}>When artists you follow upload</Text>
                            </View>
                            <Switch
                                value={newReleases}
                                onValueChange={setNewReleases}
                                trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#EC5C39' }}
                                thumbColor="#FFF"
                            />
                        </View>
                    </View>
                </View>
            </View>
        </SafeScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#140F10' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontFamily: 'Poppins-Bold', color: '#FFF' },
    content: { padding: 20 },
    iconContainer: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
    sectionTitle: { fontSize: 14, fontFamily: 'Poppins-Bold', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 16, marginLeft: 8 },
    card: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    textContainer: { flex: 1, paddingRight: 16 },
    settingTitle: { fontSize: 16, fontFamily: 'Poppins-Medium', color: '#FFF' },
    settingSub: { fontSize: 13, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.5)', marginTop: 2 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
});
