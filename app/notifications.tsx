import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useLanguage } from "../context/LanguageContext";
import { StatusBar } from "expo-status-bar";
import PremiumHeader from "../components/PremiumHeader";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/apiClient";

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { authState } = useUser();
  const user = authState.user;

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchNotifications();
  }, [user?.id]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      // 1. Try a standard notifications endpoint
      let data = [];
      try {
        const res = await apiClient.get('/api/notifications');
        data = res.data;
      } catch (err1) {
        // Fallback for user-specific endpoint
        if (user?.id) {
            const res2 = await apiClient.get(`/api/notifications/delivery-person/${user.id}`);
            data = res2.data;
        }
      }

      // Robust array extraction
      const extractData = (d: any) => Array.isArray(d) ? d : d?.data && Array.isArray(d.data) ? d.data : d?.content && Array.isArray(d.content) ? d.content : [];
      const notifs = extractData(data);

      const mapped = notifs.map((n: any, index: number) => ({
        id: n.id || index,
        title: n.title || n.subject || n.heading || "Notification",
        desc: n.message || n.body || n.content || n.description || "You have a new message.",
        time: "Recently", // Ideally parsing n.createdAt or n.timestamp
        icon: n.icon || "bell-ring-outline",
        color: "#F97316"
      }));
      setNotifications(mapped);
    } catch (error) {
       console.log('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <PremiumHeader 
          title={t('notification')}
          showBack
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
           {loading ? (
             <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 50 }} />
           ) : notifications.length === 0 ? (
             <View style={{ alignItems: 'center', marginTop: 50 }}>
               <MaterialCommunityIcons name="bell-off-outline" size={48} color="#D1D5DB" />
               <Text style={{ marginTop: 16, fontSize: 16, color: '#6B7280', fontWeight: '600' }}>No notifications yet</Text>
             </View>
           ) : (
             notifications.map((item, i) => (
               <View key={item.id || i} style={styles.notifCard}>
                  <View style={[styles.iconBox, { backgroundColor: item.color + '15' }]}>
                     <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} />
                  </View>
                  <View style={styles.notifInfo}>
                     <View style={styles.notifHeader}>
                        <Text style={styles.notifTitle}>{item.title}</Text>
                        <Text style={styles.notifTime}>{item.time}</Text>
                     </View>
                     <Text style={styles.notifDesc}>{item.desc}</Text>
                  </View>
               </View>
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
  // Header styles removed as we are using PremiumHeader
  scroll: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40 },
  notifCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  notifInfo: { flex: 1, marginLeft: 16 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  notifTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  notifTime: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  notifDesc: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
});
