import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Image,
    Dimensions,
    Switch
} from 'react-native';
import {
    Camera,
    Image as ImageIcon,
    Globe,
    Twitter,
    Instagram,
    Youtube,
    Music2,
    Settings as SettingsIcon,
    ChevronRight,
    Save,
    ExternalLink,
    Lock,
    Bell,
    Shield
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import SettingsHeader from '@/components/settings/SettingsHeader';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function ArtistSettingsScreen() {
    const router = useRouter();
    const [name, setName] = useState('Breezy Afro');
    const [bio, setBio] = useState('Creating the future of Afro music. Producing hits since 2018.');
    const [website, setWebsite] = useState('www.breezyafro.com');
    const [isPrivate, setIsPrivate] = useState(false);
    const [notifications, setNotifications] = useState(true);

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <SettingsHeader
                    title="Studio Settings"
                    onBack={() => router.back()}
                    rightElement={(
                        <TouchableOpacity style={styles.saveButton}>
                            <Save size={20} color="#EC5C39" />
                        </TouchableOpacity>
                    )}
                />

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Banner and Profile Section */}
                    <View style={styles.imagesSection}>
                        <TouchableOpacity style={styles.bannerContainer}>
                            <View style={styles.bannerPlaceholder}>
                                <ImageIcon size={32} color="rgba(255,255,255,0.2)" />
                                <View style={styles.camIcon}>
                                    <Camera size={16} color="#FFF" />
                                </View>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.profilePicContainer}>
                            <View style={styles.profilePicPlaceholder}>
                                <Music2 size={32} color="#EC5C39" />
                                <View style={styles.camIconSmall}>
                                    <Camera size={14} color="#FFF" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Basic Info Form */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Profile Info</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Display Name</Text>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Enter your artist name"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Bio</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={bio}
                                onChangeText={setBio}
                                multiline
                                numberOfLines={3}
                                placeholder="Tell your fans about yourself"
                                placeholderTextColor="rgba(255,255,255,0.3)"
                            />
                        </View>
                    </View>

                    {/* Social Links */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Social Links</Text>

                        <SocialInput icon={<Globe size={18} color="#FFF" />} value={website} onChangeText={setWebsite} label="Website" />
                        <SocialInput icon={<Instagram size={18} color="#E4405F" />} value="@breezy_afro" label="Instagram" />
                        <SocialInput icon={<Twitter size={18} color="#1DA1F2" />} value="@breezy_afro" label="Twitter" />
                        <SocialInput icon={<Youtube size={18} color="#FF0000" />} value="Breezy Afro Official" label="YouTube" />
                    </View>

                    {/* Preferences */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Preferences</Text>

                        <View style={styles.preferenceRow}>
                            <View style={styles.preferenceInfo}>
                                <Lock size={20} color="rgba(255,255,255,0.6)" />
                                <Text style={styles.preferenceLabel}>Private Profile</Text>
                            </View>
                            <Switch
                                value={isPrivate}
                                onValueChange={setIsPrivate}
                                trackColor={{ false: '#333', true: '#EC5C39' }}
                            />
                        </View>

                        <View style={styles.preferenceRow}>
                            <View style={styles.preferenceInfo}>
                                <Bell size={20} color="rgba(255,255,255,0.6)" />
                                <Text style={styles.preferenceLabel}>Studio Notifications</Text>
                            </View>
                            <Switch
                                value={notifications}
                                onValueChange={setNotifications}
                                trackColor={{ false: '#333', true: '#EC5C39' }}
                            />
                        </View>
                    </View>

                    {/* Danger Zone */}
                    <View style={[styles.section, { marginBottom: 40 }]}>
                        <TouchableOpacity style={styles.dangerButton}>
                            <Shield size={18} color="#FF4D4D" style={{ marginRight: 10 }} />
                            <Text style={styles.dangerText}>Verify Artist Status</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
        </SafeScreenWrapper>
    );
}

function SocialInput({ icon, value, label }: any) {
    return (
        <View style={styles.socialInputContainer}>
            <View style={styles.socialIcon}>
                {icon}
            </View>
            <View style={styles.socialInfo}>
                <Text style={styles.socialLabel}>{label}</Text>
                <TextInput
                    style={styles.socialTextInput}
                    value={value}
                    placeholder={`Enter ${label} link`}
                    placeholderTextColor="rgba(255,255,255,0.2)"
                />
            </View>
            <ExternalLink size={16} color="rgba(255,255,255,0.3)" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    saveButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(236, 92, 57, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    imagesSection: {
        height: 200,
        marginBottom: 60,
    },
    bannerContainer: {
        width: '100%',
        height: 150,
        borderRadius: 20,
        overflow: 'hidden',
    },
    bannerPlaceholder: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    camIcon: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    profilePicContainer: {
        position: 'absolute',
        bottom: 0,
        left: 20,
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#140F10',
        overflow: 'hidden',
    },
    profilePicPlaceholder: {
        flex: 1,
        backgroundColor: 'rgba(236, 92, 57, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    camIconSmall: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(236, 92, 57, 0.8)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 13,
        fontFamily: 'Poppins-Medium',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#FFF',
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    socialInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    socialIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    socialInfo: {
        flex: 1,
        marginLeft: 15,
    },
    socialLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontFamily: 'Poppins-Bold',
        textTransform: 'uppercase',
    },
    socialTextInput: {
        color: '#FFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 14,
        padding: 0,
        marginTop: -2,
    },
    preferenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    preferenceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    preferenceLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 15,
        fontFamily: 'Poppins-Medium',
    },
    dangerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 77, 77, 0.05)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 77, 77, 0.1)',
    },
    dangerText: {
        color: '#FF4D4D',
        fontSize: 15,
        fontFamily: 'Poppins-Bold',
    }
});
