import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import { authService } from "../services/authService";
import Animated, { FadeInDown, FadeInUp, ZoomIn, FadeIn } from "react-native-reanimated";
import PremiumPopup, { PopupType } from "../components/PremiumPopup";

const { height, width } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Dynamic UI States
  const [isFocused, setIsFocused] = useState(false);
  const [popup, setPopup] = useState<{visible: boolean, type: PopupType, title: string, message: string}>({
    visible: false, type: "success", title: "", message: ""
  });
  
  // Validate phone — India: 10 digits starting with 6-9
  const isValidPhone = /^[6-9]\d{9}$/.test(phone);

  const handleSendOtp = async () => {
    if (!isValidPhone) return Alert.alert("Invalid Number", "Please enter a valid 10-digit mobile number");
    setLoading(true);

    try {
      const fullPhone = `+91${phone}`;
      const status = await authService.checkPhone(fullPhone);
      if (!status.exists) {
        setLoading(false);
        setPopup({
          visible: true,
          type: "redirect",
          title: "Account Not Found",
          message: "Redirecting you to the Partner Setup application right now..."
        });
        setTimeout(() => {
          setPopup(prev => ({ ...prev, visible: false }));
          router.push({ pathname: "/register", params: { defaultPhone: phone } });
        }, 2500);
        return;
      }
    } catch (e: any) {
      console.warn("Backend check failed, stopping flow", e);
      setLoading(false);
      return Alert.alert("Error", "Could not connect to the backend server.");
    }

    try {
      const fullPhone = `+91${phone}`;
      const confirmation = await auth().signInWithPhoneNumber(fullPhone);
      setLoading(false);
      router.push({ pathname: "/otp", params: { phone, verificationId: confirmation.verificationId, from: "login", countryCode: "+91" } });
    } catch (error: any) {
      setLoading(false);
      Alert.alert("OTP Failed", error?.message || "Could not send OTP.");
    }
  };

  return (
    <>
    <PremiumPopup {...popup} />
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      
      {/* Dynamic Animated Background Elements */}
      <View style={styles.bgBlobPrimary} />
      <View style={styles.bgBlobSecondary} />
      <View style={styles.bgBlobAccent} />

      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.content, { paddingTop: insets.top + (height * 0.04) }]}>
          
          {/* Logo Section with Image */}
          <Animated.View entering={FadeInDown.delay(200).duration(800).springify()} style={styles.header}>
            <View style={styles.logoWrapper}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require("../assets/icon.png")} 
                  style={styles.logoImage} 
                  resizeMode="contain"
                />
              </View>
              <View style={styles.logoDecoration} />
              <View style={styles.logoGlow} />
            </View>
            <Text style={styles.brandName}>Partner Hub</Text>
            <Text style={styles.brandTagline}>Anusha Delivery Partner</Text>
          </Animated.View>

          {/* Login Card */}
          <Animated.View entering={FadeInUp.delay(350).duration(800).springify()} style={styles.cardWrapper}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.welcomeBadge}>
                  <MaterialCommunityIcons name="hand-wave" size={16} color="#0A8754" />
                  <Text style={styles.welcomeBadgeText}>Welcome Back</Text>
                </View>
                <Text style={styles.cardTitle}>Sign in to your account</Text>
                <Text style={styles.cardSubtitle}>Enter your registered mobile number to access your delivery dashboard.</Text>
              </View>

              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Mobile Number</Text>

                {/* Phone Input */}
                <View style={[styles.phoneInputRow, isFocused && styles.phoneInputRowFocused]}>
                  <View style={styles.countryBadge}>
                    <Text style={styles.countryFlag}>🇮🇳</Text>
                    <Text style={styles.countryCode}>+91</Text>
                  </View>
                  <View style={styles.inputDivider} />
                  <TextInput 
                    placeholder="99999 99999"
                    placeholderTextColor="#94A3B8" 
                    style={styles.input} 
                    keyboardType="number-pad" 
                    maxLength={10} 
                    value={phone} 
                    onChangeText={setPhone}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    selectionColor="#0A8754"
                  />
                  {phone.length === 10 && isValidPhone && (
                    <Animated.View entering={ZoomIn}>
                      <Ionicons name="checkmark-circle" size={24} color="#0A8754" style={{ marginRight: 12 }} />
                    </Animated.View>
                  )}
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [styles.primaryButton, (!isValidPhone || loading) && styles.buttonDisabled, pressed && styles.buttonPressed]}
                onPress={handleSendOtp}
                disabled={!isValidPhone || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>SECURE ACCESS</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Trust Badges */}
              <View style={styles.trustBadges}>
                <View style={styles.trustBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#0A8754" />
                  <Text style={styles.trustText}>Verified</Text>
                </View>
                <View style={styles.trustBadge}>
                  <Ionicons name="lock-closed" size={16} color="#0A8754" />
                  <Text style={styles.trustText}>Encrypted</Text>
                </View>
                <View style={styles.trustBadge}>
                  <Ionicons name="flash" size={16} color="#0A8754" />
                  <Text style={styles.trustText}>Instant OTP</Text>
                </View>
              </View>

            </View>
            
            <Animated.View entering={FadeInUp.delay(500).duration(800)} style={styles.signupSection}>
              <Text style={styles.signupText}>New delivery partner?</Text>
              <Pressable onPress={() => router.push("/register")} style={({pressed}) => pressed && {opacity: 0.7}}>
                <Text style={styles.signupLink}>Register Now</Text>
              </Pressable>
            </Animated.View>
            
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { flexGrow: 1 },
  bgBlobPrimary: { position: "absolute", top: -150, right: -100, width: 400, height: 400, borderRadius: 200, backgroundColor: "#E2F2E9", opacity: 0.9, transform: [{ scaleX: 1.2 }] },
  bgBlobSecondary: { position: "absolute", bottom: -200, left: -150, width: 500, height: 500, borderRadius: 250, backgroundColor: "#FEF9C3", opacity: 0.5 },
  bgBlobAccent: { position: "absolute", top: height * 0.35, left: -80, width: 200, height: 200, borderRadius: 100, backgroundColor: "#DBEAFE", opacity: 0.3 },
  content: { flex: 1, paddingHorizontal: 24, paddingBottom: 40, justifyContent: "space-between" },
  
  // Header / Logo
  header: { alignItems: "center", marginBottom: height * 0.03 },
  logoWrapper: { position: "relative", marginBottom: 20 },
  logoContainer: { width: 110, height: 110, borderRadius: 35, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", zIndex: 2, elevation: 12, shadowColor: "#0A8754", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, borderWidth: 1, borderColor: "rgba(10, 135, 84, 0.05)", overflow: "hidden" },
  logoImage: { width: 95, height: 95 },
  logoDecoration: { position: "absolute", bottom: -5, right: -5, width: 120, height: 120, borderRadius: 40, backgroundColor: "#0A8754", opacity: 0.1, zIndex: 1 },
  logoGlow: { position: "absolute", top: -10, left: -10, width: 130, height: 130, borderRadius: 65, backgroundColor: "#0A8754", opacity: 0.05, zIndex: 0 },
  brandName: { fontSize: 34, fontWeight: "900", color: "#0F172A", letterSpacing: -1.2 },
  brandTagline: { fontSize: 14, color: "#64748B", marginTop: 6, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  
  // Card
  cardWrapper: { width: "100%", maxWidth: 480, alignSelf: "center", flex: 1 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 32, padding: 28, elevation: 8, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.06, shadowRadius: 40, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.5)" },
  cardHeader: { marginBottom: 28 },
  welcomeBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F0FDF4", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, alignSelf: "flex-start", marginBottom: 16, borderWidth: 1, borderColor: "#D1FAE5" },
  welcomeBadgeText: { fontSize: 13, fontWeight: "700", color: "#0A8754" },
  cardTitle: { fontSize: 24, fontWeight: "800", color: "#1E293B", marginBottom: 8, letterSpacing: -0.5 },
  cardSubtitle: { fontSize: 14, color: "#64748B", lineHeight: 22, fontWeight: "500" },
  
  // Input Section
  inputSection: { marginBottom: 28 },
  inputLabel: { fontSize: 13, fontWeight: "800", color: "#475569", marginBottom: 12, marginLeft: 4, textTransform: "uppercase", letterSpacing: 1 },
  
  // Phone Input
  phoneInputRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 20, borderWidth: 1.5, borderColor: "#E2E8F0", overflow: "hidden" },
  phoneInputRowFocused: { borderColor: "#0A8754", backgroundColor: "#FFFFFF", shadowColor: "#0A8754", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2 },
  countryBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 18, backgroundColor: "transparent" },
  countryFlag: { fontSize: 22, marginRight: 6 },
  countryCode: { fontSize: 16, fontWeight: "700", color: "#334155" },
  inputDivider: { width: 1.5, height: "40%", backgroundColor: "#E2E8F0" },
  input: { flex: 1, paddingVertical: 18, paddingHorizontal: 16, fontSize: 18, fontWeight: "700", color: "#0F172A", letterSpacing: 1 },
  
  // Button
  primaryButton: { backgroundColor: "#0A8754", height: 60, borderRadius: 18, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12, elevation: 6, shadowColor: "#0A8754", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16 },
  buttonPressed: { transform: [{ scale: 0.96 }], opacity: 0.9, shadowOpacity: 0.15 },
  buttonDisabled: { backgroundColor: "#CBD5E1", shadowOpacity: 0, elevation: 0 },
  buttonText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800", letterSpacing: 0.5 },
  
  // Divider
  divider: { flexDirection: "row", alignItems: "center", marginTop: 28, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E2E8F0" },
  dividerText: { paddingHorizontal: 14, fontSize: 11, fontWeight: "800", color: "#94A3B8", letterSpacing: 2 },
  
  // Trust Badges
  trustBadges: { flexDirection: "row", justifyContent: "center", gap: 20 },
  trustBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  trustText: { fontSize: 11, fontWeight: "700", color: "#64748B" },
  
  // Signup
  signupSection: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 28, gap: 8 },
  signupText: { fontSize: 15, color: "#64748B", fontWeight: "600" },
  signupLink: { fontSize: 15, color: "#0A8754", fontWeight: "800", textDecorationLine: "underline" },
});