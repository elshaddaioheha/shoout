import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

interface SettingsSwitchRowProps {
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
}

export default function SettingsSwitchRow({
    title,
    subtitle,
    value,
    onValueChange,
}: SettingsSwitchRowProps) {
    return (
        <View style={styles.row}>
            <View style={styles.textContainer}>
                <Text style={styles.settingTitle}>{title}</Text>
                <Text style={styles.settingSub}>{subtitle}</Text>
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#EC5C39' }}
                thumbColor="#FFF"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    textContainer: {
        flex: 1,
        paddingRight: 16,
    },
    settingTitle: {
        fontSize: 16,
        fontFamily: 'Poppins-Medium',
        color: '#FFF',
    },
    settingSub: {
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
    },
});
