import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from 'react-native';
import {
    ChevronLeft,
    TrendingUp,
    Users,
    Play,
    DollarSign,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Music,
    Globe
} from 'lucide-react-native';
import Svg, { Rect, Path, Circle, Defs, LinearGradient as SVGLinearGradient, Stop } from 'react-native-svg';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// Simple Chart Component using SVG
function SimpleLineChart({ height = 150 }) {
    return (
        <View style={{ height, width: '100%', marginTop: 20 }}>
            <Svg height="100%" width="100%" viewBox="0 0 300 100">
                {/* Simulated Chart Line */}
                <Path
                    d="M0,80 Q30,70 60,85 T120,60 T180,75 T240,40 T300,50"
                    fill="none"
                    stroke="#EC5C39"
                    strokeWidth="3"
                />
                <Path
                    d="M0,80 Q30,70 60,85 T120,60 T180,75 T240,40 T300,50 V100 H0 Z"
                    fill="url(#grad)"
                    opacity="0.3"
                />
                <Defs>
                    <SVGLinearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor="#EC5C39" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#EC5C39" stopOpacity="0" />
                    </SVGLinearGradient>
                </Defs>
                {/* Data Points */}
                <Circle cx="120" cy="60" r="4" fill="#EC5C39" />
                <Circle cx="240" cy="40" r="4" fill="#EC5C39" />
            </Svg>
        </View>
    );
}

export default function AnalyticsScreen() {
    const router = useRouter();
    const [period, setPeriod] = useState('Week');

    const handleBack = () => {
        router.back();
    };

    return (
        <SafeScreenWrapper>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <ChevronLeft size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Analytics</Text>
                    <TouchableOpacity style={styles.periodSelector}>
                        <Calendar size={18} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Period Tabs */}
                <View style={styles.tabsContainer}>
                    {['Day', 'Week', 'Month', 'Year'].map((t) => (
                        <TouchableOpacity
                            key={t}
                            onPress={() => setPeriod(t)}
                            style={[styles.tab, period === t && styles.activeTab]}
                        >
                            <Text style={[styles.tabText, period === t && styles.activeTabText]}>
                                {t}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Main Overview Card */}
                <View style={styles.overviewCard}>
                    <View style={styles.overviewHeader}>
                        <View>
                            <Text style={styles.overviewLabel}>Total Plays</Text>
                            <Text style={styles.overviewValue}>458,290</Text>
                        </View>
                        <View style={styles.growthBadge}>
                            <ArrowUpRight size={14} color="#4CAF50" />
                            <Text style={styles.growthText}>+12.5%</Text>
                        </View>
                    </View>

                    <SimpleLineChart />

                    <View style={styles.overviewFooter}>
                        <Text style={styles.dateLabel}>Oct 16</Text>
                        <Text style={styles.dateLabel}>Oct 22</Text>
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <StatCard
                        icon={<DollarSign size={20} color="#EC5C39" />}
                        label="Revenue"
                        value="$12,845"
                        growth="+8.2%"
                        isUp={true}
                    />
                    <StatCard
                        icon={<Users size={20} color="#EC5C39" />}
                        label="New Fans"
                        value="1,240"
                        growth="-2.4%"
                        isUp={false}
                    />
                </View>

                {/* Top Tracks */}
                <Text style={styles.sectionTitle}>Top Tracks</Text>
                <View style={styles.listCard}>
                    <TopItem
                        rank="1"
                        title="Afro Vibes Vol. 1"
                        stat="125.4K plays"
                    />
                    <TopItem
                        rank="2"
                        title="Midnight Sun (Remix)"
                        stat="98.2K plays"
                    />
                    <TopItem
                        rank="3"
                        title="Summer Beat pack"
                        stat="45.1K plays"
                    />
                </View>

                {/* Listener Locations */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Listener Locations</Text>
                    <Globe size={18} color="rgba(255,255,255,0.4)" />
                </View>
                <View style={styles.listCard}>
                    <View style={styles.locationRow}>
                        <Text style={styles.locationName}>Nigeria</Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: '85%' }]} />
                        </View>
                        <Text style={styles.locationPercent}>85%</Text>
                    </View>
                    <View style={styles.locationRow}>
                        <Text style={styles.locationName}>USA</Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: '45%' }]} />
                        </View>
                        <Text style={styles.locationPercent}>45%</Text>
                    </View>
                    <View style={styles.locationRow}>
                        <Text style={styles.locationName}>UK</Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: '30%' }]} />
                        </View>
                        <Text style={styles.locationPercent}>30%</Text>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeScreenWrapper>
    );
}

function StatCard({ icon, label, value, growth, isUp }: any) {
    return (
        <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
                {icon}
            </View>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={styles.statValue}>{value}</Text>
            <View style={styles.statGrowthRow}>
                {isUp ? <ArrowUpRight size={12} color="#4CAF50" /> : <ArrowDownRight size={12} color="#FF4D4D" />}
                <Text style={[styles.growthMiniText, { color: isUp ? '#4CAF50' : '#FF4D4D' }]}>{growth}</Text>
            </View>
        </View>
    );
}

function TopItem({ rank, title, stat }: any) {
    return (
        <View style={styles.topItem}>
            <Text style={styles.rankText}>#{rank}</Text>
            <View style={styles.topItemInfo}>
                <Text style={styles.topItemTitle}>{title}</Text>
                <Text style={styles.topItemStat}>{stat}</Text>
            </View>
            <ArrowUpRight size={16} color="rgba(255,255,255,0.4)" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
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
    periodSelector: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabsContainer: {
        flexDirection: 'row',
        marginBottom: 25,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#EC5C39',
    },
    tabText: {
        color: 'rgba(255,255,255,0.4)',
        fontFamily: 'Poppins-SemiBold',
        fontSize: 13,
    },
    activeTabText: {
        color: '#FFF',
    },
    overviewCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    overviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    overviewLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        fontFamily: 'Poppins-Regular',
    },
    overviewValue: {
        color: '#FFF',
        fontSize: 32,
        fontFamily: 'Poppins-Bold',
    },
    growthBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    growthText: {
        color: '#4CAF50',
        fontSize: 12,
        fontFamily: 'Poppins-Bold',
    },
    overviewFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    dateLabel: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 30,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    statIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(236, 92, 57, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
        marginBottom: 2,
    },
    statValue: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        marginBottom: 4,
    },
    statGrowthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    growthMiniText: {
        fontSize: 11,
        fontFamily: 'Poppins-Bold',
    },
    sectionTitle: {
        color: '#FFF',
        fontSize: 18,
        fontFamily: 'Poppins-Bold',
        marginBottom: 15,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        marginTop: 10,
    },
    listCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 4,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    topItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    rankText: {
        color: '#EC5C39',
        fontSize: 16,
        fontFamily: 'Poppins-Bold',
        width: 30,
    },
    topItemInfo: {
        flex: 1,
    },
    topItemTitle: {
        color: '#FFF',
        fontSize: 14,
        fontFamily: 'Poppins-SemiBold',
    },
    topItemStat: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontFamily: 'Poppins-Regular',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    locationName: {
        color: '#FFF',
        fontSize: 13,
        fontFamily: 'Poppins-Regular',
        width: 60,
    },
    progressBarBg: {
        flex: 1,
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 3,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#EC5C39',
        borderRadius: 3,
    },
    locationPercent: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontFamily: 'Poppins-Bold',
        width: 30,
        textAlign: 'right',
    }
});
