import React from "react";
import {
   View,
   Text,
   StyleSheet,
   Pressable,
   ScrollView,
   Image,
   Dimensions,
   Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get("window");

export default function ReferScreen() {
   const router = useRouter();

   const onShare = async () => {
      try {
         await Share.share({
            message: 'Join me on Anusha Bazaar! Use my referral code SUP123 and get ₹50 on your first delivery: https://anushabazaar.com/join',
         });
      } catch (error) {
         console.error(error);
      }
   };

   return (
      <View style={styles.container}>
         <StatusBar style="light" />
         <SafeAreaView style={styles.safe}>

            {/* Header */}
            <View style={styles.header}>
               <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                  <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
               </TouchableOpacity>
               <Text style={styles.headerTitle}>Refer & Earn</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

               <Animated.View entering={ZoomIn.duration(800)} style={styles.illustrationWrap}>
                  <View style={styles.glowCircle} />
                  <MaterialCommunityIcons name="wallet-giftcard" size={100} color="#0E8A63" />
               </Animated.View>

               <Animated.View entering={FadeInUp.delay(200)} style={styles.textCenter}>
                  <Text style={styles.title}>Win ₹500 for every Friend</Text>
                  <Text style={styles.subtitle}>Refer your friends to join Anusha Bazaar as a delivery partner and get rewarded once they complete 50 deliveries.</Text>
               </Animated.View>

               {/* Reward Flow */}
               <View style={styles.flowRow}>
                  <Step icon="account-plus-outline" label="Invite Friend" />
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#3D3154" />
                  <Step icon="bike-fast" label="They Deliver" />
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#3D3154" />
                  <Step icon="currency-inr" label="You Earn" />
               </View>

               {/* Referral Code Card */}
               <Animated.View entering={FadeInDown.delay(400)} style={styles.referCard}>
                  <Text style={styles.referLabel}>YOUR REFERRAL CODE</Text>
                  <View style={styles.codeBox}>
                     <Text style={styles.codeText}>SUP123</Text>
                     <TouchableOpacity onPress={() => { }} style={styles.copyBtn}>
                        <MaterialCommunityIcons name="content-copy" size={20} color="#0E8A63" />
                     </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={onShare} style={styles.shareBtn}>
                     <Text style={styles.shareBtnText}>Share Invite Link</Text>
                     <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
                  </TouchableOpacity>
               </Animated.View>

               {/* Stats */}
               <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Your Referrals</Text>
               </View>

               <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                     <Text style={styles.statVal}>12</Text>
                     <Text style={styles.statLab}>Invited</Text>
                  </View>
                  <View style={styles.statBox}>
                     <Text style={styles.statVal}>₹2,500</Text>
                     <Text style={styles.statLab}>Earned</Text>
                  </View>
               </View>

            </ScrollView>
         </SafeAreaView>
      </View>
   );
}

function Step({ icon, label }: { icon: any, label: string }) {
   return (
      <View style={styles.stepItem}>
         <View style={styles.stepIconWrap}>
            <MaterialCommunityIcons name={icon} size={24} color="#fff" />
         </View>
         <Text style={styles.stepLabel}>{label}</Text>
      </View>
   );
}

function TouchableOpacity(props: any) {
   const { Pressable } = require("react-native");
   return <Pressable {...props} style={({ pressed }: any) => [props.style, pressed && { opacity: 0.7 }]} />;
}

const styles = StyleSheet.create({
   container: { flex: 1, backgroundColor: "#0A0118" },
   safe: { flex: 1 },
   header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, gap: 16 },
   backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
   headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
   scrollContent: { paddingHorizontal: 24, paddingBottom: 60, alignItems: 'center' },
   illustrationWrap: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 32, marginTop: 20 },
   glowCircle: { position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(112, 45, 255, 0.15)', filter: 'blur(30px)' },
   textCenter: { alignItems: 'center', marginBottom: 40 },
   title: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' },
   subtitle: { color: '#A0A0A0', fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 22, paddingHorizontal: 20 },
   flowRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 48 },
   stepItem: { alignItems: 'center', gap: 8 },
   stepIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
   stepLabel: { color: '#606060', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
   referCard: { width: '100%', backgroundColor: 'rgba(112, 45, 255, 0.05)', borderRadius: 32, padding: 32, borderWidth: 1, borderColor: 'rgba(112, 45, 255, 0.2)', alignItems: 'center' },
   referLabel: { color: '#0E8A63', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
   codeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A0C2E', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 20, marginTop: 16, gap: 20, borderWidth: 1, borderColor: 'rgba(112, 45, 255, 0.3)' },
   codeText: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 4 },
   copyBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(112, 45, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
   shareBtn: { backgroundColor: '#0E8A63', width: '100%', height: 60, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 32 },
   shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
   sectionHeader: { width: '100%', marginTop: 48, marginBottom: 20 },
   sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
   statsGrid: { flexDirection: 'row', gap: 16, width: '100%' },
   statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 24, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
   statVal: { color: '#fff', fontSize: 20, fontWeight: '900' },
   statLab: { color: '#606060', fontSize: 12, fontWeight: '700', marginTop: 4 },
});
