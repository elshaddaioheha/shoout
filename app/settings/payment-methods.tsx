import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useRouter } from 'expo-router';
import { ChevronLeft, CreditCard, Plus } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function PaymentMethodsScreen() {
    const router = useRouter();

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ChevronLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Payment Methods</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.emptyState}>
                        <CreditCard size={48} color="rgba(255,255,255,0.2)" />
                        <Text style={styles.emptyTitle}>No payment methods</Text>
                        <Text style={styles.emptySubtitle}>
                            You haven't added any payment methods yet. Add one to easily handle future subscriptions.
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.addButton}>
                        <Plus size={20} color="#FFF" />
                        <Text style={styles.addButtonText}>Add New Card</Text>
                    </TouchableOpacity>
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
    scrollContent: { paddingHorizontal: 20, paddingTop: 40, alignItems: 'center' },
    emptyState: {
        alignItems: 'center',
        marginBottom: 40,
        paddingHorizontal: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
        marginTop: 20,
        marginBottom: 10,
    },
    emptySubtitle: {
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        lineHeight: 22,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EC5C39',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
    },
    addButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins-SemiBold',
    },
});
