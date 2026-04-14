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
import { bannerService } from "../../services/bannerService";
import { LineChart } from "react-native-chart-kit";

const { width } = Dimensions.get("window");

export default function Earnings() {
  const { t } = useLanguage();
  const [showHistory, setShowHistory] = useState(false);
  const [showPayouts, setShowPayouts] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  
  const [activeTab, setActiveTab] = useState("Weekly");

  const { authState } = useUser();
  const user = authState.user;
  
  const [stats, setStats] = useState({ totalEarnings: 0, completedOrders: 0, payouts: [] as any[], loginMinutes: 0 });
  const [fareRule, setFareRule] = useState<any>(null);

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
        const [totalPaidRes, statsRes, payoutsRes, dashboardRes, fareRuleRes] = await Promise.all([
          payoutService.getTotalPaid(user.id).catch(() => 0),
          orderService.getStatistics(user.id).catch(() => ({ completedOrders: 0 })),
          payoutService.getRecentPayouts(user.id, 5).catch(() => ([])),
          profileService.getDashboard().catch(() => null),
          profileService.getMyFareRule().catch(() => null),
        ]);

        setStats({
           totalEarnings: typeof totalPaidRes === 'number' ? totalPaidRes : (totalPaidRes?.totalPaid || 0),
           completedOrders: statsRes?.completedOrders || 0,
           payouts: Array.isArray(payoutsRes) ? payoutsRes : [],
           loginMinutes: dashboardRes?.dashboard?.totalLoginMinutes ?? 0,
        });
        if (fareRuleRes?.fareRule) setFareRule(fareRuleRes.fareRule);
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

  // Graphical Chart Data
  const chartData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{
      data: stats.totalEarnings > 0 
        ? [0, 0, 0, 0, 0, 0, stats.totalEarnings] 
        : [0, 0, 0, 0, 0, 0, 0],
      strokeWidth: 3,
    }]
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PremiumHeader 
          title={""}
          rightContent={
            <TouchableOpacity onPress={() => Alert.alert("Coming Soon", "Withdrawal feature is coming soon! Stay tuned for updates.")} style={[styles.payoutBtn, { backgroundColor: '#94A3B8' }]}>
               <Text style={styles.payoutBtnText}>Withdraw</Text>
            </TouchableOpacity>
          }
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <Animated.View entering={FadeInDown.duration(600)} style={styles.chartSection}>
             <Text style={styles.topLabel}>Total Earnings</Text>
             <Text style={styles.topValue}>₹{(stats.totalEarnings ?? 0).toFixed(0)}</Text>

             <View style={styles.togglePillContainer}>
                <TouchableOpacity 
                   style={[styles.toggleBtn, activeTab === 'Weekly' && styles.toggleBtnActive]} 
                   onPress={() => setActiveTab('Weekly')}
                >
                   <Text style={[styles.toggleText, activeTab === 'Weekly' && styles.toggleTextActive]}>Weekly</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   style={[styles.toggleBtn, activeTab === 'Monthly' && styles.toggleBtnActive]} 
                   onPress={() => setActiveTab('Monthly')}
                >
                   <Text style={[styles.toggleText, activeTab === 'Monthly' && styles.toggleTextActive]}>Monthly</Text>
                </TouchableOpacity>
             </View>

             <View style={styles.chartWrapper}>
               <LineChart
                  data={chartData}
                  width={width - 48} // container padding
                  height={140}
                  withDots={true}
                  withInnerLines={false}
                  withOuterLines={false}
                  withVerticalLabels={false}
                  withHorizontalLabels={false}
                  yAxisInterval={1}
                  chartConfig={{
                    backgroundColor: "#FFFFFF",
                    backgroundGradientFrom: "#FFFFFF",
                    backgroundGradientTo: "#FFFFFF",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    fillShadowGradientFrom: "#FBBF24",
                    fillShadowGradientFromOpacity: 0.15,
                    fillShadowGradientTo: "#FFFFFF",
                    fillShadowGradientToOpacity: 0.0,
                    propsForDots: {
                      r: "4",
                      strokeWidth: "2",
                      stroke: "#FBBF24",
                      fill: "#FFFFFF"
                    }
                  }}
                  bezier
                  style={styles.chartStyle}
               />
             </View>

             <View style={styles.dividerLight} />

             <View style={styles.statsRow}>
                <View style={styles.statBox}>
                   <Text style={styles.statVal}>{stats.completedOrders ?? 0}</Text>
                   <Text style={styles.statLab}>Orders</Text>
                </View>
                <View style={styles.vertDivider} />
                <View style={styles.statBox}>
                   <Text style={styles.statVal}>
                     {stats.loginMinutes < 60
                       ? `${stats.loginMinutes}m`
                       : `${Math.floor(stats.loginMinutes / 60)}h ${stats.loginMinutes % 60}m`}
                   </Text>
                   <Text style={styles.statLab}>Time Online</Text>
                </View>
                <View style={styles.vertDivider} />
                <View style={styles.statBox}>
                   <Text style={styles.statVal}>₹0</Text>
                   <Text style={styles.statLab}>Bonus</Text>
                </View>
             </View>
          </Animated.View>

          {/* History Mockup Block */}
          <TouchableOpacity onPress={() => setShowHistory(!showHistory)} style={styles.mockupHistoryTile}>
             <View style={styles.row}>
                <View style={styles.greenCircle}>
                   <MaterialCommunityIcons name="star-four-points" size={16} color="#FFFFFF" />
                </View>
                <Text style={styles.historyTileTitle}>Order History</Text>
             </View>
             <MaterialCommunityIcons name={showHistory ? "chevron-up" : "chevron-right"} size={22} color="#1E293B" />
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
          
          {/* Default Payout Block */}
          <TouchableOpacity onPress={() => setShowPayouts(!showPayouts)} style={styles.mockupPayoutTile}>
             <View style={styles.payoutLeft}>
                 <View style={styles.greenBriefcase}>
                    <MaterialCommunityIcons name="briefcase" size={16} color="#FFFFFF" />
                 </View>
                 <View>
                    <Text style={styles.payoutTileTitle}>Next Payout</Text>
                    <Text style={styles.payoutTileSub}>Scheduled for</Text>
                    <Text style={styles.payoutTileSub}>Tuesday 8.00 AM</Text>
                 </View>
             </View>
             <Text style={styles.payoutTileAmount}>₹{(stats.totalEarnings ?? 0).toFixed(0)}</Text>
          </TouchableOpacity>

          {/* Fare Rate Card */}
          {fareRule && (
            <Animated.View entering={FadeInDown.delay(200)} style={styles.fareCard}>
              <View style={styles.fareCardHeader}>
                <MaterialCommunityIcons name="currency-inr" size={18} color="#F97316" />
                <Text style={styles.fareCardTitle}>Your Fare Rate</Text>
                <View style={styles.fareVehicleBadge}>
                  <Text style={styles.fareVehicleText}>{fareRule.vehicleType || ''}</Text>
                </View>
              </View>
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Base Fare</Text>
                <Text style={styles.fareValue}>₹{fareRule.baseFare ?? '—'}</Text>
              </View>
              <View style={styles.fareDivider} />
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Includes first</Text>
                <Text style={styles.fareValue}>{fareRule.baseKm ?? '—'} km</Text>
              </View>
              <View style={styles.fareDivider} />
              <View style={styles.fareRow}>
                <Text style={styles.fareLabel}>Per extra km</Text>
                <Text style={styles.fareValue}>₹{fareRule.perKmRate ?? '—'}</Text>
              </View>
              {fareRule.rainActive && (
                <>
                  <View style={styles.fareDivider} />
                  <View style={styles.fareRow}>
                    <Text style={[styles.fareLabel, { color: '#2563EB' }]}>🌧️ Rain Surcharge</Text>
                    <Text style={[styles.fareValue, { color: '#2563EB' }]}>+₹{fareRule.rainSurcharge ?? '—'}</Text>
                  </View>
                </>
              )}
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
                   <ActivityIndicator size="large" color="#C2410C" />
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
  payoutBtn: { backgroundColor: '#C2410C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  payoutBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 68, paddingTop: 10, backgroundColor: '#FFFFFF' },
  
  chartSection: { backgroundColor: '#FFFFFF', marginTop: 10, marginBottom: 20 },
  topLabel: { color: '#1E293B', fontSize: 17, fontWeight: '700' },
  topValue: { color: '#0F172A', fontSize: 44, fontWeight: '800', marginTop: 4, letterSpacing: -1 },
  
  togglePillContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 24, padding: 4, marginTop: 20, marginBottom: 10 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  toggleBtnActive: { backgroundColor: '#0F172A', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  toggleTextActive: { color: '#FFFFFF' },
  
  chartWrapper: { marginLeft: -16, marginTop: 10 },
  chartStyle: { marginVertical: 8 },
  
  dividerLight: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  statBox: { alignItems: 'center', flex: 1 },
  statVal: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  statLab: { color: '#64748B', fontSize: 13, fontWeight: '500', marginTop: 4 },
  vertDivider: { width: 1, height: 30, backgroundColor: '#F1F5F9' },
  
  mockupHistoryTile: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFD', padding: 20, borderRadius: 20, marginTop: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  greenCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FBBF24', justifyContent: 'center', alignItems: 'center' },
  historyTileTitle: { color: '#1E293B', fontSize: 15, fontWeight: '700' },
  
  mockupPayoutTile: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginTop: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  payoutLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  greenBriefcase: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FBBF24', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  payoutTileTitle: { color: '#1E293B', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  payoutTileSub: { color: '#64748B', fontSize: 12, fontWeight: '500', lineHeight: 16 },
  payoutTileAmount: { color: '#0F172A', fontSize: 24, fontWeight: '800' },
  
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginHorizontal: 12 },
  historyLabel: { color: '#1A1A1A', fontSize: 15, fontWeight: '700' },
  historySub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  historyAmount: { color: '#1A1A1A', fontSize: 16, fontWeight: '800' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { backgroundColor: '#FFFFFF', borderRadius: 32, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center' },
  settlementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 30 },
  settlementTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  statusContent: { alignItems: 'center', width: '100%' },
  statusMainText: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginTop: 24, textAlign: 'center' },
  statusSubText: { fontSize: 15, color: '#64748B', textAlign: 'center', marginTop: 12, lineHeight: 22 },
  successIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { backgroundColor: '#C2410C', width: '100%', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 32 },
  closeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  fareCard: { backgroundColor: '#FFF7ED', borderRadius: 20, padding: 18, marginTop: 16, borderWidth: 1, borderColor: '#FED7AA' },
  fareCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  fareCardTitle: { color: '#F97316', fontSize: 15, fontWeight: '800', flex: 1 },
  fareVehicleBadge: { backgroundColor: '#F97316', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  fareVehicleText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  fareLabel: { color: '#475569', fontSize: 14, fontWeight: '500' },
  fareValue: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  fareDivider: { height: 1, backgroundColor: '#FED7AA' },
});