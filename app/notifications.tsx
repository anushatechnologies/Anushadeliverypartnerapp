import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useLanguage } from "../context/LanguageContext";
import { StatusBar } from "expo-status-bar";
import PremiumHeader from "../components/PremiumHeader";
import { apiClient } from "../services/apiClient";
import {
  canNavigateFromNotification,
  navigateFromNotification,
} from "../utils/notificationNavigation";

type InboxNotification = {
  id: string;
  title: string;
  desc: string;
  time: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  read: boolean;
  actionable: boolean;
  notificationId?: string;
  raw: Record<string, any>;
};

const formatNotificationTime = (value: unknown) => {
  if (!value) return "Recently";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const visualForType = (type: string) => {
  const normalized = type.toUpperCase();

  if (normalized.includes("DELIVER")) {
    return { icon: "truck-fast-outline" as const, color: "#10B981" };
  }
  if (normalized.includes("OTP")) {
    return { icon: "shield-key-outline" as const, color: "#8B5CF6" };
  }
  if (normalized.includes("ASSIGNED") || normalized.includes("ORDER")) {
    return { icon: "package-variant-closed" as const, color: "#F97316" };
  }
  if (normalized.includes("PAYOUT") || normalized.includes("EARNING")) {
    return { icon: "wallet-outline" as const, color: "#2563EB" };
  }

  return { icon: "bell-ring-outline" as const, color: "#F97316" };
};

const extractNotifications = (payload: any) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.content)) return payload.content;
    if (Array.isArray(payload.notifications)) return payload.notifications;
  }
  return [];
};

const mapNotification = (notification: any, index: number): InboxNotification => {
  const raw = {
    ...notification,
    notificationId:
      notification?.notificationId?.toString?.() ??
      notification?.id?.toString?.() ??
      undefined,
  };
  const { icon, color } = visualForType(String(raw.type || "system"));

  return {
    id: raw.notificationId || String(index),
    title: raw.title || raw.subject || raw.heading || "Notification",
    desc: raw.message || raw.body || raw.content || raw.description || "You have a new update.",
    time: formatNotificationTime(raw.createdAt || raw.timestamp),
    icon,
    color,
    read: Boolean(raw.read || raw.isRead),
    actionable: canNavigateFromNotification(raw),
    notificationId: raw.notificationId,
    raw,
  };
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);

  useEffect(() => {
    void fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/api/notifications");
      const inbox = extractNotifications(response.data).map(mapNotification);
      setNotifications(inbox);
    } catch (error) {
      console.log("Failed to fetch notifications", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPress = async (notification: InboxNotification) => {
    if (notification.notificationId) {
      try {
        await apiClient.patch(`/api/notifications/${notification.notificationId}/read`);
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item,
          ),
        );
      } catch {
        // Ignore read-state failures and continue navigating.
      }
    }

    if (notification.actionable) {
      navigateFromNotification(router, notification.raw);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <PremiumHeader title={t("notification")} showBack />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {loading ? (
            <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 50 }} />
          ) : notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="bell-off-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySub}>Delivered order updates and rider tasks will appear here.</Text>
            </View>
          ) : (
            notifications.map((item, index) => (
              <TouchableOpacity
                key={`${item.id}-${index}`}
                activeOpacity={item.actionable ? 0.85 : 1}
                disabled={!item.actionable}
                onPress={() => void handleNotificationPress(item)}
                style={[
                  styles.notifCard,
                  !item.read && styles.notifCardUnread,
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: `${item.color}15` }]}>
                  <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
                </View>

                <View style={styles.notifInfo}>
                  <View style={styles.notifHeader}>
                    <Text style={styles.notifTitle}>{item.title}</Text>
                    <Text style={styles.notifTime}>{item.time}</Text>
                  </View>

                  <Text style={styles.notifDesc}>{item.desc}</Text>

                  <View style={styles.metaRow}>
                    {!item.read ? <View style={styles.unreadDot} /> : null}
                    <Text style={styles.metaText}>
                      {item.actionable ? "Tap to open related order" : "Saved in your inbox"}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40 },
  emptyState: { alignItems: "center", marginTop: 60, paddingHorizontal: 16 },
  emptyTitle: { marginTop: 16, fontSize: 16, color: "#111827", fontWeight: "700" },
  emptySub: { marginTop: 8, fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 20 },
  notifCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  notifCardUnread: {
    borderColor: "#FDE68A",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.08,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  notifInfo: { flex: 1, marginLeft: 16 },
  notifHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  notifTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: "#1A1A1A" },
  notifTime: { fontSize: 12, color: "#9CA3AF", fontWeight: "600" },
  notifDesc: { fontSize: 14, color: "#6B7280", lineHeight: 20 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
  },
  metaText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
});
