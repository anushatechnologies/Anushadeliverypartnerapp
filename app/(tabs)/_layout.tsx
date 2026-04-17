import { Tabs, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { ActiveOrderProvider, useActiveOrder } from "../../context/ActiveOrderContext";
import { navigateFromNotification as navigateFromNotificationPayload } from "../../utils/notificationNavigation";

const { width } = Dimensions.get("window");

// ─── Smart centre button that knows where to navigate ───────────────────────
function SmartLocationButton({ navProps }: { navProps: any }) {
  const router = useRouter();
  const { activeOrderLocation } = useActiveOrder();

  const handlePress = () => {
    if (activeOrderLocation) {
      const { targetLat, targetLng, isPickedUp } = activeOrderLocation;
      // Directly open Google Maps — no confirmation dialog
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLng}&travelmode=driving`;
      Linking.openURL(mapsUrl).catch(() =>
        Linking.openURL(`geo:${targetLat},${targetLng}?q=${targetLat},${targetLng}`)
          .catch(() => {})
      );
    } else {
      // No active order — show rider's own live GPS screen
      router.push("/(tabs)/location");
    }
  };

  const hasActiveOrder = !!activeOrderLocation;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.9}
      style={[navProps.style, styles.floatingCenterBtn]}
    >
      <View style={[styles.gradientBtn, hasActiveOrder && styles.gradientBtnActive]}>
        <MaterialCommunityIcons
          name={
            hasActiveOrder
              ? activeOrderLocation!.isPickedUp
                ? "map-marker-check"
                : "store-marker"
              : "map-marker-radius"
          }
          size={26}
          color="#fff"
        />
        {hasActiveOrder && (
          <View style={styles.activeDot} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Inner layout — can now access ActiveOrderContext ────────────────────────
function TabsLayoutInner() {
  const router = useRouter();

  // FCM deep-link: when rider taps a notification, navigate to the right screen
  useEffect(() => {
    let messaging: any = null;
    try {
      messaging = require("@react-native-firebase/messaging").default;
    } catch {
      return;
    }

    // App opened from QUIT state via notification
    messaging()
      .getInitialNotification()
      .then((msg: any) => {
        if (msg?.data) navigateFromNotificationPayload(router, msg.data);
      })
      .catch(() => {});

    // App opened from BACKGROUND state via notification tap
    const unsub = messaging().onNotificationOpenedApp((msg: any) => {
      if (msg?.data) navigateFromNotificationPayload(router, msg.data);
    });

    return unsub;
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#0D1117" }}>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#F97316",
          tabBarInactiveTintColor: "#4B5563",
          tabBarStyle: {
            height: 75,
            backgroundColor: "#0D1117",
            borderTopWidth: 1,
            borderTopColor: "#1F2937",
            elevation: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.4,
            shadowRadius: 15,
            paddingBottom: 15,
            paddingTop: 10,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "900",
            marginTop: -4,
            textTransform: "uppercase",
            letterSpacing: 1,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: "center" }}>
                <MaterialCommunityIcons
                  name={focused ? "home" : "home-outline"}
                  size={24}
                  color={color}
                />
                {focused && <View style={styles.indicator} />}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="earnings"
          options={{
            title: "Earnings",
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: "center" }}>
                <MaterialCommunityIcons
                  name={focused ? "wallet" : "wallet-outline"}
                  size={24}
                  color={color}
                />
                {focused && <View style={styles.indicator} />}
              </View>
            ),
          }}
        />

        {/* SMART CENTRE BUTTON */}
        <Tabs.Screen
          name="location"
          options={{
            title: "",
            tabBarButton: (navProps: any) => (
              <SmartLocationButton navProps={navProps} />
            ),
          }}
        />

        <Tabs.Screen
          name="orders"
          options={{
            title: "Tasks",
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: "center" }}>
                <MaterialCommunityIcons
                  name={focused ? "clipboard-text" : "clipboard-text-outline"}
                  size={24}
                  color={color}
                />
                {focused && <View style={styles.indicator} />}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Account",
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: "center" }}>
                <MaterialCommunityIcons
                  name={focused ? "account" : "account-outline"}
                  size={24}
                  color={color}
                />
                {focused && <View style={styles.indicator} />}
              </View>
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

// ─── Root export wraps with ActiveOrderProvider ──────────────────────────────
export default function TabsLayout() {
  return (
    <ActiveOrderProvider>
      <TabsLayoutInner />
    </ActiveOrderProvider>
  );
}

// ─── Deep-link navigation helper ────────────────────────────────────────────
function navigateFromNotification(data: Record<string, any>, router: any) {
  const screen = data.screen || data.type || "";

  if (screen === "OrderDetail" || screen === "order_assigned" || screen === "new_order") {
    router.push("/(tabs)/orders");
  } else if (screen === "Earnings" || screen === "payout") {
    router.push("/(tabs)/earnings");
  } else if (screen === "Profile") {
    router.push("/(tabs)/profile");
  } else {
    router.push("/(tabs)");
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  floatingCenterBtn: {
    top: -20,
    justifyContent: "center",
    alignItems: "center",
    width: 64,
    height: 64,
  },
  gradientBtn: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: "#F97316",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientBtnActive: {
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
  },
  activeDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFB800",
    borderWidth: 2,
    borderColor: "#0D1117",
  },
  indicator: {
    width: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#F97316",
    marginTop: 4,
    shadowColor: "#F97316",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
});
