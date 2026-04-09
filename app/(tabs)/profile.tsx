import React, { useEffect, useRef, useState } from "react";
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
  FlatList,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { bankService, type BankOption } from "../../services/bankService";

const { width } = Dimensions.get("window");

export default function Profile() {
  const supportNumber = "6309981555";
  const lockedWhatsappUrl = `https://wa.me/91${supportNumber}?text=Hi%2C%20I%20need%20help%20updating%20locked%20details%20in%20Anusha%20Bazaar%20Delivery%20Partner%20app`;
  const router = useRouter();
  const { authState, logout, updateProfile } = useUser();
  const { language, setLanguage, t } = useLanguage();
  const [personalModal, setPersonalModal] = useState(false);
  const [vehicleModal, setVehicleModal] = useState(false);
  const [bankModal, setBankModal] = useState(false);
  const [langModal, setLangModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLockedSupport, setShowLockedSupport] = useState(false);
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

  const openLockedSupport = () => {
    setShowLockedSupport(true);
  };

  const handleUpdateAvatar = async () => {
     if (isApproved) {
        openLockedSupport();
        return;
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
             const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.3 });
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

        const response = await profileService.updateProfilePhoto(uri);
        const nextPhotoUrl =
          response?.photoUrl ||
          response?.profilePhotoUrl ||
          response?.deliveryPerson?.profilePhotoUrl;

        if (nextPhotoUrl) {
          await updateProfile({ photo: nextPhotoUrl });
        }

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
              colors={['#10221A', '#153D2E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileHeaderGradient}
            >
              <View style={styles.profileHeaderInner}>
                <TouchableOpacity onPress={handleUpdateAvatar} style={styles.avatarContainer}>
                  <View style={styles.avatarRing}>
                    {isUploadingPhoto ? (
                      <View style={styles.avatarPlaceholder}>
                         <ActivityIndicator size="small" color="#0E8A63" />
                      </View>
                    ) : user?.photo ? (
                      <Image source={{ uri: user.photo }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <MaterialCommunityIcons name="account" size={40} color="#0E8A63" />
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
                color="#0E8A63"
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

          {isApproved && (
            <TouchableOpacity style={styles.lockedBanner} activeOpacity={0.9} onPress={openLockedSupport}>
              <MaterialCommunityIcons name="lock-check-outline" size={16} color="#166534" />
              <Text style={styles.lockedBannerText}>Account approved — personal, vehicle and bank details are locked. Contact support to modify.</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color="#166534" />
            </TouchableOpacity>
          )}

          <View style={styles.menuGroupCard}>
             <MenuAction
               icon="account-details-outline"
               label="Personal Details"
               locked={isApproved}
               onPress={() => isApproved
                 ? openLockedSupport()
                 : setPersonalModal(true)
               }
             />
             <View style={styles.menuDividerLine} />
             <MenuAction
               icon="car-info"
               label="Vehicle Information"
               locked={isApproved}
               onPress={() => isApproved
                 ? openLockedSupport()
                 : setVehicleModal(true)
               }
               value={user?.vehicleModel ? `${user.vehicleType} (${user.vehicleModel})` : user?.vehicleType}
             />
             <View style={styles.menuDividerLine} />
             <MenuAction
               icon="bank-outline"
               label="Bank Details"
               locked={isApproved}
               onPress={() => isApproved
                 ? openLockedSupport()
                 : setBankModal(true)
               }
               value={user?.bankName || undefined}
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
             <MenuAction icon="file-document-outline" label="Terms & Conditions" onPress={() => router.push('/terms')} />
             <View style={styles.menuDividerLine} />
             <MenuAction icon="information-outline" label="About Anusha Bazaar" onPress={() => router.push('/about')} />
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
                 {language === 'en' && <MaterialCommunityIcons name="check-circle" size={24} color="#0E8A63" />}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => changeLang('te')} style={[styles.langCell, language === 'te' && styles.langCellActive]}>
                 <View style={styles.langCellLeft}>
                    <Text style={[styles.langCellText, language === 'te' && styles.langCellTextActive]}>తెలుగు (Telugu)</Text>
                    <Text style={styles.langCellSub}>Regional Language</Text>
                 </View>
                 {language === 'te' && <MaterialCommunityIcons name="check-circle" size={24} color="#0E8A63" />}
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

      <BankDetailsModal
        visible={bankModal}
        onClose={() => setBankModal(false)}
        initialAccountName={user?.accountName || ""}
        initialAccountNumber={user?.accountNumber || ""}
        initialBankName={user?.bankName || ""}
        initialIfscCode={user?.ifscCode || ""}
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
                   desc={`Call: ${supportNumber}`} 
                   color="#0A6A4C" 
                   onPress={() => Linking.openURL(`tel:${supportNumber}`)} 
                 />
                 <SupportTile 
                   icon="whatsapp" 
                   label="Chat with Us" 
                   desc={`WhatsApp: ${supportNumber}`} 
                   color="#25D366" 
                   onPress={() => Linking.openURL(`https://wa.me/91${supportNumber}?text=Hi%2C%20I%20need%20help%20with%20Anusha%20Bazaar%20Delivery%20Partner%20app`)} 
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

      <Modal visible={showLockedSupport} transparent animationType="fade">
        <View style={styles.modalOverlayCenteredAlpha}>
          <Animated.View entering={FadeInDown} style={styles.lockedSupportBox}>
            <View style={styles.lockedSupportIcon}>
              <MaterialCommunityIcons name="lock-check-outline" size={28} color="#166534" />
            </View>
            <Text style={styles.lockedSupportTitle}>Contact Admin</Text>
            <Text style={styles.lockedSupportSubtitle}>
              Approved profiles are locked in the app. To update personal, vehicle, bank, or photo details, contact admin directly.
            </Text>

            <TouchableOpacity style={styles.lockedSupportPrimary} onPress={() => Linking.openURL(`tel:${supportNumber}`)}>
              <MaterialCommunityIcons name="phone" size={20} color="#FFFFFF" />
              <Text style={styles.lockedSupportPrimaryText}>Call Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.lockedSupportSecondary} onPress={() => Linking.openURL(lockedWhatsappUrl)}>
              <MaterialCommunityIcons name="whatsapp" size={20} color="#25D366" />
              <Text style={styles.lockedSupportSecondaryText}>Chat on WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.lockedSupportClose} onPress={() => setShowLockedSupport(false)}>
              <Text style={styles.lockedSupportCloseText}>Close</Text>
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

function MenuAction({ icon, label, onPress, value, status, locked }: any) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.menuLineItem, locked && { opacity: 0.75 }]}>
       <View style={styles.menuLineLeft}>
          <View style={[styles.menuLineIconBox, { backgroundColor: locked ? '#F8FAFC' : '#F1F5F9' }]}>
             <MaterialCommunityIcons name={icon} size={20} color={locked ? '#94A3B8' : '#64748B'} />
          </View>
          <Text style={[styles.menuLineLabel, locked && { color: '#94A3B8' }]}>{label}</Text>
       </View>
       <View style={styles.menuLineRight}>
          {value && <Text style={styles.menuLineValue}>{value}</Text>}
          {status && (
            <View style={[styles.menuStatusBadge, { backgroundColor: status === 'approved' ? '#DCFCE7' : '#FEF3C7' }]}>
               <Text style={[styles.menuStatusBadgeText, { color: status === 'approved' ? '#166534' : '#92400E' }]}>{status}</Text>
            </View>
          )}
          <MaterialCommunityIcons
            name={locked ? 'lock-outline' : 'chevron-right'}
            size={20}
            color={locked ? '#94A3B8' : '#CBD5E1'}
          />
       </View>
    </TouchableOpacity>
  );
}

function EditPersonalModal({ visible, onClose, initialName, phone, onSuccess }: any) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);
  const { authState, updateProfile } = useUser();
  const user = authState.user;

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
      if (user?.id) {
        await profileService.updateProfileDetailsById(user.id, { firstName, lastName });
      } else {
        await profileService.updateProfileDetails({ firstName, lastName });
      }
      await updateProfile({ name: `${firstName} ${lastName}` });
      onClose();
      setTimeout(() => {
        onSuccess("Personal details successfully updated.");
      }, 400);
    } catch (e: any) {
      const status = e?.response?.status;
      const errorMessage = e?.response?.data?.message || e?.response?.data?.error || e?.message || "Unknown Error";
      Alert.alert("Update Failed", `Could not push identity updates to server.\n\nStatus: ${status || 'No Status'}\nError: ${errorMessage}`);
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
  const { authState, updateProfile } = useUser();
  const user = authState.user;

  const handleSave = async () => {
    if (!model || !regNo) return Alert.alert("Incomplete", "Please provide the vehicle model and registration number.");
    setLoading(true);
    try {
      if (user?.id) {
        await profileService.updateVehicleById(user.id, {
          vehicleType: vehicle.toUpperCase(),
          vehicleModel: model,
          registrationNumber: regNo
        });
      } else {
        await profileService.updateVehicle({
          vehicleType: vehicle.toUpperCase(),
          vehicleModel: model,
          registrationNumber: regNo
        });
      }
      await updateProfile({ vehicleType: vehicle });
      onClose();
      setTimeout(() => {
        onSuccess("Vehicle information updated successfully.");
      }, 400);
    } catch (e: any) {
      const status = e?.response?.status;
      const errorMessage = e?.response?.data?.message || e?.response?.data?.error || e?.message || "Unknown Error";
      Alert.alert("Update Failed", `Could not save your vehicle details right now.\n\nStatus: ${status || 'No Status'}\nError: ${errorMessage}`);
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

function BankDetailsModal({ visible, onClose, initialAccountName, initialAccountNumber, initialBankName, initialIfscCode, onSuccess }: any) {
  const [accountName, setAccountName] = useState(initialAccountName || "");
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber || "");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState(initialAccountNumber || "");
  const [bankName, setBankName] = useState(initialBankName || "");
  const [ifscCode, setIfscCode] = useState(initialIfscCode || "");
  const [loading, setLoading] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState(initialBankName || "");
  const [bankSelected, setBankSelected] = useState(Boolean(initialBankName));
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);
  const [bankSearching, setBankSearching] = useState(false);
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const bankSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAccountName(initialAccountName || "");
    setAccountNumber(initialAccountNumber || "");
    setConfirmAccountNumber(initialAccountNumber || "");
    setBankName(initialBankName || "");
    setBankSearchQuery(initialBankName || "");
    setIfscCode(initialIfscCode || "");
    setBankSelected(Boolean(initialBankName));
    setBankOptions([]);
    setBankDropdownOpen(false);
  }, [initialAccountName, initialAccountNumber, initialBankName, initialIfscCode, visible]);

  useEffect(() => () => {
    if (bankSearchTimer.current) clearTimeout(bankSearchTimer.current);
  }, []);

  const searchBanks = (query: string, preserveSelection = false) => {
    setBankSearchQuery(query);
    setBankDropdownOpen(true);
    if (!preserveSelection) {
      setBankSelected(false);
      setBankName("");
    }
    if (bankSearchTimer.current) clearTimeout(bankSearchTimer.current);
    setBankSearching(true);
    bankSearchTimer.current = setTimeout(async () => {
      try {
        const results = await bankService.search(query);
        setBankOptions(results);
      } catch {
        setBankOptions([]);
      } finally {
        setBankSearching(false);
      }
    }, 250);
  };

  const loadPopularBanks = () => {
    setBankDropdownOpen(true);
    if (bankOptions.length > 0) return;
    searchBanks('', true);
  };

  const selectBank = (bank: BankOption) => {
    setBankName(bank.name);
    setBankSearchQuery(bank.name);
    setBankSelected(true);
    setBankDropdownOpen(false);
    setBankOptions([]);
    if (!ifscCode.trim() && bank.ifscPrefix) {
      setIfscCode(`${bank.ifscPrefix}0`);
    }
  };

  const handleSave = async () => {
    if (!accountName.trim()) return Alert.alert("Required", "Please enter the account holder name.");
    if (!accountNumber.trim() || accountNumber.length < 9) return Alert.alert("Invalid", "Account number must be at least 9 digits.");
    if (accountNumber !== confirmAccountNumber) return Alert.alert("Mismatch", "Account numbers do not match. Please re-enter.");
    if (!bankSelected || !bankName.trim()) return Alert.alert("Required", "Select your bank from the dropdown list.");
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode.toUpperCase())) return Alert.alert("Invalid IFSC", "IFSC code format should be like SBIN0001234.");

    setLoading(true);
    try {
      await profileService.updateBankDetails({
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        bankName: bankName.trim(),
        ifscCode: ifscCode.toUpperCase().trim(),
      });
      onClose();
      setTimeout(() => onSuccess("Bank details saved successfully."), 400);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || "Unknown error";
      Alert.alert("Save Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlayCenteredAlpha}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
          <Animated.View entering={FadeInUp} style={[styles.infoSheetBox, { padding: 24 }]}>
            <View style={[styles.modalSheetHeader, { marginBottom: 4 }]}>
              <Text style={styles.modalSheetTitle}>Bank Details</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeModalBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
            <Text style={{ color: '#64748B', fontSize: 12, marginBottom: 20 }}>Used for salary and delivery earnings payouts</Text>

            <Text style={styles.inputLabelMicro}>ACCOUNT HOLDER NAME</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="As per bank records"
              placeholderTextColor="#94A3B8"
              value={accountName}
              onChangeText={setAccountName}
              autoCapitalize="words"
            />

            <Text style={[styles.inputLabelMicro, { marginTop: 16 }]}>BANK NAME</Text>
            <View>
              <View style={styles.modalSearchField}>
                <MaterialCommunityIcons name="magnify" size={20} color="#0E8A63" />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search your bank (e.g. State Bank)"
                  placeholderTextColor="#94A3B8"
                  value={bankSearchQuery}
                  onChangeText={(value) => searchBanks(value)}
                  onFocus={loadPopularBanks}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {bankSearching ? (
                  <ActivityIndicator size="small" color="#0E8A63" />
                ) : bankSelected ? (
                  <MaterialCommunityIcons name="check-circle" size={18} color="#16A34A" />
                ) : null}
              </View>
              <Text style={styles.modalHelperText}>
                {bankSelected
                  ? "Bank selected from the approved list."
                  : "Choose your bank from the dropdown list to auto-suggest the IFSC prefix."}
              </Text>
              {bankDropdownOpen && bankOptions.length > 0 ? (
                <View style={styles.modalBankDropdown}>
                  <FlatList
                    data={bankOptions}
                    keyExtractor={(item) => String(item.id)}
                    keyboardShouldPersistTaps="handled"
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.modalBankDropdownItem} onPress={() => selectBank(item)}>
                        <MaterialCommunityIcons name="bank" size={18} color="#0E8A63" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.modalBankDropdownName}>{item.name}</Text>
                          <Text style={styles.modalBankDropdownCode}>{item.ifscPrefix} · {item.shortCode}</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.modalBankDivider} />}
                  />
                </View>
              ) : null}
            </View>

            <Text style={[styles.inputLabelMicro, { marginTop: 16 }]}>ACCOUNT NUMBER</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter account number"
              placeholderTextColor="#94A3B8"
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="number-pad"
              secureTextEntry={false}
            />

            <Text style={[styles.inputLabelMicro, { marginTop: 16 }]}>CONFIRM ACCOUNT NUMBER</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Re-enter account number"
              placeholderTextColor="#94A3B8"
              value={confirmAccountNumber}
              onChangeText={setConfirmAccountNumber}
              keyboardType="number-pad"
            />

            <Text style={[styles.inputLabelMicro, { marginTop: 16 }]}>IFSC CODE</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. SBIN0001234"
              placeholderTextColor="#94A3B8"
              value={ifscCode}
              onChangeText={(v) => setIfscCode(v.toUpperCase())}
              autoCapitalize="characters"
              maxLength={11}
            />

            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              style={[styles.modalActionBtnPrimary, loading && { opacity: 0.7 }, { marginTop: 24 }]}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.modalActionBtnTextPrimary}>Save Bank Details</Text>}
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

  lockedBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC', borderRadius: 12, padding: 12, marginBottom: 12 },
  lockedBannerText: { flex: 1, color: '#166534', fontSize: 12, fontWeight: '600', lineHeight: 18 },

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
  langCellActive: { backgroundColor: '#F0FDF4', borderColor: '#0E8A63' },
  langCellLeft: { gap: 2 },
  langCellText: { fontSize: 17, fontWeight: '800', color: '#1E293B' },
  langCellTextActive: { color: '#0E8A63' },
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
  lockedSupportBox: { backgroundColor: '#FFFFFF', borderRadius: 32, padding: 28, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 12 },
  lockedSupportIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginBottom: 18, alignSelf: 'center' },
  lockedSupportTitle: { color: '#0F172A', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  lockedSupportSubtitle: { color: '#64748B', fontSize: 14, fontWeight: '600', lineHeight: 22, textAlign: 'center', marginTop: 10, marginBottom: 22 },
  lockedSupportPrimary: { height: 58, borderRadius: 18, backgroundColor: '#0E8A63', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  lockedSupportPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  lockedSupportSecondary: { height: 58, borderRadius: 18, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  lockedSupportSecondaryText: { color: '#166534', fontSize: 16, fontWeight: '900' },
  lockedSupportClose: { height: 54, borderRadius: 18, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  lockedSupportCloseText: { color: '#475569', fontSize: 15, fontWeight: '800' },
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
  modalActionBtnPrimary: { backgroundColor: '#0E8A63', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 12, shadowColor: '#0E8A63', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  modalActionBtnTextPrimary: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },

  inputLabelMicro: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 1, marginBottom: 8 },
  modalInput: { backgroundColor: '#F8FAFC', paddingHorizontal: 16, height: 56, borderRadius: 16, fontSize: 16, fontWeight: '700', color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
  modalSearchField: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalSearchInput: {
    flex: 1,
    height: 56,
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalHelperText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    lineHeight: 18,
  },
  modalBankDropdown: {
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDEEE7',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  modalBankDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalBankDropdownName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  modalBankDropdownCode: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  modalBankDivider: {
    height: 1,
    backgroundColor: '#EEF5EC',
  },
  vehicleChipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  vChipActive: { backgroundColor: '#F0FDF4', borderColor: '#0E8A63' },
  vChipText: { color: '#64748B', fontSize: 14, fontWeight: '700' },
  vChipTextActive: { color: '#0E8A63' },
});
