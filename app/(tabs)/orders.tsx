import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity as RNTouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
  ZoomIn,
  useAnimatedStyle,
  withRepeat,
  withTiming
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomTouchableOpacity from "../../components/CustomTouchableOpacity";
import PremiumHeader from "../../components/PremiumHeader";
import { useLanguage } from "../../context/LanguageContext";
import { useUser } from "../../context/UserContext";
import { useActiveOrder } from "../../context/ActiveOrderContext";
import { orderService } from "../../services/orderService";

const { width } = Dimensions.get("window");

type OrderItem = {
  name: string;
  qty: string;
  price: number;
};

type Order = {
  id: number;
  orderId: string;
  vendorName?: string;
  vendorAddress?: string;
  vendorPhone?: string;
  vendorOtp?: string;
  vendorCoords?: { latitude: number, longitude: number };
  pickupConfirmed?: boolean;
  pickedUpAt?: string | null;
  customer: string;
  phone: string;
  address: string;
  customerCoords?: { latitude: number, longitude: number };
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
};

export default function OrdersTab() {
  const router = useRouter();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("Active");
  const [otpModal, setOtpModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Fulfillment State
  const [vendorOtp, setVendorOtp] = useState("");
  const [vendorOtpVerified, setVendorOtpVerified] = useState(false);

  const [otp, setOtp] = useState("");
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // UI State
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<Order | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [fareBreakdown, setFareBreakdown] = useState<any>(null);

  // Camera State
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const mapBackendOrder = (backendOrder: any): Order => {
    console.log("\n[DEBUG] RAW BACKEND ORDER KEYS:", Object.keys(backendOrder));
    console.log("[DEBUG] RAW BACKEND ORDER:", JSON.stringify(backendOrder, null, 2));

    // ── Store / Vendor info ──
    const store = backendOrder.store || backendOrder.vendor || backendOrder.merchant || backendOrder.restaurant || backendOrder.pickupLocation || {};
    const storeName = store.name || store.storeName || store.vendorName || store.merchantName || store.restaurantName
      || backendOrder.vendorName || backendOrder.storeName || backendOrder.merchantName || backendOrder.restaurantName 
      || backendOrder.pickup?.name || backendOrder.pickupName
      || "Unknown Store";
    const storeAddress = store.address || store.storeAddress || store.vendorAddress || store.restaurantAddress
      || backendOrder.vendorAddress || backendOrder.storeAddress || backendOrder.pickupAddress || backendOrder.restaurantAddress
      || backendOrder.pickup?.address
      || "Unknown Address";
    const storePhone = store.phone || store.mobile || store.contactNumber || store.phoneNumber || store.vendorPhone
      || backendOrder.vendorPhone || backendOrder.storePhone || backendOrder.restaurantPhone || backendOrder.pickupPhone || backendOrder.pickup?.phone
      || "";

    // ── Customer info ──
    const cust = backendOrder.customer || backendOrder.user || backendOrder.buyer || backendOrder.deliveryDetails || {};
    const customerName = typeof cust === 'string' ? cust :
      (cust.firstName ? `${cust.firstName} ${cust.lastName || ''}`.trim() 
       : (cust.name || cust.fullName || backendOrder.customerName || backendOrder.buyerName || "Unknown Customer"));
    const customerPhone = cust.phone || cust.mobile || cust.contactNumber || cust.phoneNumber
      || backendOrder.customerPhone || backendOrder.phone || backendOrder.buyerPhone || backendOrder.deliveryPhone || backendOrder.dropoffPhone || backendOrder.dropoff?.phone || "";
    const customerAddress = cust.address || cust.deliveryAddress || cust.customerAddress
      || backendOrder.deliveryAddress || backendOrder.address || backendOrder.customerAddress
      || backendOrder.dropoff?.address || backendOrder.dropoffAddress
      || "Unknown Address";

    // ── Coordinates ──
    // Try to extract store lat/lng
    const storeLat = store.latitude || store.lat || backendOrder.pickupLatitude || backendOrder.pickupLat;
    const storeLng = store.longitude || store.lng || store.lon || backendOrder.pickupLongitude || backendOrder.pickupLng;
    const vendorCoords = (storeLat && storeLng) 
      ? { latitude: Number(storeLat), longitude: Number(storeLng) } 
      : undefined;
    
    // Try to extract customer lat/lng
    const custLat = cust.latitude || cust.lat || backendOrder.deliveryLatitude || backendOrder.dropoffLat;
    const custLng = cust.longitude || cust.lng || cust.lon || backendOrder.deliveryLongitude || backendOrder.dropoffLng;
    const customerCoords = (custLat && custLng)
      ? { latitude: Number(custLat), longitude: Number(custLng) }
      : undefined;

    // ── Items ──
    let rawItems = backendOrder.items || backendOrder.orderItems || backendOrder.order_items || backendOrder.products || backendOrder.cartItems || backendOrder.cart_items || backendOrder.cart?.items || backendOrder.orderDetails || backendOrder.order_details || [];
    if (typeof rawItems === 'string') {
      try { rawItems = JSON.parse(rawItems); } catch(e) { rawItems = []; }
    }
    const itemsList = Array.isArray(rawItems) ? rawItems.map((item: any) => ({
      name: item.name || item.productName || item.itemName || item.title || item.menuItem?.name || item.product?.name || 'Item',
      qty: String(item.qty || item.quantity || item.count || 1),
      price: Number(item.price || item.total || item.amount || item.menuItem?.price || item.product?.price || 0),
    })) : [];

    // ── Order number and lifecycle state ──
    const orderNumber = backendOrder.orderNumber || backendOrder.orderId?.toString() || backendOrder.id?.toString() || "#UNK";
    const rawStatus = String(backendOrder.status || '').toUpperCase();
    const pickedUpAt = backendOrder.pickedUpAt || backendOrder.picked_up_at || null;
    const deliveryOtpVerifiedAt = backendOrder.deliveryOtpVerifiedAt || backendOrder.delivery_otp_verified_at || null;
    const deliveryPhotoUrl = backendOrder.deliveryPhotoUrl || backendOrder.delivery_photo_url || null;
    const deliveryOtp = backendOrder.deliveryOtp || backendOrder.otp || "";
    const deliveryOtpSent = Boolean(
      deliveryOtp ||
      backendOrder.deliveryOtpExpiry ||
      backendOrder.delivery_otp_expiry
    );
    const pickupConfirmed = Boolean(
      backendOrder.pickupConfirmed ||
      pickedUpAt ||
      ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(rawStatus)
    );
    const riderToStoreDistanceKm = backendOrder.riderToStoreDistanceKm;
    const storeToCustomerDistanceKm = backendOrder.storeToCustomerDistanceKm ?? backendOrder.distanceKm;
    const totalRouteDistanceKm = backendOrder.totalRouteDistanceKm;
    const distanceLabel = pickupConfirmed
      ? (storeToCustomerDistanceKm != null
          ? `${Number(storeToCustomerDistanceKm).toFixed(1)} km to customer`
          : (backendOrder.distance || "—"))
      : (riderToStoreDistanceKm != null
          ? `${Number(riderToStoreDistanceKm).toFixed(1)} km to store`
          : totalRouteDistanceKm != null
            ? `${Number(totalRouteDistanceKm).toFixed(1)} km route`
            : storeToCustomerDistanceKm != null
              ? `${Number(storeToCustomerDistanceKm).toFixed(1)} km delivery`
              : (backendOrder.distance || "—"));

    // ── Grand Total ──
    const grandTotal = Number(backendOrder.grandTotal || backendOrder.grand_total || backendOrder.totalAmount || backendOrder.total_amount || backendOrder.totalPrice || backendOrder.total_price || backendOrder.orderAmount || backendOrder.order_amount || backendOrder.billAmount || backendOrder.bill_amount || backendOrder.amount || backendOrder.total || itemsList.reduce((acc, curr) => acc + curr.price, 0) || 0);

    return {
      id: backendOrder.id || Math.random(),
      orderId: orderNumber,
      vendorName: storeName,
      vendorAddress: storeAddress,
      vendorPhone: storePhone,
      vendorOtp: backendOrder.vendorOtp || backendOrder.pickupOtp || "",
      vendorCoords: vendorCoords,
      pickupConfirmed,
      pickedUpAt,
      customer: customerName,
      phone: customerPhone,
      address: customerAddress,
      customerCoords: customerCoords,
      items: backendOrder.itemsCount || rawItems?.length || 0,
      itemsList: itemsList,
      distance: backendOrder.distanceKm ? `${Number(backendOrder.distanceKm).toFixed(1)} km` : (backendOrder.distance || "—"),
      distance: distanceLabel,
      earnings: Number(backendOrder.deliveryFee ?? backendOrder.delivery_fee ?? backendOrder.earnings ?? backendOrder.estimatedEarnings ?? 0),
      grandTotal: grandTotal,
      status: (rawStatus === 'DELIVERED' || rawStatus === 'COMPLETED' || rawStatus === 'CANCELLED')
                 ? 'Completed'
                 : 'Active',
      payment: (() => {
        const raw = backendOrder.paymentType || backendOrder.paymentMethod || backendOrder.paymentMode || '';
        if (raw === 'COD') return 'Cash';
        if (raw === 'UPI') return 'UPI';
        if (raw === 'ONLINE_PAID' || raw === 'ONLINE') return 'Online';
        return raw || 'Online';
      })(),
      otp: deliveryOtp,
      deliveryOtpSent,
      deliveryOtpVerified: Boolean(deliveryOtpVerifiedAt),
      deliveryOtpVerifiedAt,
      deliveryPhotoUrl
    };
  };

  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { authState } = useUser();
  const user = authState.user;
  const { setActiveOrderLocation, clearActiveOrderLocation } = useActiveOrder();

  // ── Ratings state for completed orders ──────────────────────────────────
  const [ratingModal, setRatingModal] = useState(false);
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [starRating, setStarRating] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const getLatestOrder = async (baseOrder: Order): Promise<Order> => {
    try {
      let fullOrder = await orderService.getOrderByNumber(baseOrder.orderId).catch(() => null);
      if (!fullOrder && baseOrder.id) {
        fullOrder = await orderService.getOrderById(baseOrder.id).catch(() => null);
      }

      if (fullOrder) {
        if (fullOrder.data && !fullOrder.id && !fullOrder.orderId) fullOrder = fullOrder.data;
        else if (fullOrder.order && !fullOrder.id && !fullOrder.orderId) fullOrder = fullOrder.order;

        return mapBackendOrder(fullOrder);
      }
    } catch (error) {
      console.log("Could not refresh order details", error);
    }

    return baseOrder;
  };

  const openFulfillmentModal = async (baseOrder: Order) => {
    const latestOrder = await getLatestOrder(baseOrder);
    setSelectedOrder(latestOrder);
    setVendorOtp(latestOrder.pickupConfirmed ? (latestOrder.vendorOtp || "") : "");
    setVendorOtpVerified(Boolean(latestOrder.pickupConfirmed));
    setOtp("");
    setOtpVerified(Boolean(latestOrder.deliveryOtpVerified));
    setDeliveryPhoto(latestOrder.deliveryPhotoUrl || null);
    setPaymentConfirmed(false);
    setPaymentMethod(null);
    setFareBreakdown(null);
    setOtpModal(true);
  };

  const extractOrders = (resp: any): any[] => {
    if (Array.isArray(resp)) return resp;
    if (resp && typeof resp === 'object') {
      for (const key of ['data', 'content', 'orders', 'activeOrders', 'completedOrders']) {
        if (Array.isArray(resp[key])) return resp[key];
      }
      const arrs = Object.values(resp).filter(Array.isArray) as any[][];
      if (arrs.length > 0) return arrs[0];
    }
    return [];
  };

  const fetchOrders = async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      if (activeTab === "Active") {
        const rawAll = await orderService.getOrders(user.id).catch(() => []);
        const listAll = extractOrders(rawAll);
        const unique = Array.from(new Map(listAll.map((o: any) => [o.id, o])).values());
        const mapped = (unique as any[])
          .filter((o: any) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'COMPLETED')
          .map(mapBackendOrder);
        setOrders(mapped);

        // ── Wire up smart location button ──────────────────────────────
        const firstActive = mapped[0];
        if (firstActive) {
          const isPickedUp = Boolean(firstActive.pickupConfirmed);
          const coords = isPickedUp ? firstActive.customerCoords : firstActive.vendorCoords;
          if (coords) {
            setActiveOrderLocation({
              orderId: String(firstActive.id),
              orderNumber: firstActive.orderId,
              isPickedUp,
              targetLat: coords.latitude,
              targetLng: coords.longitude,
              targetLabel: isPickedUp
                ? `${firstActive.customer} — ${firstActive.address}`
                : `${firstActive.vendorName} — ${firstActive.vendorAddress}`,
              targetAddress: isPickedUp ? firstActive.address : firstActive.vendorAddress || '',
            });
          } else {
            clearActiveOrderLocation();
          }
        } else {
          clearActiveOrderLocation();
        }
      } else {
        // History: try dedicated completed endpoint first, fall back to full list
        let historyRaw: any[] = [];
        try {
          historyRaw = extractOrders(await orderService.getCompletedOrders(user.id));
        } catch {
          historyRaw = [];
        }
        if (historyRaw.length === 0) {
          const rawAll = await orderService.getOrders(user.id).catch(() => []);
          const allList = extractOrders(rawAll);
          historyRaw = allList.filter((o: any) =>
            o.status === 'DELIVERED' || o.status === 'COMPLETED' || o.status === 'CANCELLED'
          );
        }
        const unique = Array.from(new Map(historyRaw.map((o: any) => [o.id, o])).values());
        setOrders((unique as any[]).map(mapBackendOrder));
      }
    } catch (e) {
      console.warn("Failed fetching orders:", e);
    } finally {
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchOrders();
  }, [activeTab, user?.id]);

  // Re-fetch every time this tab comes into focus (e.g. after accepting an order from Home tab)
  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [activeTab, user?.id])
  );

  const filteredOrders = orders.filter((o) => o.status === activeTab);

  const takeDeliveryPhoto = async () => {
    if (!permission?.granted) {
      const response = await requestPermission();
      if (!response.granted) {
        Alert.alert("Permission required", "Allow camera access to verify delivery");
        return;
      }
    }
    setShowCamera(true);
  };

  const capturePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.2 });
        if (photo?.uri) {
          setDeliveryPhoto(photo.uri);
          setShowCamera(false);
        }
      } catch (error) {
        console.log("Photo capture error:", error);
        Alert.alert("Error", "Could not capture photo.");
      }
    }
  };

  const uploadDeliveryPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission required", "Allow gallery access to select a delivery photo");
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.2
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setDeliveryPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.log("Gallery error:", error);
      Alert.alert("Gallery Error", "There was a problem opening your gallery. Please try again.");
    }
  };


  const handleVerifyVendorOtp = async () => {
    if (!vendorOtp || !selectedOrder) return;
    setLoading(true);
    try {
      const res = await orderService.pickedUpWithOtp(selectedOrder.orderId, vendorOtp);
      setVendorOtpVerified(true);

      if (res?.fareBreakdown) setFareBreakdown(res.fareBreakdown);

      const updatedDistance = res?.distanceKm != null
        ? `${Number(res.distanceKm).toFixed(1)} km`
        : selectedOrder.distance;
      const updatedEarnings = res?.deliveryFee ?? selectedOrder.earnings;

      setOrders(prev => prev.map(o => o.id === selectedOrder.id
        ? { ...o, pickupConfirmed: true, distance: updatedDistance || o.distance, earnings: updatedEarnings ?? o.earnings }
        : o));
      setSelectedOrder(prev => prev
        ? { ...prev, pickupConfirmed: true, distance: updatedDistance || prev.distance, earnings: updatedEarnings ?? prev.earnings }
        : prev);

      // Auto-generate delivery OTP so customer receives it immediately after pickup
      try {
        await orderService.generateDeliveryOtp(selectedOrder.orderId);
      } catch (otpErr) {
        console.warn("Auto delivery OTP generation failed:", otpErr);
      }
    } catch (e: any) {
      Alert.alert("Invalid OTP", e?.response?.data?.error || "The pickup code entered is incorrect.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!selectedOrder?.orderId || !otp) return;
    setLoading(true);
    try {
      const res = await orderService.verifyDeliveryOtp(selectedOrder.orderId, otp);
      if (!res?.valid) {
        throw new Error(res?.message || "The code entered is incorrect.");
      }
      setOtpVerified(true);
      setSelectedOrder(prev => prev ? {
        ...prev,
        deliveryOtpVerified: true,
      } : prev);
    } catch (error: any) {
      Alert.alert("Invalid OTP", error?.response?.data?.error || error?.message || "The code entered is incorrect.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!vendorOtpVerified && selectedOrder?.vendorName) return Alert.alert("Required", "Please verify pickup with the Vendor first.");
    if (!deliveryPhoto) return Alert.alert("Required", "Please capture a photo of the delivery at the doorstep.");
    if (!otpVerified) return Alert.alert("Required", "Please verify the customer OTP first.");

    if (selectedOrder?.payment === 'Cash' && !paymentConfirmed) {
      return Alert.alert("Payment Required", "Please confirm cash collection before completing delivery.");
    }

    setLoading(true);
    try {
      if (selectedOrder) {
        // Use the preferred app endpoint — submits OTP + delivery photo together
        await orderService.confirmDeliveryWithPhoto(selectedOrder.orderId, otp, deliveryPhoto || undefined);
      }

      setOrders(prev => prev.map(o => o.id === selectedOrder?.id ? { ...o, status: 'Completed', pickupConfirmed: true } : o));
      setOtpModal(false);
      setOtp("");
      setVendorOtp("");
      setVendorOtpVerified(false);
      setOtpVerified(false);
      setDeliveryPhoto(null);
      setPaymentConfirmed(false);
      setPaymentMethod(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // Auto-refresh lists
      fetchOrders();
    } catch (error: any) {
      Alert.alert("Fulfillment Failed", error?.response?.data?.error || error.message || "Something went wrong while fulfilling the order.");
    } finally {
      setLoading(false);
    }
  };

  const handleScannerOpen = async () => {
    const status = await requestPermission();
    if (status.granted) {
      setScannerVisible(true);
    } else {
      Alert.alert("Permission Required", "Camera access is needed to scan payment QR codes.");
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScannerVisible(false);
    setPaymentMethod('UPI');
    setPaymentConfirmed(true);
    console.log(`Scanned barcode: ${data}`);
  };

  const scanLineAnim = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: withRepeat(
            withTiming(98, { duration: 1000 }),
            -1,
            true
          ),
        },
      ],
    };
  });

  const progressLine1Style = useAnimatedStyle(() => {
    return {
      width: `${withTiming(!!deliveryPhoto ? 100 : 0, { duration: 500 })}%`
    };
  });

  const progressLine2Style = useAnimatedStyle(() => {
    return {
      width: `${withTiming(otpVerified ? 100 : 0, { duration: 500 })}%`
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top']}>

        <View style={styles.headerContainer}>
          <PremiumHeader
            title={t('tasks')}
            transparent
          />

          {/* Modern Premium Tab Selector */}
          <View style={styles.tabContainer}>
            <View style={styles.tabPill}>
              <TouchableOpacity
                onPress={() => setActiveTab("Active")}
                style={[styles.tabBtn, activeTab === "Active" && styles.tabBtnActive]}
                activeOpacity={0.8}
              >
                {activeTab === "Active" && (
                  <Animated.View layout={Layout} style={StyleSheet.absoluteFill}>
                    <Animated.View style={StyleSheet.absoluteFill}>
                      <LinearGradient
                        colors={['#F97316', '#C2410C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.tabGradient}
                      />
                    </Animated.View>
                  </Animated.View>
                )}
                <Text style={[styles.tabLabel, activeTab === "Active" && styles.tabLabelActive]}>
                  {t('activeOrders')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab("Completed")}
                style={[styles.tabBtn, activeTab === "Completed" && styles.tabBtnActive]}
                activeOpacity={0.8}
              >
                {activeTab === "Completed" && (
                  <Animated.View layout={Layout} style={StyleSheet.absoluteFill}>
                    <Animated.View style={StyleSheet.absoluteFill}>
                      <LinearGradient
                        colors={['#FB923C', '#C2410C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.tabGradient}
                      />
                    </Animated.View>
                  </Animated.View>
                )}
                <Text style={[styles.tabLabel, activeTab === "Completed" && styles.tabLabelActive]}>
                  {t('completedOrders')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── ACTIVE: horizontal swipeable card board ─────────────────── */}
        {activeTab === "Active" ? (
          filteredOrders.length === 0 ? (
            <Animated.View entering={FadeInUp} style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialCommunityIcons name="clipboard-text-search-outline" size={64} color="#4B5563" />
              </View>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptySubText}>No active orders right now.</Text>
            </Animated.View>
          ) : (
            <View style={styles.swipeWrapper}>
              {filteredOrders.length > 1 && (
                <View style={styles.swipeHint}>
                  <MaterialCommunityIcons name="gesture-swipe-horizontal" size={16} color="#F97316" />
                  <Text style={styles.swipeHintText}>Swipe to see all {filteredOrders.length} orders</Text>
                </View>
              )}
              <FlatList
                data={filteredOrders}
                keyExtractor={(item) => String(item.id)}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={width - 32}
                decelerationRate="fast"
                contentContainerStyle={styles.swipeList}
                renderItem={({ item, index }) => (
                  <View style={styles.swipeCard}>
                    <OrderCard
                      order={item}
                      index={index}
                      t={t}
                      onPress={async () => {
                        setSelectedDetailOrder(item);
                        setDetailVisible(true);
                        try { setSelectedDetailOrder(await getLatestOrder(item)); } catch {}
                      }}
                      onVerify={() => openFulfillmentModal(item)}
                    />
                  </View>
                )}
                ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              />
              {/* Dot indicators */}
              {filteredOrders.length > 1 && (
                <View style={styles.dotRow}>
                  {filteredOrders.map((_, i) => (
                    <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
                  ))}
                </View>
              )}
            </View>
          )
        ) : (
          /* ── HISTORY: vertical scrollable list with ratings ────────── */
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <Animated.View /> as any
            }
          >
            {filteredOrders.length === 0 ? (
              <Animated.View entering={FadeInUp} style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <MaterialCommunityIcons name="history" size={64} color="#4B5563" />
                </View>
                <Text style={styles.emptyTitle}>No History Yet</Text>
                <Text style={styles.emptySubText}>Completed deliveries will appear here.</Text>
              </Animated.View>
            ) : (
              filteredOrders.map((order, i) => (
                <View key={order.id}>
                  <OrderCard
                    order={order}
                    index={i}
                    t={t}
                    onPress={async () => {
                      setSelectedDetailOrder(order);
                      setDetailVisible(true);
                      try { setSelectedDetailOrder(await getLatestOrder(order)); } catch {}
                    }}
                    onVerify={() => {}}
                  />
                  {/* Rating row for completed orders */}
                  <Pressable
                    style={styles.ratingRow}
                    onPress={() => { setRatingOrder(order); setStarRating(0); setRatingModal(true); }}
                  >
                    <MaterialCommunityIcons name="star-outline" size={16} color="#F59E0B" />
                    <Text style={styles.ratingRowText}>Rate this delivery</Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color="#6B7280" />
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Order Details Modal */}
      <Modal visible={detailVisible} transparent animationType="fade">
        <View style={[styles.modalBlurOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setDetailVisible(false)}
          />
          <Animated.View entering={ZoomIn.duration(400)} style={styles.detailsModalContent}>
            <View style={styles.detailsHeader}>
              <View style={styles.detailsLogoWrap}>
                <MaterialCommunityIcons name="shopping" size={24} color="#FB923C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailsOrderNum}>{selectedDetailOrder?.orderId}</Text>
                <Text style={styles.detailsOrderDate}>Expected Delivery: Today, 2:30 PM</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.detailsCloseBtn}>
                <MaterialCommunityIcons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.itemsScroll}>

              {/* Map functionality moved to the Order Card directly */}

              <View style={styles.itemsHeaderRow}>
                <Text style={styles.itemsHeaderTitle}>Order Items</Text>
                <View style={styles.itemsCountBadge}>
                  <Text style={styles.itemsCountText}>{selectedDetailOrder?.itemsList.length} Items</Text>
                </View>
              </View>

              {selectedDetailOrder?.itemsList.map((item, idx) => (
                <View key={idx} style={styles.orderListItem}>
                  <View style={styles.itemBullet} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderItemName}>{item.name}</Text>
                    <Text style={styles.orderItemQty}>{item.qty}</Text>
                  </View>
                  <Text style={styles.orderItemPrice}>₹{item.price}</Text>
                </View>
              ))}

              <View style={styles.billingSection}>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Item Total</Text>
                  <Text style={styles.billVal}>₹{selectedDetailOrder?.itemsList.reduce((acc, curr) => acc + curr.price, 0) || selectedDetailOrder?.grandTotal || 0}</Text>
                </View>
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Rider Earnings</Text>
                  <Text style={[styles.billVal, { color: '#F97316', fontWeight: '800' }]}>
                    {selectedDetailOrder?.earnings ? `₹${selectedDetailOrder.earnings}` : '—'}
                  </Text>
                </View>
                <View style={[styles.billRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
                  <Text style={styles.billTotalLabel}>Grand Total</Text>
                  <Text style={styles.billTotalVal}>₹{selectedDetailOrder?.grandTotal || selectedDetailOrder?.itemsList.reduce((acc, curr) => acc + curr.price, 0) || 0}</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => {
                setDetailVisible(false);
                if (selectedDetailOrder?.status === 'Active') {
                  openFulfillmentModal(selectedDetailOrder);
                }
              }}
              style={styles.detailsActionBtn}
            >
              <LinearGradient
                colors={['#FB923C', '#C2410C']}
                style={styles.detailsActionGradient}
              >
                <Text style={styles.detailsActionText}>
                  {selectedDetailOrder?.status === 'Active' ? 'Mark Delivered' : 'Back to List'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
      <Modal visible={otpModal} transparent animationType="slide">
        <View style={[styles.modalBlurOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setOtpModal(false)}
          />
          <Animated.View entering={FadeInUp.springify().damping(20)} style={styles.modalSheet}>
            <View style={styles.modalSheetHandle} />

            <View style={styles.modalSheetHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={styles.modalSheetTitle}>Fulfill Order</Text>
                  <View style={[styles.paymentBadge, selectedOrder?.payment === 'Online' ? styles.paymentOnline : styles.paymentCash]}>
                    <Text style={styles.paymentBadgeText}>{selectedOrder?.payment}</Text>
                  </View>
                </View>
                <Text style={styles.modalSheetSubtitle}>Complete verification to mark as delivered</Text>
              </View>
              <TouchableOpacity onPress={() => setOtpModal(false)} style={styles.modalCloseIconBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalSheetScroll}>
              {/* Modern Animated Step Indicator */}
              <View style={styles.modernStepIndicator}>
                {selectedOrder?.vendorName && (
                  <>
                    <StepDot active={true} completed={vendorOtpVerified} />
                    <View style={styles.stepLine}>
                      <Animated.View style={[styles.stepLineActive, { width: vendorOtpVerified ? '100%' : '0%' }]} />
                    </View>
                  </>
                )}
                <StepDot active={selectedOrder?.vendorName ? vendorOtpVerified : true} completed={!!deliveryPhoto} />
                <View style={styles.stepLine}>
                  <Animated.View style={[styles.stepLineActive, progressLine1Style]} />
                </View>
                <StepDot active={!!deliveryPhoto} completed={otpVerified} />
                {selectedOrder?.payment === 'Cash' && (
                  <>
                    <View style={styles.stepLine}>
                      <Animated.View style={[styles.stepLineActive, progressLine2Style]} />
                    </View>
                    <StepDot active={otpVerified} completed={paymentConfirmed} />
                  </>
                )}
              </View>

              {/* Step 1: Vendor OTP (Only if Vendor exists and not already verified/picked up in a previous session if we supported that) */}
              {selectedOrder?.vendorName && (
                <Animated.View entering={FadeInUp} style={styles.stepContainer}>
                  <View style={styles.stepHeader}>
                    <View style={[styles.stepNumber, vendorOtpVerified && styles.stepNumberCompleted]}>
                      {vendorOtpVerified ? (
                        <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                      ) : (
                        <Text style={styles.stepNumberText}>1</Text>
                      )}
                    </View>
                    <Text style={styles.stepTitle}>Verify Pickup from Vendor</Text>
                    {vendorOtpVerified && (
                      <Animated.View entering={ZoomIn} style={styles.verifiedBadge}>
                        <MaterialCommunityIcons name="check-decagram" size={14} color="#FBBF24" />
                        <Text style={styles.verifiedText}>Verified</Text>
                      </Animated.View>
                    )}
                  </View>

                  <View style={[styles.otpFieldWrap, vendorOtpVerified && styles.otpVerifiedWrap]}>
                    <MaterialCommunityIcons
                      name={vendorOtpVerified ? "shield-check" : "storefront-outline"}
                      size={22}
                      color={vendorOtpVerified ? "#FBBF24" : "#475569"}
                      style={styles.otpIcon}
                    />
                    <TextInput
                      style={styles.otpInputField}
                      placeholder="Enter 4-digit Vendor code"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      maxLength={4}
                      value={vendorOtp}
                      onChangeText={setVendorOtp}
                      editable={!vendorOtpVerified}
                      autoCorrect={false}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    {vendorOtp.length === 4 && !vendorOtpVerified && (
                      <TouchableOpacity onPress={handleVerifyVendorOtp} style={styles.verifyOtpBtn}>
                        <Text style={styles.verifyOtpBtnText}>Verify</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              )}

              {/* Fare Breakdown — shown after pickup OTP is verified */}
              {vendorOtpVerified && fareBreakdown && (
                <View style={styles.fareBreakdownCard}>
                  <View style={styles.fareBreakdownHeader}>
                    <MaterialCommunityIcons name="calculator-variant" size={18} color="#F97316" />
                    <Text style={styles.fareBreakdownTitle}>Your Earnings Breakdown</Text>
                  </View>
                  <View style={styles.fareBreakdownRow}>
                    <Text style={styles.fareBreakdownLabel}>Distance</Text>
                    <Text style={styles.fareBreakdownValue}>{Number(fareBreakdown.distanceKm || 0).toFixed(1)} km</Text>
                  </View>
                  <View style={styles.fareBreakdownRow}>
                    <Text style={styles.fareBreakdownLabel}>Base Fare ({fareBreakdown.baseKm} km)</Text>
                    <Text style={styles.fareBreakdownValue}>₹{fareBreakdown.baseFare}</Text>
                  </View>
                  {Number(fareBreakdown.extraKm) > 0 && (
                    <View style={styles.fareBreakdownRow}>
                      <Text style={styles.fareBreakdownLabel}>+{fareBreakdown.extraKm} km × ₹{fareBreakdown.perKmRate}</Text>
                      <Text style={styles.fareBreakdownValue}>₹{fareBreakdown.extraCharge}</Text>
                    </View>
                  )}
                  {fareBreakdown.rainActive && (
                    <View style={styles.fareBreakdownRow}>
                      <Text style={[styles.fareBreakdownLabel, { color: '#2563EB' }]}>🌧️ Rain Surcharge</Text>
                      <Text style={[styles.fareBreakdownValue, { color: '#2563EB' }]}>+₹{fareBreakdown.rainSurcharge}</Text>
                    </View>
                  )}
                  <View style={[styles.fareBreakdownRow, { borderTopWidth: 1, borderTopColor: '#FED7AA', marginTop: 4, paddingTop: 8 }]}>
                    <Text style={[styles.fareBreakdownLabel, { fontWeight: '800', color: '#0F172A' }]}>Total Earnings</Text>
                    <Text style={[styles.fareBreakdownValue, { color: '#F97316', fontSize: 18, fontWeight: '900' }]}>₹{fareBreakdown.totalFare}</Text>
                  </View>
                </View>
              )}

              <View style={[styles.stepContainer, selectedOrder?.vendorName && !vendorOtpVerified && styles.stepLocked]}>
                <View style={styles.stepHeader}>
                  <View style={[styles.stepNumber, deliveryPhoto && styles.stepNumberCompleted, selectedOrder?.vendorName && !vendorOtpVerified && styles.stepNumberLocked]}>
                    {deliveryPhoto ? (
                      <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                    ) : selectedOrder?.vendorName && !vendorOtpVerified ? (
                      <MaterialCommunityIcons name="lock" size={14} color="#94A3B8" />
                    ) : (
                      <Text style={styles.stepNumberText}>{selectedOrder?.vendorName ? '2' : '1'}</Text>
                    )}
                  </View>
                  <Text style={[styles.stepTitle, selectedOrder?.vendorName && !vendorOtpVerified && styles.stepTitleLocked]}>Capture Proof of Delivery</Text>
                  {deliveryPhoto && (
                    <Animated.View entering={ZoomIn} style={styles.verifiedBadge}>
                      <MaterialCommunityIcons name="check-decagram" size={14} color="#FBBF24" />
                      <Text style={styles.verifiedText}>Captured</Text>
                    </Animated.View>
                  )}
                </View>

                <TouchableOpacity
                  onPress={takeDeliveryPhoto}
                  disabled={selectedOrder?.vendorName && !vendorOtpVerified ? true : false}
                  style={[styles.cameraBox, deliveryPhoto && styles.cameraBoxSuccess]}
                >
                  {deliveryPhoto ? (
                    <View style={styles.photoContainer}>
                      <Image source={{ uri: deliveryPhoto }} style={styles.capturedPhoto} />
                      <View style={styles.photoOverlay}>
                        <MaterialCommunityIcons name="check-circle" size={32} color="#FFFFFF" />
                        <Text style={styles.photoOverlayText}>Photo Captured</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.cameraPlaceholder}>
                      <View style={styles.cameraIconWrap}>
                        <MaterialCommunityIcons name="camera-plus" size={32} color="#FB923C" />
                      </View>
                      <Text style={styles.cameraText}>Take Doorstep Photo</Text>
                      <Text style={styles.cameraSubText}>Make sure order items are visible</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Android Native Backup - Gallery Upload */}
                {!deliveryPhoto && (
                  <TouchableOpacity
                    onPress={uploadDeliveryPhoto}
                    disabled={selectedOrder?.vendorName && !vendorOtpVerified ? true : false}
                    style={styles.galleryBackupBtn}
                  >
                    <MaterialCommunityIcons name="image-multiple-outline" size={18} color="#64748B" />
                    <Text style={styles.galleryBackupText}>Upload Photo from Gallery instead</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Step 3 (or 2): Customer OTP - Pre-rendered but locked if no photo */}
              <Animated.View entering={FadeInUp.delay(200)} style={[styles.stepContainer, !deliveryPhoto && styles.stepLocked]}>
                <View style={styles.stepHeader}>
                  <View style={[styles.stepNumber, otpVerified && styles.stepNumberCompleted, !deliveryPhoto && styles.stepNumberLocked]}>
                    {otpVerified ? (
                      <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                    ) : !deliveryPhoto ? (
                      <MaterialCommunityIcons name="lock" size={14} color="#94A3B8" />
                    ) : (
                      <Text style={styles.stepNumberText}>{selectedOrder?.vendorName ? '3' : '2'}</Text>
                    )}
                  </View>
                  <Text style={[styles.stepTitle, !deliveryPhoto && styles.stepTitleLocked]}>Customer OTP Verification</Text>
                  {otpVerified && (
                    <Animated.View entering={ZoomIn} style={styles.verifiedBadge}>
                      <MaterialCommunityIcons name="check-decagram" size={14} color="#FBBF24" />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </Animated.View>
                  )}
                </View>

                <View style={[styles.otpFieldWrap, otpVerified && styles.otpVerifiedWrap, !deliveryPhoto && styles.otpFieldLocked]}>
                  <MaterialCommunityIcons
                    name={otpVerified ? "shield-check" : "shield-key-outline"}
                    size={22}
                    color={otpVerified ? "#FBBF24" : "#475569"}
                    style={styles.otpIcon}
                  />
                  <TextInput
                    style={styles.otpInputField}
                    placeholder="Enter 4-digit customer code"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={4}
                    value={otp}
                    onChangeText={setOtp}
                    editable={!!deliveryPhoto && !otpVerified}
                    autoCorrect={false}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {!!deliveryPhoto && otp.length === 4 && !otpVerified && (
                    <TouchableOpacity onPress={handleVerifyOtp} style={styles.verifyOtpBtn}>
                      <Text style={styles.verifyOtpBtnText}>Verify</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {!!deliveryPhoto && !otpVerified && (
                  <Text style={styles.otpHelperText}>
                    Ask the customer for their 4-digit delivery code and enter it here.
                  </Text>
                )}
              </Animated.View>

              {/* Step 4 (or 3): Cash - Pre-rendered if Cash order, but locked if no photo */}
              {selectedOrder?.payment === 'Cash' && (
                <Animated.View entering={FadeInUp.delay(400)} style={[styles.stepContainer, !deliveryPhoto && styles.stepLocked]}>
                  <View style={styles.stepHeader}>
                    <View style={[styles.stepNumber, paymentConfirmed && styles.stepNumberCompleted, !deliveryPhoto && styles.stepNumberLocked]}>
                      {paymentConfirmed ? (
                        <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                      ) : !deliveryPhoto ? (
                        <MaterialCommunityIcons name="lock" size={14} color="#94A3B8" />
                      ) : (
                        <Text style={styles.stepNumberText}>{selectedOrder?.vendorName ? '4' : '3'}</Text>
                      )}
                    </View>
                    <Text style={[styles.stepTitle, !deliveryPhoto && styles.stepTitleLocked]}>Collect Cash Payment</Text>
                    {paymentConfirmed && (
                      <Animated.View entering={ZoomIn} style={styles.verifiedBadge}>
                        <MaterialCommunityIcons name="check-decagram" size={14} color="#FBBF24" />
                        <Text style={styles.verifiedText}>Collected</Text>
                      </Animated.View>
                    )}
                  </View>

                  <View style={[styles.paymentScannerContainer, !deliveryPhoto && styles.scannerLocked]}>
                    <View style={styles.amountBox}>
                      <Text style={styles.amountLabel}>Amount to Collect</Text>
                      <Text style={styles.amountValue}>₹{selectedOrder?.grandTotal ?? 0}</Text>
                    </View>

                    {paymentConfirmed ? (
                      <Animated.View entering={ZoomIn} style={styles.paymentSuccessBox}>
                        <View style={styles.successReceipt}>
                          <View style={styles.receiptLine}>
                            <Text style={styles.receiptLabel}>Collection Method</Text>
                            <Text style={styles.receiptId}>{paymentMethod === 'Cash' ? 'HARD CASH' : 'UPI SCANNER'}</Text>
                          </View>
                          <View style={styles.receiptLine}>
                            <Text style={styles.receiptLabel}>Total Amount</Text>
                            <Text style={styles.receiptTotal}>₹{selectedOrder?.grandTotal ?? 0}</Text>
                          </View>
                          <View style={styles.receiptStatus}>
                            <MaterialCommunityIcons name="check-decagram" size={24} color="#FBBF24" />
                            <Text style={styles.paymentSuccessText}>Payment Verified</Text>
                          </View>
                        </View>
                      </Animated.View>
                    ) : (
                      <View style={{ gap: 16 }}>
                        {/* Dummy QR Code */}
                        <View style={styles.qrContainer}>
                          <MaterialCommunityIcons name="qrcode" size={100} color={!deliveryPhoto ? "#CBD5E1" : "#1E293B"} />
                          <Text style={[styles.qrHelperText, !deliveryPhoto && { color: "#94A3B8" }]}>Customer can scan to pay via UPI</Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <TouchableOpacity
                            onPress={() => {
                              setPaymentMethod('Cash');
                              setPaymentConfirmed(true);
                            }}
                            disabled={!deliveryPhoto}
                            style={[styles.cashBtn, !deliveryPhoto && { opacity: 0.5, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }]}
                          >
                            <MaterialCommunityIcons name="cash" size={20} color={!deliveryPhoto ? "#94A3B8" : "#FBBF24"} />
                            <Text style={[styles.cashBtnText, !deliveryPhoto && { color: '#94A3B8' }]}>Received Cash</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={handleScannerOpen}
                            disabled={!deliveryPhoto}
                            style={[styles.scanAlternativeBtn, !deliveryPhoto && { opacity: 0.5, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' }]}
                          >
                            <MaterialCommunityIcons name="qrcode-scan" size={20} color={!deliveryPhoto ? "#94A3B8" : "#FB923C"} />
                            <Text style={[styles.scanAlternativeBtnText, !deliveryPhoto && { color: '#94A3B8' }]}>Scan App</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </Animated.View>
              )}

              {/* Professionally Linked Confirm Button */}
              <CustomTouchableOpacity
                onPress={handleVerify}
                style={[
                  styles.completeBtn,
                  (!deliveryPhoto || !otpVerified || (selectedOrder?.payment === 'Cash' && !paymentConfirmed)) && styles.completeBtnDisabled
                ]}
                disabled={loading || !deliveryPhoto || !otpVerified || (selectedOrder?.payment === 'Cash' && !paymentConfirmed)}
              >
                <LinearGradient
                  colors={(!deliveryPhoto || !otpVerified || (selectedOrder?.payment === 'Cash' && !paymentConfirmed))
                    ? ['#CBD5E1', '#94A3B8']
                    : ['#F97316', '#C2410C']}
                  style={styles.btnGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Animated.View entering={ZoomIn.delay(200)} style={styles.confirmBtnContent}>
                      <Text style={styles.completeBtnText}>Confirm Delivery</Text>
                      <MaterialCommunityIcons name="check-circle-outline" size={24} color="#FFFFFF" />
                    </Animated.View>
                  )}
                </LinearGradient>
              </CustomTouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Full-Screen Success Celebration */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.celebrationOverlay}>
          <Animated.View entering={ZoomIn.duration(600).springify()}>
            <LinearGradient
              colors={['#F97316', '#C2410C']}
              style={styles.celebrationCircle}
            >
              <MaterialCommunityIcons name="check-bold" size={80} color="#FFFFFF" />
            </LinearGradient>
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(400)}>
            <Text style={styles.celebrationTitle}>Delivery Confirmed!</Text>
            <Text style={styles.celebrationSubtitle}>Order #{selectedOrder?.orderId} fulfilled successfully</Text>
          </Animated.View>
        </View>
      </Modal>

      {/* Real Camera Scanner Modal (QR) */}
      <Modal visible={scannerVisible} animationType="slide" onRequestClose={() => setScannerVisible(false)}>
        {scannerVisible && (
          <View style={styles.scannerModalMain}>
            <CameraView
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={handleBarCodeScanned}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerTarget}>
                <View style={[styles.targetCorner, styles.targetTL]} />
                <View style={[styles.targetCorner, styles.targetTR]} />
                <View style={[styles.targetCorner, styles.targetBL]} />
                <View style={[styles.targetCorner, styles.targetBR]} />
                <Animated.View style={[styles.scannerLaser, scanLineAnim]} />
              </View>
              <Text style={styles.scannerHint}>Align Payment QR inside the box</Text>
              <TouchableOpacity onPress={() => setScannerVisible(false)} style={styles.scannerCloseBtn}>
                <Text style={styles.scannerCloseText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* Doorstep Delivery Photo Camera Modal */}
      <Modal visible={showCamera} animationType="slide" transparent={false} onRequestClose={() => setShowCamera(false)}>
        {showCamera && (
          <View style={styles.deliveryCameraContainer}>
            <View style={styles.deliveryCameraHeader}>
              <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.deliveryCameraCloseBtn}>
                <MaterialCommunityIcons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.deliveryCameraTitle}>Doorstep Photo</Text>
              <View style={{ width: 40 }} />
            </View>

            <CameraView
              ref={cameraRef}
              style={styles.deliveryCameraView}
              facing="back"
            >
              <View style={styles.deliveryCameraFooter}>
                <Text style={styles.deliveryCameraHint}>Make sure items are clearly visible</Text>
                <TouchableOpacity onPress={capturePhoto} style={styles.deliveryCaptureBtnOuter}>
                  <View style={styles.deliveryCaptureBtnInner} />
                </TouchableOpacity>
              </View>
            </CameraView>
          </View>
        )}
      </Modal>

      {/* ── Rating Modal ──────────────────────────────────────────────── */}
      <Modal visible={ratingModal} transparent animationType="slide">
        <View style={styles.ratingOverlay}>
          <Animated.View entering={FadeInUp.springify().damping(18)} style={styles.ratingSheet}>
            <View style={styles.ratingSheetHandle} />
            <Text style={styles.ratingTitle}>Rate this Delivery</Text>
            <Text style={styles.ratingSubtitle}>Order {ratingOrder?.orderId}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setStarRating(star)} style={styles.starBtn}>
                  <MaterialCommunityIcons
                    name={starRating >= star ? "star" : "star-outline"}
                    size={42}
                    color={starRating >= star ? "#F59E0B" : "#374151"}
                  />
                </Pressable>
              ))}
            </View>
            <Text style={styles.ratingLabel}>
              {starRating === 0 ? "Tap a star to rate" : ["", "Poor", "Fair", "Good", "Great", "Excellent!"][starRating]}
            </Text>
            <View style={styles.ratingBtnRow}>
              <Pressable style={styles.ratingCancelBtn} onPress={() => setRatingModal(false)}>
                <Text style={styles.ratingCancelText}>Skip</Text>
              </Pressable>
              <Pressable
                style={[styles.ratingSubmitBtn, starRating === 0 && { opacity: 0.4 }]}
                disabled={starRating === 0 || ratingSubmitting}
                onPress={async () => {
                  if (!ratingOrder || starRating === 0) return;
                  setRatingSubmitting(true);
                  try {
                    const { apiClient } = await import('../../services/apiClient');
                    await apiClient.post(
                      `/api/delivery-app/orders/${encodeURIComponent(ratingOrder.orderId)}/rate`,
                      { stars: starRating }
                    );
                  } catch (e) {
                    console.warn('Rating submit failed', e);
                  } finally {
                    setRatingSubmitting(false);
                    setRatingModal(false);
                  }
                }}
              >
                {ratingSubmitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.ratingSubmitText}>Submit</Text>
                }
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

    </View>
  );
}

function OrderCard({ order, index, t, onVerify, onPress }: { order: Order, index: number, t: any, onVerify: () => void, onPress: () => void }) {
  const isCompleted = order.status === 'Completed';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(500)}
      style={styles.orderCardWrap}
    >
      <Pressable onPress={onPress} style={styles.orderCardInner}>
        {/* Card Header */}
        <View style={styles.cardTopRow}>
          <View>
            <Text style={styles.cardOrderId}>{order.orderId}</Text>
            <View style={styles.earningsBadge}>
              <Text style={styles.earningsLabel}>Earnings: </Text>
              <Text style={styles.earningsVal}>₹{order.earnings}</Text>
            </View>
          </View>

          <View style={[
            styles.statusPill,
            { backgroundColor: isCompleted ? '#DCFCE7' : '#F3E8FF' }
          ]}>
            <View style={[
              styles.statusDot,
              { backgroundColor: isCompleted ? '#22C55E' : '#F97316' }
            ]} />
            <Text style={[
              styles.statusPillText,
              { color: isCompleted ? '#166534' : '#F97316' }
            ]}>
              {order.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Vendor Info (Pickup) */}
        {order.vendorName && (
          <View style={[styles.vendorRow, order.pickupConfirmed && { opacity: 0.6 }]}>
            <View style={styles.iconCircleVendor}>
              <MaterialCommunityIcons name={order.pickupConfirmed ? "check-circle" : "storefront"} size={18} color="#F97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pickupLabel}>{order.pickupConfirmed ? "PICKED UP FROM" : "PICKUP FROM"}</Text>
              <Text style={styles.vendorName}>{order.vendorName}</Text>
              <Text style={styles.addressText} numberOfLines={2}>{order.vendorAddress}</Text>
            </View>
            {order.vendorPhone && (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${order.vendorPhone}`)} style={styles.phoneActionBtn}>
                <MaterialCommunityIcons name="phone-outline" size={18} color="#F97316" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {order.vendorName && order.pickupConfirmed && (
          <View style={styles.routeConnector}>
            <View style={styles.routeDottedLine} />
          </View>
        )}

        {/* Customer Info (Drop-off) */}
        {(!order.vendorName || order.pickupConfirmed) && (
          <View style={styles.customerRow}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="map-marker-account-outline" size={18} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pickupLabel}>DELIVER TO</Text>
              <Text style={styles.customerName}>{order.customer}</Text>
              <Text style={styles.addressText} numberOfLines={2}>{order.address}</Text>
            </View>
            {order.phone ? (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${order.phone}`)} style={styles.phoneActionBtn}>
                <MaterialCommunityIcons name="phone-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Meta Info Grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCapsule}>
            <MaterialCommunityIcons name="package-variant-closed" size={14} color="#FB923C" />
            <Text style={styles.metaCapsuleText}>{order.items || order.itemsList.length} Items</Text>
          </View>
          <View style={styles.metaCapsule}>
            <MaterialCommunityIcons name="navigation-variant" size={14} color="#FBBF24" />
            <Text style={styles.metaCapsuleText}>{order.distance}</Text>
          </View>
          <View style={styles.metaCapsule}>
            <MaterialCommunityIcons name="wallet-outline" size={14} color="#F59E0B" />
            <Text style={styles.metaCapsuleText}>{order.payment}</Text>
          </View>
        </View>

        {/* Navigation button — always visible for active orders */}
        {!isCompleted && (
          <TouchableOpacity
            onPress={() => {
              const targetCoords = !order.pickupConfirmed ? order.vendorCoords : order.customerCoords;
              const navAddress = (!order.pickupConfirmed && order.vendorAddress) ? order.vendorAddress : order.address;
              const mapsUrl = targetCoords
                ? `https://www.google.com/maps/dir/?api=1&destination=${targetCoords.latitude},${targetCoords.longitude}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(navAddress)}`;
              Linking.openURL(mapsUrl);
            }}
            style={styles.navBtn}
          >
            <MaterialCommunityIcons name="navigation-variant" size={18} color="#F97316" />
            <Text style={styles.navBtnText}>
              {!order.pickupConfirmed ? 'Navigate to Store' : 'Navigate to Customer'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Actions */}
        {!isCompleted && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              onPress={onVerify}
              style={styles.primaryActionBtn}
            >
              <LinearGradient
                colors={['#FB923C', '#C2410C']}
                style={styles.actionGradient}
              >
                <Text style={styles.actionBtnText}>
                  {order.vendorName && !order.pickupConfirmed ? 'Confirm Pickup' : 'Mark Delivered'}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1117" },
  safe: { flex: 1, backgroundColor: "#0D1117" },

  // ── Swipeable board ───────────────────────────────────────────────────
  swipeWrapper: { flex: 1 },
  swipeHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4,
  },
  swipeHintText: { color: '#F97316', fontSize: 12, fontWeight: '700' },
  swipeList: { paddingHorizontal: 16, paddingVertical: 12 },
  swipeCard: { width: width - 32 },
  dotRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#374151' },
  dotActive: { width: 18, backgroundColor: '#F97316' },

  // ── Rating row (history list) ─────────────────────────────────────────
  ratingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#161B22', marginHorizontal: 16, marginTop: -8, marginBottom: 16,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: '#1F2937',
  },
  ratingRowText: { flex: 1, color: '#F59E0B', fontSize: 13, fontWeight: '700' },

  // ── Rating Modal ──────────────────────────────────────────────────────
  ratingOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  ratingSheet: {
    backgroundColor: '#161B22', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, alignItems: 'center',
    borderWidth: 1, borderColor: '#1F2937',
  },
  ratingSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#374151', marginBottom: 20 },
  ratingTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 4 },
  ratingSubtitle: { color: '#6B7280', fontSize: 13, fontWeight: '600', marginBottom: 24 },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  starBtn: { padding: 4 },
  ratingLabel: { color: '#F59E0B', fontSize: 16, fontWeight: '800', marginBottom: 28, minHeight: 22 },
  ratingBtnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  ratingCancelBtn: {
    flex: 1, height: 52, borderRadius: 16, borderWidth: 1, borderColor: '#374151',
    justifyContent: 'center', alignItems: 'center',
  },
  ratingCancelText: { color: '#6B7280', fontSize: 15, fontWeight: '700' },
  ratingSubmitBtn: {
    flex: 2, height: 52, borderRadius: 16, backgroundColor: '#F97316',
    justifyContent: 'center', alignItems: 'center',
  },
  ratingSubmitText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  headerContainer: { backgroundColor: '#0D1117', paddingBottom: 16 },

  // Tab Styles
  tabContainer: { paddingHorizontal: 20, marginTop: 4 },
  tabPill: {
    flexDirection: 'row',
    backgroundColor: '#161B22',
    borderRadius: 24,
    padding: 6,
    borderWidth: 1,
    borderColor: '#1F2937'
  },
  tabBtn: {
    flex: 1,
    height: 48,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  tabBtnActive: {
    shadowColor: '#FB923C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  tabGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    zIndex: 1
  },
  tabLabelActive: { color: '#FFFFFF' },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 12,
    backgroundColor: '#0D1117',
  },

  // Card Styles
  orderCardWrap: {
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: '#161B22',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    overflow: 'hidden'
  },
  orderCardInner: { padding: 20 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardOrderId: { fontSize: 18, fontWeight: '900', color: '#F9FAFB', letterSpacing: -0.5 },
  earningsBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  earningsLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  earningsVal: { fontSize: 13, fontWeight: '800', color: '#FB923C' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusPillText: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  cardDivider: { height: 1, backgroundColor: '#1F2937', marginVertical: 16 },

  // Vendor Info Styles
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircleVendor: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#EDE9FE' },
  pickupLabel: { fontSize: 10, fontWeight: '800', color: '#6B7280', letterSpacing: 0.5, marginBottom: 2 },
  vendorName: { fontSize: 15, fontWeight: '800', color: '#F9FAFB' },
  routeConnector: { height: 24, marginLeft: 20, borderLeftWidth: 2, borderLeftColor: '#E2E8F0', borderStyle: 'dotted', marginVertical: 2 },
  routeDottedLine: { display: 'none' }, // Using borderLeft on container instead
  phoneActionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },

  // Customer Info Styles
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  customerName: { fontSize: 15, fontWeight: '800', color: '#F9FAFB' },
  customerPhone: { fontSize: 13, fontWeight: '600', color: '#FB923C', marginTop: 1 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  addressText: { flex: 1, fontSize: 13, color: '#9CA3AF', fontWeight: '500', lineHeight: 20 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  metaCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  metaCapsuleText: { fontSize: 11, fontWeight: '800', color: '#D1D5DB' },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(249,115,22,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  navBtnText: { fontSize: 13, fontWeight: '800', color: '#F97316' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  roundActionBtn: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  primaryActionBtn: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  actionGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    elevation: 8,
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  actionBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },

  // Empty State
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#161B22', borderWidth: 1, borderColor: '#1F2937', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: '#F9FAFB', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },

  // Modal Styles
  modalBlurOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalDismissArea: { flex: 1 },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: '90%'
  },
  modalSheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24
  },
  modalSheetTitle: { fontSize: 24, fontWeight: '900', color: '#1E293B', letterSpacing: -0.5 },
  modalSheetSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '500', marginTop: 2 },
  modalCloseIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalSheetScroll: { paddingBottom: 40 },

  stepContainer: { marginBottom: 20 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  stepNumber: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FB923C', justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  stepTitle: { fontSize: 16, fontWeight: '800', color: '#334155' },

  cameraBox: {
    height: 180,
    borderRadius: 28,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    overflow: 'hidden'
  },
  cameraBoxSuccess: { borderStyle: 'solid', borderColor: '#FBBF24' },
  cameraPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  cameraIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cameraText: { fontSize: 15, fontWeight: '800', color: '#475569' },
  cameraSubText: { fontSize: 12, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
  photoContainer: { flex: 1 },
  capturedPhoto: { width: '100%', height: '100%' },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  photoOverlayText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginTop: 8 },

  otpFieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    height: 64,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  otpIcon: { marginRight: 14 },
  otpInputField: { flex: 1, fontSize: 18, fontWeight: '800', color: '#1E293B' },

  completeBtn: { marginTop: 32, borderRadius: 22, overflow: 'hidden', elevation: 8 },
  btnGradient: {
    height: 68,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  completeBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },

  // Payment Scanner Styles
  paymentScannerContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  amountBox: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  amountLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1E293B',
    marginTop: 4,
  },
  scannerBtn: {
    height: 100,
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FB923C',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  scannerBtnActive: {
    borderColor: '#FB923C',
    borderStyle: 'solid',
  },
  scannerPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  scannerBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FB923C',
  },
  scanningWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  scanningLine: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: 3,
    backgroundColor: '#FB923C',
    shadowColor: '#FB923C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 2,
    // Note: Reanimated would be better for actual animation, but for now we CSS/Style sim
  },
  scanningText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FB923C',
  },
  paymentSuccessBox: {
    height: 100,
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FBBF24',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },

  // Premium Step Indicators
  modernStepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  stepDotActive: {
    backgroundColor: '#FB923C',
    transform: [{ scale: 1.2 }],
    shadowColor: '#FB923C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  stepDotCompleted: {
    backgroundColor: '#FBBF24',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: '#FBBF24',
  },
  stepNumberCompleted: {
    backgroundColor: '#FBBF24',
  },
  otpVerifiedWrap: {
    borderColor: '#FBBF24',
    backgroundColor: '#FFF7ED',
  },
  verifyOtpBtn: {
    backgroundColor: '#F97316',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  verifyOtpBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  otpHelperText: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
    fontWeight: '600',
  },
  galleryBackupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    gap: 8,
  },
  galleryBackupText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },

  // Map Action Button Styles
  mapActionBtn: {
    height: 48,
    flexDirection: 'row',
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  mapActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },

  // Details Modal Styles
  detailsModalContent: {
    backgroundColor: '#FFFFFF',
    width: width * 0.9,
    borderRadius: 32,
    padding: 24,
    maxHeight: '85%',
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  detailsLogoWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsOrderNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1E293B',
  },
  detailsOrderDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  detailsCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsScroll: {
    maxHeight: 400,
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemsHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemsCountBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemsCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  orderListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  itemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FB923C',
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  orderItemQty: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  orderItemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  billingSection: {
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  billVal: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
  },
  billTotalLabel: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '900',
  },
  billTotalVal: {
    fontSize: 18,
    color: '#FB923C',
    fontWeight: '900',
  },
  detailsActionBtn: {
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  detailsActionGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  // Real Map Context Styles
  mapContainer: {
    marginBottom: 24,
  },
  mapWrap: {
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  mapView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  driverMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FB923C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  vendorMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  customerMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  mapOverlayBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapOverlayText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  // Enhanced Scanner Styles
  scannerFrame: {
    height: 140,
    borderWidth: 2,
    borderColor: '#FB923C',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#FFF7ED',
  },
  scannerBtnGradient: {
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  confirmBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  completeBtnDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  successReceipt: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
    width: '100%',
  },
  receiptLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  receiptId: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '700',
  },
  receiptTotal: {
    fontSize: 18,
    color: '#1E293B',
    fontWeight: '900',
  },
  receiptStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  paymentSuccessText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FBBF24',
  },
  scannerCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#FB923C',
  },
  cornerTL: { top: 10, left: 10, borderLeftWidth: 3, borderTopWidth: 3 },
  cornerTR: { top: 10, right: 10, borderRightWidth: 3, borderTopWidth: 3 },
  cornerBL: { bottom: 10, left: 10, borderLeftWidth: 3, borderBottomWidth: 3 },
  cornerBR: { bottom: 10, right: 10, borderRightWidth: 3, borderBottomWidth: 3 },

  // Verification Badges
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginLeft: 12,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FBBF24',
    marginLeft: 4,
    textTransform: 'uppercase',
  },

  // Celebration Overlay
  celebrationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  celebrationCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  celebrationTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 12,
  },
  celebrationSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 8,
  },
  otpHelperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FB923C',
    textDecorationLine: 'underline',
  },

  // Locked States
  stepLocked: {
    opacity: 0.6,
  },
  stepNumberLocked: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  stepTitleLocked: {
    color: '#94A3B8',
  },
  otpFieldLocked: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
  },
  scannerLocked: {
    opacity: 0.5,
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  paymentOnline: {
    backgroundColor: '#FFF7ED',
    borderColor: '#C7D2FE',
  },
  paymentCash: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1E293B',
    textTransform: 'uppercase',
  },

  // Real Scanner Modal Styles
  scannerModalMain: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerTarget: {
    width: 280,
    height: 280,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FB923C',
  },
  targetTL: { top: -2, left: -2, borderTopWidth: 6, borderLeftWidth: 6, borderTopLeftRadius: 20 },
  targetTR: { top: -2, right: -2, borderTopWidth: 6, borderRightWidth: 6, borderTopRightRadius: 20 },
  targetBL: { bottom: -2, left: -2, borderBottomWidth: 6, borderLeftWidth: 6, borderBottomLeftRadius: 20 },
  targetBR: { bottom: -2, right: -2, borderBottomWidth: 6, borderRightWidth: 6, borderBottomRightRadius: 20 },
  scannerLaser: {
    width: '90%',
    height: 3,
    backgroundColor: '#FB923C',
    shadowColor: '#FB923C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  // Dynamic Payment Styles
  qrContainer: { alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  qrHelperText: { fontSize: 13, color: '#64748B', marginTop: 8, fontWeight: '500' },
  cashBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7ED', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FBBF24', gap: 6 },
  cashBtnText: { fontSize: 14, color: '#FBBF24', fontWeight: 'bold' },
  scanAlternativeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7ED', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FB923C', gap: 6 },
  scanAlternativeBtnText: { fontSize: 14, color: '#FB923C', fontWeight: 'bold' },

  scannerHint: {
    marginTop: 40,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  scannerCloseBtn: {
    position: 'absolute',
    bottom: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  scannerCloseText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  // Delivery Doorstep Camera Modal Styles
  deliveryCameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  deliveryCameraHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.8)',
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 10,
  },
  deliveryCameraCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryCameraTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  deliveryCameraView: {
    flex: 1,
    width: '100%',
  },
  deliveryCameraFooter: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    paddingTop: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
  },
  deliveryCameraHint: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 20,
  },
  deliveryCaptureBtnOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  deliveryCaptureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },

  // Fare breakdown card — shown after pickup OTP verified
  fareBreakdownCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  fareBreakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  fareBreakdownTitle: {
    color: '#F97316',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  fareBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  fareBreakdownLabel: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '500',
  },
  fareBreakdownValue: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
});

function StepDot({ active, completed }: { active: boolean, completed: boolean }) {
  return (
    <View style={[
      styles.stepDot,
      active && styles.stepDotActive,
      completed && styles.stepDotCompleted
    ]} />
  );
}

function TouchableOpacity(props: any) {
  return <Pressable {...props} style={({ pressed }: any) => [props.style, pressed && { opacity: 0.7 }]} />;
}
