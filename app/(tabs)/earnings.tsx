import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import { useUser } from "../../context/UserContext";
import { payoutService } from "../../services/payoutService";
import { profileService } from "../../services/profileService";
import { orderService } from "../../services/orderService";

const { width } = Dimensions.get("window");

type Period = "Day" | "Week" | "Month" | "All";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtMins(mins: number): string {
  if (!mins || mins <= 0) return "0h 0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmtHrs(mins: number): string {
  if (!mins || mins <= 0) return "0.0";
  return (mins / 60).toFixed(1);
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEK_LABEL = ["Wk 1", "Wk 2", "Wk 3", "Wk 4"];

// ─── Build per-day login minutes from completed orders ─────────────────────
// Backend doesn't provide per-day breakdown, so derive from delivery timestamps.
function buildDailyBreakdown(completedOrders: any[]): number[] {
  const weekMins: number[] = [0, 0, 0, 0, 0, 0, 0]; // Mon=0…Sun=6
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  startOfWeek.setHours(0, 0, 0, 0);

  completedOrders.forEach((order) => {
    const ts = order.deliveredAt || order.completedAt || order.updatedAt || order.createdAt;
    if (!ts) return;
    const d = new Date(ts);
    if (d < startOfWeek) return;
    const dow = (d.getDay() + 6) % 7; // 0=Mon
    // Approximate: each order took ~25min online
    const approxMins = order.loginMinutes || order.durationMinutes || 25;
    weekMins[dow] += approxMins;
  });
  return weekMins;
}

// ─── Order History Row ────────────────────────────────────────────────────────
function OrderHistoryRow({ order, theme, index }: any) {
  const rawDate = order.deliveredAt || order.completedAt || order.createdAt || "";
  const formatted = rawDate
    ? new Date(rawDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
  const earning = order.deliveryFee ?? order.earnings ?? order.amount ?? 0;
  const dist = order.distanceKm ? `${Number(order.distanceKm).toFixed(1)} km` : "";
  const oid = order.orderNumber || order.orderId || order.id || `#${index + 1}`;

  return (
    <View style={[histStyles.row, { borderBottomColor: theme.divider }]}>
      <View style={[histStyles.numBox, { backgroundColor: "#16A34A18" }]}>
        <Text style={histStyles.numText}>{index + 1}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[histStyles.oid, { color: theme.text }]} numberOfLines={1}>#{oid}</Text>
        <Text style={[histStyles.date, { color: theme.textSoft }]}>{formatted}</Text>
      </View>
      {dist ? <Text style={[histStyles.dist, { color: theme.textSoft }]}>{dist}</Text> : null}
      <Text style={[histStyles.amt, { color: "#16A34A" }]}>₹{earning}</Text>
    </View>
  );
}
const histStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, gap: 10 },
  numBox: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  numText: { color: "#16A34A", fontSize: 12, fontWeight: "800" },
  oid: { fontSize: 13, fontWeight: "700" },
  date: { fontSize: 11, marginTop: 1 },
  dist: { fontSize: 11 },
  amt: { fontSize: 14, fontWeight: "900" },
});

// ─── Day Bar (single day in weekly view) ──────────────────────────────────────
function DayBar({ label, mins, maxMins, isToday, theme }: any) {
  const pct = maxMins > 0 ? Math.min((mins / maxMins), 1) : 0;
  const barH = Math.max(4, Math.round(pct * 80));
  const hrs = fmtHrs(mins);

  return (
    <View style={dayBarStyles.col}>
      <Text style={[dayBarStyles.val, { color: theme.text, opacity: mins > 0 ? 1 : 0.3 }]}>{hrs}h</Text>
      <View style={[dayBarStyles.track, { backgroundColor: theme.surfaceMuted }]}>
        <View style={[
          dayBarStyles.fill,
          { height: barH, backgroundColor: isToday ? "#F97316" : "#3B82F6" },
          isToday && { shadowColor: "#F97316", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 4 },
        ]} />
      </View>
      <Text style={[dayBarStyles.lbl, { color: isToday ? "#F97316" : theme.textMuted, fontWeight: isToday ? "800" : "600" }]}>
        {label}
      </Text>
    </View>
  );
}
const dayBarStyles = StyleSheet.create({
  col: { alignItems: "center", flex: 1 },
  val: { fontSize: 10, fontWeight: "700", marginBottom: 4 },
  track: { width: 16, height: 80, borderRadius: 8, justifyContent: "flex-end", overflow: "hidden" },
  fill: { width: "100%", borderRadius: 8 },
  lbl: { fontSize: 11, marginTop: 6 },
});

// ─── Period Pill ──────────────────────────────────────────────────────────────
function PeriodPill({ label, active, onPress, theme }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        pillStyles.btn,
        active
          ? { backgroundColor: "#F97316", shadowColor: "#F97316", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 4 }
          : { backgroundColor: theme.surfaceMuted, borderWidth: 1, borderColor: theme.border },
      ]}
      activeOpacity={0.8}
    >
      <Text style={[pillStyles.text, { color: active ? "#fff" : theme.textMuted, fontWeight: active ? "800" : "600" }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
const pillStyles = StyleSheet.create({
  btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  text: { fontSize: 13 },
});

// ─── Metric chip ──────────────────────────────────────────────────────────────
function MetricChip({ icon, label, value, color, theme }: any) {
  return (
    <View style={[chipStyles.chip, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
      <View style={[chipStyles.iconBox, { backgroundColor: color + "18" }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <View>
        <Text style={[chipStyles.value, { color: theme.text }]}>{value}</Text>
        <Text style={[chipStyles.label, { color: theme.textMuted }]}>{label}</Text>
      </View>
    </View>
  );
}
const chipStyles = StyleSheet.create({
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  value: { fontSize: 16, fontWeight: "800" },
  label: { fontSize: 10, fontWeight: "600", marginTop: 1, textTransform: "uppercase", letterSpacing: 0.4 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function Earnings() {
  const { theme } = useTheme();
  const { authState } = useUser();
  const user = authState.user;

  const [activePeriod, setActivePeriod] = useState<Period>("Week");
  const [refreshing, setRefreshing] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [payoutsExpanded, setPayoutsExpanded] = useState(false);
  const [fareExpanded, setFareExpanded] = useState(false);

  // All backend stats
  const [stats, setStats] = useState({
    totalEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    dailyEarnings: 0,
    completedOrders: 0,
    weeklyOrders: 0,
    monthlyOrders: 0,
    dailyOrders: 0,
    payouts: [] as any[],
    // Login minutes by period
    totalLoginMinutes: 0,
    weeklyLoginMinutes: 0,
    monthlyLoginMinutes: 0,
    dailyLoginMinutes: 0,
    rating: "--" as string | number,
  });

  const [fareRule, setFareRule] = useState<any>(null);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [dailyMinBreakdown, setDailyMinBreakdown] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      const [statsRes, payoutsRes, dashboardRes, fareRuleRes, completedRes] = await Promise.all([
        orderService.getStatistics(user.id).catch(() => ({})),
        payoutService.getRecentPayouts(user.id, 20).catch(() => []),
        profileService.getDashboard().catch(() => null),
        profileService.getMyFareRule().catch(() => null),
        orderService.getCompletedOrders(user.id).catch(() => []),
      ]);

      // Normalise completed orders
      let rawCompleted: any[] = [];
      if (Array.isArray(completedRes)) rawCompleted = completedRes;
      else if (completedRes && typeof completedRes === "object") {
        for (const k of ["data", "content", "orders", "completedOrders"]) {
          if (Array.isArray((completedRes as any)[k])) { rawCompleted = (completedRes as any)[k]; break; }
        }
      }
      setCompletedOrders(rawCompleted);

      // Daily breakdown from order timestamps
      setDailyMinBreakdown(buildDailyBreakdown(rawCompleted));

      const dash = dashboardRes?.dashboard || dashboardRes || {};
      const payoutsArray = Array.isArray(payoutsRes) ? payoutsRes :
        (Array.isArray((payoutsRes as any)?.data) ? (payoutsRes as any).data : []);

      setStats({
        totalEarnings: statsRes?.totalEarnings || 0,
        weeklyEarnings: statsRes?.weeklyEarnings || dash?.weeklyEarnings || 0,
        monthlyEarnings: statsRes?.monthlyEarnings || dash?.monthlyEarnings || 0,
        dailyEarnings: statsRes?.dailyEarnings || statsRes?.todayEarnings || 0,
        completedOrders: statsRes?.completedOrders || rawCompleted.length || 0,
        weeklyOrders: statsRes?.weeklyOrders || 0,
        monthlyOrders: statsRes?.monthlyOrders || 0,
        dailyOrders: statsRes?.dailyOrders || statsRes?.todayOrders || 0,
        payouts: payoutsArray,
        // Login minutes — try all known keys
        totalLoginMinutes:
          dash?.totalLoginMinutes || statsRes?.totalLoginMinutes || statsRes?.loginMinutes || 0,
        weeklyLoginMinutes:
          dash?.weeklyLoginMinutes || statsRes?.weeklyLoginMinutes || 0,
        monthlyLoginMinutes:
          dash?.monthlyLoginMinutes || statsRes?.monthlyLoginMinutes || 0,
        dailyLoginMinutes:
          dash?.dailyLoginMinutes || statsRes?.dailyLoginMinutes || dash?.todayLoginMinutes || statsRes?.todayLoginMinutes || 0,
        rating: statsRes?.rating || "--",
      });

      if (fareRuleRes?.fareRule) setFareRule(fareRuleRes.fareRule);
    } catch (e) {
      console.warn("Earnings fetch error:", e);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [user?.id]);
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  // ── Derived values by period ─────────────────────────────────────────────
  const displayEarnings =
    activePeriod === "Day" ? stats.dailyEarnings :
    activePeriod === "Week" ? stats.weeklyEarnings :
    activePeriod === "Month" ? stats.monthlyEarnings :
    stats.totalEarnings;

  const displayOrders =
    activePeriod === "Day" ? stats.dailyOrders :
    activePeriod === "Week" ? stats.weeklyOrders :
    activePeriod === "Month" ? stats.monthlyOrders :
    stats.completedOrders;

  const displayLoginMins =
    activePeriod === "Day" ? stats.dailyLoginMinutes :
    activePeriod === "Week" ? stats.weeklyLoginMinutes :
    activePeriod === "Month" ? stats.monthlyLoginMinutes :
    stats.totalLoginMinutes;

  // Earnings per hour online
  const earningsPerHour =
    displayLoginMins > 0 ? (displayEarnings / (displayLoginMins / 60)) : 0;

  // Active day index (0=Mon…6=Sun)
  const todayIdx = (new Date().getDay() + 6) % 7;
  const maxDayMins = Math.max(...dailyMinBreakdown, 1);

  // Monthly weekly grouping (4 weeks)
  const weeklyMinsForMonth: number[] = [0, 0, 0, 0];
  completedOrders.forEach((o) => {
    const ts = o.deliveredAt || o.completedAt || o.createdAt;
    if (!ts) return;
    const d = new Date(ts);
    const now = new Date();
    if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return;
    const weekIdx = Math.min(Math.floor((d.getDate() - 1) / 7), 3);
    weeklyMinsForMonth[weekIdx] += o.loginMinutes || o.durationMinutes || 25;
  });

  // ── Chart for earnings ───────────────────────────────────────────────────
  const earningsChartLabels =
    activePeriod === "Day" ? ["6AM", "9AM", "12PM", "3PM", "6PM", "9PM", "Now"] :
    activePeriod === "Week" ? DAY_NAMES :
    activePeriod === "Month" ? WEEK_LABEL :
    ["Jan", "Mar", "May", "Jul", "Sep", "Nov", "Now"];

  const earningsChartValues = earningsChartLabels.map((_, i) =>
    i === earningsChartLabels.length - 1 && displayEarnings > 0 ? displayEarnings : 0
  );

  const handleWithdraw = () => {
    setShowPayoutModal(true);
    setPayoutLoading(true);
    setPayoutSuccess(false);
    setTimeout(() => { setPayoutLoading(false); setPayoutSuccess(true); }, 3000);
  };

  const s = makeStyles(theme);

  return (
    <View style={s.root}>
      <StatusBar style={theme.statusBar} />
      <SafeAreaView style={s.safe} edges={["top"]}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Earnings & Hours</Text>
            <Text style={s.headerSub}>Track your time & income</Text>
          </View>
          <TouchableOpacity
            onPress={() => Alert.alert("Coming Soon", "Withdrawal coming soon!")}
            style={s.withdrawBtn}
          >
            <MaterialCommunityIcons name="bank-transfer" size={15} color="#fff" />
            <Text style={s.withdrawBtnText}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        {/* ── Period pills ──────────────────────────────────────────────── */}
        <View style={[s.pillRow, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
          {(["Day", "Week", "Month", "All"] as Period[]).map((p) => (
            <PeriodPill key={p} label={p} active={activePeriod === p} onPress={() => setActivePeriod(p)} theme={theme} />
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor={theme.primary} colors={[theme.primary]} />
          }
        >

          {/* ══════════════════════════════════════════════════════════════
              SECTION 1 — EARNINGS HERO
          ══════════════════════════════════════════════════════════════ */}
          <Animated.View entering={FadeInDown.duration(500)}>
            <LinearGradient colors={["#111827", "#1F2937"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroCard}>
              <Text style={s.heroPeriodLabel}>
                {activePeriod === "Day" ? "Today's Earnings" :
                 activePeriod === "Week" ? "This Week" :
                 activePeriod === "Month" ? "This Month" : "All Time"}
              </Text>
              <Text style={s.heroAmount}>₹{(displayEarnings ?? 0).toFixed(0)}</Text>

              <View style={s.heroMetaRow}>
                <View style={s.heroMeta}>
                  <MaterialCommunityIcons name="package-variant-closed" size={13} color="#60A5FA" />
                  <Text style={s.heroMetaText}>{displayOrders} deliveries</Text>
                </View>
                <View style={s.heroDot} />
                <View style={s.heroMeta}>
                  <MaterialCommunityIcons name="clock-outline" size={13} color="#4ADE80" />
                  <Text style={s.heroMetaText}>{fmtMins(displayLoginMins)} online</Text>
                </View>
                {earningsPerHour > 0 && (
                  <>
                    <View style={s.heroDot} />
                    <View style={s.heroMeta}>
                      <MaterialCommunityIcons name="trending-up" size={13} color="#FBBF24" />
                      <Text style={s.heroMetaText}>₹{earningsPerHour.toFixed(0)}/hr</Text>
                    </View>
                  </>
                )}
              </View>

              {/* Quick compare chips */}
              <View style={s.heroChips}>
                <View style={s.heroChip}>
                  <Text style={s.heroChipLabel}>⭐ Rating</Text>
                  <Text style={s.heroChipValue}>{stats.rating}</Text>
                </View>
                <View style={[s.heroChip, { backgroundColor: "rgba(74,222,128,0.12)" }]}>
                  <Text style={s.heroChipLabel}>🚀 Total</Text>
                  <Text style={s.heroChipValue}>₹{(stats.totalEarnings).toFixed(0)}</Text>
                </View>
                <View style={[s.heroChip, { backgroundColor: "rgba(251,191,36,0.12)" }]}>
                  <Text style={s.heroChipLabel}>📦 Orders</Text>
                  <Text style={s.heroChipValue}>{stats.completedOrders}</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── Metric chips row ── */}
          <Animated.View entering={FadeInDown.delay(80)} style={s.chipRow}>
            <MetricChip icon="currency-inr" label="Earnings" value={`₹${(displayEarnings ?? 0).toFixed(0)}`} color="#F97316" theme={theme} />
            <MetricChip icon="clock-fast" label="Hours" value={fmtMins(displayLoginMins)} color="#3B82F6" theme={theme} />
            <MetricChip icon="star" label="Rating" value={stats.rating} color="#FBBF24" theme={theme} />
          </Animated.View>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 2 — LOGIN HOURS BREAKDOWN
          ══════════════════════════════════════════════════════════════ */}
          <Animated.View entering={FadeInDown.delay(120)}>
            <View style={[s.sectionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>

              {/* Section header */}
              <View style={s.sectionTop}>
                <View style={[s.sectionIconBox, { backgroundColor: "#3B82F618" }]}>
                  <MaterialCommunityIcons name="clock-time-four-outline" size={20} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.sectionTitle, { color: theme.text }]}>Login Hours</Text>
                  <Text style={[s.sectionSub, { color: theme.textMuted }]}>Time spent online on the app</Text>
                </View>
                <Text style={[s.sectionBig, { color: "#3B82F6" }]}>{fmtMins(displayLoginMins)}</Text>
              </View>

              <View style={[s.divider, { backgroundColor: theme.divider }]} />

              {/* ── Weekly bar chart (Day or Week period) ── */}
              {(activePeriod === "Day" || activePeriod === "Week") && (
                <>
                  <Text style={[s.subsectionTitle, { color: theme.textMuted }]}>
                    {activePeriod === "Day" ? "Today vs this week" : "This week — day by day"}
                  </Text>
                  <View style={s.dayBarsRow}>
                    {DAY_NAMES.map((day, i) => (
                      <DayBar
                        key={day}
                        label={day}
                        mins={dailyMinBreakdown[i]}
                        maxMins={maxDayMins}
                        isToday={i === todayIdx}
                        theme={theme}
                      />
                    ))}
                  </View>
                  <View style={[s.legendRow]}>
                    <View style={s.legendItem}>
                      <View style={[s.legendDot, { backgroundColor: "#F97316" }]} />
                      <Text style={[s.legendText, { color: theme.textMuted }]}>Today</Text>
                    </View>
                    <View style={s.legendItem}>
                      <View style={[s.legendDot, { backgroundColor: "#3B82F6" }]} />
                      <Text style={[s.legendText, { color: theme.textMuted }]}>Other days</Text>
                    </View>
                  </View>
                </>
              )}

              {/* ── Monthly weekly bars ── */}
              {activePeriod === "Month" && (
                <>
                  <Text style={[s.subsectionTitle, { color: theme.textMuted }]}>Weekly breakdown this month</Text>
                  <View style={s.dayBarsRow}>
                    {WEEK_LABEL.map((wk, i) => (
                      <DayBar
                        key={wk}
                        label={wk}
                        mins={weeklyMinsForMonth[i]}
                        maxMins={Math.max(...weeklyMinsForMonth, 1)}
                        isToday={false}
                        theme={theme}
                      />
                    ))}
                  </View>
                </>
              )}

              {/* ── All-time stats ── */}
              {activePeriod === "All" && (
                <View style={s.allTimeGrid}>
                  {[
                    { label: "Today", mins: stats.dailyLoginMinutes, icon: "weather-sunny", color: "#F97316" },
                    { label: "This Week", mins: stats.weeklyLoginMinutes, icon: "calendar-week", color: "#3B82F6" },
                    { label: "This Month", mins: stats.monthlyLoginMinutes, icon: "calendar-month", color: "#8B5CF6" },
                    { label: "All Time", mins: stats.totalLoginMinutes, icon: "infinity", color: "#16A34A" },
                  ].map(({ label, mins, icon, color }) => (
                    <View key={label} style={[s.allTimeItem, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
                      <View style={[s.allTimeIconBox, { backgroundColor: color + "18" }]}>
                        <MaterialCommunityIcons name={icon as any} size={18} color={color} />
                      </View>
                      <Text style={[s.allTimeValue, { color: theme.text }]}>{fmtMins(mins)}</Text>
                      <Text style={[s.allTimeLabel, { color: theme.textMuted }]}>{label}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={[s.divider, { backgroundColor: theme.divider, marginTop: 12 }]} />

              {/* ── Efficiency row ── */}
              <View style={s.effRow}>
                <View style={s.effItem}>
                  <Text style={[s.effLabel, { color: theme.textMuted }]}>Avg Earnings/Hr</Text>
                  <Text style={[s.effValue, { color: theme.text }]}>
                    {earningsPerHour > 0 ? `₹${earningsPerHour.toFixed(0)}` : "—"}
                  </Text>
                </View>
                <View style={[s.effDivider, { backgroundColor: theme.divider }]} />
                <View style={s.effItem}>
                  <Text style={[s.effLabel, { color: theme.textMuted }]}>Avg Delivery Time</Text>
                  <Text style={[s.effValue, { color: theme.text }]}>
                    {displayOrders > 0 ? `${Math.round(displayLoginMins / displayOrders)}m` : "—"}
                  </Text>
                </View>
                <View style={[s.effDivider, { backgroundColor: theme.divider }]} />
                <View style={s.effItem}>
                  <Text style={[s.effLabel, { color: theme.textMuted }]}>Active Days</Text>
                  <Text style={[s.effValue, { color: theme.text }]}>
                    {dailyMinBreakdown.filter(m => m > 0).length}/7
                  </Text>
                </View>
              </View>

            </View>
          </Animated.View>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 3 — EARNINGS CHART
          ══════════════════════════════════════════════════════════════ */}
          <Animated.View entering={FadeInDown.delay(160)}>
            <View style={[s.sectionCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <View style={s.sectionTop}>
                <View style={[s.sectionIconBox, { backgroundColor: "#F9731618" }]}>
                  <MaterialCommunityIcons name="chart-line-variant" size={20} color="#F97316" />
                </View>
                <Text style={[s.sectionTitle, { color: theme.text }]}>Earnings Chart</Text>
              </View>
              {/* Custom earnings bar chart (no external deps) */}
              <View style={{ flexDirection: "row", alignItems: "flex-end", height: 100, marginTop: 14, gap: 4 }}>
                {earningsChartLabels.map((label, i) => {
                  const val = earningsChartValues[i] ?? 0;
                  const maxVal = Math.max(...earningsChartValues, 1);
                  const pct = val / maxVal;
                  const barH = Math.max(4, Math.round(pct * 72));
                  const isLast = i === earningsChartLabels.length - 1;
                  return (
                    <View key={label} style={{ flex: 1, alignItems: "center", gap: 4 }}>
                      <View style={{
                        width: "70%", height: barH,
                        backgroundColor: isLast ? "#F97316" : "#F9731630",
                        borderRadius: 5,
                        shadowColor: isLast ? "#F97316" : undefined,
                        shadowOpacity: isLast ? 0.4 : 0,
                        shadowRadius: 4, elevation: isLast ? 3 : 0,
                      }} />
                      <Text style={{ fontSize: 9, color: theme.textSoft, fontWeight: "600" }}>{label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 4 — NEXT PAYOUT
          ══════════════════════════════════════════════════════════════ */}
          <Animated.View entering={FadeInDown.delay(200)}>
            <View style={[s.payoutCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
              <View style={[s.payoutIconBox, { backgroundColor: "#16A34A18" }]}>
                <MaterialCommunityIcons name="bank-transfer" size={22} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.payoutCardLabel, { color: theme.textMuted }]}>Next Payout</Text>
                <Text style={[s.payoutCardAmount, { color: theme.text }]}>
                  ₹{(stats.weeklyEarnings ?? 0).toFixed(0)}
                </Text>
                <Text style={[s.payoutCardSched, { color: theme.textSoft }]}>Every Tuesday at 8:00 AM</Text>
              </View>
              <TouchableOpacity style={[s.payoutCardBtn, { backgroundColor: "#16A34A" }]} onPress={handleWithdraw}>
                <Text style={s.payoutCardBtnText}>Request</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 5 — ORDER HISTORY
          ══════════════════════════════════════════════════════════════ */}
          <Animated.View entering={FadeInDown.delay(240)}>
            <TouchableOpacity
              style={[s.accordionHeader, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
              onPress={() => setHistoryExpanded(!historyExpanded)}
              activeOpacity={0.8}
            >
              <View style={[s.sectionIconBox, { backgroundColor: "#16A34A18" }]}>
                <MaterialCommunityIcons name="history" size={18} color="#16A34A" />
              </View>
              <Text style={[s.accordionTitle, { color: theme.text }]}>
                Order History {completedOrders.length > 0 ? `(${completedOrders.length})` : ""}
              </Text>
              <MaterialCommunityIcons
                name={historyExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.textMuted}
              />
            </TouchableOpacity>

            {historyExpanded && (
              <View style={[s.accordionBody, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                {completedOrders.length === 0 ? (
                  <View style={s.emptyBox}>
                    <MaterialCommunityIcons name="inbox-outline" size={38} color={theme.textSoft} />
                    <Text style={[s.emptyText, { color: theme.textMuted }]}>No completed orders yet</Text>
                  </View>
                ) : (
                  completedOrders.slice(0, 30).map((o, i) => (
                    <OrderHistoryRow key={o.id || i} order={o} theme={theme} index={i} />
                  ))
                )}
              </View>
            )}
          </Animated.View>

          {/* ══════════════════════════════════════════════════════════════
              SECTION 6 — PAYOUT HISTORY
          ══════════════════════════════════════════════════════════════ */}
          {stats.payouts.length > 0 && (
            <Animated.View entering={FadeInDown.delay(260)}>
              <TouchableOpacity
                style={[s.accordionHeader, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                onPress={() => setPayoutsExpanded(!payoutsExpanded)}
                activeOpacity={0.8}
              >
                <View style={[s.sectionIconBox, { backgroundColor: "#8B5CF618" }]}>
                  <MaterialCommunityIcons name="wallet-outline" size={18} color="#8B5CF6" />
                </View>
                <Text style={[s.accordionTitle, { color: theme.text }]}>
                  Payout History ({stats.payouts.length})
                </Text>
                <MaterialCommunityIcons
                  name={payoutsExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.textMuted}
                />
              </TouchableOpacity>

              {payoutsExpanded && (
                <View style={[s.accordionBody, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                  {stats.payouts.map((p, i) => {
                    const isPaid = p.status === "PROCESSED" || p.status === "PAID";
                    return (
                      <View key={i} style={[s.payoutRow, { borderBottomColor: theme.divider }]}>
                        <View style={[s.payoutRowIcon, { backgroundColor: isPaid ? "#16A34A18" : "#F9731618" }]}>
                          <MaterialCommunityIcons
                            name={isPaid ? "check-circle" : "clock-outline"}
                            size={16}
                            color={isPaid ? "#16A34A" : "#F97316"}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.payoutRowLabel, { color: theme.text }]}>
                            {p.period || `Payout #${p.id || i + 1}`}
                          </Text>
                          <Text style={[s.payoutRowSub, { color: theme.textSoft }]}>
                            {p.ordersIncluded || 0} orders
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={[s.payoutRowAmt, { color: "#16A34A" }]}>₹{p.amount || 0}</Text>
                          <View style={[s.payoutStatusBadge, { backgroundColor: isPaid ? "#16A34A18" : "#F9731618" }]}>
                            <Text style={[s.payoutStatusText, { color: isPaid ? "#16A34A" : "#F97316" }]}>
                              {p.status || "PENDING"}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </Animated.View>
          )}

          {/* ══════════════════════════════════════════════════════════════
              SECTION 7 — FARE RULES
          ══════════════════════════════════════════════════════════════ */}
          {fareRule && (
            <Animated.View entering={FadeInDown.delay(280)}>
              <TouchableOpacity
                style={[s.accordionHeader, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}
                onPress={() => setFareExpanded(!fareExpanded)}
                activeOpacity={0.8}
              >
                <View style={[s.sectionIconBox, { backgroundColor: "#F9731618" }]}>
                  <MaterialCommunityIcons name="currency-inr" size={18} color="#F97316" />
                </View>
                <Text style={[s.accordionTitle, { color: theme.text }]}>Fare Rate</Text>
                <View style={[s.vehicleBadge, { backgroundColor: "#F97316" }]}>
                  <Text style={s.vehicleBadgeText}>{fareRule.vehicleType || "Bike"}</Text>
                </View>
                <MaterialCommunityIcons
                  name={fareExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.textMuted}
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>

              {fareExpanded && (
                <View style={[s.accordionBody, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                  {[
                    { label: "Base Fare", value: `₹${fareRule.baseFare ?? "—"}` },
                    { label: "Includes first", value: `${fareRule.baseKm ?? "—"} km` },
                    { label: "Per extra km", value: `₹${fareRule.perKmRate ?? "—"}` },
                  ].map(({ label, value }, i) => (
                    <View key={i} style={[s.fareRow, { borderBottomColor: theme.divider }]}>
                      <Text style={[s.fareLabel, { color: theme.textMuted }]}>{label}</Text>
                      <Text style={[s.fareValue, { color: theme.text }]}>{value}</Text>
                    </View>
                  ))}
                  {fareRule.rainActive && (
                    <View style={[s.fareRow, { borderBottomColor: theme.divider }]}>
                      <Text style={[s.fareLabel, { color: "#388BFD" }]}>🌧 Rain Surcharge</Text>
                      <Text style={[s.fareValue, { color: "#388BFD" }]}>+₹{fareRule.rainSurcharge ?? "—"}</Text>
                    </View>
                  )}
                </View>
              )}
            </Animated.View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      {/* ── Payout modal ─────────────────────────────────────────────── */}
      <Modal visible={showPayoutModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Animated.View entering={ZoomIn} style={[s.modalBox, { backgroundColor: theme.surface }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: theme.text }]}>Early Settlement</Text>
              {!payoutLoading && (
                <TouchableOpacity onPress={() => setShowPayoutModal(false)}>
                  <MaterialCommunityIcons name="close" size={22} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            {payoutLoading ? (
              <View style={s.modalBody}>
                <ActivityIndicator size="large" color="#F97316" />
                <Text style={[s.modalStatus, { color: theme.text }]}>Processing...</Text>
                <Text style={[s.modalSub, { color: theme.textMuted }]}>Transferring to your bank account.</Text>
              </View>
            ) : payoutSuccess ? (
              <View style={s.modalBody}>
                <View style={[s.successCircle, { backgroundColor: "#16A34A18" }]}>
                  <MaterialCommunityIcons name="check-bold" size={38} color="#16A34A" />
                </View>
                <Text style={[s.modalStatus, { color: "#16A34A" }]}>Submitted!</Text>
                <Text style={[s.modalSub, { color: theme.textMuted }]}>Funds reflect within 24 hours.</Text>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: "#16A34A" }]}
                  onPress={() => { setShowPayoutModal(false); setPayoutSuccess(false); }}
                >
                  <Text style={s.modalBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
function makeStyles(theme: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg },
    safe: { flex: 1 },

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: theme.headerBg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: { fontSize: 18, fontWeight: "800", color: theme.headerText },
    headerSub: { fontSize: 11, color: theme.textSoft, marginTop: 2 },
    withdrawBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#C2410C",
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
    },
    withdrawBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },

    // Period pills
    pillRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },

    // Scroll
    scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 80 },

    // Hero card
    heroCard: { borderRadius: 22, padding: 22, marginBottom: 12 },
    heroPeriodLabel: { color: "#8B949E", fontSize: 12, fontWeight: "600", marginBottom: 4 },
    heroAmount: { color: "#FFFFFF", fontSize: 46, fontWeight: "900", letterSpacing: -1, marginBottom: 8 },
    heroMetaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4, marginBottom: 14 },
    heroMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
    heroMetaText: { color: "#C9D1D9", fontSize: 12, fontWeight: "600" },
    heroDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#484F58" },
    heroChips: { flexDirection: "row", gap: 8 },
    heroChip: {
      flex: 1,
      backgroundColor: "rgba(255,255,255,0.07)",
      borderRadius: 12,
      padding: 10,
      alignItems: "center",
    },
    heroChipLabel: { color: "#8B949E", fontSize: 10, fontWeight: "600", marginBottom: 2 },
    heroChipValue: { color: "#E6EDF3", fontSize: 14, fontWeight: "800" },

    // Chips row
    chipRow: { flexDirection: "row", marginBottom: 12 },

    // Section card
    sectionCard: {
      borderRadius: 18,
      borderWidth: 1,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    sectionTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
    sectionIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    sectionTitle: { flex: 1, fontSize: 15, fontWeight: "800" },
    sectionSub: { fontSize: 11, marginTop: 1 },
    sectionBig: { fontSize: 18, fontWeight: "900" },
    divider: { height: 1, marginVertical: 12 },
    subsectionTitle: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 },

    // Day bars
    dayBarsRow: { flexDirection: "row", alignItems: "flex-end", height: 120, marginBottom: 6 },
    legendRow: { flexDirection: "row", gap: 16, marginTop: 4 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, fontWeight: "600" },

    // All-time grid
    allTimeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    allTimeItem: {
      width: (width - 80) / 2,
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      alignItems: "center",
      gap: 6,
    },
    allTimeIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    allTimeValue: { fontSize: 18, fontWeight: "800" },
    allTimeLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 },

    // Efficiency row
    effRow: { flexDirection: "row", alignItems: "center" },
    effItem: { flex: 1, alignItems: "center" },
    effLabel: { fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 },
    effValue: { fontSize: 16, fontWeight: "900" },
    effDivider: { width: 1, height: 32 },

    // Payout card
    payoutCard: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginBottom: 12,
      gap: 12,
    },
    payoutIconBox: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    payoutCardLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 },
    payoutCardAmount: { fontSize: 22, fontWeight: "900" },
    payoutCardSched: { fontSize: 11, marginTop: 3 },
    payoutCardBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    payoutCardBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

    // Accordion
    accordionHeader: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      marginBottom: 4,
      gap: 10,
    },
    accordionTitle: { flex: 1, fontSize: 14, fontWeight: "700" },
    accordionBody: {
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingBottom: 4,
      marginBottom: 12,
    },

    // Empty
    emptyBox: { alignItems: "center", paddingVertical: 24, gap: 8 },
    emptyText: { fontSize: 14 },

    // Payout rows
    payoutRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      gap: 10,
    },
    payoutRowIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    payoutRowLabel: { fontSize: 13, fontWeight: "700" },
    payoutRowSub: { fontSize: 11, marginTop: 1 },
    payoutRowAmt: { fontSize: 14, fontWeight: "800", marginBottom: 3 },
    payoutStatusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
    payoutStatusText: { fontSize: 10, fontWeight: "800" },

    // Fare rows
    fareRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    fareLabel: { fontSize: 13 },
    fareValue: { fontSize: 13, fontWeight: "700" },
    vehicleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    vehicleBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700", textTransform: "uppercase" },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 24 },
    modalBox: { borderRadius: 24, padding: 24, width: "100%" },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    modalTitle: { fontSize: 17, fontWeight: "800" },
    modalBody: { alignItems: "center" },
    modalStatus: { fontSize: 19, fontWeight: "900", marginTop: 14, textAlign: "center" },
    modalSub: { fontSize: 13, textAlign: "center", marginTop: 8, lineHeight: 20 },
    successCircle: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" },
    modalBtn: { width: "100%", borderRadius: 14, paddingVertical: 13, alignItems: "center", marginTop: 20 },
    modalBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  });
}
