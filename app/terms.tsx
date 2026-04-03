import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms & Conditions</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.paragraph}>
            Welcome to Anusha Bazaar. These Terms of Service ("Terms") govern your use of our website and mobile application (collectively, the "Service") operated by Anusha Bazaar Technologies Private Limited.
          </Text>
          <Text style={styles.paragraph}>
            By accessing or using the Service, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Service.
          </Text>

          <Text style={styles.sectionHeading}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By creating an account or using our Service, you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree, please do not use our Service.
          </Text>

          <Text style={styles.sectionHeading}>2. Use of Service</Text>
          <Text style={styles.paragraph}>
            You may use our Service only for lawful purposes and in accordance with these Terms. You agree not to:{'\n'}
            • Use the Service in any way that violates any applicable national or international law or regulation{'\n'}
            • Engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Service{'\n'}
            • Impersonate or attempt to impersonate the Company, a Company employee, another user, or any other person or entity{'\n'}
            • Use the Service to transmit, or procure the sending of, any advertising or promotional material without our prior written consent
          </Text>

          <Text style={styles.sectionHeading}>3. User Accounts</Text>
          <Text style={styles.paragraph}>
            When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
            {'\n\n'}
            You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. You agree not to disclose your password to any third party.
          </Text>

          <Text style={styles.sectionHeading}>4. Orders and Payments</Text>
          <Text style={styles.paragraph}>
            All orders placed through our Service are subject to product availability. We reserve the right to refuse or cancel any order for any reason at any time.
            {'\n\n'}
            We accept various payment methods as displayed on our platform. By providing payment information, you represent and warrant that you are authorized to use the designated payment method.
            {'\n\n'}
            Prices for our products are subject to change without notice. We shall not be liable to you or to any third party for any modification, price change, suspension, or discontinuance of the Service.
          </Text>

          <Text style={styles.sectionHeading}>5. Delivery</Text>
          <Text style={styles.paragraph}>
            We strive to deliver all orders within our advertised timeframe. However, delivery times may vary based on factors beyond our control, including but not limited to weather conditions, traffic, or unforeseen circumstances. We are not liable for any delays in delivery.
          </Text>

          <Text style={styles.sectionHeading}>6. Returns and Refunds</Text>
          <Text style={styles.paragraph}>
            We want you to be satisfied with your purchase. If you are not satisfied with any product, you may request a return or exchange within 24 hours of delivery, subject to our Return Policy.
            {'\n\n'}
            Refunds will be processed within 5-7 business days to the original payment method used for the purchase.
          </Text>

          <Text style={styles.sectionHeading}>7. Product Information</Text>
          <Text style={styles.paragraph}>
            We strive to provide accurate product descriptions and images. However, we do not warrant that product descriptions, images, or other content available on the Service are accurate, complete, reliable, current, or error-free.
          </Text>

          <Text style={styles.sectionHeading}>8. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            In no event shall Anusha Bazaar, Anusha Bazaar Technologies Private Limited, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
          </Text>

          <Text style={styles.sectionHeading}>9. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            The Service and its original content, features, and functionality are and will remain the exclusive property of Anusha Bazaar Technologies Private Limited and its licensors. The Service is protected by copyright, trademark, and other laws of both India and foreign countries.
          </Text>

          <Text style={styles.sectionHeading}>10. Termination</Text>
          <Text style={styles.paragraph}>
            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
          </Text>

          <Text style={styles.sectionHeading}>11. Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.
          </Text>

          <Text style={styles.sectionHeading}>12. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
          </Text>

          <Text style={styles.sectionHeading}>13. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions about these Terms, please contact us at:{'\n\n'}
            Email: anushabazaar4@gmail.com{'\n'}
            Phone: +91 6309981555{'\n'}
            Address: 501, Manjeera Trinity Corporate, KPHB, Hyderabad, 500072{'\n\n'}
            Last Updated: March 14, 2026
          </Text>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9' 
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  content: { padding: 24, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', marginBottom: 20, letterSpacing: -0.5 },
  sectionHeading: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginTop: 24, marginBottom: 12 },
  paragraph: { fontSize: 15, lineHeight: 24, color: '#475569', fontWeight: '500' },
  bottomSpacer: { height: 40 }
});
