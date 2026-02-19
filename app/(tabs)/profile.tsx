import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';

export default function ProfileScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.avatarPlaceholder} />
                <Text style={styles.title}>Your Name</Text>
                <Text style={styles.subtitle}>@username</Text>

                <TouchableOpacity style={styles.editButton}>
                    <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#140F10',
    },
    content: {
        flex: 1,
        paddingHorizontal: 28,
        paddingTop: 60,
        alignItems: 'center',
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#1E1A1B',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontFamily: 'Poppins-Bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Poppins-Regular',
        color: '#A0A0A0',
        marginBottom: 24,
    },
    editButton: {
        backgroundColor: '#1E1A1B',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    editButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'Poppins-SemiBold',
    },
});
