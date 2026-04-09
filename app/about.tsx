import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Application from 'expo-application';

export default function AboutScreen() {
  const router = useRouter();
  const appVersion = Application.nativeApplicationVersion ?? "2.4.8";
  const buildNumber = Application.nativeBuildVersion ?? "86";

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>About App</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#7C3AED', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoBox}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={48} color="#fff" />
            </LinearGradient>
            <Text style={styles.brandName}>Anusha Bazaar</Text>
            <Text style={styles.partnerText}>Delivery Partner</Text>
            
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>Version {appVersion} (Build {buildNumber})</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>About Our Company</Text>
            <Text style={styles.paragraph}>
              Operated by Anusha Bazaar Technologies Private Limited, our mission is to empower delivery partners with modern logistics tools and ensure that essential goods reach customers accurately and at lightning speed.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact Details</Text>
            
            <View style={styles.contactRow}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="email-outline" size={20} color="#7C3AED" />
              </View>
              <View>
                <Text style={styles.contactLabel}>Email Us</Text>
                <Text style={styles.contactValue}>anushabazaar4@gmail.com</Text>
              </View>
            </View>

            <View style={styles.contactRow}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="phone-outline" size={20} color="#10B981" />
              </View>
              <View>
                <Text style={styles.contactLabel}>Support Call / Chat</Text>
                <Text style={styles.contactValue}>+91 6309981555</Text>
              </View>
            </View>

            <View style={[styles.contactRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <View style={styles.iconBox}>
                <MaterialCommunityIcons name="map-marker-outline" size={20} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactLabel}>Headquarters</Text>
                <Text style={styles.contactValue}>
                  501, Manjeera Trinity Corporate,{'\n'}KPHB, Hyderabad, 500072
                </Text>
              </View>
            </View>
          </View>
          
          <Text style={styles.copyright}>© 2026 Anusha Bazaar Technologies Private Limited. All rights reserved.</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF'
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  content: { padding: 20, paddingBottom: 60 },
  
  logoContainer: { alignItems: 'center', marginVertical: 32 },
  logoBox: { width: 100, height: 100, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 12, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, marginBottom: 20 },
  brandName: { fontSize: 26, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  partnerText: { fontSize: 16, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 },
  versionBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 16 },
  versionText: { fontSize: 13, color: '#475569', fontWeight: '800' },

  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16 },
  paragraph: { fontSize: 15, lineHeight: 24, color: '#475569', fontWeight: '500' },

  contactRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 16, marginBottom: 16, gap: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  contactLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  contactValue: { fontSize: 15, color: '#1E293B', fontWeight: '800', marginTop: 2 },

  copyright: { textAlign: 'center', color: '#94A3B8', fontSize: 12, fontWeight: '600', marginTop: 10, paddingHorizontal: 20 }
});
