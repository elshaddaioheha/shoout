import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useToastStore } from '@/store/useToastStore';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import {
    ArrowDownRight,
    ArrowUpRight,
    Building2,
    ChevronLeft,
    Clock,
    History,
    Wallet
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

export default function WithdrawalScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(0);
    const [totalEarned, setTotalEarned] = useState(0);
    const [history, setHistory] = useState<any[]>([]);
    const { showToast } = useToastStore();

    useEffect(() => {
        if (!auth.currentUser) return;

        // 1. Listen for Sales (Transactions)
        const salesQuery = query(
            collection(db, 'transactions'),
            where('sellerId', '==', auth.currentUser.uid),
            where('status', '==', 'completed')
        );

        const unsubSales = onSnapshot(salesQuery, (snapshot) => {
            const sales = snapshot.docs.map(doc => doc.data());
            const sum = sales.reduce((acc, curr) => acc + (curr.amount || 0), 0);
            setTotalEarned(sum);
            // In a real app, balance = total - withdrawn. 
            // For MVP simplicity, we'll assume balance is everything not yet paid out.
            setBalance(sum);
        });

        // 2. Listen for Payouts (Withdrawals)
        const payoutQuery = query(
            collection(db, 'payouts'),
            where('userId', '==', auth.currentUser.uid),
            orderBy('timestamp', 'desc')
        );

        const unsubPayouts = onSnapshot(payoutQuery, (snapshot) => {
            const payouts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().timestamp?.toDate()?.toLocaleDateString() || 'Recent'
            }));
            setHistory(payouts);
            setLoading(false);
        }, (err) => {
            console.warn("Payouts fetch failed:", err);
            setLoading(false);
        });

        return () => {
            unsubSales();
            unsubPayouts();
        };
    }, []);

    const handleBack = () => {
        router.back();
    };

    const handleRequestWithdrawal = () => {
        if (balance < 50) {
            showToast("You need at least $50.00 to request a withdrawal.", "error");
            return;
        }
        showToast("Withdrawal processing is being integrated with local African payment gateways.", "info");
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
                    <TouchableOpacity style={styles.historyButton} onPress={() => showToast('Scroll down to see your payout history below.', 'info')}>
                        <History size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                        <ActivityIndicator color="#EC5C39" />
                    </View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        {/* Balance Card */}
                        <LinearGradient
                            colors={['#EC5C39', '#863420']}
                            style={styles.balanceCard}
                        >
                            <Text style={styles.balanceLabel}>Withdrawable Balance</Text>
                            <Text style={styles.balanceAmount}>${balance.toFixed(2)}</Text>

                            <View style={styles.balanceMeta}>
                                <View style={styles.metaItem}>
                                    <Text style={styles.metaLabel}>Total Earned</Text>
                                    <Text style={styles.metaValue}>${totalEarned.toFixed(2)}</Text>
                                </View>
                                <View style={styles.metaDivider} />
                                <View style={styles.metaItem}>
                                    <Text style={styles.metaLabel}>Pending</Text>
                                    <Text style={styles.metaValue}>$0.00</Text>
                                </View>
                            </View>
                        </LinearGradient>

                        {/* Quick Stats Grid */}
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <ArrowUpRight size={18} color="#4CAF50" />
                                <Text style={styles.statBoxLabel}>Sales</Text>
                                <Text style={styles.statBoxValue}>{history.length > 0 ? (totalEarned / history.length).toFixed(1) : '0'} Avg</Text>
                            </View>
                            <View style={styles.statBox}>
                                <ArrowDownRight size={18} color="#EC5C39" />
                                <Text style={styles.statBoxLabel}>Payouts</Text>
                                <Text style={styles.statBoxValue}>$0.00</Text>
                            </View>
                        </View>

                        {/* Action Button */}
                        <TouchableOpacity style={styles.withdrawAction} onPress={handleRequestWithdrawal}>
                            <LinearGradient
                                colors={['#EC5C39', '#ED5639']}
                                style={styles.actionGradient}
                            >
                                <Wallet size={20} color="#FFF" style={{ marginRight: 10 }} />
                                <Text style={styles.actionText}>Request Withdrawal</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Payment Method (Static for MVP UI) */}
                        <Text style={styles.sectionTitle}>Payment Method</Text>
                        <TouchableOpacity style={styles.bankCard}>
                            <View style={styles.bankIcon}>
                                <Building2 size={24} color="#EC5C39" />
                            </View>
                            <View style={styles.bankInfo}>
                                <Text style={styles.bankName}>Local Nigerian Bank</Text>
                                <Text style={styles.accountNumber}>Direct Deposit Active</Text>
                            </View>
                            <TouchableOpacity onPress={() => showToast('Bank account management will be available in the next update. Contact support@shoouts.com to update your payout details.', 'info')}>
                                <Text style={styles.editLink}>Change</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>

                        {/* History Section */}
                        <View style={styles.historyHeader}>
                            <Text style={styles.sectionTitle}>Payout History</Text>
                            <TouchableOpacity onPress={() => showToast(`You have ${history.length} payout record${history.length !== 1 ? 's' : ''}. Full history export coming soon.`, 'info')}>
                                <Text style={styles.seeAll}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.historyList}>
                            {history.length === 0 ? (
                                <Text style={styles.emptyText}>No payout history found.</Text>
                            ) : (
                                history.map((item) => (
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
                                                <Text style={styles.historyBank}>Bank Transfer</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>

                        <View style={{ height: 100 }} />
                    </ScrollView>
                )}
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
    },
    emptyText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
        textAlign: 'center',
        marginTop: 40,
    }
});
