import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    ArrowDownRight,
    ArrowUpRight,
    Building2,
    ChevronLeft,
    Clock,
    History,
    Wallet
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

// Mock Data
const WITHDRAWAL_HISTORY = [
    { id: '1', date: 'Oct 15, 2023', amount: '850.00', status: 'Completed', bank: 'Standard Chartered' },
    { id: '2', date: 'Sep 28, 2023', amount: '1,200.00', status: 'Completed', bank: 'Standard Chartered' },
    { id: '3', date: 'Sep 12, 2023', amount: '450.00', status: 'Pending', bank: 'Standard Chartered' },
];

export default function WithdrawalScreen() {
    const router = useRouter();
    const [balance, setBalance] = useState('1,284.50');

    const handleBack = () => {
        router.back();
    };

    return (
        <SafeScreenWrapper>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <ChevronLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Earnings</Text>
                    <TouchableOpacity style={styles.historyButton}>
                        <History size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Balance Card */}
                    <LinearGradient
                        colors={['#EC5C39', '#863420']}
                        style={styles.balanceCard}
                    >
                        <Text style={styles.balanceLabel}>Withdrawable Balance</Text>
                        <Text style={styles.balanceAmount}>${balance}</Text>

                        <View style={styles.balanceMeta}>
                            <View style={styles.metaItem}>
                                <Text style={styles.metaLabel}>Total Earned</Text>
                                <Text style={styles.metaValue}>$14.2K</Text>
                            </View>
                            <View style={styles.metaDivider} />
                            <View style={styles.metaItem}>
                                <Text style={styles.metaLabel}>This Month</Text>
                                <Text style={styles.metaValue}>$2.1K</Text>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* Quick Stats Grid */}
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <ArrowUpRight size={18} color="#4CAF50" />
                            <Text style={styles.statBoxLabel}>Payouts</Text>
                            <Text style={styles.statBoxValue}>$12.4K</Text>
                        </View>
                        <View style={styles.statBox}>
                            <ArrowDownRight size={18} color="#EC5C39" />
                            <Text style={styles.statBoxLabel}>Pending</Text>
                            <Text style={styles.statBoxValue}>$450</Text>
                        </View>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity style={styles.withdrawAction}>
                        <LinearGradient
                            colors={['#EC5C39', '#ED5639']}
                            style={styles.actionGradient}
                        >
                            <Wallet size={20} color="#FFF" style={{ marginRight: 10 }} />
                            <Text style={styles.actionText}>Request Withdrawal</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Payment Method */}
                    <Text style={styles.sectionTitle}>Payment Method</Text>
                    <TouchableOpacity style={styles.bankCard}>
                        <View style={styles.bankIcon}>
                            <Building2 size={24} color="#EC5C39" />
                        </View>
                        <View style={styles.bankInfo}>
                            <Text style={styles.bankName}>Standard Chartered Bank</Text>
                            <Text style={styles.accountNumber}>**** 8942</Text>
                        </View>
                        <TouchableOpacity>
                            <Text style={styles.editLink}>Change</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>

                    {/* History Section */}
                    <View style={styles.historyHeader}>
                        <Text style={styles.sectionTitle}>Payout History</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>See All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.historyList}>
                        {WITHDRAWAL_HISTORY.map((item) => (
                            <View key={item.id} style={styles.historyItem}>
                                <View style={[styles.statusIcon, {
                                    backgroundColor: item.status === 'Completed' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 193, 7, 0.1)'
                                }]}>
                                    {item.status === 'Completed' ? (
                                        <Image
                                            source={require('@/assets/images/check-circle.png')}
                                            style={{ width: 16, height: 16 }}
                                            contentFit="contain"
                                        />
                                    ) : (
                                        <Clock size={16} color="#FFC107" />
                                    )}
                                </View>
                                <View style={styles.historyInfo}>
                                    <View style={styles.historyRow}>
                                        <Text style={styles.historyAmount}>${item.amount}</Text>
                                        <Text style={[styles.historyStatus, { color: item.status === 'Completed' ? '#4CAF50' : '#FFC107' }]}>
                                            {item.status}
                                        </Text>
                                    </View>
                                    <View style={styles.historyRow}>
                                        <Text style={styles.historyDate}>{item.date}</Text>
                                        <Text style={styles.historyBank}>{item.bank}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
        </SafeScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        marginBottom: 10,
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
        fontSize: 20,
        fontFamily: 'Poppins-Bold',
        color: '#FFF',
    },
    historyButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    balanceCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontFamily: 'Poppins-Regular',
        fontSize: 14,
    },
    balanceAmount: {
        color: '#FFF',
        fontFamily: 'Poppins-Bold',
        fontSize: 36,
        marginVertical: 10,
    },
    balanceMeta: {
        flexDirection: 'row',
        marginTop: 15,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    metaItem: {
        flex: 1,
    },
    metaLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        fontFamily: 'Poppins-Regular',
        marginBottom: 2,
    },
    metaValue: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
    },
    metaDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 15,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 20,
    },
    statBox: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    statBoxLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        marginTop: 8,
    },
    statBoxValue: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
    },
    withdrawAction: {
        height: 56,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 30,
    },
    actionGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        color: '#FFF',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        marginBottom: 15,
    },
    bankCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    bankIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(236, 92, 57, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bankInfo: {
        flex: 1,
        marginLeft: 15,
    },
    bankName: {
        color: '#FFF',
        fontSize: 15,
        fontFamily: 'Poppins-SemiBold',
    },
    accountNumber: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
    },
    editLink: {
        color: '#EC5C39',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    seeAll: {
        color: '#EC5C39',
        fontSize: 14,
        fontFamily: 'Poppins-SemiBold',
    },
    historyList: {
        gap: 12,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 16,
        padding: 12,
    },
    statusIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    historyInfo: {
        flex: 1,
        marginLeft: 12,
    },
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    historyAmount: {
        color: '#FFF',
        fontSize: 15,
        fontFamily: 'Poppins-Bold',
    },
    historyStatus: {
        fontSize: 12,
        fontFamily: 'Poppins-SemiBold',
    },
    historyDate: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
    },
    historyBank: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 11,
        fontFamily: 'Poppins-Regular',
    }
});
