import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function SettingsDivider() {
    return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
});
