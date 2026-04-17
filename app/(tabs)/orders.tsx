import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguage } from "../../context/LanguageContext";
import { useUser } from "../../context/UserContext";
import { useTheme } from "../../context/ThemeContext";
import { useActiveOrder } from "../../context/ActiveOrderContext";
import { orderService } from "../../services/orderService";

const { width } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────
type OrderItem = { name: string; qty: string; price: number };
type Order = {
  id: number;
  orderId: string;
  vendorName?: string;
  vendorAddress?: string;
  vendorPhone?: string;
  vendorOtp?: string;
  vendorCoords?: { latitude: number; longitude: number };
  pickupConfirmed?: boolean;
  arrivedAtStore?: boolean;
  pickedUpAt?: string | null;
  customer: string;
  phone: string;
  address: string;
  customerCoords?: { latitude: number; longitude: number };
  items: number;
  itemsList: OrderItem[];
  distance: string;
  earnings: number;
  grandTotal: number;
  status: string;
  payment: string;
  otp: string;
  deliveryOtpSent?: boolean;
  deliveryOtpVerified?: boolean;
  deliveryOtpVerifiedAt?: string | null;
  deliveryPhotoUrl?: string | null;
  rawStatus?: string;
};

// ─── Map backend → local Order ────────────────────────────────────────────────
function mapBackendOrder(backendOrder: any): Order {
  const store = backendOrder.store || backendOrder.vendor || backendOrder.merchant || backendOrder.restaurant || backendOrder.pickupLocation || {};
  const storeName = store.name || store.storeName || store.vendorName || backendOrder.vendorName || backendOrder.storeName || backendOrder.pickup?.name || "Unknown Store";
  const storeAddress = store.address || backendOrder.vendorAddress || backendOrder.storeAddress || backendOrder.pickup?.address || "Unknown Address";
  const storePhone = store.phone || store.mobile || backendOrder.vendorPhone || backendOrder.storePhone || "";

  const cust = backendOrder.customer || backendOrder.user || backendOrder.buyer || {};
  const customerName = typeof cust === "string" ? cust :
    cust.firstName ? `${cust.firstName} ${cust.lastName || ""}`.trim() :
    cust.name || backendOrder.customerName || "Customer";
  const customerPhone = cust.phone || cust.mobile || backendOrder.customerPhone || backendOrder.phone || "";
  const customerAddress = cust.address || cust.deliveryAddress || backendOrder.deliveryAddress || backendOrder.address || "Delivery Address";

  const storeLat = store.latitude || store.lat || backendOrder.pickupLatitude;
  const storeLng = store.longitude || store.lng || backendOrder.pickupLongitude;
  const vendorCoords = (storeLat && storeLng) ? { latitude: Number(storeLat), longitude: Number(storeLng) } : undefined;

  const custLat = cust.latitude || cust.lat || backendOrder.deliveryLatitude;
  const custLng = cust.longitude || cust.lng || backendOrder.deliveryLongitude;
  const customerCoords = (custLat && custLng) ? { latitude: Number(custLat), longitude: Number(custLng) } : undefined;

  let rawItems = backendOrder.items || backendOrder.orderItems || backendOrder.products || backendOrder.cartItems || [];
  if (typeof rawItems === "string") { try { rawItems = JSON.parse(rawItems); } catch { rawItems = []; } }
  const itemsList = Array.isArray(rawItems) ? rawItems.map((item: any) => ({
    name: item.name || item.productName || item.title || "Item",
    qty: String(item.qty || item.quantity || 1),
    price: Number(item.price || item.total || 0),
  })) : [];

  const orderNumber = backendOrder.orderNumber || backendOrder.orderId?.toString() || backendOrder.id?.toString() || "#UNK";
  const rawStatus = String(backendOrder.status || "").toUpperCase();
  const pickedUpAt = backendOrder.pickedUpAt || backendOrder.picked_up_at || null;
  const arrivedAtStore = Boolean(backendOrder.arrivedAtStore || backendOrder.arrived_at_store || rawStatus === "ARRIVED_AT_STORE");
  const deliveryOtp = backendOrder.deliveryOtp || backendOrder.otp || "";
  const deliveryOtpSent = Boolean(deliveryOtp || backendOrder.deliveryOtpExpiry);
  const pickupConfirmed = Boolean(backendOrder.pickupConfirmed || pickedUpAt || ["PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED"].includes(rawStatus));

  const riderToStoreDistanceKm = backendOrder.riderToStoreDistanceKm;
  const storeToCustomerDistanceKm = backendOrder.storeToCustomerDistanceKm ?? backendOrder.distanceKm;
  const distanceLabel = pickupConfirmed
    ? (storeToCustomerDistanceKm != null ? `${Number(storeToCustomerDistanceKm).toFixed(1)} km to customer` : (backendOrder.distance || "—"))
    : (riderToStoreDistanceKm != null ? `${Number(riderToStoreDistanceKm).toFixed(1)} km to store` : (backendOrder.distance || "—"));

  const grandTotal = Number(backendOrder.grandTotal || backendOrder.totalAmount || backendOrder.total || 0);
  const isCompleted = ["DELIVERED", "COMPLETED", "CANCELLED"].includes(rawStatus);

  return {
    id: backendOrder.id || Math.random(),
    orderId: orderNumber,
    vendorName: storeName,
    vendorAddress: storeAddress,
    vendorPhone: storePhone,
    vendorOtp: backendOrder.vendorOtp || backendOrder.pickupOtp || "",
    vendorCoords,
    pickupConfirmed,
    arrivedAtStore,
    pickedUpAt,
    customer: customerName,
    phone: customerPhone,
    address: customerAddress,
    customerCoords,
    items: backendOrder.itemsCount || rawItems?.length || 0,
    itemsList,
    distance: distanceLabel,
    earnings: Number(backendOrder.deliveryFee ?? backendOrder.earnings ?? 0),
    grandTotal,
    status: isCompleted ? "Completed" : "Active",
    rawStatus,
    payment: (() => {
      const raw = backendOrder.paymentType || backendOrder.paymentMethod || "";
      if (raw === "COD") return "Cash";
      if (raw === "UPI") return "UPI";
      if (raw === "ONLINE_PAID" || raw === "ONLINE") return "Online";
      return raw || "Online";
    })(),
    otp: deliveryOtp,
    deliveryOtpSent,
    deliveryOtpVerified: Boolean(backendOrder.deliveryOtpVerifiedAt),
    deliveryOtpVerifiedAt: backendOrder.deliveryOtpVerifiedAt || null,
    deliveryPhotoUrl: backendOrder.deliveryPhotoUrl || null,
  };
}

function extractOrders(resp: any): any[] {
  if (Array.isArray(resp)) return resp;
  if (resp && typeof resp === "object") {
    for (const key of ["data", "content", "orders", "activeOrders", "completedOrders"]) {
      if (Array.isArray(resp[key])) return resp[key];
    }
    const arrs = Object.values(resp).filter(Array.isArray) as any[][];
    if (arrs.length > 0) return arrs[0];
  }
  return [];
}

const normalizeTarget = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();
  return normalized.length ? normalized : undefined;
};

const matchesNotificationTarget = (
  order: Order,
  notificationOrderId?: string,
  notificationOrderNumber?: string,
) => {
  const normalizedId = normalizeTarget(notificationOrderId);
  const normalizedNumber = normalizeTarget(notificationOrderNumber);
  const orderId = normalizeTarget(order.id);
  const orderNumber = normalizeTarget(order.orderId);

  return (
    (normalizedId !== undefined &&
      (normalizedId === orderId || normalizedId === orderNumber)) ||
    (normalizedNumber !== undefined && normalizedNumber === orderNumber)
  );
};

// ─── Situational action button helper ────────────────────────────────────────
function getOrderPhase(order: Order) {
  const s = (order.rawStatus || "");
  if (order.pickupConfirmed) return "DELIVER"; // heading to customer
  if (order.arrivedAtStore || s === "ARRIVED_AT_STORE") return "PICKUP"; // at store, enter vendor OTP
  return "GOTO_STORE"; // just accepted, need to reach store
}

// ─── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({ order, onAction, onDetails, theme, isCompleted }: {
  order: Order;
  onAction: (action: string) => void;
  onDetails: () => void;
  theme: any;
  isCompleted: boolean;
}) {
  const phase = isCompleted ? "COMPLETED" : getOrderPhase(order);

  const phaseConfig = {
    GOTO_STORE: { icon: "store-clock", label: "Reached Store", color: "#3B82F6", bg: "#EFF6FF", darkBg: "#0C1D38" },
    PICKUP: { icon: "package-variant-closed-check", label: "Pickup Items", color: "#F97316", bg: "#FFF7ED", darkBg: "#431407" },
    DELIVER: { icon: "map-marker-check", label: "Deliver Order", color: "#16A34A", bg: "#F0FDF4", darkBg: "#0D2818" },
    COMPLETED: { icon: "check-circle", label: "Delivered", color: "#16A34A", bg: "#F0FDF4", darkBg: "#0D2818" },
  }[phase]!;

  const openMaps = (lat?: number, lng?: number) => {
    if (!lat || !lng) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={[
      cardStyles.card,
      { backgroundColor: theme.surface, borderColor: theme.cardBorder },
    ]}>
      {/* Header */}
      <View style={cardStyles.cardHeader}>
        <View style={[cardStyles.orderIdBadge, { backgroundColor: theme.primaryGlow }]}>
          <MaterialCommunityIcons name="receipt" size={12} color={theme.primary} />
          <Text style={[cardStyles.orderIdText, { color: theme.primary }]}>#{order.orderId}</Text>
        </View>
        <View style={[cardStyles.earningsBadge, { backgroundColor: "#16A34A18" }]}>
          <Text style={cardStyles.earningsText}>₹{order.earnings}</Text>
        </View>
      </View>

      {/* Store info */}
      <View style={cardStyles.infoRow}>
        <View style={[cardStyles.iconBox, { backgroundColor: "#3B82F618" }]}>
          <MaterialCommunityIcons name="store" size={18} color="#3B82F6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[cardStyles.infoTitle, { color: theme.text }]} numberOfLines={1}>{order.vendorName}</Text>
          <Text style={[cardStyles.infoSub, { color: theme.textMuted }]} numberOfLines={1}>{order.vendorAddress}</Text>
        </View>
        {order.vendorCoords && (
          <TouchableOpacity onPress={() => openMaps(order.vendorCoords?.latitude, order.vendorCoords?.longitude)} style={cardStyles.mapsBtn}>
            <MaterialCommunityIcons name="map-marker-outline" size={16} color="#3B82F6" />
          </TouchableOpacity>
        )}
      </View>

      {/* Arrow */}
      <View style={cardStyles.arrowRow}>
        <View style={[cardStyles.arrowLine, { backgroundColor: theme.border }]} />
        <MaterialCommunityIcons name="arrow-down" size={16} color={theme.textSoft} />
        <View style={[cardStyles.arrowLine, { backgroundColor: theme.border }]} />
      </View>

      {/* Customer info */}
      <View style={cardStyles.infoRow}>
        <View style={[cardStyles.iconBox, { backgroundColor: "#F9731618" }]}>
          <MaterialCommunityIcons name="account" size={18} color="#F97316" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[cardStyles.infoTitle, { color: theme.text }]} numberOfLines={1}>{order.customer}</Text>
          <Text style={[cardStyles.infoSub, { color: theme.textMuted }]} numberOfLines={1}>{order.address}</Text>
        </View>
        {order.customerCoords && (
          <TouchableOpacity onPress={() => openMaps(order.customerCoords?.latitude, order.customerCoords?.longitude)} style={cardStyles.mapsBtn}>
            <MaterialCommunityIcons name="map-marker-outline" size={16} color="#F97316" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats row */}
      <View style={[cardStyles.statsRow, { borderColor: theme.border }]}>
        <View style={cardStyles.statItem}>
          <MaterialCommunityIcons name="package-variant" size={14} color={theme.textSoft} />
          <Text style={[cardStyles.statText, { color: theme.textMuted }]}>{order.items} items</Text>
        </View>
        <View style={[cardStyles.statDivider, { backgroundColor: theme.border }]} />
        <View style={cardStyles.statItem}>
          <MaterialCommunityIcons name="map-marker-distance" size={14} color={theme.textSoft} />
          <Text style={[cardStyles.statText, { color: theme.textMuted }]}>{order.distance}</Text>
        </View>
        <View style={[cardStyles.statDivider, { backgroundColor: theme.border }]} />
        <View style={cardStyles.statItem}>
          <MaterialCommunityIcons
            name={order.payment === "Cash" ? "cash" : "credit-card-outline"}
            size={14}
            color={theme.textSoft}
          />
          <Text style={[cardStyles.statText, { color: theme.textMuted }]}>{order.payment}</Text>
        </View>
      </View>

      {/* Phase badge */}
      {!isCompleted && (
        <View style={[cardStyles.phaseBadge, { backgroundColor: phaseConfig.bg }]}>
          <MaterialCommunityIcons name={phaseConfig.icon as any} size={13} color={phaseConfig.color} />
          <Text style={[cardStyles.phaseText, { color: phaseConfig.color }]}>
            {phase === "GOTO_STORE" ? "Head to store" :
              phase === "PICKUP" ? "At store — collect items" :
              "En route to customer"}
          </Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={cardStyles.actionRow}>
        <TouchableOpacity
          onPress={onDetails}
          style={[cardStyles.detailsBtn, { borderColor: theme.border }]}
        >
          <Text style={[cardStyles.detailsBtnText, { color: theme.textMuted }]}>Details</Text>
        </TouchableOpacity>

        {!isCompleted && (
          <TouchableOpacity
            onPress={() => onAction(phase)}
            style={[cardStyles.actionBtn, { backgroundColor: phaseConfig.color }]}
          >
            <MaterialCommunityIcons name={phaseConfig.icon as any} size={16} color="#fff" />
            <Text style={cardStyles.actionBtnText}>{phaseConfig.label}</Text>
          </TouchableOpacity>
        )}
        {isCompleted && (
          <View style={[cardStyles.completedChip, { backgroundColor: "#16A34A18" }]}>
            <MaterialCommunityIcons name="check-circle" size={14} color="#16A34A" />
            <Text style={[cardStyles.completedText, { color: "#16A34A" }]}>Delivered</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  orderIdBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  orderIdText: { fontSize: 12, fontWeight: "800" },
  earningsBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  earningsText: { fontSize: 14, fontWeight: "900", color: "#16A34A" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoTitle: { fontSize: 14, fontWeight: "700" },
  infoSub: { fontSize: 12, marginTop: 1 },
  mapsBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowRow: { flexDirection: "row", alignItems: "center", marginVertical: 4, paddingLeft: 46, gap: 4 },
  arrowLine: { flex: 1, height: 1 },
  statsRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  statItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  statDivider: { width: 1 },
  statText: { fontSize: 12, fontWeight: "600" },
  phaseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  phaseText: { fontSize: 12, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 8 },
  detailsBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  detailsBtnText: { fontSize: 13, fontWeight: "700" },
  actionBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 10 },
  actionBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  completedChip: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 10 },
  completedText: { fontSize: 13, fontWeight: "700" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OrdersTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    notificationOrderId?: string | string[];
    notificationOrderNumber?: string | string[];
  }>();
  useLanguage();
  const { theme } = useTheme();
  const { authState } = useUser();
  const user = authState.user;
  const { setActiveOrderLocation, clearActiveOrderLocation } = useActiveOrder();
  const handledNotificationKey = useRef<string | null>(null);

  const [activeTab, setActiveTab] = useState<"Active" | "Completed">("Active");
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fulfillment modal state
  const [fulfillmentOrder, setFulfillmentOrder] = useState<Order | null>(null);
  const [fulfillmentPhase, setFulfillmentPhase] = useState<string>("GOTO_STORE");
  const [fulfillmentVisible, setFulfillmentVisible] = useState(false);

  // OTP state
  const [vendorOtpInput, setVendorOtpInput] = useState("");
  const [vendorOtpVerified, setVendorOtpVerified] = useState(false);
  const [deliveryOtpInput, setDeliveryOtpInput] = useState("");
  const [deliveryOtpVerified, setDeliveryOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  // Photo state
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Payment state
  const [, setPaymentMethod] = useState<"Cash" | "UPI" | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // Detail modal
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // Rating modal
  const [ratingModal, setRatingModal] = useState(false);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [starRating, setStarRating] = useState(0);
  const [ratingNote, setRatingNote] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Success banner
  const [showSuccess, setShowSuccess] = useState(false);

  // ── Fetch orders ─────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setRefreshing(true);
    try {
      if (activeTab === "Active") {
        const rawAll = await orderService.getOrders(user.id).catch(() => []);
        const listAll = extractOrders(rawAll);
        const unique = Array.from(new Map(listAll.map((o: any) => [o.id, o])).values());
        const mapped = (unique as any[])
          .filter((o: any) => !["DELIVERED", "CANCELLED", "COMPLETED"].includes(String(o.status).toUpperCase()))
          .map(mapBackendOrder);
        setOrders(mapped);
        setLastUpdated(new Date());

        // Wire smart location button
        const first = mapped[0];
        if (first) {
          const isPickedUp = Boolean(first.pickupConfirmed);
          const coords = isPickedUp ? first.customerCoords : first.vendorCoords;
          if (coords) {
            setActiveOrderLocation({
              orderId: String(first.id),
              orderNumber: first.orderId,
              isPickedUp,
              targetLat: coords.latitude,
              targetLng: coords.longitude,
              targetLabel: isPickedUp
                ? `${first.customer} — ${first.address}`
                : `${first.vendorName} — ${first.vendorAddress}`,
              targetAddress: isPickedUp ? first.address : (first.vendorAddress || ""),
            });
          } else clearActiveOrderLocation();
        } else clearActiveOrderLocation();
      } else {
        // Completed orders
        let historyRaw: any[] = [];
        try {
          historyRaw = extractOrders(await orderService.getCompletedOrders(user.id));
        } catch { historyRaw = []; }
        if (historyRaw.length === 0) {
          const rawAll = await orderService.getOrders(user.id).catch(() => []);
          historyRaw = extractOrders(rawAll).filter((o: any) =>
            ["DELIVERED", "COMPLETED", "CANCELLED"].includes(String(o.status).toUpperCase())
          );
        }
        const unique = Array.from(new Map(historyRaw.map((o: any) => [o.id, o])).values());
        setOrders((unique as any[]).map(mapBackendOrder));
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.warn("Fetch orders failed:", e);
    } finally {
      if (!silent) setRefreshing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.id]);

  // ── Initial + tab change fetch ────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchOrders(); }, [activeTab, user?.id]);

  // ── Focus re-fetch ────────────────────────────────────────────────────────
  useFocusEffect(useCallback(() => { fetchOrders(); }, [fetchOrders]));

  // ── 2-second real-time polling ────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "Active") return;
    const interval = setInterval(() => fetchOrders(true), 2000);
    return () => clearInterval(interval);
  }, [activeTab, fetchOrders]);

  const notificationOrderId = normalizeTarget(params.notificationOrderId);
  const notificationOrderNumber = normalizeTarget(params.notificationOrderNumber);

  useEffect(() => {
    if (!notificationOrderId && !notificationOrderNumber) {
      handledNotificationKey.current = null;
      return;
    }

    const targetKey = `${notificationOrderId ?? ""}:${notificationOrderNumber ?? ""}`;
    if (handledNotificationKey.current === targetKey) {
      return;
    }

    const openTargetOrder = (targetOrder: Order) => {
      handledNotificationKey.current = targetKey;
      setActiveTab(targetOrder.status === "Completed" ? "Completed" : "Active");
      setDetailOrder(targetOrder);
      setDetailVisible(true);
      router.replace("/(tabs)/orders");
    };

    const existingOrder = orders.find((order) =>
      matchesNotificationTarget(order, notificationOrderId, notificationOrderNumber),
    );
    if (existingOrder) {
      openTargetOrder(existingOrder);
      return;
    }

    let cancelled = false;
    const fetchTargetOrder = async () => {
      try {
        let rawOrder: any = null;
        if (notificationOrderId && !Number.isNaN(Number(notificationOrderId))) {
          rawOrder = await orderService.getOrderById(Number(notificationOrderId)).catch(() => null);
        }
        if (!rawOrder && notificationOrderNumber) {
          rawOrder = await orderService.getOrderByNumber(notificationOrderNumber).catch(() => null);
        }
        if (!cancelled && rawOrder) {
          openTargetOrder(mapBackendOrder(rawOrder));
        }
      } catch {
        // Ignore notification deep-link lookup failures and keep the current list flow.
      }
    };

    fetchTargetOrder();

    return () => {
      cancelled = true;
    };
  }, [notificationOrderId, notificationOrderNumber, orders, router]);

  // ── Action handler ────────────────────────────────────────────────────────
  const handleAction = useCallback(async (order: Order, phase: string) => {
    setFulfillmentOrder(order);
    setFulfillmentPhase(phase);
    setVendorOtpInput(order.vendorOtp || "");
    setVendorOtpVerified(Boolean(order.pickupConfirmed));
    setDeliveryOtpInput(order.otp || "");
    setDeliveryOtpVerified(Boolean(order.deliveryOtpVerified));
    setDeliveryPhoto(order.deliveryPhotoUrl || null);
    setPaymentMethod(null);
    setPaymentConfirmed(false);
    setFulfillmentVisible(true);

    // Auto-mark arrived at store
    if (phase === "GOTO_STORE") {
      try {
        await orderService.arrivedAtStore(order.orderId);
      } catch {}
      setFulfillmentPhase("PICKUP");
    }
  }, []);

  // ── Verify vendor OTP / pickup ────────────────────────────────────────────
  const handlePickup = async () => {
    if (!fulfillmentOrder || !vendorOtpInput) return;
    setLoading(true);
    try {
      await orderService.pickedUpWithOtp(fulfillmentOrder.orderId, vendorOtpInput);
      setVendorOtpVerified(true);
      setOrders((prev) =>
        prev.map((o) => o.id === fulfillmentOrder.id ? { ...o, pickupConfirmed: true } : o)
      );
      setFulfillmentPhase("DELIVER");
      // Auto-generate delivery OTP
      try { await orderService.generateDeliveryOtp(fulfillmentOrder.orderId); } catch {}
      Alert.alert("Picked up!", "Items collected. Head to the customer.");
    } catch (e: any) {
      Alert.alert("Invalid OTP", e?.response?.data?.error || "The pickup code is incorrect.");
    } finally {
      setLoading(false);
    }
  };

  // ── Verify delivery OTP ───────────────────────────────────────────────────
  const handleVerifyDeliveryOtp = async () => {
    if (!fulfillmentOrder || !deliveryOtpInput) return;
    setLoading(true);
    try {
      const res = await orderService.verifyDeliveryOtp(fulfillmentOrder.orderId, deliveryOtpInput);
      if (!res?.valid) throw new Error(res?.message || "Invalid OTP");
      setDeliveryOtpVerified(true);
    } catch (e: any) {
      Alert.alert("Invalid OTP", e?.response?.data?.error || e?.message || "Code is incorrect.");
    } finally {
      setLoading(false);
    }
  };

  // ── Complete delivery ─────────────────────────────────────────────────────
  const handleCompleteDelivery = async () => {
    if (!fulfillmentOrder) return;
    if (!vendorOtpVerified) return Alert.alert("Required", "Pickup must be verified first.");
    if (!deliveryPhoto) return Alert.alert("Required", "Take a photo at the doorstep.");
    if (!deliveryOtpVerified) return Alert.alert("Required", "Verify customer OTP first.");
    if (fulfillmentOrder.payment === "Cash" && !paymentConfirmed) {
      return Alert.alert("Payment", "Confirm cash collection before completing.");
    }
    setLoading(true);
    try {
      await orderService.confirmDeliveryWithPhoto(fulfillmentOrder.orderId, deliveryOtpInput, deliveryPhoto || undefined);
      setOrders((prev) => prev.filter((o) => o.id !== fulfillmentOrder.id));
      setFulfillmentVisible(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      fetchOrders(true);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.error || e?.message || "Could not complete delivery.");
    } finally {
      setLoading(false);
    }
  };

  // ── Camera ────────────────────────────────────────────────────────────────
  const capturePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.2 });
        if (photo?.uri) { setDeliveryPhoto(photo.uri); setShowCamera(false); }
      } catch { Alert.alert("Error", "Could not capture photo."); }
    }
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.2 });
    if (!result.canceled && result.assets?.[0]) setDeliveryPhoto(result.assets[0].uri);
  };

  // ── Submit rating ─────────────────────────────────────────────────────────
  const handleSubmitRating = async () => {
    if (starRating === 0) return Alert.alert("Rating", "Please select a star rating.");
    setRatingSubmitting(true);
    try {
      // Rating submission — log for now; replace with API when available
      console.log("Rating submitted:", { orderId: ratingOrder?.orderId, stars: starRating, note: ratingNote });
      Alert.alert("Thank you!", "Your rating has been submitted.");
      setRatingModal(false);
      setStarRating(0);
      setRatingNote("");
    } catch {
      Alert.alert("Error", "Could not submit rating.");
    } finally {
      setRatingSubmitting(false);
    }
  };

  const filteredOrders = orders.filter((o) =>
    activeTab === "Active" ? o.status === "Active" : o.status === "Completed"
  );

  const s = makeStyles(theme);

  return (
    <View style={s.container}>
      <StatusBar style={theme.statusBar} />
      <SafeAreaView style={s.safe} edges={["top"]}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>Orders</Text>
            {lastUpdated && (
              <Text style={s.headerSub}>Live · {lastUpdated.toLocaleTimeString()}</Text>
            )}
          </View>
          <View style={[s.liveDot, { backgroundColor: activeTab === "Active" ? "#16A34A" : theme.textSoft }]}>
            <Text style={s.liveDotText}>LIVE</Text>
          </View>
        </View>

        {/* ── Tabs ── */}
        <View style={s.tabContainer}>
          {(["Active", "Completed"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[s.tabBtn, activeTab === tab && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
            >
              <Text style={[s.tabText, { color: activeTab === tab ? theme.primary : theme.textMuted, fontWeight: activeTab === tab ? "800" : "600" }]}>
                {tab === "Active" ? "Active Orders" : "Completed"}
              </Text>
              {tab === "Active" && filteredOrders.length > 0 && (
                <View style={[s.tabBadge, { backgroundColor: theme.primary }]}>
                  <Text style={s.tabBadgeText}>{filteredOrders.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Content ── */}
        {activeTab === "Active" ? (
          filteredOrders.length === 0 ? (
            <View style={s.empty}>
              <MaterialCommunityIcons name="clipboard-text-search-outline" size={72} color={theme.textSoft} />
              <Text style={[s.emptyTitle, { color: theme.text }]}>All caught up!</Text>
              <Text style={[s.emptySub, { color: theme.textMuted }]}>No active orders right now.{"\n"}Polling every 2 seconds...</Text>
              {refreshing && <ActivityIndicator color={theme.primary} style={{ marginTop: 16 }} />}
            </View>
          ) : (
            <FlatList
              data={filteredOrders}
              keyExtractor={(item) => String(item.id)}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={width - 32}
              decelerationRate="fast"
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
              renderItem={({ item }) => (
                <View style={{ width: width - 32 }}>
                  <OrderCard
                    order={item}
                    theme={theme}
                    isCompleted={false}
                    onAction={(phase) => handleAction(item, phase)}
                    onDetails={async () => {
                      setDetailOrder(item);
                      setDetailVisible(true);
                    }}
                  />
                </View>
              )}
              ItemSeparatorComponent={() => <View style={{ width: 0 }} />}
              ListHeaderComponent={
                filteredOrders.length > 1 ? (
                  <View style={s.swipeHint}>
                    <MaterialCommunityIcons name="gesture-swipe-horizontal" size={14} color={theme.primary} />
                    <Text style={[s.swipeHintText, { color: theme.textMuted }]}>
                      Swipe to see all {filteredOrders.length} orders
                    </Text>
                  </View>
                ) : null
              }
            />
          )
        ) : (
          <ScrollView
            contentContainerStyle={s.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchOrders()}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
          >
            {filteredOrders.length === 0 ? (
              <View style={s.empty}>
                <MaterialCommunityIcons name="history" size={72} color={theme.textSoft} />
                <Text style={[s.emptyTitle, { color: theme.text }]}>No Completed Orders</Text>
                <Text style={[s.emptySub, { color: theme.textMuted }]}>Your completed deliveries will appear here.</Text>
              </View>
            ) : (
              filteredOrders.map((order) => (
                <View key={order.id}>
                  <OrderCard
                    order={order}
                    theme={theme}
                    isCompleted={true}
                    onAction={() => {}}
                    onDetails={() => { setDetailOrder(order); setDetailVisible(true); }}
                  />
                  {/* Rate delivery row */}
                  <TouchableOpacity
                    style={[s.ratingRow, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => { setRatingOrder(order); setStarRating(0); setRatingNote(""); setRatingModal(true); }}
                  >
                    <MaterialCommunityIcons name="star-outline" size={16} color="#FBBF24" />
                    <Text style={[s.ratingRowText, { color: theme.textMuted }]}>Rate this delivery</Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={theme.textSoft} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        )}

        {/* ── Success banner ── */}
        {showSuccess && (
          <Animated.View entering={ZoomIn} style={[s.successBanner, { backgroundColor: "#16A34A" }]}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#fff" />
            <Text style={s.successText}>Delivery completed! Great job.</Text>
          </Animated.View>
        )}
      </SafeAreaView>

      {/* ═══════════════════════════════════════════════════════════════════════
          FULFILLMENT MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={fulfillmentVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <Animated.View entering={FadeInUp} style={[s.fulfillmentSheet, { backgroundColor: theme.surface }]}>
            {/* Handle + Header */}
            <View style={[s.modalHandle, { backgroundColor: theme.border }]} />
            <View style={s.fulfillmentHeader}>
              <View>
                <Text style={[s.fulfillmentTitle, { color: theme.text }]}>
                  {fulfillmentPhase === "PICKUP" ? "Pickup Items" :
                   fulfillmentPhase === "DELIVER" ? "Complete Delivery" : "At Store"}
                </Text>
                <Text style={[s.fulfillmentSub, { color: theme.textMuted }]}>Order #{fulfillmentOrder?.orderId}</Text>
              </View>
              <TouchableOpacity onPress={() => setFulfillmentVisible(false)} style={[s.closeBtn, { backgroundColor: theme.surfaceMuted }]}>
                <MaterialCommunityIcons name="close" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>

              {/* ── PICKUP PHASE ── */}
              {(fulfillmentPhase === "PICKUP" || fulfillmentPhase === "GOTO_STORE") && (
                <View style={s.phaseSection}>
                  <View style={s.phaseTitle}>
                    <View style={[s.phaseBubble, { backgroundColor: "#F9731618" }]}>
                      <MaterialCommunityIcons name="package-variant-closed" size={18} color="#F97316" />
                    </View>
                    <Text style={[s.phaseTitleText, { color: theme.text }]}>Step 1 — Collect Items</Text>
                  </View>
                  <Text style={[s.phaseHint, { color: theme.textMuted }]}>
                    Enter the OTP from the store to confirm item pickup.
                  </Text>

                  {fulfillmentOrder?.vendorOtp ? (
                    <View style={[s.otpDisplayBox, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
                      <Text style={[s.otpDisplayLabel, { color: theme.textSoft }]}>Pickup OTP</Text>
                      <Text style={[s.otpDisplayValue, { color: theme.primary }]}>{fulfillmentOrder.vendorOtp}</Text>
                    </View>
                  ) : (
                    <TextInput
                      value={vendorOtpInput}
                      onChangeText={setVendorOtpInput}
                      keyboardType="number-pad"
                      placeholder="Enter store OTP"
                      maxLength={6}
                      style={[s.otpInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                      placeholderTextColor={theme.inputPlaceholder}
                    />
                  )}

                  {!vendorOtpVerified && (
                    <TouchableOpacity
                      style={[s.primaryBtn, { backgroundColor: theme.primary }]}
                      onPress={handlePickup}
                      disabled={loading || !vendorOtpInput}
                    >
                      {loading ? <ActivityIndicator color="#fff" /> :
                        <><MaterialCommunityIcons name="check" size={18} color="#fff" />
                        <Text style={s.primaryBtnText}>Confirm Pickup</Text></>}
                    </TouchableOpacity>
                  )}
                  {vendorOtpVerified && (
                    <View style={[s.verifiedBox, { backgroundColor: "#16A34A18" }]}>
                      <MaterialCommunityIcons name="check-circle" size={18} color="#16A34A" />
                      <Text style={[s.verifiedText, { color: "#16A34A" }]}>Items picked up — proceed to customer</Text>
                    </View>
                  )}
                </View>
              )}

              {/* ── DELIVER PHASE ── */}
              {fulfillmentPhase === "DELIVER" && (
                <>
                  {/* Delivery photo */}
                  <View style={s.phaseSection}>
                    <View style={s.phaseTitle}>
                      <View style={[s.phaseBubble, { backgroundColor: "#3B82F618" }]}>
                        <MaterialCommunityIcons name="camera" size={18} color="#3B82F6" />
                      </View>
                      <Text style={[s.phaseTitleText, { color: theme.text }]}>Step 2 — Delivery Photo</Text>
                    </View>
                    {deliveryPhoto ? (
                      <View>
                        <Image source={{ uri: deliveryPhoto }} style={s.photoPreview} />
                        <TouchableOpacity onPress={() => setDeliveryPhoto(null)} style={[s.retakeBtn, { borderColor: theme.border }]}>
                          <Text style={[s.retakeBtnText, { color: theme.textMuted }]}>Retake Photo</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={s.photoActions}>
                        <TouchableOpacity style={[s.photoBtn, { backgroundColor: theme.primary }]} onPress={() => {
                          if (!permission?.granted) requestPermission().then(r => { if (r.granted) setShowCamera(true); });
                          else setShowCamera(true);
                        }}>
                          <MaterialCommunityIcons name="camera" size={18} color="#fff" />
                          <Text style={s.photoBtnText}>Camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.photoBtn, { backgroundColor: theme.surfaceMuted, borderWidth: 1, borderColor: theme.border }]} onPress={pickFromGallery}>
                          <MaterialCommunityIcons name="image" size={18} color={theme.text} />
                          <Text style={[s.photoBtnText, { color: theme.text }]}>Gallery</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Customer OTP */}
                  <View style={s.phaseSection}>
                    <View style={s.phaseTitle}>
                      <View style={[s.phaseBubble, { backgroundColor: "#8B5CF618" }]}>
                        <MaterialCommunityIcons name="numeric" size={18} color="#8B5CF6" />
                      </View>
                      <Text style={[s.phaseTitleText, { color: theme.text }]}>Step 3 — Customer OTP</Text>
                    </View>
                    <Text style={[s.phaseHint, { color: theme.textMuted }]}>
                      Ask the customer for the 4-digit delivery OTP.
                    </Text>
                    <TextInput
                      value={deliveryOtpInput}
                      onChangeText={setDeliveryOtpInput}
                      keyboardType="number-pad"
                      maxLength={6}
                      placeholder="Enter customer OTP"
                      style={[s.otpInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                      placeholderTextColor={theme.inputPlaceholder}
                    />
                    {!deliveryOtpVerified ? (
                      <TouchableOpacity
                        style={[s.primaryBtn, { backgroundColor: "#8B5CF6" }]}
                        onPress={handleVerifyDeliveryOtp}
                        disabled={loading || !deliveryOtpInput}
                      >
                        {loading ? <ActivityIndicator color="#fff" /> :
                          <><MaterialCommunityIcons name="check" size={18} color="#fff" />
                          <Text style={s.primaryBtnText}>Verify OTP</Text></>}
                      </TouchableOpacity>
                    ) : (
                      <View style={[s.verifiedBox, { backgroundColor: "#16A34A18" }]}>
                        <MaterialCommunityIcons name="check-circle" size={18} color="#16A34A" />
                        <Text style={[s.verifiedText, { color: "#16A34A" }]}>OTP verified</Text>
                      </View>
                    )}
                  </View>

                  {/* Cash collection */}
                  {fulfillmentOrder?.payment === "Cash" && (
                    <View style={s.phaseSection}>
                      <View style={s.phaseTitle}>
                        <View style={[s.phaseBubble, { backgroundColor: "#16A34A18" }]}>
                          <MaterialCommunityIcons name="cash" size={18} color="#16A34A" />
                        </View>
                        <Text style={[s.phaseTitleText, { color: theme.text }]}>Step 4 — Collect Cash</Text>
                      </View>
                      <Text style={[s.phaseHint, { color: theme.textMuted }]}>
                        Collect ₹{fulfillmentOrder.grandTotal.toFixed(0)} from customer.
                      </Text>
                      <TouchableOpacity
                        style={[s.cashBtn, paymentConfirmed && { backgroundColor: "#16A34A18", borderColor: "#16A34A" }, { borderColor: theme.border }]}
                        onPress={() => setPaymentConfirmed(!paymentConfirmed)}
                      >
                        <MaterialCommunityIcons
                          name={paymentConfirmed ? "check-circle" : "circle-outline"}
                          size={22}
                          color={paymentConfirmed ? "#16A34A" : theme.textMuted}
                        />
                        <Text style={[s.cashBtnText, { color: paymentConfirmed ? "#16A34A" : theme.text }]}>
                          {paymentConfirmed ? "Cash collected ✓" : "Tap to confirm cash collection"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Complete delivery button */}
                  <TouchableOpacity
                    style={[s.completeBtn, { backgroundColor: theme.success }]}
                    onPress={handleCompleteDelivery}
                    disabled={loading}
                  >
                    {loading ? <ActivityIndicator color="#fff" size="large" /> : (
                      <>
                        <MaterialCommunityIcons name="check-decagram" size={22} color="#fff" />
                        <Text style={s.completeBtnText}>Complete Delivery</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Camera modal ── */}
      <Modal visible={showCamera} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} />
          <View style={s.cameraControls}>
            <TouchableOpacity onPress={() => setShowCamera(false)} style={s.cameraCancelBtn}>
              <Text style={{ color: "#fff", fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={capturePhoto} style={s.cameraShutterBtn}>
              <MaterialCommunityIcons name="camera" size={32} color="#fff" />
            </TouchableOpacity>
            <View style={{ width: 80 }} />
          </View>
        </View>
      </Modal>

      {/* ── Detail modal ── */}
      <Modal visible={detailVisible} transparent animationType="fade">
        <View style={[s.modalOverlay, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
          <Animated.View entering={ZoomIn} style={[s.detailSheet, { backgroundColor: theme.surface }]}>
            <View style={s.detailHeader}>
              <Text style={[s.detailTitle, { color: theme.text }]}>Order #{detailOrder?.orderId}</Text>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <MaterialCommunityIcons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {detailOrder?.itemsList?.map((item, i) => (
                <View key={i} style={[s.itemRow, { borderBottomColor: theme.divider }]}>
                  <Text style={[s.itemName, { color: theme.text }]}>{item.name}</Text>
                  <Text style={[s.itemQty, { color: theme.textMuted }]}>×{item.qty}</Text>
                  <Text style={[s.itemPrice, { color: theme.primary }]}>₹{item.price}</Text>
                </View>
              ))}
              <View style={s.itemRow}>
                <Text style={[s.itemName, { color: theme.text, fontWeight: "800" }]}>Total</Text>
                <Text style={[s.itemPrice, { color: theme.text, fontWeight: "900", fontSize: 16 }]}>₹{detailOrder?.grandTotal}</Text>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* ── Rating modal ── */}
      <Modal visible={ratingModal} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <Animated.View entering={FadeInUp} style={[s.ratingSheet, { backgroundColor: theme.surface }]}>
            <View style={[s.modalHandle, { backgroundColor: theme.border }]} />
            <Text style={[s.ratingTitle, { color: theme.text }]}>Rate this delivery</Text>
            <Text style={[s.ratingSub, { color: theme.textMuted }]}>How was your experience with this delivery?</Text>

            {/* Stars */}
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setStarRating(star)}>
                  <MaterialCommunityIcons
                    name={star <= starRating ? "star" : "star-outline"}
                    size={40}
                    color="#FBBF24"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={ratingNote}
              onChangeText={setRatingNote}
              placeholder="Add a note (optional)..."
              placeholderTextColor={theme.inputPlaceholder}
              multiline
              numberOfLines={3}
              style={[s.ratingInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
            />

            <TouchableOpacity
              style={[s.primaryBtn, { backgroundColor: "#FBBF24" }]}
              onPress={handleSubmitRating}
              disabled={ratingSubmitting}
            >
              {ratingSubmitting ? <ActivityIndicator color="#000" /> :
                <><MaterialCommunityIcons name="star" size={18} color="#000" />
                <Text style={[s.primaryBtnText, { color: "#000" }]}>Submit Rating</Text></>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRatingModal(false)} style={{ marginTop: 10, padding: 10, alignItems: "center" }}>
              <Text style={{ color: theme.textMuted }}>Skip</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles factory ────────────────────────────────────────────────────────────
function makeStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
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
    headerTitle: { fontSize: 20, fontWeight: "800", color: theme.headerText },
    headerSub: { fontSize: 11, color: theme.textSoft, marginTop: 2 },
    liveDot: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    liveDotText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 1 },

    // Tabs
    tabContainer: {
      flexDirection: "row",
      backgroundColor: theme.headerBg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    tabBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 13,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    tabText: { fontSize: 13 },
    tabBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
    tabBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900" },

    // Swipe hint
    swipeHint: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 4,
      paddingBottom: 8,
    },
    swipeHintText: { fontSize: 12 },

    // Empty
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
      gap: 12,
    },
    emptyTitle: { fontSize: 22, fontWeight: "800" },
    emptySub: { fontSize: 14, textAlign: "center", lineHeight: 22 },

    // Scroll content
    scrollContent: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 100 },

    // Rating row
    ratingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 16,
      marginHorizontal: 0,
      marginTop: -4,
    },
    ratingRowText: { flex: 1, fontSize: 13, fontWeight: "600" },

    // Success banner
    successBanner: {
      position: "absolute",
      bottom: 90,
      left: 24,
      right: 24,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      padding: 16,
    },
    successText: { color: "#fff", fontSize: 15, fontWeight: "800" },

    // Modal overlay
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },

    // Fulfillment sheet
    fulfillmentSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 40,
      paddingTop: 12,
      maxHeight: "92%",
    },
    modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
    fulfillmentHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    fulfillmentTitle: { fontSize: 18, fontWeight: "800" },
    fulfillmentSub: { fontSize: 13, marginTop: 2 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },

    // Phase sections
    phaseSection: { marginBottom: 20 },
    phaseTitle: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
    phaseBubble: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    phaseTitleText: { fontSize: 15, fontWeight: "800" },
    phaseHint: { fontSize: 13, marginBottom: 10, lineHeight: 18 },

    // OTP
    otpDisplayBox: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 16,
      alignItems: "center",
      marginBottom: 12,
    },
    otpDisplayLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
    otpDisplayValue: { fontSize: 32, fontWeight: "900", letterSpacing: 8 },
    otpInput: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: 6,
      textAlign: "center",
      marginBottom: 12,
    },

    // Verified box
    verifiedBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      borderRadius: 12,
    },
    verifiedText: { fontSize: 14, fontWeight: "700" },

    // Primary button
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 14,
      paddingVertical: 14,
    },
    primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

    // Photo actions
    photoActions: { flexDirection: "row", gap: 10 },
    photoBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderRadius: 14,
      paddingVertical: 14,
    },
    photoBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    photoPreview: { width: "100%", height: 160, borderRadius: 14, marginBottom: 8 },
    retakeBtn: {
      borderWidth: 1,
      borderRadius: 12,
      padding: 10,
      alignItems: "center",
    },
    retakeBtnText: { fontSize: 13, fontWeight: "600" },

    // Cash button
    cashBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderRadius: 14,
      padding: 14,
    },
    cashBtnText: { fontSize: 14, fontWeight: "700", flex: 1 },

    // Complete delivery
    completeBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      borderRadius: 16,
      paddingVertical: 16,
      marginTop: 10,
      marginBottom: 10,
    },
    completeBtnText: { color: "#fff", fontSize: 17, fontWeight: "900" },

    // Camera
    cameraControls: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 24,
      backgroundColor: "#000",
    },
    cameraCancelBtn: { width: 80, alignItems: "center" },
    cameraShutterBtn: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "#F97316",
      alignItems: "center",
      justifyContent: "center",
    },

    // Detail sheet
    detailSheet: {
      margin: 24,
      borderRadius: 20,
      padding: 20,
      maxHeight: "70%",
    },
    detailHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    detailTitle: { fontSize: 17, fontWeight: "800" },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      gap: 8,
    },
    itemName: { flex: 1, fontSize: 14, fontWeight: "600" },
    itemQty: { fontSize: 13 },
    itemPrice: { fontSize: 14, fontWeight: "700" },

    // Rating sheet
    ratingSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 12,
    },
    ratingTitle: { fontSize: 20, fontWeight: "800", marginBottom: 6 },
    ratingSub: { fontSize: 14, marginBottom: 20 },
    starsRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 20 },
    ratingInput: {
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 14,
      marginBottom: 16,
      minHeight: 80,
      textAlignVertical: "top",
    },
  });
}
