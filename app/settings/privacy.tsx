import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Lock, ShieldCheck, UserX } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function PrivacyScreen() {
    const router = useRouter();
    const [publicProfile, setPublicProfile] = useState(true);
    const [shareData, setShareData] = useState(false);

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Privacy & Security</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.iconContainer}>
                        <ShieldCheck size={48} color="#64748B" />
                    </View>

                    <Text style={styles.sectionTitle}>Privacy Settings</Text>

                    <View style={styles.card}>
                        <View style={styles.row}>
                            <View style={styles.textContainer}>
                                <Text style={styles.settingTitle}>Public Profile</Text>
                                <Text style={styles.settingSub}>Allow others to see your profile and listening activity</Text>
                            </View>
                            <Switch
                                value={publicProfile}
                                onValueChange={setPublicProfile}
                                trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#EC5C39' }}
                                thumbColor="#FFF"
                            />
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.row}>
                            <View style={styles.textContainer}>
                                <Text style={styles.settingTitle}>Share Data & Analytics</Text>
                                <Text style={styles.settingSub}>Help us improve by sharing usage data</Text>
                            </View>
                            <Switch
                                value={shareData}
                                onValueChange={setShareData}
                                trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#EC5C39' }}
                                thumbColor="#FFF"
                            />
                        </View>
                    </View>

                    <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Security</Text>

                    <View style={styles.card}>
                        <TouchableOpacity style={styles.actionRow}>
                            <View style={styles.actionIconCell}>
                                <Lock size={20} color="#FFF" />
                            </View>
                            <Text style={styles.actionTitle}>Change Password</Text>
                            <ChevronRight size={20} color="rgba(255,255,255,0.3)" />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.actionRow}>
                            <View style={[styles.actionIconCell, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                <UserX size={20} color="#EF4444" />
                            </View>
                            <Text style={[styles.actionTitle, { color: '#EF4444' }]}>Delete Account</Text>
                            <ChevronRight size={20} color="rgba(255,255,255,0.3)" />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
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
    content: { padding: 20, paddingBottom: 60 },
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
    actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    actionIconCell: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    actionTitle: { flex: 1, fontSize: 16, fontFamily: 'Poppins-Medium', color: '#FFF', marginLeft: 16 },
});
