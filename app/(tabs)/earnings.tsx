import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  TouchableOpacity as RNTouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "../../context/LanguageContext";
import PremiumHeader from "../../components/PremiumHeader";
import { useUser } from "../../context/UserContext";
import { payoutService } from "../../services/payoutService";
import { profileService } from "../../services/profileService";
import { orderService } from "../../services/orderService";

const { width } = Dimensions.get("window");

export default function Earnings() {
  const { t } = useLanguage();
  const [showHistory, setShowHistory] = useState(false);
  const [showPayouts, setShowPayouts] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  const { authState } = useUser();
  const user = authState.user;
  
  const [stats, setStats] = useState({ totalEarnings: 0, completedOrders: 0, payouts: [] as any[] });

  const handleWithdraw = () => {
    setShowPayoutModal(true);
    setPayoutLoading(true);
    setPayoutSuccess(false);

    // Simulate Payout Process (In a real app this would call an API like payoutService.requestPayout())
    setTimeout(() => {
      setPayoutLoading(false);
      setPayoutSuccess(true);
    }, 3000);
  };

  React.useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      try {
        const [totalPaidRes, statsRes, payoutsRes] = await Promise.all([
          payoutService.getTotalPaid(user.id).catch(() => 0),
          orderService.getStatistics(user.id).catch(() => ({ completedOrders: 0 })),
          payoutService.getRecentPayouts(user.id, 5).catch(() => ([]))
        ]);
        
        setStats({
           totalEarnings: typeof totalPaidRes === 'number' ? totalPaidRes : (totalPaidRes?.totalPaid || 0),
           completedOrders: statsRes?.completedOrders || 0,
           payouts: Array.isArray(payoutsRes) ? payoutsRes : []
        });
      } catch (e) {
        console.warn("Error fetching earnings data", e);
      }
    };
    fetchData();
  }, [user?.id]);

  const earningsHistory = stats.payouts.length > 0 ? stats.payouts.map(p => ({
    label: p.period || `Payout #${p.id || 'N/A'}`,
    amount: `₹${p.amount || 0}`,
    orders: p.ordersIncluded || 0,
    status: p.status || 'PROCESSED'
  })) : [
    { label: "No Recent Payouts", amount: "₹0", orders: 0, status: 'NONE' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PremiumHeader 
          title={t('earnings')}
          rightContent={
            <TouchableOpacity onPress={() => Alert.alert("Coming Soon", "Withdrawal feature is coming soon! Stay tuned for updates.")} style={[styles.payoutBtn, { backgroundColor: '#94A3B8' }]}>
               <Text style={styles.payoutBtnText}>Coming Soon</Text>
            </TouchableOpacity>
          }
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Main Earnings Card */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.mainCard}>
              <View style={styles.cardHeader}>
                <View>
                   <Text style={styles.cardLabel}>All-Time Earnings</Text>
                   <Text style={styles.cardValue}>₹{stats.totalEarnings.toFixed(2)}</Text>
                </View>
                <View style={styles.periodBadge}>
                   <MaterialCommunityIcons name="calendar-range" size={14} color="#0E8A63" />
                   <Text style={styles.periodText}>Lifetime</Text>
                </View>
             </View>

             <View style={styles.divider} />

             <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                   <Text style={styles.statSubValue}>{stats.completedOrders}</Text>
                   <Text style={styles.statSubLabel}>Orders</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                   <Text style={styles.statSubValue}>Level 1</Text>
                   <Text style={styles.statSubLabel}>Tier</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                   <Text style={styles.statSubValue}>₹0</Text>
                   <Text style={styles.statSubLabel}>Bonus</Text>
                </View>
             </View>
          </Animated.View>

          {/* Rate Card Removed as requested */}

          {/* Collapsible Earnings History */}
          <TouchableOpacity onPress={() => setShowHistory(!showHistory)} style={styles.collapsibleHeader}>
             <View style={styles.row}>
                <MaterialCommunityIcons name="history" size={24} color="#0E8A63" />
                <Text style={styles.collapsibleTitle}>{t('history')}</Text>
             </View>
             <MaterialCommunityIcons name={showHistory ? "chevron-up" : "chevron-down"} size={24} color="#A0A0A0" />
          </TouchableOpacity>

          {showHistory && (
             <Animated.View entering={FadeInDown}>
                {earningsHistory.map((item, i) => (
                   <View key={i} style={styles.historyItem}>
                      <View>
                         <Text style={styles.historyLabel}>{item.label}</Text>
                         <Text style={styles.historySub}>{item.orders} Orders completed</Text>
                      </View>
                      <Text style={styles.historyAmount}>{item.amount}</Text>
                   </View>
                ))}
             </Animated.View>
          )}

          <TouchableOpacity onPress={() => setShowPayouts(!showPayouts)} style={[styles.collapsibleHeader, { marginTop: 12 }]}>
             <View style={styles.row}>
                <MaterialCommunityIcons name="bank-transfer" size={24} color="#00C853" />
                <Text style={styles.collapsibleTitle}>Payout Settlements</Text>
             </View>
             <MaterialCommunityIcons name={showPayouts ? "chevron-up" : "chevron-down"} size={24} color="#A0A0A0" />
          </TouchableOpacity>

          {showPayouts && (
             <Animated.View entering={FadeInDown} style={styles.payoutContent}>
                <View style={styles.payoutStatusCard}>
                   <MaterialCommunityIcons name="check-circle" size={20} color="#00C853" />
                   <Text style={styles.payoutStatusText}>Next settlement scheduled for Monday, 8:00 AM</Text>
                </View>
             </Animated.View>
          )}

        </ScrollView>
      </SafeAreaView>

      {/* Settlement Payout Modal */}
      <Modal visible={showPayoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
           <Animated.View entering={ZoomIn} style={styles.modalBox}>
              <View style={styles.settlementHeader}>
                 <Text style={styles.settlementTitle}>Weekly Settlement</Text>
                 {!payoutLoading && (
                   <RNTouchableOpacity onPress={() => setShowPayoutModal(false)}>
                      <MaterialCommunityIcons name="close" size={24} color="#1A1A1A" />
                   </RNTouchableOpacity>
                 )}
              </View>

              {payoutLoading ? (
                <View style={styles.statusContent}>
                   <ActivityIndicator size="large" color="#0A6A4C" />
                   <Text style={styles.statusMainText}>Processing Payout...</Text>
                   <Text style={styles.statusSubText}>Securely transferring ₹1,250.00 to your linked bank account.</Text>
                </View>
              ) : payoutSuccess ? (
                <View style={styles.statusContent}>
                   <View style={styles.successIconCircle}>
                      <MaterialCommunityIcons name="check-bold" size={40} color="#00C853" />
                   </View>
                   <Text style={[styles.statusMainText, { color: '#00C853' }]}>Settlement Successful!</Text>
                   <Text style={styles.statusSubText}>Funds will reflect in your account within 24 hours.</Text>
                   <TouchableOpacity onPress={() => setShowPayoutModal(false)} style={styles.closeBtn}>
                      <Text style={styles.closeBtnText}>Great, Thanks!</Text>
                   </TouchableOpacity>
                </View>
              ) : null}
           </Animated.View>
        </View>
      </Modal>

    </View>
  );
}

function TouchableOpacity(props: any) {
  return <Pressable {...props} style={({ pressed }: any) => [props.style, pressed && { opacity: 0.7 }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  // Header styles removed as we are using PremiumHeader
  payoutBtn: { backgroundColor: '#0A6A4C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, shadowColor: '#0A6A4C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  payoutBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 68, paddingTop: 24, backgroundColor: '#F8FAFC', borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  mainCard: { backgroundColor: '#ECFDF5', borderRadius: 28, padding: 24, shadowColor: '#0A6A4C', shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.08, shadowRadius: 30, elevation: 8, marginBottom: 32, borderWidth: 1, borderColor: 'rgba(79,70,229,0.1)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: '#0A6A4C', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { color: '#0F172A', fontSize: 34, fontWeight: '900', marginTop: 4 },
  periodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(79,70,229,0.1)' },
  periodText: { color: '#0A6A4C', fontSize: 11, fontWeight: '800' },
  divider: { height: 1, backgroundColor: 'rgba(79,70,229,0.1)', marginVertical: 24 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statSubValue: { color: '#0F172A', fontSize: 20, fontWeight: '900' },
  statSubLabel: { color: '#0A6A4C', fontSize: 13, fontWeight: '700', marginTop: 4, opacity: 0.9 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(79,70,229,0.1)' },
  sectionTitle: { color: '#1A1A1A', fontSize: 18, fontWeight: '800', marginBottom: 20 },
  rateCard: { backgroundColor: '#F0FDF4', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4, marginBottom: 32, borderWidth: 1, borderColor: 'rgba(0,200,83,0.1)' },
  rateRow: { flexDirection: 'row', alignItems: 'center' },
  rateLabel: { color: '#15803D', fontSize: 13, fontWeight: '700' },
  rateValue: { color: '#1A1A1A', fontSize: 16, fontWeight: '800', marginTop: 2 },
  collapsibleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F3E8FF', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(112,45,255,0.1)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  collapsibleTitle: { color: '#1A1A1A', fontSize: 15, fontWeight: '700' },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginHorizontal: 12 },
  historyLabel: { color: '#1A1A1A', fontSize: 15, fontWeight: '700' },
  historySub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  historyAmount: { color: '#1A1A1A', fontSize: 16, fontWeight: '800' },
  payoutContent: { padding: 12 },
  payoutStatusCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#DCFCE7' },
  payoutStatusText: { flex: 1, color: '#15803D', fontSize: 13, fontWeight: '600', lineHeight: 20 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { backgroundColor: '#FFFFFF', borderRadius: 32, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center' },
  settlementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 30 },
  settlementTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  statusContent: { alignItems: 'center', width: '100%' },
  statusMainText: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginTop: 24, textAlign: 'center' },
  statusSubText: { fontSize: 15, color: '#64748B', textAlign: 'center', marginTop: 12, lineHeight: 22 },
  successIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { backgroundColor: '#0A6A4C', width: '100%', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  closeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});