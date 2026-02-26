import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SharedHeader from '@/components/SharedHeader';
import Sidebar from '@/components/Sidebar';
import { useUserStore } from '@/store/useUserStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight, CreditCard, Crown, DollarSign, LogOut, Shield, Sparkles, TrendingUp } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function MoreScreen() {
    const router = useRouter();
    const { role, viewMode, reset } = useUserStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const isStudioOrHybrid = role === 'studio' || role === 'hybrid';

    const handleLogout = () => {
        reset();
        router.replace('/(auth)/login');
    };

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <SharedHeader onMenuPress={() => setIsSidebarOpen(true)} title="More" />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    {/* Role Specific Section */}
                    {isStudioOrHybrid && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Business</Text>
                            <View style={styles.menuContainer}>
                                <MenuItem icon={DollarSign} label="Earnings" color="#10B981" />
                                <MenuItem icon={TrendingUp} label="Analytics" color="#3B82F6" />
                            </View>
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Account</Text>
                        <View style={styles.menuContainer}>
                            <MenuItem icon={Crown} label="Subscription" value={role.toUpperCase()} color="#FFD700" />
                            <MenuItem icon={CreditCard} label="Payment Methods" color="#EC5C39" />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Settings</Text>
                        <View style={styles.menuContainer}>
                            <MenuItem icon={Bell} label="Notifications" color="#EC5C39" />
                            <MenuItem icon={Shield} label="Privacy & Security" color="#64748B" />
                        </View>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.menuContainer}>
                            <MenuItem icon={LogOut} label="Log Out" color="#EF4444" onPress={handleLogout} hideChevron />
                        </View>
                    </View>

                    {role === 'vault' && (
                        <TouchableOpacity style={styles.upgradeCard}>
                            <LinearGradient
                                colors={['#EC5C39', '#863420']}
                                style={styles.upgradeGradient}
                            >
                                <Sparkles size={24} color="#FFF" />
                                <View style={styles.upgradeTextContainer}>
                                    <Text style={styles.upgradeTitle}>Upgrade to Hybrid</Text>
                                    <Text style={styles.upgradeSubtitle}>Unlimited uploads & marketplace access</Text>
                                </View>
                                <ChevronRight size={20} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    <View style={{ height: 100 }} />
                </ScrollView>

                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            </View>
        </SafeScreenWrapper>
    );
}

function MenuItem({ icon: Icon, label, value, color, onPress, hideChevron }: any) {
    return (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={[styles.menuIconContainer, { backgroundColor: `${color}15` }]}>
                <Icon size={20} color={color} />
            </View>
            <View style={styles.menuTextContainer}>
                <Text style={styles.menuLabel}>{label}</Text>
                {value && <Text style={styles.menuValue}>{value}</Text>}
            </View>
            {!hideChevron && <ChevronRight size={18} color="rgba(255,255,255,0.3)" />}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#140F10' },
    content: { padding: 24, paddingTop: 12 },
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 13, fontFamily: 'Poppins-Bold', color: 'rgba(255,255,255,0.3)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
    menuContainer: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    menuIconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    menuTextContainer: { flex: 1, marginLeft: 16 },
    menuLabel: { fontSize: 15, fontFamily: 'Poppins-Medium', color: '#FFF' },
    menuValue: { fontSize: 12, fontFamily: 'Poppins-Regular', color: 'rgba(255,255,255,0.4)', marginTop: 1 },
    upgradeCard: { borderRadius: 24, overflow: 'hidden', marginTop: 8 },
    upgradeGradient: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 16 },
    upgradeTextContainer: { flex: 1 },
    upgradeTitle: { color: '#FFF', fontSize: 18, fontFamily: 'Poppins-Bold' },
    upgradeSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'Poppins-Regular' },
});
