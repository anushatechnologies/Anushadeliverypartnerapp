import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../context/UserContext";
import { authService } from "../services/authService";
import { profileService } from "../services/profileService";
import { documentService } from "../services/documentService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeInDown, FadeInUp, ZoomIn } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import auth from "@react-native-firebase/auth";
import { firebase } from "./config/firebase";
import PremiumPopup, { PopupType } from "../components/PremiumPopup";
import messaging from "@react-native-firebase/messaging";

const { width } = Dimensions.get("window");

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { login } = useUser();
  const [loading, setLoading] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState((params.phone as string) || (params.defaultPhone as string) || "");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [idToken, setIdToken] = useState<string | null>((params.idToken as string) || null);
  
  // OTP State
  const [otp, setOtp] = useState("");
  const [isOtpFocused, setIsOtpFocused] = useState(false);
  const otpInputRef = useRef<TextInput>(null);

  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(!!params.idToken);
  
  // Vehicle State
  const [vehicle, setVehicle] = useState("Bike");
  const [vehicleModel, setVehicleModel] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  
  // Custom Formatted Documents
  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");
  const [license, setLicense] = useState("");

  
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [aadhaarPhoto, setAadhaarPhoto] = useState<string | null>(null);
  const [panPhoto, setPanPhoto] = useState<string | null>(null);
  const [licensePhoto, setLicensePhoto] = useState<string | null>(null);

  const [popup, setPopup] = useState<{visible: boolean, type: PopupType, title: string, message: string}>({
    visible: false, type: "success", title: "", message: ""
  });

  // Camera State
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Phone Formatting Handler
  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setPhone(cleaned.slice(0, 10));
  };

  // Format phone display as XXXXX XXXXX
  const getFormattedPhone = (raw: string) => {
    if (raw.length <= 5) return raw;
    return `${raw.slice(0, 5)} ${raw.slice(5)}`;
  };

  // Formatting Handlers
  const handleAadhaarChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    let formatted = "";
    for (let i = 0; i < cleaned.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += " ";
      formatted += cleaned[i];
    }
    setAadhaar(formatted.slice(0, 14)); // 12 digits + 2 spaces
  };

  // PAN: ABCDE1234F pattern — 5 letters, 4 digits, 1 letter
  const handlePanChange = (text: string) => {
    const upper = text.toUpperCase();
    let result = "";
    for (let i = 0; i < upper.length && result.length < 10; i++) {
      const ch = upper[i];
      if (result.length < 5) {
        // First 5 must be letters
        if (/[A-Z]/.test(ch)) result += ch;
      } else if (result.length < 9) {
        // Next 4 must be digits
        if (/[0-9]/.test(ch)) result += ch;
      } else {
        // Last 1 must be letter
        if (/[A-Z]/.test(ch)) result += ch;
      }
    }
    setPan(result);
  };

  // DL: State code (2 letters) + optional hyphen + remaining alphanumeric
  const handleLicenseChange = (text: string) => {
    const upper = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setLicense(upper.slice(0, 16));
  };

  // Format helpers for display hints
  const getAadhaarFormatHint = () => {
    const digits = aadhaar.replace(/\s/g, "").length;
    if (digits === 0) return "Enter 12-digit Aadhaar number";
    if (digits < 12) return `${digits}/12 digits entered`;
    return "✓ Valid format";
  };

  const getPanFormatHint = () => {
    if (pan.length === 0) return "Format: ABCDE1234F (5 letters, 4 digits, 1 letter)";
    if (pan.length < 5) return `${pan.length}/5 letters entered...`;
    if (pan.length < 9) return `Letters ✓ — ${pan.length - 5}/4 digits entered...`;
    if (pan.length < 10) return "Letters ✓ Digits ✓ — Enter last letter";
    if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) return "✓ Valid PAN format";
    return "✗ Invalid format";
  };

  const getLicenseFormatHint = () => {
    if (license.length === 0) return "Format: AP0320260001234";
    if (license.length < 5) return `${license.length} characters entered...`;
    return `${license.length}/16 characters — ${license.length >= 10 ? '✓ Valid length' : 'keep typing...'}`;
  };

  // Logic Handlers
  const takeLivePhoto = async () => {
    if (!cameraPermission?.granted) {
      const p = await requestCameraPermission();
      if (!p.granted) return Alert.alert("Permission required", "Allow camera access to take a live profile photo");
    }
    setShowCamera(true);
  };

  const handleCaptureSelfie = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
        if (photo) {
          setProfilePhoto(photo.uri);
          setShowCamera(false);
        }
      } catch (e: any) {
        Alert.alert("Capture Failed", "Failed to capture selfie.");
      }
    }
  };

  const [pickerModal, setPickerModal] = useState<{visible: boolean, title: string, setter: ((uri: string) => void) | null}>({
    visible: false, title: "", setter: null
  });

  const handleCameraDoc = async () => {
    const activeSetter = pickerModal.setter;
    setPickerModal({ visible: false, title: "", setter: null }); // ensure modal unmounts

    setTimeout(async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return Alert.alert("Required", "Camera access is needed.");
      
      try {
        const result = await ImagePicker.launchCameraAsync({ quality: 0.3 });
        if (!result.canceled && activeSetter) {
          activeSetter(result.assets[0].uri);
        }
      } catch (e: any) {
        console.warn("Camera Register Intent Fail", e);
      }
    }, 400);
  };

  const pickFromGallery = async () => {
    const activeSetter = pickerModal.setter;
    setPickerModal({ visible: false, title: "", setter: null });

    setTimeout(async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return Alert.alert("Permission required", "Allow gallery access to upload documents");
      
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.3,
        });
        if (!result.canceled && result.assets && activeSetter) {
          activeSetter(result.assets[0].uri);
        }
      } catch(e: any) {
        console.warn("Gallery Register Intent Fail", e);
      }
    }, 400);
  };

  const openPicker = (setter: (uri: string) => void, title: string) => {
    setPickerModal({ visible: true, title, setter });
  };

  const handleSendOTP = async () => {
    if (phone.length !== 10) return Alert.alert("Invalid Phone", "Please enter a 10-digit phone number");
    setLoading(true);

    try {
      const confirmation = await auth().signInWithPhoneNumber(`+91${phone}`);
      setVerificationId(confirmation.verificationId);
      setIsOtpSent(true);
      Alert.alert("OTP Sent", "Verification code sent to your mobile.");
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 300); // Faster focus for better UX
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) return Alert.alert("Verify OTP", "Enter the 6-digit code.");
    setLoading(true);

    try {
      if (!verificationId) throw new Error("Missing Verification ID");
      const credential = auth.PhoneAuthProvider.credential(verificationId as string, otp);
      const userCred = await auth().signInWithCredential(credential);
      const token = await userCred.user!.getIdToken();
      
      setIdToken(token);
      setIsPhoneVerified(true);
      setIsOtpSent(false);
      
      setPopup({
        visible: true,
        type: "success",
        title: "Number Verified!",
        message: "Your phone number was authenticated successfully."
      });
      setTimeout(() => setPopup(prev => ({...prev, visible: false})), 2000);
      
    } catch (err: any) {
      Alert.alert("Invalid OTP", "Incorrect code.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!firstName || !lastName || !profilePhoto || !vehicle || !aadhaar || !pan || !license || !aadhaarPhoto || !panPhoto || !licensePhoto) {
      return Alert.alert("Incomplete Profile", "All fields and document photos are required.");
    }
    if (!idToken) return Alert.alert("Verification Required", "Please verify your phone number first.");

    // Validate Strict Formatting Before Connecting to API
    const cleanAadhaar = aadhaar.replace(/ /g, "");
    if (cleanAadhaar.length !== 12) return Alert.alert("Invalid Aadhaar", "Aadhaar must be exactly 12 digits.");
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) return Alert.alert("Invalid Format", "PAN Card must match the exact ABCDE1234F format.");
    if (license.length < 5) return Alert.alert("Invalid License", "Please enter a fully formed Driving License number.");

    setLoading(true);
    try {
      // REFRESH FIREBASE ID TOKEN (prevents expired token errors)
      let activeIdToken = idToken;
      try {
        const currentUser = auth().currentUser;
        if (currentUser) {
          activeIdToken = await currentUser.getIdToken(true); // Force refresh
          setIdToken(activeIdToken);
        }
      } catch (tokenRefreshErr) {
        console.warn("Token refresh failed, using existing token:", tokenRefreshErr);
      }

      // PROACTIVELY UPLOAD TO FIREBASE STORAGE FOR PUBLIC URL (with 10s timeout)
      let finalProfileUrl = `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`;
      try {
        const uploadPromise = (async () => {
          const base64 = await FileSystem.readAsStringAsync(profilePhoto, { encoding: 'base64' });
          const ref = firebase.storage().ref().child(`profiles/${phone}_${Date.now()}.jpg`);
          await ref.putString(`data:image/jpeg;base64,${base64}`, 'data_url');
          return await ref.getDownloadURL();
        })();
        
        const timeoutPromise = new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error("Firebase Storage upload timed out")), 10000)
        );
        
        finalProfileUrl = await Promise.race([uploadPromise, timeoutPromise]);
      } catch (photoUploadError: any) {
        console.warn("Firebase Storage upload skipped:", photoUploadError?.message);
        // Continue with fallback avatar URL
      }

      // FETCH FCM TOKEN
      let fcmToken = "";
      try {
         const authStatus = await messaging().requestPermission();
         const isGranted =
           authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
           authStatus === messaging.AuthorizationStatus.PROVISIONAL;
         if (isGranted) {
            fcmToken = await messaging().getToken();
         }
      } catch(e: any) {
         console.warn("FCM get token failed", e);
      }

      console.log("[Register] Calling signup API...");
      const signupRes = await authService.signup({
         firebaseIdToken: activeIdToken,
         firstName,
         lastName,
         vehicleType: vehicle.toUpperCase(),
         vehicleModel: vehicleModel || "Not Specified",
         registrationNumber: registrationNumber || "Pending Validation",
         profilePhotoUrl: finalProfileUrl,
         fcmToken
      });
      console.log("[Register] Signup API response:", JSON.stringify(signupRes));
      
      const deliveryPersonId = signupRes.deliveryPersonId;
      if (signupRes.jwtToken) await AsyncStorage.setItem('@anusha_jwt_token', signupRes.jwtToken);

      // Upload documents in parallel with allSettled (so one failure doesn't block others)
      console.log("[Register] Uploading documents for deliveryPersonId:", deliveryPersonId);
      const docUploads = await Promise.allSettled([
        aadhaarPhoto ? documentService.uploadDocument(deliveryPersonId, 'AADHAAR_CARD', aadhaar.replace(/ /g, ""), aadhaarPhoto) : Promise.resolve(),
        panPhoto ? documentService.uploadDocument(deliveryPersonId, 'PAN_CARD', pan, panPhoto) : Promise.resolve(),
        licensePhoto ? documentService.uploadDocument(deliveryPersonId, 'DRIVING_LICENSE', license, licensePhoto) : Promise.resolve(),
        profilePhoto ? documentService.uploadDocument(deliveryPersonId, 'PROFILE_PHOTO', phone, profilePhoto) : Promise.resolve(),
      ]);
      
      // Log any failed document uploads (non-blocking)
      docUploads.forEach((result, idx) => {
        const labels = ['Aadhaar', 'PAN', 'License', 'Profile Photo'];
        if (result.status === 'rejected') {
          console.warn(`[Register] ${labels[idx]} upload failed:`, result.reason?.message || result.reason);
        } else {
          console.log(`[Register] ${labels[idx]} upload successful`);
        }
      });

      console.log("[Register] Saving login state...");
      await login(phone, {
        name: `${firstName} ${lastName}`,
        phone, vehicleType: vehicle, photo: profilePhoto, aadhaar, pan, license, aadhaarPhoto, panPhoto, licensePhoto,
      }, "pending");
      
      console.log("[Register] Registration complete, navigating...");
      setLoading(false);
      
      // Show professional success modal
      setShowSuccessModal(true);
      
      setTimeout(() => {
        setShowSuccessModal(false);
        router.replace("/verification");
      }, 3500);
      return; // Skip the finally block's setLoading since we already set it above
      
    } catch (err: any) {
      console.warn("[Register] Full error object:", JSON.stringify(err?.response?.data || err?.message || err));
      const apiError = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      if (apiError?.toLowerCase()?.includes("already registered") || apiError?.toLowerCase()?.includes("login")) {
         Alert.alert("Account Found", "This phone number is already registered in our system.", [
           { text: "Go to Login", onPress: () => router.replace("/login") }
         ]);
      } else {
         Alert.alert("Submission Error", `${apiError || "An unexpected error occurred. Please try again."}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderInputField = (label: string, placeholder: string, value: string, onChange: (t: string) => void, icon: string, kbType: any = "default") => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputBox}>
        <MaterialCommunityIcons name={icon as any} size={20} color="#0A8754" style={styles.inputIcon} />
        <TextInput style={styles.textInput} placeholder={placeholder} placeholderTextColor="#94A3B8" value={value} onChangeText={onChange} keyboardType={kbType} selectionColor="#0A8754" />
      </View>
    </View>
  );

  const renderDocUpload = (title: string, value: string, onChange: (t: string) => void, placeholder: string, photo: string | null, onPick: () => void, kbType: any = "default", maxLength?: number, formatHint?: string) => (
    <View style={styles.docCard}>
      <View style={styles.docHeader}>
        <View>
          <Text style={styles.docTitle}>{title}</Text>
          <Text style={styles.docSubtitle}>Required for verified access</Text>
        </View>
        {photo && (
          <Animated.View entering={ZoomIn}>
             <MaterialCommunityIcons name="check-decagram" size={24} color="#0A8754" />
          </Animated.View>
        )}
      </View>

      <View style={styles.inputGroup}>
        <View style={styles.inputBox}>
          <MaterialCommunityIcons name="card-text-outline" size={20} color="#0A8754" style={styles.inputIcon} />
          <TextInput style={styles.textInput} placeholder={placeholder} placeholderTextColor="#94A3B8" value={value} onChangeText={onChange} keyboardType={kbType} maxLength={maxLength} selectionColor="#0A8754" />
        </View>
        {formatHint && (
          <Text style={styles.formatHintText}>{formatHint}</Text>
        )}
      </View>

      <TouchableOpacity onPress={onPick} style={[styles.uploadButton, photo && styles.uploadButtonDone]}>
        {photo ? (
          <>
            <Image source={{ uri: photo }} style={styles.capturedImage} />
            <TouchableOpacity style={styles.reUploadBtn} onPress={onPick}>
                <MaterialCommunityIcons name="refresh" size={16} color="#fff" />
                <Text style={styles.reUploadText}>Change Photo</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.uploadPlaceholder}>
            <MaterialCommunityIcons name="camera-plus-outline" size={32} color="#0A8754" />
            <Text style={styles.uploadText}>Tap to Upload Document</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <>
    <PremiumPopup {...popup} />
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        {/* Dynamic Background Blob */}
        <View style={styles.bgBlobPrimary} />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerLogoContainer}>
            <Image 
              source={require("../assets/icon.png")} 
              style={styles.headerLogoImage} 
              resizeMode="contain"
            />
          </View>
          <View style={styles.headerTextWrapper}>
            <Text style={styles.headerTitle}>Partner Setup</Text>
            <Text style={styles.headerSubtitle}>Join the delivery network</Text>
          </View>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex1}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            
            {/* Step 1: Personal Profile */}
            <Animated.View entering={FadeInDown.delay(100).duration(600).springify()} style={styles.sectionContainer}>
              <View style={styles.photoUploadWrapper}>
                <TouchableOpacity onPress={takeLivePhoto} style={styles.profilePhotoCircle}>
                  {profilePhoto ? (
                    <Image source={{ uri: profilePhoto }} style={styles.profilePhotoImg} />
                  ) : (
                    <View style={styles.profilePhotoPlaceholder}>
                       <MaterialCommunityIcons name="face-recognition" size={32} color="#0A8754" />
                       <Text style={styles.profilePhotoText}>Take Selfie</Text>
                    </View>
                  )}
                  {profilePhoto && (
                    <View style={styles.photoCheck}>
                      <MaterialCommunityIcons name="check-bold" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.row}>
                <View style={styles.flex1}>{renderInputField("FIRST NAME", "Suresh", firstName, setFirstName, "account")}</View>
                <View style={styles.flex1}>{renderInputField("LAST NAME", "Reddy", lastName, setLastName, "account-outline")}</View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                <View style={styles.phoneBox}>
                  <View style={styles.phonePrefix}><Text style={styles.prefixText}>🇮🇳 +91</Text></View>
                  <View style={styles.inputDivider} />
                  <TextInput 
                    style={styles.phoneInput} 
                    placeholder="99999 99999" 
                    placeholderTextColor="#94A3B8" 
                    keyboardType="number-pad" 
                    maxLength={11}
                    value={getFormattedPhone(phone)} 
                    onChangeText={(text) => handlePhoneChange(text.replace(/\s/g, ""))}
                    editable={!isOtpSent && !isPhoneVerified} 
                  />
                  
                  {isPhoneVerified ? (
                    <Animated.View entering={ZoomIn}><MaterialCommunityIcons name="check-decagram" size={24} color="#0A8754" /></Animated.View>
                  ) : isOtpSent ? (
                    <TouchableOpacity onPress={() => setIsOtpSent(false)} style={styles.phoneActionLight}><Text style={styles.editLink}>Edit</Text></TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={handleSendOTP} disabled={loading || phone.length !== 10} style={[styles.phoneAction, phone.length === 10 && styles.phoneActionActive]}>
                      {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.actionLinkActive}>Send Code</Text>}
                    </TouchableOpacity>
                  )}
                </View>
                {phone.length > 0 && phone.length < 10 && (
                  <Text style={styles.formatHintText}>{phone.length}/10 digits entered</Text>
                )}
              </View>

              {/* Advanced Segmented OTP Box */}
              {isOtpSent && !isPhoneVerified && (
                <Animated.View entering={FadeInDown.duration(400)} style={styles.otpOuterContainer}>
                  <Text style={[styles.inputLabel, { textAlign: 'center', marginBottom: 12 }]}>ENTER 6-DIGIT CODE</Text>
                  
                  <Pressable 
                    onPress={() => {
                       setIsOtpFocused(true);
                       otpInputRef.current?.focus();
                    }} 
                    style={styles.otpBoxContainer}
                  >
                    {[0, 1, 2, 3, 4, 5].map((index) => {
                      const isActive = (otp.length === index && isOtpFocused) || (otp.length === 6 && index === 5 && isOtpFocused);
                      return (
                        <View key={index} style={[styles.otpBox, isActive && styles.otpBoxFocused, otp[index] && styles.otpBoxFilled]}>
                          <Text style={styles.otpText}>{otp[index] || ""}</Text>
                        </View>
                      );
                    })}
                  </Pressable>

                  <TextInput
                    ref={otpInputRef}
                    style={styles.hiddenOtpInput}
                    value={otp}
                    onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, "").slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    onFocus={() => setIsOtpFocused(true)}
                    onBlur={() => setIsOtpFocused(false)}
                    caretHidden={true}
                    textContentType="oneTimeCode"
                    autoComplete="sms-otp"
                  />
                  
                  <TouchableOpacity onPress={handleVerifyOTP} style={[styles.primaryButton, otp.length !== 6 && styles.buttonDisabled]} disabled={loading || otp.length !== 6}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify OTP Code</Text>}
                  </TouchableOpacity>
                </Animated.View>
              )}
            </Animated.View>

            {/* Step 2: Vehicle Selection */}
            <Animated.View entering={FadeInUp.delay(200).duration(600).springify()} style={styles.sectionContainer}>
              <Text style={[styles.inputLabel, { marginBottom: 16 }]}>SELECT VEHICLE TYPE</Text>
              <View style={styles.vehicleGrid}>
                 {[
                   { label: "Bike", icon: "motorbike" as const }, 
                   { label: "Scooter", icon: "scooter" as const }, 
                   { label: "Auto", icon: "taxi" as const }, 
                   { label: "Heavy", icon: "truck-delivery" as const },
                 ].map(v => (
                    <TouchableOpacity key={v.label} onPress={() => setVehicle(v.label)} style={[styles.vCard, vehicle === v.label && styles.vCardActive]}>
                      <MaterialCommunityIcons name={v.icon} size={30} color={vehicle === v.label ? "#fff" : "#0A8754"} />
                      <Text style={[styles.vLabel, vehicle === v.label && styles.vLabelActive]}>{v.label}</Text>
                      {vehicle === v.label && (
                        <Animated.View entering={ZoomIn} style={styles.vSelected}>
                           <MaterialCommunityIcons name="check-bold" size={12} color="#0A8754" />
                        </Animated.View>
                      )}
                    </TouchableOpacity>
                 ))}
              </View>

              <View style={{ marginTop: 24 }}>
                {renderInputField("VEHICLE MODEL", "e.g. Honda Activa 6G", vehicleModel, setVehicleModel, "motorbike")}
                {renderInputField("REGISTRATION NO.", "AP 12 XY 9999", registrationNumber, setRegistrationNumber, "numeric", "default")}
              </View>
            </Animated.View>

            {/* Step 3: Documents */}
            <Animated.View entering={FadeInUp.delay(300).duration(600).springify()} style={styles.sectionContainer}>
               <Text style={[styles.inputLabel, { marginBottom: 16 }]}>KYC DOCUMENTS</Text>
               {renderDocUpload("Aadhaar Card", aadhaar, handleAadhaarChange, "XXXX XXXX XXXX", aadhaarPhoto, () => openPicker(setAadhaarPhoto, "Aadhaar Card"), "number-pad", 14, getAadhaarFormatHint())}
               {renderDocUpload("PAN Card", pan, handlePanChange, "ABCDE1234F", panPhoto, () => openPicker(setPanPhoto, "PAN Card"), "default", 10, getPanFormatHint())}
               {renderDocUpload("Driving License", license, handleLicenseChange, "AP0320260001234", licensePhoto, () => openPicker(setLicensePhoto, "Driving License"), "default", 16, getLicenseFormatHint())}
            </Animated.View>

            <Pressable 
              onPress={handleSubmit} 
              style={({ pressed }) => [styles.finalSubmitBtn, (!isPhoneVerified || loading) && styles.buttonDisabled, pressed && { transform: [{ scale: 0.98 }] }]} 
              disabled={loading || !isPhoneVerified}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={styles.buttonText}>Submit Application</Text>
                  <MaterialCommunityIcons name="arrow-right-circle" size={24} color="#fff" />
                </>
              )}
            </Pressable>

          </ScrollView>

        {/* Professional Success Modal */}
        <Modal visible={showSuccessModal} transparent animationType="none">
          <View style={styles.successOverlay}>
            <Animated.View entering={ZoomIn.springify().damping(15)} style={styles.successCard}>
              <View style={styles.successIconOuter}>
                <View style={styles.successIconRing}>
                  <View style={styles.successIconInner}>
                    <MaterialCommunityIcons name="check-bold" size={48} color="#FFFFFF" />
                  </View>
                </View>
              </View>
              
              <Animated.View entering={FadeInUp.delay(300).duration(500)}>
                <Text style={styles.successTitle}>🎉 Application Submitted!</Text>
                <Text style={styles.successSubtitle}>Congratulations! Your partner application has been successfully submitted.</Text>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(500).duration(500)} style={styles.successInfoBox}>
                <View style={styles.successInfoRow}>
                  <MaterialCommunityIcons name="clock-check-outline" size={20} color="#7C3AED" />
                  <Text style={styles.successInfoText}>Verification takes 24-48 hours</Text>
                </View>
                <View style={styles.successInfoRow}>
                  <MaterialCommunityIcons name="bell-ring-outline" size={20} color="#7C3AED" />
                  <Text style={styles.successInfoText}>You'll be notified once approved</Text>
                </View>
                <View style={styles.successInfoRow}>
                  <MaterialCommunityIcons name="shield-check-outline" size={20} color="#7C3AED" />
                  <Text style={styles.successInfoText}>All documents are securely stored</Text>
                </View>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(700).duration(400)} style={styles.successRedirectRow}>
                <ActivityIndicator size="small" color="#7C3AED" />
                <Text style={styles.successRedirectText}>Redirecting to verification status...</Text>
              </Animated.View>
            </Animated.View>
          </View>
        </Modal>
        </KeyboardAvoidingView>

        {/* Custom Selfie Camera Modal */}
        <Modal visible={showCamera} animationType="slide" transparent={false} onRequestClose={() => setShowCamera(false)}>
          {showCamera && (
            <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
              <View style={styles.cameraHeader}>
                <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.closeCameraBtn}>
                  <MaterialCommunityIcons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.cameraTitle}>Face Recognition</Text>
                <View style={{ width: 40 }} />
              </View>
              
              <View style={styles.cameraContainer}>
                 <CameraView ref={cameraRef} style={styles.cameraPreview} facing="front" />
                 <View style={[styles.cameraOverlay, StyleSheet.absoluteFillObject]} pointerEvents="none">
                    <View style={styles.faceTargetOutline} />
                 </View>
              </View>

              <View style={styles.cameraFooter}>
                <TouchableOpacity onPress={handleCaptureSelfie} style={styles.captureBtn}>
                   <View style={styles.captureInnerBtn} />
                </TouchableOpacity>
                <Text style={{ color: "#fff", opacity: 0.8 }}>Ensure good lighting for verification</Text>
              </View>
            </SafeAreaView>
          )}
        </Modal>

        {/* Dynamic Image Picker Bottom Sheet */}
        <Modal visible={pickerModal.visible} transparent animationType="fade" onRequestClose={() => setPickerModal(prev => ({...prev, visible: false}))}>
          <View style={styles.modalOverlay}>
             <Pressable style={StyleSheet.absoluteFill} onPress={() => setPickerModal(prev => ({...prev, visible: false}))} />
             <Animated.View entering={FadeInDown.springify().damping(20)} style={styles.bottomSheet}>
                
                <View style={styles.sheetHandle} />
                
                <View style={styles.sheetHeader}>
                   <Text style={styles.sheetTitle}>Upload {pickerModal.title}</Text>
                   <Text style={styles.sheetSubtitle}>Choose an option below</Text>
                </View>

                <View style={styles.sheetActions}>
                   <TouchableOpacity onPress={handleCameraDoc} style={styles.actionCard}>
                      <View style={[styles.actionIconBox, { backgroundColor: '#F3E8FF' }]}>
                         <MaterialCommunityIcons name="camera" size={32} color="#702DFF" />
                      </View>
                      <Text style={styles.actionCardTitle}>Camera</Text>
                      <Text style={styles.actionCardSub}>Take a live photo</Text>
                   </TouchableOpacity>

                   <TouchableOpacity onPress={pickFromGallery} style={styles.actionCard}>
                       <View style={[styles.actionIconBox, { backgroundColor: '#ECFDF5' }]}>
                         <MaterialCommunityIcons name="folder-image" size={32} color="#10B981" />
                      </View>
                      <Text style={styles.actionCardTitle}>Device Files</Text>
                      <Text style={styles.actionCardSub}>Upload from device safely</Text>
                   </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => setPickerModal(prev => ({...prev, visible: false}))} style={styles.sheetCancelBtn}>
                   <Text style={styles.sheetCancelText}>Cancel</Text>
                </TouchableOpacity>
             </Animated.View>
          </View>
        </Modal>

      </SafeAreaView>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  safe: { flex: 1 },
  flex1: { flex: 1 },
  bgBlobPrimary: { position: "absolute", top: -100, right: -150, width: 450, height: 450, borderRadius: 225, backgroundColor: "#E2F2E9", opacity: 0.8 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", elevation: 4, shadowColor: "#0A8754", shadowOpacity: 0.1, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10 },
  headerTextWrapper: { marginLeft: 12, flex: 1 },
  headerLogoContainer: { width: 44, height: 44, borderRadius: 12, overflow: "hidden", marginLeft: 12, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(10, 135, 84, 0.1)" },
  headerLogoImage: { width: 32, height: 32 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#0F172A", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: "#64748B", fontWeight: "600", marginTop: 2 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60 },
  sectionContainer: { backgroundColor: "#FFFFFF", borderRadius: 32, padding: 24, marginBottom: 20, elevation: 8, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.05, shadowRadius: 30, borderWidth: 1, borderColor: "rgba(255,255,255,0.6)" },
  photoUploadWrapper: { alignItems: "center", marginBottom: 32, marginTop: 10 },
  profilePhotoCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#0A8754", borderStyle: "dashed", overflow: "hidden" },
  profilePhotoImg: { width: "100%", height: "100%" },
  profilePhotoPlaceholder: { alignItems: "center", gap: 6 },
  profilePhotoText: { color: "#0A8754", fontSize: 13, fontWeight: "800", textTransform: "uppercase" },
  photoCheck: { position: "absolute", bottom: 6, right: 6, backgroundColor: "#0A8754", width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#fff" },
  row: { flexDirection: "row", gap: 14 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { color: "#64748B", fontSize: 12, fontWeight: "800", marginBottom: 10, marginLeft: 4, letterSpacing: 1 },
  inputBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 16, height: 56, paddingHorizontal: 16, borderWidth: 1.5, borderColor: "#E2E8F0" },
  inputIcon: { marginRight: 12, opacity: 0.8 },
  textInput: { flex: 1, color: "#0F172A", fontSize: 16, fontWeight: "700", letterSpacing: 0.5 },
  phoneBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 16, height: 58, paddingHorizontal: 16, borderWidth: 1.5, borderColor: "#E2E8F0" },
  phonePrefix: { justifyContent: "center", alignItems: "center", marginRight: 10 },
  prefixText: { color: "#334155", fontWeight: "800", fontSize: 16, lineHeight: 20 },
  inputDivider: { width: 1.5, height: 24, backgroundColor: "#CBD5E1", marginRight: 10 },
  phoneInput: { flex: 1, color: "#0F172A", fontSize: 17, fontWeight: "800", letterSpacing: 1, height: '100%', paddingVertical: 0, textAlignVertical: "center" },
  phoneActionLight: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: "#F1F5F9" },
  phoneAction: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: "#CBD5E1" },
  phoneActionActive: { backgroundColor: "#0A8754", elevation: 4, shadowColor: "#0A8754", shadowOpacity: 0.3, shadowRadius: 8 },
  actionLinkActive: { color: "#FFFFFF", fontWeight: "800", fontSize: 13, textTransform: "uppercase" },
  editLink: { color: "#475569", fontSize: 13, fontWeight: "800", textTransform: "uppercase" },
  
  // Segmented OTP Styles
  otpOuterContainer: { marginTop: 10, marginBottom: 10 },
  otpBoxContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 20 },
  otpBox: { flex: 1, height: 60, backgroundColor: "#F8FAFC", borderRadius: 14, borderWidth: 1.5, borderColor: "#E2E8F0", justifyContent: 'center', alignItems: 'center' },
  otpBoxFocused: { borderColor: "#0A8754", backgroundColor: "#FFFFFF", shadowColor: "#0A8754", shadowOpacity: 0.2, shadowRadius: 5, elevation: 3 },
  otpBoxFilled: { borderColor: "#0A8754", backgroundColor: "#F0FDF4" },
  otpText: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
  hiddenOtpInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  
  primaryButton: { backgroundColor: "#0A8754", height: 56, borderRadius: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 },
  buttonDisabled: { backgroundColor: "#94A3B8", opacity: 0.7 },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  
  vehicleGrid: { flexDirection: "row", gap: 12 },
  vCard: { flex: 1, backgroundColor: "#F8FAFC", paddingVertical: 20, borderRadius: 20, alignItems: "center", gap: 10, borderWidth: 1.5, borderColor: "#E2E8F0" },
  vCardActive: { backgroundColor: "#F0FDF4", borderColor: "#0A8754", elevation: 2, shadowColor: "#0A8754", shadowOpacity: 0.1, shadowRadius: 5 },
  vLabel: { color: "#64748B", fontWeight: "800", fontSize: 13 },
  vLabelActive: { color: "#0A8754" },
  vSelected: { position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: "#D1FAE5", justifyContent: "center", alignItems: "center" },
  
  docCard: { backgroundColor: "#F8FAFC", borderRadius: 20, padding: 18, marginBottom: 20, borderWidth: 1.5, borderColor: "#F1F5F9" },
  docHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  docTitle: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  docSubtitle: { color: "#64748B", fontSize: 12, marginTop: 4, fontWeight: "500" },
  formatHintText: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 6, marginLeft: 4, letterSpacing: 0.3 },
  uploadButton: { height: 140, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#E2E8F0", borderStyle: "dashed", overflow: "hidden", justifyContent: "center", alignItems: "center" },
  uploadButtonDone: { borderStyle: "solid", borderColor: "#0A8754" },
  uploadPlaceholder: { alignItems: "center", gap: 8 },
  uploadText: { color: "#475569", fontWeight: "700", fontSize: 13 },
  capturedImage: { width: "100%", height: "100%", resizeMode: "cover" },
  reUploadBtn: { position: "absolute", bottom: 10, right: 10, backgroundColor: "rgba(0,0,0,0.7)", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, gap: 6 },
  reUploadText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  
  finalSubmitBtn: { backgroundColor: "#1E293B", height: 64, borderRadius: 20, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12, elevation: 8, shadowColor: "#1E293B", shadowOpacity: 0.25, shadowOffset: { width: 0, height: 10 }, shadowRadius: 15, marginTop: 10 },
  
  cameraHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 20 },
  closeCameraBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  cameraTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  cameraContainer: { flex: 1, overflow: "hidden", borderRadius: 32, marginHorizontal: 16, marginVertical: 10 },
  cameraPreview: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)" },
  faceTargetOutline: { width: 280, height: 380, borderWidth: 3, borderColor: "#00C853", borderStyle: "dashed", borderRadius: 140 },
  cameraFooter: { paddingVertical: 40, alignItems: "center", gap: 16 },
  captureBtn: { width: 84, height: 84, borderRadius: 42, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  captureInnerBtn: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#FFFFFF" },

  // Bottom Sheet Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  sheetHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 24 },
  sheetHeader: { marginBottom: 24, alignItems: 'center' },
  sheetTitle: { color: '#0F172A', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  sheetSubtitle: { color: '#64748B', fontSize: 14, fontWeight: '500', marginTop: 4 },
  sheetActions: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  actionCard: { flex: 1, backgroundColor: '#F8FAFC', padding: 20, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  actionIconBox: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  actionCardTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  actionCardSub: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginTop: 2 },
  sheetCancelBtn: { height: 60, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  sheetCancelText: { color: '#475569', fontSize: 16, fontWeight: '800' },

  // Professional Success Modal
  successOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  successCard: { backgroundColor: '#FFFFFF', borderRadius: 40, padding: 36, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 40, elevation: 24 },
  successIconOuter: { marginBottom: 28 },
  successIconRing: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#BBF7D0' },
  successIconInner: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#0A8754', justifyContent: 'center', alignItems: 'center', shadowColor: '#0A8754', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A', textAlign: 'center', marginBottom: 12, letterSpacing: -0.5 },
  successSubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, fontWeight: '500', marginBottom: 24, paddingHorizontal: 10 },
  successInfoBox: { width: '100%', backgroundColor: '#F8FAFC', borderRadius: 20, padding: 18, gap: 14, marginBottom: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  successInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  successInfoText: { fontSize: 13, color: '#475569', fontWeight: '600', flex: 1 },
  successRedirectRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  successRedirectText: { fontSize: 13, color: '#7C3AED', fontWeight: '700' }
});
