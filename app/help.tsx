import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useLanguage } from "../context/LanguageContext";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function HelpScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const faqCategories = [
    {
      category: "Getting Started",
      icon: "rocket-launch-outline" as const,
      color: "#14A06D",
      faqs: [
        { q: "How do I start accepting orders?", a: "Toggle the 'Online' switch on the home screen. Once online, you'll receive order notifications automatically based on your current location and proximity to vendors." },
        { q: "What documents are required for verification?", a: "You need to upload your Aadhaar Card, PAN Card, and Driving License along with clear photos of each document. Your profile photo taken via selfie is also required." },
        { q: "How long does account verification take?", a: "Account verification typically takes 24-48 hours after submitting all required documents. You'll receive a notification once your account is approved." },
        { q: "Can I use any vehicle for deliveries?", a: "Yes, we support Bikes, Scooters, Autos, and Heavy vehicles. Select your vehicle type during registration and ensure your vehicle registration is up to date." },
      ]
    },
    {
      category: "Orders & Deliveries",
      icon: "package-variant-closed" as const,
      color: "#10B981",
      faqs: [
        { q: "What happens when I receive a new order?", a: "When a new order is assigned, you'll see a notification with pickup location, drop location, estimated distance, and earnings. You can accept or reject the order with a valid reason." },
        { q: "Can I reject an order?", a: "Yes, you can reject orders but you must provide a valid reason (Vehicle Breakdown, Out of Fuel, Too Far, Personal Emergency, or Other). Frequent rejections may affect your rating." },
        { q: "What if the customer is not available at the delivery location?", a: "Try calling the customer using the contact details in the order. If unreachable, wait for 10 minutes and then contact support. Do not leave the order unattended." },
        { q: "What to do if an order is cancelled after pickup?", a: "If an order is cancelled after pickup, please return the items to the nearest vendor store. Contact support to report the cancellation to avoid penalties." },
        { q: "How do I navigate to the delivery location?", a: "Tap on the delivery address in the order details to open Google Maps with turn-by-turn navigation to the customer's location." },
      ]
    },
    {
      category: "Earnings & Payments",
      icon: "cash-multiple" as const,
      color: "#F59E0B",
      faqs: [
        { q: "How do I withdraw my earnings?", a: "Earnings are automatically transferred to your registered bank account every Monday. You can view your earnings history and pending settlements in the Earnings tab." },
        { q: "How is my delivery fee calculated?", a: "Delivery fees are calculated based on distance, order value, time of day (surge pricing during peak hours), and the number of pickup points. Base rates may vary by city." },
        { q: "What are bonus earnings?", a: "You can earn bonuses by completing a certain number of deliveries in a week, delivering during peak hours, or through referral rewards when your friends join and complete deliveries." },
        { q: "Why is my payment delayed?", a: "Payments are processed weekly every Monday. If there's a delay, it could be due to bank processing times (usually 1-2 business days). Contact support if payment is delayed beyond 3 business days." },
        { q: "How do I update my bank account details?", a: "For security, bank account changes must be done through our support team. Contact us via call or WhatsApp to update your bank details." },
      ]
    },
    {
      category: "Account & Profile",
      icon: "account-cog-outline" as const,
      color: "#0E8A63",
      faqs: [
        { q: "How do I update my profile photo?", a: "Go to Profile tab, tap on your profile photo, and take a new selfie or upload from gallery. Note: Once your profile is verified, photo changes require admin re-approval." },
        { q: "My vehicle has changed, how do I update?", a: "Go to Profile > Vehicle Information to update your vehicle type, model, and registration number. New vehicle details may require re-verification." },
        { q: "How do I change the app language?", a: "Go to Profile > Preferences > Language to switch between English and Telugu. The change takes effect immediately across the app." },
        { q: "Can I temporarily deactivate my account?", a: "Yes, you can go offline anytime by toggling the Online switch. For extended breaks, contact support to put your account on hold without losing your rating." },
      ]
    },
    {
      category: "Safety & Support",
      icon: "shield-check-outline" as const,
      color: "#EF4444",
      faqs: [
        { q: "What should I do in case of an accident?", a: "Your safety is our priority. In case of an accident, first ensure your safety, call emergency services if needed, then contact our support team immediately at 6309981555." },
        { q: "How do I report a safety concern?", a: "Call our 24/7 support line at 6309981555 or send a WhatsApp message. For emergencies, always call local emergency services first." },
        { q: "Is my personal data secure?", a: "Yes, all your personal and financial data is encrypted and stored securely. We follow strict data protection policies and never share your information with third parties." },
        { q: "What if I face harassment from a customer?", a: "Report the incident immediately to our support team. We take all harassment reports seriously and will take appropriate action against the customer." },
      ]
    },
  ];

  const allFaqs = faqCategories.flatMap((cat, catIdx) => 
    cat.faqs.map((faq, faqIdx) => ({
      ...faq,
      category: cat.category,
      globalIndex: catIdx * 100 + faqIdx,
    }))
  );

  const filteredFaqs = searchQuery.trim()
    ? allFaqs.filter(
        f => f.q.toLowerCase().includes(searchQuery.toLowerCase()) || f.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
           <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#1A1A1A" />
           </TouchableOpacity>
           <Text style={styles.headerTitle}>{t('help')}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
           {/* Search */}
           <View style={styles.searchBox}>
              <MaterialCommunityIcons name="magnify" size={22} color="#9CA3AF" />
              <TextInput 
                placeholder="Search for help..." 
                style={styles.searchInput} 
                placeholderTextColor="#9CA3AF" 
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <MaterialCommunityIcons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
           </View>

           {/* Quick Contact Cards */}
           <View style={styles.contactRow}>
              <TouchableOpacity 
                style={[styles.contactCard, { backgroundColor: '#F0FDF4' }]} 
                onPress={() => Linking.openURL('tel:6309981555')}
              >
                 <View style={[styles.contactIconBox, { backgroundColor: '#0E8A63' }]}>
                    <MaterialCommunityIcons name="phone" size={24} color="#fff" />
                 </View>
                 <Text style={styles.contactLabel}>Call Us</Text>
                 <Text style={styles.contactNumber}>6309981555</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.contactCard, { backgroundColor: '#F0FDF4' }]} 
                onPress={() => Linking.openURL('https://wa.me/916309981555?text=Hi%2C%20I%20need%20help%20with%20Anusha%20Bazaar%20Delivery%20Partner%20app')}
              >
                 <View style={[styles.contactIconBox, { backgroundColor: '#25D366' }]}>
                    <MaterialCommunityIcons name="whatsapp" size={24} color="#fff" />
                 </View>
                 <Text style={styles.contactLabel}>WhatsApp</Text>
                 <Text style={styles.contactNumber}>6309981555</Text>
              </TouchableOpacity>
           </View>

           {/* Search Results */}
           {filteredFaqs && (
             <View>
               <Text style={styles.sectionTitle}>
                 Search Results ({filteredFaqs.length})
               </Text>
               {filteredFaqs.length === 0 ? (
                 <View style={styles.noResultsCard}>
                   <MaterialCommunityIcons name="file-search-outline" size={48} color="#CBD5E1" />
                   <Text style={styles.noResultsText}>No results found</Text>
                   <Text style={styles.noResultsSub}>Try different keywords or contact support</Text>
                 </View>
               ) : (
                 filteredFaqs.map((item) => (
                   <TouchableOpacity 
                     key={item.globalIndex} 
                     style={styles.faqCard} 
                     onPress={() => toggleFaq(item.globalIndex)}
                     activeOpacity={0.7}
                   >
                     <View style={styles.faqHeader}>
                       <Text style={styles.faqQuestion}>{item.q}</Text>
                       <MaterialCommunityIcons 
                         name={expandedFaq === item.globalIndex ? "chevron-up" : "chevron-down"} 
                         size={22} 
                         color="#94A3B8" 
                       />
                     </View>
                     {expandedFaq === item.globalIndex && (
                       <Animated.View entering={FadeInDown.duration(200)}>
                         <View style={styles.faqDivider} />
                         <Text style={styles.faqAnswer}>{item.a}</Text>
                         <View style={styles.faqCategoryBadge}>
                           <Text style={styles.faqCategoryText}>{item.category}</Text>
                         </View>
                       </Animated.View>
                     )}
                   </TouchableOpacity>
                 ))
               )}
             </View>
           )}

           {/* FAQ Categories (when not searching) */}
           {!filteredFaqs && (
             <>
               <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
               
               {faqCategories.map((cat, catIdx) => (
                 <View key={catIdx} style={styles.categorySection}>
                   <View style={styles.categoryHeader}>
                     <View style={[styles.categoryIconBox, { backgroundColor: cat.color + '15' }]}>
                       <MaterialCommunityIcons name={cat.icon} size={22} color={cat.color} />
                     </View>
                     <Text style={styles.categoryTitle}>{cat.category}</Text>
                   </View>
                   
                   {cat.faqs.map((item, faqIdx) => {
                     const globalIdx = catIdx * 100 + faqIdx;
                     return (
                       <TouchableOpacity 
                         key={faqIdx} 
                         style={styles.faqCard} 
                         onPress={() => toggleFaq(globalIdx)}
                         activeOpacity={0.7}
                       >
                         <View style={styles.faqHeader}>
                           <Text style={styles.faqQuestion}>{item.q}</Text>
                           <MaterialCommunityIcons 
                             name={expandedFaq === globalIdx ? "chevron-up" : "chevron-down"} 
                             size={22} 
                             color="#94A3B8" 
                           />
                         </View>
                         {expandedFaq === globalIdx && (
                           <Animated.View entering={FadeInDown.duration(200)}>
                             <View style={styles.faqDivider} />
                             <Text style={styles.faqAnswer}>{item.a}</Text>
                           </Animated.View>
                         )}
                       </TouchableOpacity>
                     );
                   })}
                 </View>
               ))}
             </>
           )}

           {/* Still Need Help */}
           <View style={styles.helpCard}>
              <View style={styles.helpHead}>
                 <MaterialCommunityIcons name="headphones" size={30} color="#0E8A63" />
                 <Text style={styles.helpTitle}>Still need help?</Text>
              </View>
              <Text style={styles.helpDesc}>Our support team is available 24/7 to assist you with any delivery issues.</Text>
              
              <TouchableOpacity 
                style={styles.supportBtn}
                onPress={() => Linking.openURL('tel:6309981555')}
              >
                 <MaterialCommunityIcons name="phone" size={20} color="#fff" />
                 <Text style={styles.supportBtnText}>Call: 6309981555</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.supportBtn, { backgroundColor: '#25D366', marginTop: 12 }]}
                onPress={() => Linking.openURL('https://wa.me/916309981555?text=Hi%2C%20I%20need%20help%20with%20Anusha%20Bazaar%20Delivery%20Partner%20app')}
              >
                 <MaterialCommunityIcons name="whatsapp" size={20} color="#fff" />
                 <Text style={styles.supportBtnText}>Chat on WhatsApp</Text>
              </TouchableOpacity>
           </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, gap: 16 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#1A1A1A' },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', height: 56, borderRadius: 18, paddingHorizontal: 16, marginBottom: 24, borderWidth: 1, borderColor: '#F3F4F6' },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  
  contactRow: { flexDirection: 'row', gap: 14, marginBottom: 28 },
  contactCard: { flex: 1, borderRadius: 24, padding: 20, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  contactIconBox: { width: 52, height: 52, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  contactLabel: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
  contactNumber: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 4 },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A', marginBottom: 20 },
  
  categorySection: { marginBottom: 24 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  categoryIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  categoryTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  
  faqCard: { backgroundColor: '#FFFFFF', padding: 18, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', flex: 1, paddingRight: 12 },
  faqDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  faqAnswer: { fontSize: 14, color: '#6B7280', lineHeight: 22 },
  faqCategoryBadge: { alignSelf: 'flex-start', backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 10 },
  faqCategoryText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  
  noResultsCard: { alignItems: 'center', padding: 40, backgroundColor: '#F8FAFC', borderRadius: 24, marginBottom: 20 },
  noResultsText: { fontSize: 16, fontWeight: '800', color: '#94A3B8', marginTop: 16 },
  noResultsSub: { fontSize: 13, color: '#CBD5E1', marginTop: 4 },
  
  helpCard: { backgroundColor: '#F0FDF4', borderRadius: 28, padding: 24, marginTop: 16, alignItems: 'center' },
  helpHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  helpTitle: { fontSize: 20, fontWeight: '900', color: '#1A1A1A' },
  helpDesc: { textAlign: 'center', color: '#6B7280', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  supportBtn: { backgroundColor: '#0E8A63', width: '100%', height: 56, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, shadowColor: '#0E8A63', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  supportBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
