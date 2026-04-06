/**
 * ActionSheet — a reusable bottom sheet for item actions.
 * Usage:
 *   <ActionSheet
 *     visible={visible}
 *     onClose={() => setVisible(false)}
 *     title="Track Options"
 *     options={[
 *       { label: 'Edit', icon: <Edit3 />, onPress: () => {} },
 *       { label: 'Delete', icon: <Trash2 />, onPress: () => {}, destructive: true },
 *     ]}
 *   />
 */
import React, { useEffect, useRef } from 'react';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

const { height } = Dimensions.get('window');

export interface ActionSheetOption {
    label: string;
    icon?: React.ReactNode;
    onPress: () => void;
    destructive?: boolean;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    title?: string;
    options: ActionSheetOption[];
}

function useActionSheetStyles() {
    const appTheme = useAppTheme();
    return React.useMemo(() => StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any), [appTheme]);
}

export default function ActionSheet({ visible, onClose, title, options }: Props) {
    const appTheme = useAppTheme();
    const styles = useActionSheetStyles();

    const slideAnim = useRef(new Animated.Value(300)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 300, duration: 220, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                    <BlurView intensity={30} tint={appTheme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                    <View style={styles.overlayDim} />
                </Animated.View>
            </TouchableWithoutFeedback>

            <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
                <BlurView intensity={28} tint={appTheme.isDark ? 'dark' : 'light'} style={styles.sheetBlur}>
                    <View style={styles.sheetChrome} />
                    <View style={styles.handle} />

                    {title && <Text style={styles.title}>{title}</Text>}

                    {options.map((opt, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={[styles.option, idx < options.length - 1 && styles.optionBorder]}
                            onPress={() => { onClose(); setTimeout(opt.onPress, 150); }}
                            activeOpacity={0.7}
                        >
                            {opt.icon && <View style={styles.optionIcon}>{opt.icon}</View>}
                            <Text style={[styles.optionLabel, opt.destructive && { color: appTheme.colors.error }]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}

                    <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.7}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </BlurView>
            </Animated.View>
        </Modal>
    );
}

const legacyStyles = {
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    overlayDim: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10,10,16,0.44)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
    },
    sheetBlur: {
        paddingBottom: 34,
        paddingHorizontal: 20,
        paddingTop: 12,
        backgroundColor: 'rgba(30, 26, 27, 0.76)',
    },
    sheetChrome: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignSelf: 'center',
        marginBottom: 16,
    },
    title: {
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'Poppins-Regular',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 12,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    optionBorder: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    optionIcon: {
        marginRight: 14,
        width: 22,
        alignItems: 'center',
    },
    optionLabel: {
        color: '#FFF',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 15,
    },
    cancel: {
        marginTop: 10,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
    },
    cancelText: {
        color: 'rgba(255,255,255,0.6)',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 15,
    },
};
