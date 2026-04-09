import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useLanguage } from "../context/LanguageContext";
import { StatusBar } from "expo-status-bar";
import PremiumHeader from "../components/PremiumHeader";

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  const notifications = [
    { title: "Peak Hour Started!", desc: "Earn 20% extra on every order from 7 PM to 10 PM.", time: "2m ago", icon: "lightning-bolt", color: "#FF9F0A" },
    { title: "Payout Processed", desc: "Your weekly earnings of ₹4,250 have been sent to your bank account.", time: "1h ago", icon: "bank-transfer", color: "#00C853" },
    { title: "New Policy Update", desc: "Please review the updated delivery guidelines effective from next Monday.", time: "5h ago", icon: "file-document-outline", color: "#0E8A63" },
    { title: "Congratulations!", desc: "You completed 50 deliveries this week. Gold Badge unlocked!", time: "1d ago", icon: "trophy", color: "#FFD700" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <PremiumHeader 
          title={t('notification')}
          showBack
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
           {notifications.map((item, i) => (
             <View key={i} style={styles.notifCard}>
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
           ))}
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
