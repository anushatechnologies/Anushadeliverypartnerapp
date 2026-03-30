import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Modal,
  Dimensions,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import firebase from "firebase/compat/app";
import "firebase/compat/storage";
import { useUser } from "../../context/UserContext";
import { useLanguage, Language } from "../../context/LanguageContext";
import Animated, { FadeInDown, FadeInUp, FadeInLeft } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import PremiumHeader from "../../components/PremiumHeader";
import { LinearGradient } from "expo-linear-gradient";
import CustomTouchableOpacity from "../../components/CustomTouchableOpacity";
import PremiumPopup, { PopupType } from "../../components/PremiumPopup";
import { orderService } from "../../services/orderService";
import { profileService } from "../../services/profileService";
import { documentService } from "../../services/documentService";

const { width } = Dimensions.get("window");

export default function Profile() {
  const router = useRouter();
  const { authState, logout, updateProfile } = useUser();
  const { language, setLanguage, t } = useLanguage();
  const [personalModal, setPersonalModal] = useState(false);
  const [vehicleModal, setVehicleModal] = useState(false);
  const [langModal, setLangModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [profileStats, setProfileStats] = useState({ totalTrips: 0, rating: "--" });
  const [popup, setPopup] = useState<{visible: boolean, type: PopupType, title: string, message: string}>({
    visible: false, type: "success", title: "", message: ""
  });

  const showSuccessPopup = (msg: string) => {
    setPopup({ visible: true, type: "success", title: "Updated!", message: msg });
    setTimeout(() => setPopup(prev => ({ ...prev, visible: false })), 2500);
  };

  const user = authState.user;
  const isApproved = authState.verificationStatus === 'approved';

  const handleUpdateAvatar = async () => {
     if (isApproved) {
        return Alert.alert("Locked Profile", "Your profile photo is verified and cannot be changed. Contact support if you need assistance.");
     }
     Alert.alert(
       "Update Profile Photo",
       "Choose an option to update your live photo",
       [
         { 
           text: "Camera", 
           onPress: async () => {
             const { status } = await ImagePicker.requestCameraPermissionsAsync();
             if (status !== 'granted') return Alert.alert("Required", "Camera access is needed.");
             const result = await ImagePicker.launchCameraAsync({ quality: 0.3 });
             if (!result.canceled && result.assets) uploadPhoto(result.assets[0].uri);
           }
         },
         { 
           text: "Device Files", 
           onPress: async () => {
             const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
             if (status !== 'granted') return Alert.alert("Required", "Gallery access is needed.");
             const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.3 });
             if (!result.canceled && result.assets) uploadPhoto(result.assets[0].uri);
           }
         },
         { text: "Cancel", style: "cancel" }
       ]
     );
  };

  const uploadPhoto = async (uri: string) => {
     setIsUploadingPhoto(true);
     try {
        if (!user || (!user.id && user.id !== 0)) throw new Error("Missing Account Context");
        
        let fileUrl = "";
        try {
           const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
           const ref = firebase.storage().ref().child(`profiles/${user.phone}_${Date.now()}.jpg`);
           await ref.putString(`data:image/jpeg;base64,${base64}`, 'data_url');
           fileUrl = await ref.getDownloadURL();
        } catch (uploadObjErr) {
           console.warn("Storage Sync Failed:", uploadObjErr);
           throw new Error("Could not securely upload photo to bucket.");
        }

        const parts = (user.name || "Rider Partner").split(" ");
        const firstName = parts[0];
        const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";

        await profileService.updateProfileDetails({
           firstName,
           lastName,
           profilePhotoUrl: fileUrl
        });

        await updateProfile({ photo: fileUrl }); // Update local UI immediately
        Alert.alert("Success", "Profile photo synced for Admin approval!");
     } catch (err: any) {
        console.warn("Avatar PUT Failed:", err?.response?.data || err?.message);
        Alert.alert("Upload Failed", err?.response?.data?.message || err.message || "Could not submit your live photo right now.");
     } finally {
        setIsUploadingPhoto(false);
     }
  };

  React.useEffect(() => {
    if (user?.id) {
       orderService.getStatistics(user.id)
         .then(res => setProfileStats({ totalTrips: res.completedOrders || 0, rating: res.rating || "--" }))
         .catch(e => console.warn("Failed fetching profile stats", e));
    }
  }, [user?.id]);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };

  const changeLang = (lang: Language) => {
    setLanguage(lang);
    setLangModal(false);
  };

  return (
    <>
    <PremiumPopup {...popup} />
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PremiumHeader 
           title={t('account')}
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Profile Premium Header */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.profileHeaderOuter}>
            <LinearGradient
              colors={['#7C3AED', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileHeaderGradient}
            >
              <View style={styles.profileHeaderInner}>
                <TouchableOpacity onPress={handleUpdateAvatar} style={styles.avatarContainer}>
                  <View style={styles.avatarRing}>
                    {isUploadingPhoto ? (
                      <View style={styles.avatarPlaceholder}>
                         <ActivityIndicator size="small" color="#7C3AED" />
                      </View>
                    ) : user?.photo ? (
                      <Image source={{ uri: user.photo }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <MaterialCommunityIcons name="account" size={40} color="#7C3AED" />
                      </View>
                    )}
                  </View>
                  {!isUploadingPhoto && <View style={styles.statusDotPulsing} />}
                </TouchableOpacity>
                
                <View style={styles.profileInfo}>
                  <Text style={styles.nameText}>{user?.name || "Rider Partner"}</Text>
                  <Text style={styles.phoneText}>+91 {user?.phone || '0000000000'}</Text>
                  <View style={styles.idBadgeMini}>
                    <Text style={styles.idTextMini}>ID: AB-{user?.phone?.slice(-4) || '0000'}</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Quick Info Grid - Home Style */}
          <View style={styles.infoGridRow}>
             <StatCardMini
                label="Total Trips"
                value={profileStats.totalTrips.toString()}
                icon="bike"
                color="#7C3AED"
                colors={['#1E293B', '#0F172A']}
             />
             <StatCardMini
                label="Rating"
                value={profileStats.rating}
                icon="star"
                color="#FF9F0A"
                colors={['#1E293B', '#0F172A']}
             />
          </View>

          {/* Menu Sections */}
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionHeaderTitle}>Account Configuration</Text>
          </View>

          <View style={styles.menuGroupCard}>
             <MenuAction icon="account-details-outline" label="Personal Details" onPress={() => setPersonalModal(true)} />
             <View style={styles.menuDividerLine} />
             <MenuAction 
               icon="car-info" 
               label="Vehicle Information" 
               onPress={() => setVehicleModal(true)} 
               value={user?.vehicleModel ? `${user.vehicleType} (${user.vehicleModel})` : user?.vehicleType} 
             />
             <View style={styles.menuDividerLine} />
             <MenuAction icon="shield-check-outline" label="KYC Verification" onPress={() => router.push("/kyc")} status={authState.verificationStatus || 'Pending'} />
          </View>

          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionHeaderTitle}>Preferences</Text>
          </View>

          <View style={styles.menuGroupCard}>
             <MenuAction 
               icon="translate" 
               label={t('language')} 
               value={language === "en" ? "English" : "Telugu"} 
               onPress={() => setLangModal(true)} 
             />
          </View>

          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionHeaderTitle}>Support & Legal</Text>
          </View>

          <View style={styles.menuGroupCard}>
             <MenuAction icon="help-circle-outline" label={t('help')} onPress={() => setShowHelp(true)} />
             <View style={styles.menuDividerLine} />
             <MenuAction icon="file-document-outline" label="Terms & Conditions" onPress={() => {}} />
             <View style={styles.menuDividerLine} />
             <MenuAction icon="information-outline" label="About Anusha Bazaar" onPress={() => {}} />
          </View>

          {/* Logout Section */}
          <CustomTouchableOpacity onPress={handleLogout} style={styles.logoutButtonOuter}>
             <MaterialCommunityIcons name="logout-variant" size={22} color="#EF4444" />
             <Text style={styles.logoutButtonText}>{t('logout')}</Text>
          </CustomTouchableOpacity>

          {/* Version Info */}
          <View style={styles.footerVersion}>
             <Text style={styles.versionLabel}>Version 2.4.0 (Build 56)</Text>
             <Text style={styles.copyrightLabel}>© 2026 Anusha Bazaar Logistics</Text>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* Language Modal */}
      <Modal visible={langModal} transparent animationType="slide">
        <View style={[styles.modalOverlayBlur, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
           <Animated.View entering={FadeInUp} style={styles.modalSheet}>
              <View style={styles.modalSheetHeader}>
                 <Text style={styles.modalSheetTitle}>Select Language</Text>
                 <TouchableOpacity onPress={() => setLangModal(false)} style={styles.closeModalBtn}>
                    <MaterialCommunityIcons name="close" size={24} color="#0F172A" />
                 </TouchableOpacity>
              </View>
              
              <TouchableOpacity onPress={() => changeLang('en')} style={[styles.langCell, language === 'en' && styles.langCellActive]}>
                 <View style={styles.langCellLeft}>
                    <Text style={[styles.langCellText, language === 'en' && styles.langCellTextActive]}>English</Text>
                    <Text style={styles.langCellSub}>System Default</Text>
                 </View>
                 {language === 'en' && <MaterialCommunityIcons name="check-circle" size={24} color="#7C3AED" />}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => changeLang('te')} style={[styles.langCell, language === 'te' && styles.langCellActive]}>
                 <View style={styles.langCellLeft}>
                    <Text style={[styles.langCellText, language === 'te' && styles.langCellTextActive]}>తెలుగు (Telugu)</Text>
                    <Text style={styles.langCellSub}>Regional Language</Text>
                 </View>
                 {language === 'te' && <MaterialCommunityIcons name="check-circle" size={24} color="#7C3AED" />}
              </TouchableOpacity>
           </Animated.View>
        </View>
      </Modal>

      {/* Info Modals */}
      <EditPersonalModal 
        visible={personalModal} 
        onClose={() => setPersonalModal(false)} 
        initialName={user?.name || ""}
        phone={user?.phone || "N/A"}
        onSuccess={showSuccessPopup}
      />

      <EditVehicleModal 
        visible={vehicleModal} 
        onClose={() => setVehicleModal(false)} 
        initialType={user?.vehicleType || "Bike"}
        initialModel={user?.vehicleModel || ""}
        initialRegNo={user?.registrationNumber || ""}
        onSuccess={showSuccessPopup}
      />

      {/* Premium Support Modal (Matching Home Page) */}
      <Modal visible={showHelp} transparent animationType="slide">
        <View style={styles.modalOverlayBlur}>
           <Animated.View entering={FadeInUp} style={styles.modalSheet}>
              <View style={styles.modalSheetHeader}>
                 <View>
                    <Text style={styles.modalSheetTitle}>{t('help')}</Text>
                    <Text style={styles.modalSheetSubtitle}>How can we assist you today?</Text>
                 </View>
                 <TouchableOpacity onPress={() => setShowHelp(false)} style={styles.closeModalBtn}>
                    <MaterialCommunityIcons name="close" size={24} color="#0F172A" />
                 </TouchableOpacity>
              </View>

              <View style={styles.supportGridList}>
                 <SupportTile 
                   icon="phone-in-talk" 
                   label="Call Support" 
                   desc="Call: 6309981555" 
                   color="#4F46E5" 
                   onPress={() => Linking.openURL('tel:6309981555')} 
                 />
                 <SupportTile 
                   icon="whatsapp" 
                   label="Chat with Us" 
                   desc="WhatsApp: 6309981555" 
                   color="#25D366" 
                   onPress={() => Linking.openURL('https://wa.me/916309981555?text=Hi%2C%20I%20need%20help%20with%20Anusha%20Bazaar%20Delivery%20Partner%20app')} 
                 />
                 <SupportTile 
                   icon="frequently-asked-questions" 
                   label="View FAQs" 
                   desc="Browse helpful articles" 
                   color="#F59E0B" 
                   onPress={() => { setShowHelp(false); router.push('/help'); }} 
                 />
              </View>

              <TouchableOpacity style={styles.modalActionBtnSecondary} onPress={() => setShowHelp(false)}>
                 <Text style={styles.modalActionBtnTextSecondary}>Close</Text>
              </TouchableOpacity>
           </Animated.View>
        </View>
      </Modal>

      {/* Premium Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenteredAlpha}>
          <Animated.View entering={FadeInDown} style={styles.logoutConfirmationBox}>
            <View style={styles.logoutIconBadge}>
               <MaterialCommunityIcons name="logout-variant" size={32} color="#EF4444" />
            </View>
            <Text style={styles.logoutModalTitle}>Confirm Logout</Text>
            <Text style={styles.logoutModalSubtitle}>Are you sure you want to sign out? You&apos;ll need to login again to accept orders.</Text>
            
            <View style={styles.logoutModalActions}>
               <TouchableOpacity style={styles.logoutCancelBtn} onPress={() => setShowLogoutModal(false)}>
                  <Text style={styles.logoutCancelBtnText}>Cancel</Text>
               </TouchableOpacity>
               <TouchableOpacity style={styles.logoutConfirmBtn} onPress={confirmLogout}>
                  <Text style={styles.logoutConfirmBtnText}>Logout</Text>
               </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
    </>
  );
}

interface StatCardMiniProps { label: string; value: string; icon: any; color: string; colors: string[] }

function StatCardMini({ label, value, icon, color, colors }: StatCardMiniProps) {
  return (
    <View style={styles.statCellContainer}>
      <LinearGradient colors={colors as any} style={styles.statCellGradient}>
        <View style={styles.statCellHeader}>
          <View style={[styles.statCellIconBox, { backgroundColor: color + '20' }]}>
            <MaterialCommunityIcons name={icon} size={18} color={color} />
          </View>
        </View>
        <Text style={styles.statCellValue}>{value}</Text>
        <Text style={styles.statCellLabel}>{label}</Text>
      </LinearGradient>
    </View>
  );
}

function MenuAction({ icon, label, onPress, value, status }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.menuLineItem}>
       <View style={styles.menuLineLeft}>
          <View style={[styles.menuLineIconBox, { backgroundColor: '#F1F5F9' }]}>
             <MaterialCommunityIcons name={icon} size={20} color="#64748B" />
          </View>
          <Text style={styles.menuLineLabel}>{label}</Text>
       </View>
       <View style={styles.menuLineRight}>
          {value && <Text style={styles.menuLineValue}>{value}</Text>}
          {status && (
            <View style={[styles.menuStatusBadge, { backgroundColor: status === 'approved' ? '#DCFCE7' : '#FEF3C7' }]}>
               <Text style={[styles.menuStatusBadgeText, { color: status === 'approved' ? '#166534' : '#92400E' }]}>{status}</Text>
            </View>
          )}
          <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
       </View>
    </TouchableOpacity>
  );
}

function EditPersonalModal({ visible, onClose, initialName, phone, onSuccess }: any) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const { updateProfile } = useUser();

  React.useEffect(() => {
    if (initialName) {
       const parts = initialName.split(" ");
       setFirstName(parts[0] || "");
       setLastName(parts.slice(1).join(" ") || "");
    }
  }, [initialName]);

  const handleSave = async () => {
    if (!firstName || !lastName) return Alert.alert("Incomplete", "First and Last Name are required.");
    setSaving(true);
    try {
      await profileService.updateProfileDetails({ firstName, lastName });
      await updateProfile({ name: `${firstName} ${lastName}` });
      onClose();
      setTimeout(() => {
        onSuccess("Personal details successfully updated.");
      }, 400);
    } catch (e: any) {
      Alert.alert("Update Failed", "Could not push identity updates to server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
       <View style={styles.modalOverlayCenteredAlpha}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <Animated.View entering={FadeInUp} style={[styles.infoSheetBox, { padding: 24 }]}>
                <View style={[styles.modalSheetHeader, { marginBottom: 20 }]}>
                    <Text style={styles.modalSheetTitle}>Edit Identity</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeModalBtn}>
                       <MaterialCommunityIcons name="close" size={24} color="#0F172A" />
                    </TouchableOpacity>
                 </View>

                 <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                    <View style={{ flex: 1 }}>
                       <Text style={styles.inputLabelMicro}>FIRST NAME</Text>
                       <TextInput style={styles.modalInput} value={firstName} onChangeText={setFirstName} />
                    </View>
                    <View style={{ flex: 1 }}>
                       <Text style={styles.inputLabelMicro}>LAST NAME</Text>
                       <TextInput style={styles.modalInput} value={lastName} onChangeText={setLastName} />
                    </View>
                 </View>

                 <Text style={[styles.inputLabelMicro, { marginTop: 4 }]}>REGISTERED MOBILE (LOCKED)</Text>
                 <TextInput style={[styles.modalInput, { backgroundColor: "#F1F5F9", color: "#64748B" }]} value={phone} editable={false} />

                 <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.modalActionBtnPrimary, { marginTop: 24 }]}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalActionBtnTextPrimary}>Save Updates</Text>}
                 </TouchableOpacity>
            </Animated.View>
          </KeyboardAvoidingView>
       </View>
    </Modal>
  );
}

function EditVehicleModal({ visible, onClose, initialType, initialModel, initialRegNo, onSuccess }: any) {
  const [vehicle, setVehicle] = useState(initialType || "Bike");
  const [model, setModel] = useState(initialModel || "");
  const [regNo, setRegNo] = useState(initialRegNo || "");
  const [loading, setLoading] = useState(false);
  const { updateProfile } = useUser();

  const handleSave = async () => {
    if (!model || !regNo) return Alert.alert("Incomplete", "Please provide the vehicle model and registration number.");
    setLoading(true);
    try {
      await profileService.updateVehicle({
        vehicleType: vehicle.toUpperCase(),
        vehicleModel: model,
        registrationNumber: regNo
      });
      await updateProfile({ vehicleType: vehicle });
      onClose();
      setTimeout(() => {
        onSuccess("Vehicle information updated successfully.");
      }, 400);
    } catch (e: any) {
      Alert.alert("Update Failed", "Could not save your vehicle details right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
       <View style={styles.modalOverlayCenteredAlpha}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <Animated.View entering={FadeInUp} style={[styles.infoSheetBox, { padding: 24 }]}>
                <View style={[styles.modalSheetHeader, { marginBottom: 20 }]}>
                    <Text style={styles.modalSheetTitle}>Edit Vehicle Info</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeModalBtn}>
                       <MaterialCommunityIcons name="close" size={24} color="#0F172A" />
                    </TouchableOpacity>
                 </View>
                 
                 <Text style={styles.inputLabelMicro}>VEHICLE TYPE</Text>
                 <View style={styles.vehicleChipGrid}>
                    {["Bike", "Scooter", "Auto", "Heavy"].map(v => (
                       <TouchableOpacity key={v} onPress={() => setVehicle(v)} style={[styles.vChip, vehicle === v && styles.vChipActive]}>
                          <Text style={[styles.vChipText, vehicle === v && styles.vChipTextActive]}>{v}</Text>
                       </TouchableOpacity>
                    ))}
                 </View>

                 <Text style={[styles.inputLabelMicro, { marginTop: 16 }]}>VEHICLE MODEL</Text>
                 <TextInput 
                   style={styles.modalInput} 
                   placeholder="e.g. Honda Activa 6G" 
                   placeholderTextColor="#94A3B8" 
                   value={model} 
                   onChangeText={setModel} 
                 />

                 <Text style={[styles.inputLabelMicro, { marginTop: 16 }]}>REGISTRATION NUMBER</Text>
                 <TextInput 
                   style={styles.modalInput} 
                   placeholder="e.g. AP 39 XY 1234" 
                   placeholderTextColor="#94A3B8" 
                   value={regNo} 
                   onChangeText={setRegNo} 
                   autoCapitalize="characters"
                 />

                 <TouchableOpacity onPress={handleSave} disabled={loading} style={[styles.modalActionBtnPrimary, loading && { opacity: 0.7 }]}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalActionBtnTextPrimary}>Save Updates</Text>}
                 </TouchableOpacity>
            </Animated.View>
          </KeyboardAvoidingView>
       </View>
    </Modal>
  );
}

function SupportTile({ icon, label, desc, color, onPress }: { icon: any, label: string, desc: string, color: string, onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.supportListItem}>
       <View style={[styles.supportIconBox, { backgroundColor: color + '15' }]}>
          <MaterialCommunityIcons name={icon} size={26} color={color} />
       </View>
       <View style={styles.supportTextWrap}>
          <Text style={styles.supportLabelText}>{label}</Text>
          <Text style={styles.supportDescText}>{desc}</Text>
       </View>
       <MaterialCommunityIcons name="chevron-right" size={20} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 10 },
  
  profileHeaderOuter: { marginBottom: 24, borderRadius: 28, overflow: 'hidden', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12 },
  profileHeaderGradient: { padding: 24 },
  profileHeaderInner: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { position: 'relative' },
  avatarRing: { width: 84, height: 84, borderRadius: 42, padding: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  avatar: { width: '100%', height: '100%', borderRadius: 39, borderWidth: 2, borderColor: '#FFFFFF' },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 39, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  statusDotPulsing: { position: 'absolute', bottom: 2, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#22C55E', borderWidth: 3, borderColor: '#FFFFFF' },
  profileInfo: { marginLeft: 18, flex: 1 },
  nameText: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  phoneText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 2, fontWeight: '600' },
  idBadgeMini: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8, alignSelf: 'flex-start' },
  idTextMini: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  editProfileBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  infoGridRow: { flexDirection: 'row', gap: 14, marginBottom: 28 },
  statCellContainer: { flex: 1, borderRadius: 22, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6 },
  statCellGradient: { padding: 16 },
  statCellHeader: { marginBottom: 10 },
  statCellIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statCellValue: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  statCellLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },

  sectionHeadingRow: { marginBottom: 12, marginLeft: 4 },
  sectionHeaderTitle: { color: '#64748B', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  menuGroupCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 8, marginBottom: 28, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, borderWidth: 1, borderColor: '#F1F5F9' },
  menuLineItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  menuLineLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuLineIconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  menuLineLabel: { color: '#1E293B', fontSize: 15, fontWeight: '700' },
  menuLineRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuLineValue: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  menuStatusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  menuStatusBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  menuDividerLine: { height: 1, backgroundColor: '#F8FAFC', marginHorizontal: 16 },

  logoutButtonOuter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#FEF2F2', height: 64, borderRadius: 22, marginBottom: 32, borderWidth: 1, borderColor: '#FEE2E2', elevation: 2, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  logoutButtonText: { color: '#EF4444', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },

  footerVersion: { alignItems: 'center', marginBottom: 20 },
  versionLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  copyrightLabel: { color: '#CBD5E1', fontSize: 11, fontWeight: '500', marginTop: 4 },

  modalOverlayBlur: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 28, paddingBottom: 48 },
  modalSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  modalSheetTitle: { color: '#0F172A', fontSize: 26, fontWeight: '900', letterSpacing: -0.8 },
  modalSheetSubtitle: { color: '#64748B', fontSize: 15, fontWeight: '500', marginTop: 4 },
  closeModalBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  
  langCell: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 24, marginBottom: 12, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#F1F5F9' },
  langCellActive: { backgroundColor: '#F5F3FF', borderColor: '#7C3AED' },
  langCellLeft: { gap: 2 },
  langCellText: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  langCellTextActive: { color: '#7C3AED' },
  langCellSub: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },

  supportGridList: { gap: 16, marginBottom: 28 },
  supportListItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  supportIconBox: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 18 },
  supportTextWrap: { flex: 1 },
  supportLabelText: { color: '#0F172A', fontSize: 17, fontWeight: '800' },
  supportDescText: { color: '#64748B', fontSize: 13, fontWeight: '500', marginTop: 3 },
  modalActionBtnSecondary: { height: 64, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  modalActionBtnTextSecondary: { color: '#475569', fontSize: 16, fontWeight: '800' },

  modalOverlayCenteredAlpha: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 28 },
  logoutConfirmationBox: { backgroundColor: '#FFFFFF', borderRadius: 36, padding: 32, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 12 },
  logoutIconBadge: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#FEE2E2' },
  logoutModalTitle: { color: '#0F172A', fontSize: 24, fontWeight: '900', letterSpacing: -0.5, marginBottom: 12 },
  logoutModalSubtitle: { color: '#64748B', fontSize: 15, fontWeight: '500', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  logoutModalActions: { flexDirection: 'row', gap: 14, width: '100%' },
  logoutCancelBtn: { flex: 1, height: 60, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  logoutCancelBtnText: { color: '#64748B', fontSize: 16, fontWeight: '800' },
  logoutConfirmBtn: { flex: 1.2, height: 60, borderRadius: 20, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  logoutConfirmBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },

  infoSheetBox: { backgroundColor: '#FFFFFF', borderRadius: 40, padding: 32, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 28, elevation: 16 },
  infoDataContainer: { marginBottom: 12 },
  infoDataItem: { marginBottom: 20 },
  infoDataLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  infoDataValue: { color: '#1E293B', fontSize: 18, fontWeight: '700', marginTop: 4 },
  modalActionBtnPrimary: { backgroundColor: '#7C3AED', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 12, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  modalActionBtnTextPrimary: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },

  inputLabelMicro: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 1, marginBottom: 8 },
  modalInput: { backgroundColor: '#F8FAFC', paddingHorizontal: 16, height: 56, borderRadius: 16, fontSize: 16, fontWeight: '700', color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
  vehicleChipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  vChipActive: { backgroundColor: '#F5F3FF', borderColor: '#7C3AED' },
  vChipText: { color: '#64748B', fontSize: 14, fontWeight: '700' },
  vChipTextActive: { color: '#7C3AED' },
});