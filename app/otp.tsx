import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../context/UserContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { authService } from "../services/authService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import auth from "@react-native-firebase/auth";
import PremiumPopup, { PopupType } from "../components/PremiumPopup";
import messaging from "@react-native-firebase/messaging";

export default function OtpScreen() {
  const router = useRouter();
  const { phone, verificationId, from } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { login } = useUser();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [popup, setPopup] = useState<{visible: boolean, type: PopupType, title: string, message: string}>({
    visible: false, type: "success", title: "", message: ""
  });

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const verifyOtpCode = async () => {
    if (code.length !== 6) return Alert.alert("Incomplete Code", "Please enter the 6-digit verification code.");
    
    setLoading(true);

    if (!verificationId) {
      setLoading(false);
      return Alert.alert("Missing ID", "Verification Instance disconnected.");
    }
    
    try {
      if (!verificationId) throw new Error("Missing Verification ID");
      delete (global as any).firebaseBypass;

      const credential = auth.PhoneAuthProvider.credential(verificationId as string, code);
      const userCred = await auth().signInWithCredential(credential);
      const idToken = await userCred.user!.getIdToken();

      if (from === "login") {
        try {
          // Fetch FCM Token for notifications
          let fcmToken = "";
          try {
             const authStatus = await messaging().requestPermission();
             const isGranted =
               authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
               authStatus === messaging.AuthorizationStatus.PROVISIONAL;
             if (isGranted) {
                 fcmToken = await messaging().getToken();
             }
          } catch(e) {
             console.warn("FCM Token not fetched", e);
          }

          // Backend Login
          const loginRes = await authService.login(idToken, fcmToken);
          if (loginRes.jwtToken) {
            await AsyncStorage.setItem('@anusha_jwt_token', loginRes.jwtToken);
          }
          
          const additionalData = { 
             name: loginRes.fullName || "Partner", 
             vehicleType: "None", 
             photo: "https://ui-avatars.com/api/?name=Partner" 
          };
          let verificationStatus = (loginRes.approvalStatus?.toLowerCase() as any) || "pending";
          
          await login(phone as string, additionalData, verificationStatus);
          setLoading(false);
          
          // Listen for FCM token refresh
          messaging().onTokenRefresh((newToken) => {
              authService.saveFcmToken(phone as string, newToken);
          });
          
          setPopup({
            visible: true,
            type: "success",
            title: "Authentication Verified!",
            message: "Successfully synchronized with the Partner Node. Launching dashboard..."
          });
          
          setTimeout(() => {
             setPopup(prev => ({...prev, visible: false}));
             router.replace("/(tabs)");
          }, 2000);
          return;

        } catch (backendError: any) {
          console.warn("Backend Login Error", backendError?.response?.data || backendError);
          const status = backendError?.response?.status;
          
          if (status === 404) {
             // Not registered -> go to register
             setLoading(false);
             router.replace({ pathname: "/register", params: { phone, idToken } });
             return;
          } else if (status === 403) {
             // Pending approval
             setLoading(false);
             Alert.alert("Pending Approval", "Your account is still waiting for admin approval.");
             return;
          }

          throw backendError;
        }
      } else {
        // From signup page direct route
        setLoading(false);
        router.replace({ pathname: "/register", params: { phone, idToken } });
      }

    } catch (error: any) {
      setLoading(false);
      Alert.alert("Verification Failed", error?.response?.data?.error || error?.message || "Invalid OTP");
      setCode("");
      inputRef.current?.focus();
    }
  };

  const resendOtp = async () => {
    setCanResend(false);
    setResendTimer(30);
    setCode("");
    Alert.alert("Resend Code", "Please request a new code from the previous screen.", [{ text: "OK", onPress: () => router.back() }]);
  };

  const renderOtpBoxes = () => {
    const codeArray = code.split("");
    const boxes = [];
    for (let i = 0; i < 6; i++) {
        const char = codeArray[i] || "";
        const isFocused = i === code.length || (i === 5 && code.length === 6);
        boxes.push(
            <View key={i} style={[styles.otpBox, isFocused && styles.otpBoxActive, char !== "" && styles.otpBoxFilled]}>
                <Text style={styles.otpBoxText}>{char}</Text>
            </View>
        );
    }
    return <Pressable style={styles.otpBoxesContainer} onPress={() => inputRef.current?.focus()}>{boxes}</Pressable>;
  };

  return (
    <>
    <PremiumPopup {...popup} />
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}><Pressable style={styles.backBtn} onPress={() => router.back()}><Ionicons name="chevron-back" size={24} color="#1E293B" /></Pressable></View>
        <View style={styles.content}>
            <View style={styles.titleSection}><Text style={styles.title}>Verification Code</Text><Text style={styles.subtitle}>We&apos;ve sent a 6-digit code to{"\n"}<Text style={styles.phoneHighlight}>+91 {phone}</Text></Text></View>
            <TextInput ref={inputRef} style={styles.hiddenInput} keyboardType="number-pad" maxLength={6} value={code} onChangeText={(v) => setCode(v.replace(/[^0-9]/g, ""))} textContentType="oneTimeCode" autoComplete="sms-otp" autoFocus />
            {renderOtpBoxes()}
            <Pressable style={({ pressed }) => [styles.primaryButton, code.length !== 6 && styles.buttonDisabled, pressed && styles.buttonPressed]} onPress={verifyOtpCode} disabled={code.length !== 6 || loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <><Text style={styles.buttonText}>Verify & Continue</Text><Ionicons name="checkmark-circle" size={20} color="#fff" /></>}
            </Pressable>
            <View style={styles.resendSection}>
                <Text style={styles.resendText}>Didn&apos;t receive the code?</Text>
                {canResend ? <Pressable onPress={resendOtp}><Text style={styles.resendAction}>Resend Code</Text></Pressable> : <Text style={styles.timerText}>Resend in <Text style={styles.timerBold}>{resendTimer}s</Text></Text>}
            </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff", }, scrollContent: { flexGrow: 1, }, header: { paddingHorizontal: 20, marginBottom: 40, }, backBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center", }, content: { paddingHorizontal: 28, }, titleSection: { marginBottom: 48, }, title: { fontSize: 32, fontWeight: "900", color: "#0F172A", letterSpacing: -1, }, subtitle: { fontSize: 16, color: "#64748B", marginTop: 12, lineHeight: 24, fontWeight: "500", }, phoneHighlight: { color: "#1E293B", fontWeight: "800", }, hiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0, }, otpBoxesContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 48, }, otpBox: { width: 48, height: 64, borderRadius: 18, borderWidth: 2, borderColor: "#F1F5F9", backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center", }, otpBoxActive: { borderColor: "#0A8754", backgroundColor: "#fff", elevation: 4, shadowColor: "#0A8754", shadowOpacity: 0.1, shadowRadius: 10, }, otpBoxFilled: { borderColor: "#E2E8F0", backgroundColor: "#fff", }, otpBoxText: { fontSize: 24, fontWeight: "800", color: "#0F172A", }, primaryButton: { backgroundColor: "#0A8754", height: 64, borderRadius: 20, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12, elevation: 8, shadowColor: "#0A8754", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 15, }, buttonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9, }, buttonDisabled: { backgroundColor: "#CBD5E1", shadowOpacity: 0, elevation: 0, }, buttonText: { color: "#fff", fontSize: 17, fontWeight: "800", }, resendSection: { marginTop: 40, alignItems: "center", gap: 8, }, resendText: { fontSize: 15, color: "#64748B", fontWeight: "500", }, resendAction: { fontSize: 15, color: "#0A8754", fontWeight: "800", textDecorationLine: "underline", }, timerText: { fontSize: 15, color: "#94a3b8", fontWeight: "600", }, timerBold: { color: "#0A8754", fontWeight: "800", },
});