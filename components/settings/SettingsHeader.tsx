import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

interface SettingsHeaderProps {
    title: string;
    onBack: () => void;
    rightElement?: React.ReactNode;
    style?: ViewStyle;
}

export default function SettingsHeader({ title, onBack, rightElement, style }: SettingsHeaderProps) {
    return (
        <View style={[styles.header, style]}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <ChevronLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            {rightElement ?? <View style={styles.rightPlaceholder} />}
        </View>
    );
}

const styles = StyleSheet.create({
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
    headerTitle: {
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
    },
    rightPlaceholder: {
        width: 40,
    },
});
