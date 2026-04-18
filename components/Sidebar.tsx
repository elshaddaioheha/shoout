import { useUserStore } from '@/store/useUserStore';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/constants/typography';
import { adaptLegacyColor, adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import React from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

function useSidebarStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const appTheme = useAppTheme();
    const styles = useSidebarStyles();

    const router = useRouter();
    const { role, viewMode, setViewMode, reset } = useUserStore();
    const translateX = React.useRef(new Animated.Value(width)).current;
    const opacityAnim = React.useRef(new Animated.Value(0)).current;
    const [render, setRender] = React.useState(isOpen);

    React.useEffect(() => {
        if (isOpen) {
            setRender(true);
            Animated.parallel([
                Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: true,
                    bounciness: 0,
                    speed: 24,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            Animated.parallel([
                Animated.spring(translateX, {
                    toValue: width,
                    useNativeDriver: true,
                    bounciness: 0,
                    speed: 24,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 0,
                    duration: 180,
                    useNativeDriver: true,
                })
            ]).start(() => setRender(false));
        }
    }, [isOpen]);

    const handleModeSwitch = (mode: 'vault' | 'studio') => {
        setViewMode(mode);
        onClose();
    };

    const handleLogout = () => {
        reset();
        onClose();
        router.replace('/(auth)/login');
    };

    const isHybrid = role.startsWith('hybrid');

    if (!render) return null;

    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityAnim }]}>
                <Pressable style={styles.overlay} onPress={onClose}>
                    <BlurView intensity={28} style={StyleSheet.absoluteFill} tint={appTheme.isDark ? 'dark' : 'light'} />
                    <View style={styles.overlayDim} />
                </Pressable>
            </Animated.View>

            <Animated.View style={[styles.sidebar, { transform: [{ translateX }] }]}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Account Mode</Text>
                    <IconButton
                        onPress={onClose}
                        style={styles.closeButton}
                        icon="x"
                        size={24}
                        color={appTheme.colors.textPrimary}
                        accessibilityRole="button"
                        accessibilityLabel="Close sidebar"
                    />
                </View>

                <View style={styles.content}>
                    <Text style={styles.sectionTitle}>Switch View</Text>

                    <ModeItem
                        icon="music"
                        label="Vault Mode"
                        active={viewMode === 'vault'}
                        onPress={() => handleModeSwitch('vault')}
                        disabled={role.startsWith('studio')}
                        styles={styles}
                        appTheme={appTheme}
                    />

                    <ModeItem
                        icon="mic"
                        label="Studio Mode"
                        active={viewMode === 'studio'}
                        onPress={() => handleModeSwitch('studio')}
                        disabled={role.startsWith('vault')}
                        styles={styles}
                        appTheme={appTheme}
                    />

                    {isHybrid && (
                        <View style={styles.hybridBadge}>
                            <Icon name="sparkles" size={16} color="#EC5C39" />
                            <Text style={styles.hybridText}>Hybrid Access Active</Text>
                        </View>
                    )}

                    <View style={styles.divider} />

                    <TouchableOpacity
                        style={styles.profileLink}
                        onPress={() => { router.push('/(tabs)/profile' as any); onClose(); }}
                        accessibilityRole="button"
                        accessibilityLabel="Open profile"
                    >
                        <View style={styles.profileIcon}>
                            <Icon name="user" size={20} color={appTheme.colors.textPrimary} />
                        </View>
                        <Text style={styles.profileLabel}>View Profile</Text>
                        <Icon name="chevron-right" size={18} color={appTheme.colors.textDisabled} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.profileLink}
                        onPress={() => { router.push('/settings/subscriptions' as any); onClose(); }}
                        accessibilityRole="button"
                        accessibilityLabel="Open premium plans"
                    >
                        <View style={styles.profileIcon}>
                            <Icon name="zap" size={20} color={appTheme.colors.textPrimary} />
                        </View>
                        <Text style={styles.profileLabel}>Premium Plans</Text>
                        <Icon name="chevron-right" size={18} color={appTheme.colors.textDisabled} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                        accessibilityRole="button"
                        accessibilityLabel="Log out"
                    >
                        <Icon name="log-out" size={20} color={adaptLegacyColor('#EF4444', 'color', appTheme)} />
                        <Text style={styles.logoutText}>Log Out</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.versionText}>Shoouts v1.0.0</Text>
                </View>
            </Animated.View>
        </View>
    );
}

function ModeItem({ icon, label, active, onPress, disabled, styles, appTheme }: any) {
    const iconMuted = adaptLegacyColor('rgba(255,255,255,0.4)', 'color', appTheme);

    return (
        <TouchableOpacity
            style={[styles.modeItem, active && styles.modeItemActive, disabled && styles.modeItemDisabled]}
            onPress={onPress}
            disabled={disabled || active}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: active, disabled: disabled || active }}
        >
            <View style={[styles.modeIcon, active && styles.modeIconActive]}>
                <Icon name={icon} size={20} color={active ? appTheme.colors.textPrimary : iconMuted} />
            </View>
            <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{label}</Text>
            {active && <View style={styles.activeDot} />}
        </TouchableOpacity>
    );
}

const legacyStyles = {
    overlay: { flex: 1 },
    overlayDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,8,12,0.42)' },
    sidebar: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: width * 0.75,
        backgroundColor: '#1A1516',
        paddingTop: 60,
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.05)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    headerTitle: { ...typography.title, color: '#FFF' },
    closeButton: { padding: 4 },
    content: { paddingHorizontal: 16, flex: 1 },
    sectionTitle: { ...typography.label, color: 'rgba(255,255,255,0.3)', marginBottom: 16, paddingHorizontal: 8, textTransform: 'uppercase', letterSpacing: 1 },
    modeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 8,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    modeItemActive: { backgroundColor: 'rgba(236, 92, 57, 0.1)', borderWidth: 1, borderColor: 'rgba(236, 92, 57, 0.2)' },
    modeItemDisabled: { opacity: 0.3 },
    modeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    modeIconActive: { backgroundColor: '#EC5C39' },
    modeLabel: { ...typography.body, flex: 1, marginLeft: 16, color: 'rgba(255,255,255,0.5)' },
    modeLabelActive: { color: '#FFF', fontFamily: typography.title.fontFamily },
    activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EC5C39' },
    hybridBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, marginTop: 16 },
    hybridText: { ...typography.label, color: '#EC5C39' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 32, marginHorizontal: 8 },
    profileLink: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    profileIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    profileLabel: { ...typography.body, flex: 1, marginLeft: 12, color: '#FFF' },
    logoutButton: { flexDirection: 'row', alignItems: 'center', padding: 12, marginTop: 'auto', marginBottom: 40 },
    logoutText: { ...typography.body, marginLeft: 12, color: '#EF4444' },
    footer: { padding: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    versionText: { ...typography.small, color: 'rgba(255,255,255,0.2)', textAlign: 'center' },
};
