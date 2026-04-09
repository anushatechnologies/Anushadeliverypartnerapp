import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Modal,
  Pressable,
  ImageBackground,
  RefreshControl,
  TextInput,
  Linking,
  Vibration
} from "react-native";
import { Audio } from 'expo-av';
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useUser } from "../../context/UserContext";
import { profileService } from "../../services/profileService";
import { payoutService } from "../../services/payoutService";
import { orderService } from "../../services/orderService";
import { useRouter } from "expo-router";
import { useLanguage } from "../../context/LanguageContext";
import CustomTouchableOpacity from "../../components/CustomTouchableOpacity";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInLeft,
} from "react-native-reanimated";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import PremiumPopup, { PopupType } from "../../components/PremiumPopup";
import { locationService } from "../../services/locationService";
// FCM foreground notifications (Phase 6)
let messaging: any = null;
try {
  messaging = require('@react-native-firebase/messaging').default;
} catch { /* expo-go or web — skip */ }

const { width } = Dimensions.get("window");

export default function Home() {
  const router = useRouter();
  const { authState } = useUser();
  const { t } = useLanguage();
  const [active, setActive] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const user = authState.user;
  
  // Dashboard Data
  const [dashboard, setDashboard] = useState({ totalEarnings: 0, activeOrders: 0 });
  
  const [popup, setPopup] = useState<{visible: boolean, type: PopupType, title: string, message: string}>({
    visible: false, type: "success", title: "", message: ""
  });
  
  // Incoming Order State (Should fetch from backend in production)
  const [incomingOrder, setIncomingOrder] = useState<{ id: string, vendor: string, location: string, distance: string, earnings: string, orderNumber: string } | null>(null);
  
  // Rejection State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [customRejectReason, setCustomRejectReason] = useState("");
  const REJECT_REASONS = ["Vehicle Breakdown", "Out of Fuel", "Too Far", "Personal Emergency", "Other"];
  
  // Rejected Orders History
  const [rejectedOrders, setRejectedOrders] = useState<{ id: string, reason: string, time: string }[]>([]);
  
  const fetchDashboard = async () => {
    if (!user?.id) return;
    try {
      // Try the dedicated dashboard endpoint first (fastest, single call)
      const [dashboardRes, statusRes] = await Promise.all([
        profileService.getDashboard().catch(() => null),
        profileService.getStatus().catch(() => null),
      ]);

      const isOnline = statusRes?.deliveryPerson?.isOnline
        ?? dashboardRes?.dashboard?.isOnline
        ?? false;
      setActive(isOnline);

      if (dashboardRes?.success && dashboardRes?.dashboard) {
        setDashboard({
          totalEarnings: dashboardRes.dashboard.totalEarnings ?? 0,
          activeOrders: dashboardRes.dashboard.weeklyCompletedOrders ?? 0,
        });
      } else {
        // Fallback: derive from payout + active-orders services
        const [payoutsRes, ordersRes] = await Promise.all([
          payoutService.getTotalPaid(user.id).catch(() => 0),
          orderService.getActiveOrders(user.id).catch(() => []),
        ]);
        setDashboard({
          totalEarnings: typeof payoutsRes === 'number' ? payoutsRes : (payoutsRes?.totalPaid || 0),
          activeOrders: Array.isArray(ordersRes) ? ordersRes.length : 0,
        });
      }
    } catch (e: any) {
      console.warn("Failed to synchronize telemetry:", e.message);
    }
  };

  const soundRef = useRef<Audio.Sound | null>(null);

  const playAlarm = async () => {
    try {
      if (soundRef.current) await stopAlarm();
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      soundRef.current = sound;
      Vibration.vibrate([0, 500, 200, 500], true);
    } catch (e) {
      console.warn("Sound system failed", e);
    }
  };

  const stopAlarm = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      Vibration.cancel();
    } catch (e) { }
  };

  // ── Phase 6: FCM foreground handler ──────────────────────────────────────
  useEffect(() => {
    if (!messaging || !user?.id) return;
    const unsubscribe = messaging().onMessage(async (remoteMessage: any) => {
      const data = remoteMessage.data ?? {};
      const msgType = data.type;

      if (msgType === 'NEW_DELIVERY_ORDER' && active) {
        // A new order was broadcasted — show the accept/reject popup
        setIncomingOrder({
          id: data.orderId ?? '',
          vendor: data.storeName ?? data.pickup ?? 'Store',
          location: data.delivery ?? 'Customer Location',
          distance: data.distanceKm ? `${data.distanceKm} km` : '—',
          earnings: data.amount ? `₹${data.deliveryFee ?? data.amount}` : '—',
          orderNumber: data.orderNumber ?? '',
        });
        playAlarm();
      }
    });
    return () => unsubscribe();
  }, [active, user?.id]);

  useEffect(() => {
    fetchDashboard();

    // Phase 3: Start GPS background pinging when rider is online
    if (active && user?.id) {
      locationService.startTracking(user.id, null);
    } else {
      locationService.stopTracking();
    }

    // START POLLING FOR NEW ORDERS & UPDATING LOCATION
    const interval = setInterval(async () => {
       if (active && user?.id) {
          try {
             // 1. POLLING FOR NEW ASSIGNED ORDER (fallback when FCM is unavailable)
             const activeOrders = await orderService.getActiveOrders(user.id);

             if (activeOrders && activeOrders.length > 0) {
                const newPotential = activeOrders.find((o: any) => o.status === 'BROADCASTED_TO_RIDERS' || o.status === 'RIDER_ASSIGNED' && !o.acceptedAt);
                if (newPotential && !incomingOrder) {
                   setIncomingOrder({
                      id: newPotential.id.toString(),
                      vendor: newPotential.store?.name ?? newPotential.vendorName ?? "Unknown Store",
                      location: newPotential.deliveryAddress ?? newPotential.customerAddress ?? "Customer Location",
                      distance: newPotential.distanceKm ? `${Number(newPotential.distanceKm).toFixed(1)} km` : "—",
                      earnings: `₹${newPotential.deliveryFee ?? newPotential.estimateEarnings ?? '—'}`,
                      orderNumber: newPotential.orderNumber
                   });
                   playAlarm();
                }

                // 2. RTDB live location for active orders
                const activeOrder = activeOrders.find((o: any) =>
                  o.status === 'RIDER_ASSIGNED' || o.status === 'REACHED_STORE' ||
                  o.status === 'PICKED_UP' || o.status === 'OUT_FOR_DELIVERY');
                if (activeOrder) {
                  const locStatus = await Location.requestForegroundPermissionsAsync();
                  if (locStatus.status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    await orderService.updateLocation(
                      activeOrder.orderNumber || activeOrder.id.toString(),
                      user.id,
                      loc.coords.latitude,
                      loc.coords.longitude
                    );
                  }
                }
             }
          } catch(e) {
             console.log("Telemetry pulse deferred");
          }
       }
    }, 15000);

    return () => {
        clearInterval(interval);
        stopAlarm();
        locationService.stopTracking();
    };
  }, [active, user?.id, incomingOrder]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const handleAcceptOrder = async () => {
    if (!incomingOrder) return;
    setLoading(true);
    await stopAlarm();
    try {
       await orderService.acceptOrder(incomingOrder.orderNumber || incomingOrder.id, user!.id!);
       Alert.alert("Order Accepted!", "The order has been moved to your Active Tasks.");
       setIncomingOrder(null);
       fetchDashboard(); // Refresh stats
       router.push("/(tabs)/orders");
    } catch (e: any) {
       Alert.alert("Failed", "Could not accept order. It might have been assigned to someone else.");
    } finally {
       setLoading(false);
    }
  };

  const handleRejectOrderSubmit = async () => {
    const finalReason = rejectReason === "Other" ? customRejectReason : rejectReason;
    if (!finalReason.trim()) {
      Alert.alert("Reason Required", "Please specify a reason for rejecting the order.");
      return;
    }
    
    if (!incomingOrder) return;
    setLoading(true);
    await stopAlarm();

    try {
      await orderService.rejectOrder(incomingOrder.orderNumber || incomingOrder.id, user!.id!, finalReason);
      
      // Add to history
      setRejectedOrders(prev => [{
        id: incomingOrder.id,
        reason: finalReason,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }, ...prev]);
      
      setShowRejectModal(false);
      setIncomingOrder(null);
      setRejectReason("");
      setCustomRejectReason("");
      Alert.alert("Order Rejected", "We have notified the admin.");
    } catch (e) {
      Alert.alert("Failed", "Error notifying the server of rejection.");
    } finally {
      setLoading(false);
    }
  };

  const toggleOnline = async () => {
    const newState = !active;
    setActive(newState); // Optimistic UI update
    
    try {
      if (user?.id) {
        await profileService.updateOnlineStatusById(user.id, newState);
      } else {
        await profileService.updateOnlineStatus(newState);
      }
    } catch (e: any) {
      setActive(!newState); // Revert on failure
      
      const status = e?.response?.status;
      const errorMessage = e?.response?.data?.message || e?.response?.data?.error || e?.message || "Unknown Error";
      const errUrl = e?.config?.baseURL + "" + e?.config?.url;
      Alert.alert("Server Info", `Status: ${status || 'No Status'}\nURL: ${e?.config?.url}\nError: ${errorMessage}`);
      
      if (status === 403) {
        setPopup({
          visible: true,
          type: "error",
          title: "Account Locked",
          message: errorMessage
        });
      } else {
        setPopup({
          visible: true,
          type: "error",
          title: "Server Sync Failed",
          message: "Check your internet connection or admin status."
        });
      }
      setTimeout(() => setPopup(prev => ({...prev, visible: false})), 3500);
    }
  };


  const scrollRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const carouselBanners = [
    {
      id: '1',
      title: 'Ride & Earn More',
      subtitle: 'Every delivery brings you closer to your goals',
      image: require('../../assets/delivery_person.png'),
      overlay: ['rgba(10,106,76,0.72)', 'rgba(14,138,99,0.55)'] as const,
      badge: '🏍️  Fast Delivery',
    },
    {
      id: '2',
      title: 'Refer & Earn ₹500',
      subtitle: 'Invite a friend — earn when they complete 10 trips',
      image: require('../../assets/refer.png'),
      overlay: ['rgba(217,119,6,0.72)', 'rgba(245,158,11,0.55)'] as const,
      badge: '🎁  Referral Bonus',
    },
    {
      id: '3',
      title: 'Your Partner Journey',
      subtitle: 'Track earnings, grow fast, ride smart every day',
      image: require('../../assets/hero_illustration.png'),
      overlay: ['rgba(79,70,229,0.72)', 'rgba(99,102,241,0.55)'] as const,
      badge: '📈  Growth Partner',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      if (scrollRef.current) {
        let nextSlide = currentSlide + 1;
        if (nextSlide >= carouselBanners.length) {
          nextSlide = 0;
        }
        scrollRef.current.scrollTo({ x: nextSlide * (width - 32), animated: true });
        setCurrentSlide(nextSlide);
      }
    }, 3500);
    return () => clearInterval(timer);
  }, [currentSlide]);

  const onMomentumScrollEnd = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentSlide(Math.round(index));
  };

  const goToSlide = (index: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ x: index * (width - 32), animated: true });
      setCurrentSlide(index);
    }
  };

  return (
    <>
    <PremiumPopup {...popup} />
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top']}>

        {/* Clean Professional Header */}
        <View style={styles.homeHeader}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={['#0E8A63', '#14A06D']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.groceryIconBox}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={22} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={styles.brandName}>Anusha Bazaar</Text>
              <Text style={styles.headerGreeting}>Good Day, {user?.name?.split(' ')[0] || 'Partner'} ✨</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={toggleOnline}
              style={[styles.powerBtn, active ? styles.powerBtnOnline : styles.powerBtnOffline]}
            >
              <MaterialCommunityIcons
                name="power"
                size={22}
                color={active ? '#fff' : '#94A3B8'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setShowSupport(true)}
            >
              <MaterialCommunityIcons name="face-agent" size={22} color="#0F172A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => router.push("/notifications")}
            >
              <MaterialCommunityIcons name="bell-ring-outline" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollContent} 
          bounces={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0E8A63" />
          }
        >

          {/* Premium Incoming Order Modal */}
          <Modal visible={!!incomingOrder} transparent animationType="slide">
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
              <Animated.View entering={FadeInUp.springify()} style={styles.assignmentModal}>
                <LinearGradient
                  colors={['#0E8A63', '#0A6A4C']}
                  style={styles.assignmentHeader}
                >
                  <View style={styles.assignmentBadge}>
                    <MaterialCommunityIcons name="lightning-bolt" size={16} color="#F59E0B" />
                    <Text style={styles.assignmentBadgeText}>NEW CHALLENGE</Text>
                  </View>
                  <Text style={styles.assignmentPrice}>{incomingOrder?.earnings}</Text>
                  <Text style={styles.assignmentPriceSub}>Estimated Earning</Text>
                </LinearGradient>

                <View style={styles.assignmentBody}>
                   <View style={styles.stepItem}>
                      <View style={[styles.stepIcon, { backgroundColor: '#F0FDF4' }]}>
                         <MaterialCommunityIcons name="storefront" size={24} color="#0E8A63" />
                      </View>
                      <View style={styles.stepText}>
                         <Text style={styles.stepLabel}>PICKUP AT</Text>
                         <Text style={styles.stepValue}>{incomingOrder?.vendor}</Text>
                      </View>
                   </View>

                   <View style={styles.stepDashed} />

                   <View style={styles.stepItem}>
                      <View style={[styles.stepIcon, { backgroundColor: '#ECFDF5' }]}>
                         <MaterialCommunityIcons name="map-marker-radius" size={24} color="#10B981" />
                      </View>
                      <View style={styles.stepText}>
                         <Text style={styles.stepLabel}>DELIVER TO</Text>
                         <Text style={styles.stepValue}>{incomingOrder?.location}</Text>
                      </View>
                   </View>

                   <View style={styles.assignmentStats}>
                      <View style={styles.assignStatBox}>
                         <MaterialCommunityIcons name="map-marker-distance" size={18} color="#64748B" />
                         <Text style={styles.assignStatText}>{incomingOrder?.distance}</Text>
                      </View>
                      <View style={styles.assignStatDivider} />
                      <View style={styles.assignStatBox}>
                         <MaterialCommunityIcons name="timer-outline" size={18} color="#64748B" />
                         <Text style={styles.assignStatText}>12 mins</Text>
                      </View>
                   </View>
                </View>

                <View style={styles.assignmentActions}>
                   <TouchableOpacity 
                      onPress={() => setShowRejectModal(true)} 
                      style={styles.assignRejectBtn}
                   >
                      <Text style={styles.assignRejectText}>REJECT</Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                      onPress={handleAcceptOrder} 
                      style={styles.assignAcceptBtn}
                   >
                      <LinearGradient
                        colors={['#10B981', '#059669']}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <Text style={styles.assignAcceptText}>ACCEPT & START</Text>
                      <MaterialCommunityIcons name="chevron-right" size={20} color="#fff" />
                   </TouchableOpacity>
                </View>

                {/* Progress countdown bar mockup */}
                <View style={styles.countdownContainer}>
                   <View style={styles.countdownBar} />
                </View>
              </Animated.View>
            </View>
          </Modal>

          {/* Carousel */}
          <View style={styles.carouselContainer}>
            <ScrollView
              ref={scrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              snapToInterval={width - 32}
              decelerationRate="fast"
              onMomentumScrollEnd={onMomentumScrollEnd}
            >
              {carouselBanners.map((banner, index) => (
                <View key={banner.id} style={styles.autoBannerCard}>
                  <ImageBackground
                    source={banner.image}
                    style={styles.bannerImageBg}
                    imageStyle={styles.bannerImageStyle}
                    resizeMode="cover"
                  >
                    <LinearGradient
                      colors={banner.overlay}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0.8 }}
                      style={styles.bannerGradient}
                    >
                      <View style={styles.bannerContent}>
                        <View style={styles.bannerBadgePill}>
                          <Text style={styles.bannerBadgeText}>{banner.badge}</Text>
                        </View>
                        <Animated.Text
                          entering={FadeInLeft.delay(index * 100)}
                          style={styles.autoBannerTitle}
                        >
                          {banner.title}
                        </Animated.Text>
                        <Animated.Text
                          entering={FadeInLeft.delay(index * 150)}
                          style={styles.autoBannerSub}
                        >
                          {banner.subtitle}
                        </Animated.Text>
                      </View>
                    </LinearGradient>
                  </ImageBackground>
                </View>
              ))}
            </ScrollView>
            <View style={styles.paginationDots}>
              {carouselBanners.map((_, i) => (
                <CustomTouchableOpacity 
                   key={i} 
                   onPress={() => goToSlide(i)}
                   style={[styles.carouselDot, currentSlide === i && styles.carouselDotActive]} 
                />
              ))}
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatCard
              label={t('earnings')}
              value={`₹${dashboard.totalEarnings.toFixed(2)}`}
              icon="bank-outline"
              color="#F59E0B"
              colors={['#1E293B', '#0F172A']}
              onPress={() => router.push("/(tabs)/earnings")}
            />
            <StatCard
              label={t('activeOrders')}
              value={dashboard.activeOrders.toString()}
              icon="bike-fast"
              color="#38BDF8"
              colors={['#1E293B', '#0F172A']}
              onPress={() => router.push("/(tabs)/orders")}
            />
          </View>


          {/* Quick Actions Removed Placeholders as requested */}
          <View style={styles.quickGrid}>
            <QuickAction icon="wallet-outline" label="Earnings" color="#0E8A63" bg="#F0FDF4" onPress={() => router.push("/(tabs)/earnings")} />
            <QuickAction icon="clipboard-text-outline" label="Orders" color="#10B981" bg="#ECFDF5" onPress={() => router.push("/(tabs)/orders")} />
            <QuickAction icon="headphones" label="Support" color="#EF4444" bg="#FEF2F2" onPress={() => setShowSupport(true)} />
            <QuickAction icon="account-multiple-plus-outline" label="Refer & Earn" color="#F59E0B" bg="#FFFBEB" onPress={() => router.push("/refer")} />
          </View>


        </ScrollView>
      </SafeAreaView>

      {/* Support Modal */}
      <Modal visible={showSupport} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInUp} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Support Center</Text>
                <Text style={styles.modalSubtitle}>How can we assist you today?</Text>
              </View>
              <CustomTouchableOpacity onPress={() => setShowSupport(false)} style={styles.modalCloseBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#1A1A1A" />
              </CustomTouchableOpacity>
            </View>

            <View style={styles.supportGrid}>
              <SupportTile
                icon="phone-in-talk"
                label="Call Support"
                desc="Call: 6309981555"
                color="#0A6A4C"
                onPress={() => Linking.openURL('tel:6309981555')}
              />
              <SupportTile
                icon="whatsapp"
                label="Chat with Us"
                desc="WhatsApp: 6309981555"
                color="#25D366"
                onPress={() => Linking.openURL('https://wa.me/916309981555?text=Hi%2C%20I%20need%20help%20with%20Anusha%20Bazaar%20Delivery%20Partner%20app')}
              />
              <SupportTile
                icon="frequently-asked-questions"
                label="View FAQs"
                desc="Browse helpful articles"
                color="#F59E0B"
                onPress={() => { setShowSupport(false); router.push('/help'); }}
              />
            </View>

            <CustomTouchableOpacity style={styles.modalSecondaryBtn} onPress={() => setShowSupport(false)}>
              <Text style={styles.modalSecondaryBtnText}>Close</Text>
            </CustomTouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      {/* Reject Order Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInUp.springify().damping(20)} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Reject Order</Text>
                <Text style={styles.modalSubtitle}>Please select a valid reason</Text>
              </View>
              <CustomTouchableOpacity onPress={() => setShowRejectModal(false)} style={styles.modalCloseBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#1A1A1A" />
              </CustomTouchableOpacity>
            </View>

            <View style={styles.reasonGrid}>
              {REJECT_REASONS.map((reason) => (
                <TouchableOpacity 
                  key={reason} 
                  activeOpacity={0.7}
                  onPress={() => setRejectReason(reason)}
                  style={[styles.reasonChip, rejectReason === reason && styles.reasonChipActive]}
                >
                  <MaterialCommunityIcons 
                    name={rejectReason === reason ? "radiobox-marked" : "radiobox-blank"} 
                    size={20} 
                    color={rejectReason === reason ? "#EF4444" : "#94A3B8"} 
                  />
                  <Text style={[styles.reasonChipText, rejectReason === reason && styles.reasonChipTextActive]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {rejectReason === "Other" && (
              <Animated.View entering={FadeInDown.duration(200)}>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Type your specific reason here..."
                  placeholderTextColor="#94A3B8"
                  value={customRejectReason}
                  onChangeText={setCustomRejectReason}
                  multiline
                  maxLength={100}
                />
              </Animated.View>
            )}

            <CustomTouchableOpacity 
              style={[styles.modalDangerBtn, !rejectReason && { opacity: 0.5 }]} 
              onPress={handleRejectOrderSubmit}
              disabled={!rejectReason}
            >
              <Text style={styles.modalDangerBtnText}>Submit Rejection</Text>
            </CustomTouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
    </>
  );
}

function StatCard({ label, value, icon, color, colors, onPress }: { label: string, value: string, icon: any, color: string, colors: string[], onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.statCardContainer}>
      <LinearGradient colors={colors as any} style={styles.statCardGradient}>
        <Animated.View entering={FadeInDown.delay(100)}>
          <View style={styles.statHeaderRow}>
            <View style={[styles.statIconWrap, { backgroundColor: color + '20' }]}>
              <MaterialCommunityIcons name={icon} size={22} color={color} />
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
          </View>
          <Text style={styles.statValueText}>{value}</Text>
          <Text style={styles.statLabelText}>{label}</Text>
        </Animated.View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function QuickAction({ icon, label, color, bg, onPress }: { icon: any, label: string, color: string, bg: string, onPress: () => void }) {
  return (
    <CustomTouchableOpacity onPress={onPress} style={[styles.quickActionTile, { backgroundColor: bg }]}>
      <View style={[styles.quickActionIconBox, { backgroundColor: color + '18' }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </CustomTouchableOpacity>
  );
}

function SupportTile({ icon, label, desc, color, onPress }: { icon: any, label: string, desc: string, color: string, onPress: () => void }) {
  return (
    <CustomTouchableOpacity onPress={onPress} style={styles.supportTile}>
      <View style={[styles.tileIconBox, { backgroundColor: color + '15' }]}>
        <MaterialCommunityIcons name={icon} size={28} color={color} />
      </View>
      <View style={styles.tileTextContent}>
        <Text style={styles.tileLabel}>{label}</Text>
        <Text style={styles.tileDesc}>{desc}</Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#CBD5E1" />
    </CustomTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  homeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  groceryIconBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#0E8A63', justifyContent: 'center', alignItems: 'center' },
  brandName: { fontSize: 16, fontWeight: '900', color: '#0F172A', letterSpacing: -0.3 },
  headerGreeting: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  powerBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 },
  powerBtnOnline: { backgroundColor: '#22C55E', shadowColor: '#22C55E' },
  powerBtnOffline: { backgroundColor: '#F1F5F9', shadowColor: '#94A3B8' },
  notifBadge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 20, backgroundColor: '#F8FAFC' },
  carouselContainer: { marginBottom: 24, width: '100%' },
  autoBannerCard: { width: width - 36, height: 170, marginRight: 12, borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
  bannerImageBg: { width: '100%', height: '100%' },
  bannerImageStyle: { borderRadius: 24 },
  bannerGradient: { flex: 1, padding: 20, justifyContent: 'flex-end' },
  bannerContent: { flex: 1, justifyContent: 'flex-end' },
  bannerBadgePill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  bannerBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  autoBannerTitle: { fontSize: 21, fontWeight: '900', color: '#FFFFFF', marginBottom: 4, letterSpacing: -0.5, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  autoBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.88)', fontWeight: '600', lineHeight: 17 },
  autoBannerIconCircle: { width: 64, height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  paginationDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, gap: 8 },
  carouselDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E2E8F0' },
  carouselDotActive: { width: 24, height: 8, borderRadius: 4, backgroundColor: '#0E8A63' },

  statsRow: { flexDirection: 'row', gap: 14, marginBottom: 24, marginTop: 8 },
  statCardContainer: { flex: 1, borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
  statCardGradient: { padding: 18, minHeight: 140 },
  statHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statValueText: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  statLabelText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, marginTop: 8 },
  sectionTitle: { color: '#0F172A', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  pulseDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#EF4444' },
  liveText: { color: '#EF4444', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  mapCardOuter: { width: '100%', marginBottom: 28, borderRadius: 28, padding: 4, backgroundColor: '#FFFFFF', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12 },
  mapCardInner: { width: '100%', height: 210, borderRadius: 24, overflow: 'hidden' },
  mapImg: { width: '100%', height: '100%' },
  mapOverlayBlur: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  demandBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(124, 58, 237, 0.9)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  demandText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, letterSpacing: -0.2 },
  mapExpandBtn: { position: 'absolute', bottom: 12, right: 12, width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 30 },
  quickActionTile: { width: (width - 54) / 2, borderRadius: 22, padding: 18, alignItems: 'center', gap: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  quickActionIconBox: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  quickActionLabel: { color: '#0F172A', fontSize: 14, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 28, paddingBottom: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  modalTitle: { color: '#0F172A', fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  modalSubtitle: { color: '#64748B', fontSize: 15, fontWeight: '500', marginTop: 4 },
  modalCloseBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  supportGrid: { gap: 16, marginBottom: 28 },
  supportTile: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', elevation: 1 },
  tileIconBox: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 18 },
  tileTextContent: { flex: 1 },
  tileLabel: { color: '#0F172A', fontSize: 17, fontWeight: '800' },
  tileDesc: { color: '#64748B', fontSize: 13, fontWeight: '500', marginTop: 3 },
  modalSecondaryBtn: { height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  modalSecondaryBtnText: { color: '#475569', fontSize: 16, fontWeight: '800' },
  
  // Incoming Order Styles
  incomingOrderCard: { width: '100%', marginBottom: 24, backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden', elevation: 8, shadowColor: '#14A06D', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, borderWidth: 1, borderColor: '#ECFDF5' },
  incomingOrderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#14A06D', paddingHorizontal: 16, paddingVertical: 12 },
  incomingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  incomingBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  incomingOrderId: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', opacity: 0.9 },
  incomingOrderDetails: { padding: 20, paddingBottom: 10 },
  incomingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  incomingIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' },
  incomingLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 2 },
  incomingValue: { fontSize: 15, color: '#0F172A', fontWeight: '800' },
  routeConnector: { marginLeft: 19, height: 28, borderLeftWidth: 2, borderLeftColor: '#E2E8F0', borderStyle: 'dashed', marginVertical: 2 },
  routeDot: { width: 0, height: 0 }, // optional visual tweak depending on needs
  routeLine: { width: 0, height: 0 },
  incomingHighlights: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 20 },
  highlightBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  highlightText: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
  incomingActions: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingTop: 0 },
  rejectBtn: { flex: 1, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  rejectBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '800' },
  acceptBtn: { flex: 2, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  acceptBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },

  // Reject Modal Styles
  reasonGrid: { marginBottom: 24, gap: 12 },
  reasonChip: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  reasonChipActive: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  reasonChipText: { fontSize: 15, color: '#475569', fontWeight: '600' },
  reasonChipTextActive: { color: '#EF4444', fontWeight: '800' },
  reasonInput: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, fontSize: 15, color: '#0F172A', borderColor: '#E2E8F0', borderWidth: 1, minHeight: 100, textAlignVertical: 'top', marginBottom: 24 },
  modalDangerBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EF4444' },
  modalDangerBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  
  // Rejections Card
  rejectionsCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  rejectionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  rejectionItemBorder: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  rejectionItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 10 },
  rejectionIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  rejectionOrderId: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  rejectionReasonText: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  rejectionTime: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },

  // Premium Assignment Modal Styles
  assignmentModal: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, width: '100%', overflow: 'hidden' },
  assignmentHeader: { padding: 40, alignItems: 'center' },
  assignmentBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 16 },
  assignmentBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  assignmentPrice: { fontSize: 48, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
  assignmentPriceSub: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '700', marginTop: 4 },
  assignmentBody: { padding: 32 },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  stepIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  stepText: { flex: 1 },
  stepLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, marginBottom: 4 },
  stepValue: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  stepDashed: { height: 30, width: 2, borderLeftWidth: 2, borderLeftColor: '#E2E8F0', borderStyle: 'dashed', marginLeft: 25, marginVertical: 4 },
  assignmentStats: { flexDirection: 'row', alignItems: 'center', marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  assignStatBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  assignStatText: { fontSize: 14, fontWeight: '800', color: '#475569' },
  assignStatDivider: { width: 1, height: 24, backgroundColor: '#F1F5F9' },
  assignmentActions: { flexDirection: 'row', padding: 24, paddingTop: 0, gap: 12 },
  assignRejectBtn: { flex: 1, height: 64, borderRadius: 20, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  assignRejectText: { color: '#94A3B8', fontSize: 14, fontWeight: '900' },
  assignAcceptBtn: { flex: 2.2, height: 64, borderRadius: 20, overflow: 'hidden', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  assignAcceptText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  countdownContainer: { height: 4, backgroundColor: '#F1F5F9', width: '100%' },
  countdownBar: { height: '100%', backgroundColor: '#10B981', width: '70%' }
});