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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "../../context/UserContext";
import { useLanguage, Language } from "../../context/LanguageContext";
import { useTheme } from "../../context/ThemeContext";
import Animated, { FadeInDown, FadeInUp, FadeInLeft } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import CustomTouchableOpacity from "../../components/CustomTouchableOpacity";
import { orderService } from "../../services/orderService";
import { profileService } from "../../services/profileService";
import { bankService, type BankOption } from "../../services/bankService";

const { width } = Dimensions.get("window");

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCardMini({ label, value, icon, color, theme }: any) {
  return (
    <View style={[miniStyles.card, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
      <View style={[miniStyles.iconCircle, { backgroundColor: color + "20" }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <Text style={[miniStyles.value, { color: theme.text }]}>{value}</Text>
      <Text style={[miniStyles.label, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const miniStyles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  value: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  label: { fontSize: 11, fontWeight: "600", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
});

function MenuAction({
  icon,
  label,
  value,
  locked,
  status,
  onPress,
  isSwitch,
  switchValue,
  onSwitchChange,
  theme,
  danger,
}: any) {
  const statusColor =
    status === "approved"
      ? "#16A34A"
      : status === "rejected"
      ? "#DC2626"
      : "#F97316";

  return (
    <TouchableOpacity
      onPress={!isSwitch ? onPress : undefined}
      activeOpacity={0.75}
      style={[menuStyles.row, { borderColor: theme.divider }]}
    >
      <View style={[menuStyles.iconBg, { backgroundColor: (danger ? theme.dangerSoft : theme.primaryGlow) }]}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={danger ? theme.danger : theme.primary}
        />
      </View>
      <Text style={[menuStyles.label, { color: danger ? theme.danger : theme.text, flex: 1 }]} numberOfLines={1}>{label}</Text>
      {locked && (
        <MaterialCommunityIcons name="lock" size={14} color={theme.textSoft} style={{ marginRight: 4 }} />
      )}
      {status && (
        <View style={[menuStyles.statusBadge, { backgroundColor: statusColor + "18" }]}>
          <Text style={[menuStyles.statusText, { color: statusColor }]}>{status.toUpperCase()}</Text>
        </View>
      )}
      {value && !status && (
        <Text style={[menuStyles.value, { color: theme.textMuted }]} numberOfLines={1}>{value}</Text>
      )}
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: theme.switchTrack, true: theme.primary }}
          thumbColor={switchValue ? "#FFFFFF" : theme.switchThumb}
        />
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={22} color={theme.textSoft} />
      )}
    </TouchableOpacity>
  );
}

const menuStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  label: { fontSize: 15, fontWeight: "600" },
  value: { fontSize: 13, fontWeight: "500", maxWidth: 120 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 4,
  },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Profile() {
  const supportNumber = "6309981555";
  const lockedWhatsappUrl = `https://wa.me/91${supportNumber}?text=Hi%2C%20I%20need%20help%20updating%20locked%20details%20in%20Anusha%20Bazaar%20Delivery%20Partner%20app`;
  const router = useRouter();
  const { authState, logout, updateProfile } = useUser();
  const { language, setLanguage, t } = useLanguage();
  const { theme, isDark, toggleTheme } = useTheme();

  const [personalModal, setPersonalModal] = useState(false);
  const [vehicleModal, setVehicleModal] = useState(false);
  const [bankModal, setBankModal] = useState(false);
  const [langModal, setLangModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLockedSupport, setShowLockedSupport] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [profileStats, setProfileStats] = useState({ totalTrips: 0, rating: "--" });

  // Bank modal state
  const [bankName, setBankName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankConfirmNumber, setBankConfirmNumber] = useState("");
  const [bankIfscCode, setBankIfscCode] = useState("");
  const [bankSearchQuery, setBankSearchQuery] = useState("");
  const [bankOptions, setBankOptions] = useState<BankOption[]>([]);
  const [bankSearching, setBankSearching] = useState(false);
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const [bankSelected, setBankSelected] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const bankSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Personal edit state
  const [editName, setEditName] = useState("");
  const [personalSaving, setPersonalSaving] = useState(false);

  // Vehicle modal state
  const [editVehicleModel, setEditVehicleModel] = useState("");
  const [editVehicleReg, setEditVehicleReg] = useState("");
  const [vehicleSaving, setVehicleSaving] = useState(false);

  const user = authState.user;
  const isApproved = authState.verificationStatus === "approved";

  useEffect(() => {
    if (user?.id) {
      orderService
        .getStatistics(user.id)
        .then((res) =>
          setProfileStats({
            totalTrips: res.completedOrders || 0,
            rating: res.rating || "--",
          })
        )
        .catch(() => {});
    }
  }, [user?.id]);

  const handleUpdateAvatar = async () => {
    if (isApproved) {
      setShowLockedSupport(true);
      return;
    }
    Alert.alert("Update Profile Photo", "Choose an option", [
      {
        text: "Camera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted")
            return Alert.alert("Required", "Camera access is needed.");
          const result = await ImagePicker.launchCameraAsync({ quality: 0.3 });
          if (!result.canceled && result.assets) uploadPhoto(result.assets[0].uri);
        },
      },
      {
        text: "Device Files",
        onPress: async () => {
          const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted")
            return Alert.alert("Required", "Gallery access is needed.");
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.3 });
          if (!result.canceled && result.assets) uploadPhoto(result.assets[0].uri);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const uploadPhoto = async (uri: string) => {
    setIsUploadingPhoto(true);
    try {
      const response = await profileService.updateProfilePhoto(uri);
      const nextPhotoUrl =
        response?.photoUrl ||
        response?.profilePhotoUrl ||
        response?.deliveryPerson?.profilePhotoUrl;
      if (nextPhotoUrl) await updateProfile({ photo: nextPhotoUrl });
      Alert.alert("Success", "Profile photo submitted for Admin approval!");
    } catch (err: any) {
      Alert.alert(
        "Upload Failed",
        err?.response?.data?.message || err.message || "Could not upload photo right now."
      );
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleLogout = () => setShowLogoutModal(true);
  const confirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
  };
  const changeLang = (lang: Language) => {
    setLanguage(lang);
    setLangModal(false);
  };

  const handleSavePersonal = async () => {
    if (!editName.trim()) return Alert.alert("Required", "Name cannot be empty.");
    setPersonalSaving(true);
    try {
      const [first, ...rest] = editName.trim().split(" ");
      await profileService.updateProfileDetails({ firstName: first, lastName: rest.join(" ") || "." });
      await updateProfile({ name: editName.trim() });
      setPersonalModal(false);
      Alert.alert("Updated", "Personal details saved.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save changes.");
    } finally {
      setPersonalSaving(false);
    }
  };

  const handleSaveVehicle = async () => {
    setVehicleSaving(true);
    try {
      await profileService.updateVehicle({
        vehicleType: user?.vehicleType || "BIKE",
        vehicleModel: editVehicleModel,
        registrationNumber: editVehicleReg,
      });
      setVehicleModal(false);
      Alert.alert("Updated", "Vehicle details saved.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save vehicle info.");
    } finally {
      setVehicleSaving(false);
    }
  };

  const handleBankSearch = (q: string) => {
    setBankSearchQuery(q);
    setBankSelected(false);
    if (bankSearchTimer.current) clearTimeout(bankSearchTimer.current);
    if (!q.trim()) { setBankOptions([]); setBankDropdownOpen(false); return; }
    setBankDropdownOpen(true);
    setBankSearching(true);
    bankSearchTimer.current = setTimeout(async () => {
      try {
        const opts = await bankService.search(q);
        setBankOptions(opts.slice(0, 8));
      } catch {
        setBankOptions([]);
      } finally {
        setBankSearching(false);
      }
    }, 350);
  };

  const handleSaveBank = async () => {
    if (!bankAccountName.trim() || !bankAccountNumber.trim() || !bankIfscCode.trim())
      return Alert.alert("Required", "Please fill all bank fields.");
    if (bankAccountNumber !== bankConfirmNumber)
      return Alert.alert("Mismatch", "Account numbers do not match.");
    setBankSaving(true);
    try {
      await profileService.updateBankDetails({
        accountName: bankAccountName,
        bankName,
        accountNumber: bankAccountNumber,
        ifscCode: bankIfscCode,
      });
      setBankModal(false);
      Alert.alert("Saved", "Bank details updated.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save bank info.");
    } finally {
      setBankSaving(false);
    }
  };

  const s = makeStyles(theme);

  // Phone display helper
  const displayPhone = (() => {
    const digits = (user?.phone || "").replace(/\D/g, "");
    const normalized = digits.length > 10 ? digits.slice(-10) : digits || "0000000000";
    return `+91 ${normalized}`;
  })();

  const displayId = (() => {
    const digits = (user?.phone || "").replace(/\D/g, "");
    const normalized = digits.length > 10 ? digits.slice(-10) : digits || "0000000000";
    return `ID: AB-${normalized.slice(-4)}`;
  })();

  return (
    <>
      <View style={s.container}>
        <StatusBar style={theme.statusBar} />
        <SafeAreaView style={s.safe} edges={["top"]}>

          {/* ── Header ── */}
          <View style={s.header}>
            <Text style={s.headerTitle}>Account</Text>
            <TouchableOpacity onPress={toggleTheme} style={s.themeToggleBtn}>
              <MaterialCommunityIcons
                name={isDark ? "weather-sunny" : "weather-night"}
                size={22}
                color={theme.primary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
          >
            {/* ── Profile Hero Card ── */}
            <Animated.View entering={FadeInDown.duration(500)}>
              <LinearGradient
                colors={isDark ? ["#1C2128", "#161B22"] : ["#111827", "#1F2937"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.heroCard}
              >
                {/* Theme toggle inside card */}
                <View style={s.heroRow}>
                  <TouchableOpacity onPress={handleUpdateAvatar} style={s.avatarContainer}>
                    <View style={s.avatarRing}>
                      {isUploadingPhoto ? (
                        <View style={s.avatarPlaceholder}>
                          <ActivityIndicator size="small" color="#F97316" />
                        </View>
                      ) : user?.photo ? (
                        <Image source={{ uri: user.photo }} style={s.avatar} />
                      ) : (
                        <View style={s.avatarPlaceholder}>
                          <MaterialCommunityIcons name="account" size={40} color="#F97316" />
                        </View>
                      )}
                    </View>
                    <View style={s.cameraBadge}>
                      <MaterialCommunityIcons name="camera" size={12} color="#fff" />
                    </View>
                  </TouchableOpacity>

                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={s.heroName}>{user?.name || "Rider Partner"}</Text>
                    <Text style={s.heroPhone}>{displayPhone}</Text>
                    <View style={s.heroBadge}>
                      <MaterialCommunityIcons name="identifier" size={12} color="#F97316" />
                      <Text style={s.heroBadgeText}>{displayId}</Text>
                    </View>
                  </View>
                </View>

                {/* Status badges */}
                <View style={s.heroStatusRow}>
                  <View style={[s.heroStatusChip, { backgroundColor: isApproved ? "#16A34A22" : "#F9731622" }]}>
                    <View style={[s.heroStatusDot, { backgroundColor: isApproved ? "#16A34A" : "#F97316" }]} />
                    <Text style={[s.heroStatusText, { color: isApproved ? "#4ADE80" : "#FCA07D" }]}>
                      {isApproved ? "Verified Partner" : "Pending Approval"}
                    </Text>
                  </View>
                  <View style={[s.heroStatusChip, { backgroundColor: "#2563EB22" }]}>
                    <MaterialCommunityIcons name="star" size={12} color="#60A5FA" />
                    <Text style={[s.heroStatusText, { color: "#93C5FD" }]}>{profileStats.rating} Rating</Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* ── Stats Row ── */}
            <Animated.View entering={FadeInDown.delay(100)} style={s.statsRow}>
              <StatCardMini
                label="Total Trips"
                value={profileStats.totalTrips.toString()}
                icon="bike"
                color="#F97316"
                theme={theme}
              />
              <StatCardMini
                label="Rating"
                value={profileStats.rating}
                icon="star"
                color="#FBBF24"
                theme={theme}
              />
              <StatCardMini
                label="Status"
                value={isApproved ? "Active" : "Pending"}
                icon="shield-check"
                color={isApproved ? "#16A34A" : "#F97316"}
                theme={theme}
              />
            </Animated.View>

            {/* ── Locked Banner ── */}
            {isApproved && (
              <Animated.View entering={FadeInDown.delay(150)}>
                <TouchableOpacity
                  style={[s.lockedBanner, { backgroundColor: theme.dangerSoft, borderColor: theme.danger + "44" }]}
                  onPress={() => setShowLockedSupport(true)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="lock-check-outline" size={16} color={theme.danger} />
                  <Text style={[s.lockedBannerText, { color: theme.danger }]}>
                    Account approved — contact support to modify locked details.
                  </Text>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={theme.danger} />
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* ── Account Configuration ── */}
            <Animated.View entering={FadeInDown.delay(180)}>
              <Text style={s.sectionTitle}>Account Configuration</Text>
              <View style={[s.menuCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <MenuAction
                  icon="account-details-outline"
                  label="Personal Details"
                  locked={isApproved}
                  onPress={() => {
                    if (isApproved) { setShowLockedSupport(true); return; }
                    setEditName(user?.name || "");
                    setPersonalModal(true);
                  }}
                  theme={theme}
                />
                <View style={[s.menuDivider, { backgroundColor: theme.divider }]} />
                <MenuAction
                  icon="car-info"
                  label="Vehicle Information"
                  locked={isApproved}
                  value={user?.vehicleModel ? `${user.vehicleType} · ${user.vehicleModel}` : user?.vehicleType}
                  onPress={() => {
                    if (isApproved) { setShowLockedSupport(true); return; }
                    setEditVehicleModel(user?.vehicleModel || "");
                    setEditVehicleReg(user?.registrationNumber || "");
                    setVehicleModal(true);
                  }}
                  theme={theme}
                />
                <View style={[s.menuDivider, { backgroundColor: theme.divider }]} />
                <MenuAction
                  icon="bank-outline"
                  label="Bank Details"
                  locked={isApproved}
                  value={user?.bankName || undefined}
                  onPress={() => {
                    if (isApproved) { setShowLockedSupport(true); return; }
                    setBankAccountName(user?.bankAccountName || "");
                    setBankName(user?.bankName || "");
                    setBankAccountNumber(user?.bankAccountNumber || "");
                    setBankConfirmNumber(user?.bankAccountNumber || "");
                    setBankIfscCode(user?.ifscCode || "");
                    setBankModal(true);
                  }}
                  theme={theme}
                />
                <View style={[s.menuDivider, { backgroundColor: theme.divider }]} />
                <MenuAction
                  icon="shield-check-outline"
                  label="KYC Verification"
                  status={authState.verificationStatus || "pending"}
                  onPress={() => router.push("/kyc")}
                  theme={theme}
                />
              </View>
            </Animated.View>

            {/* ── Preferences ── */}
            <Animated.View entering={FadeInDown.delay(220)}>
              <Text style={s.sectionTitle}>Preferences</Text>
              <View style={[s.menuCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <MenuAction
                  icon={isDark ? "weather-night" : "weather-sunny"}
                  label={isDark ? "Dark Theme" : "Light Theme"}
                  isSwitch
                  switchValue={isDark}
                  onSwitchChange={toggleTheme}
                  theme={theme}
                />
                <View style={[s.menuDivider, { backgroundColor: theme.divider }]} />
                <MenuAction
                  icon="translate"
                  label={t("language")}
                  value={language === "en" ? "English" : "Telugu"}
                  onPress={() => setLangModal(true)}
                  theme={theme}
                />
              </View>
            </Animated.View>

            {/* ── Support & Legal ── */}
            <Animated.View entering={FadeInDown.delay(260)}>
              <Text style={s.sectionTitle}>Support & Legal</Text>
              <View style={[s.menuCard, { backgroundColor: theme.surface, borderColor: theme.cardBorder }]}>
                <MenuAction
                  icon="help-circle-outline"
                  label={t("help")}
                  onPress={() => setShowHelp(true)}
                  theme={theme}
                />
                <View style={[s.menuDivider, { backgroundColor: theme.divider }]} />
                <MenuAction
                  icon="file-document-outline"
                  label="Terms & Conditions"
                  onPress={() => router.push("/terms")}
                  theme={theme}
                />
                <View style={[s.menuDivider, { backgroundColor: theme.divider }]} />
                <MenuAction
                  icon="information-outline"
                  label="About Anusha Bazaar"
                  onPress={() => router.push("/about")}
                  theme={theme}
                />
              </View>
            </Animated.View>

            {/* ── Logout ── */}
            <Animated.View entering={FadeInDown.delay(300)}>
              <TouchableOpacity
                onPress={handleLogout}
                style={[s.logoutBtn, { backgroundColor: theme.dangerSoft, borderColor: theme.danger + "44" }]}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="logout-variant" size={22} color={theme.danger} />
                <Text style={[s.logoutText, { color: theme.danger }]}>{t("logout")}</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* ── Version ── */}
            <View style={s.footer}>
              <Text style={[s.footerText, { color: theme.textSoft }]}>Version 2.4.0 (Build 56)</Text>
              <Text style={[s.footerText, { color: theme.textSoft }]}>© 2026 Anusha Bazaar Logistics</Text>
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* ══════════════════════════════════════════════════════════════════════
            MODALS
        ══════════════════════════════════════════════════════════════════════ */}

        {/* ── Language Modal ── */}
        <Modal visible={langModal} transparent animationType="slide">
          <Pressable style={s.modalOverlay} onPress={() => setLangModal(false)}>
            <Animated.View entering={FadeInUp} style={[s.modalSheet, { backgroundColor: theme.surface }]}>
              <View style={[s.modalHandle, { backgroundColor: theme.border }]} />
              <Text style={[s.modalTitle, { color: theme.text }]}>Select Language</Text>
              {[
                { code: "en", label: "English", emoji: "🇬🇧" },
                { code: "te", label: "Telugu", emoji: "🇮🇳" },
              ].map(({ code, label, emoji }) => (
                <TouchableOpacity
                  key={code}
                  style={[
                    s.langRow,
                    language === code && { backgroundColor: theme.primaryGlow },
                    { borderColor: theme.border },
                  ]}
                  onPress={() => changeLang(code as Language)}
                >
                  <Text style={{ fontSize: 22 }}>{emoji}</Text>
                  <Text style={[s.langLabel, { color: theme.text }]}>{label}</Text>
                  {language === code && (
                    <MaterialCommunityIcons name="check-circle" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </Animated.View>
          </Pressable>
        </Modal>

        {/* ── Personal Details Modal ── */}
        <Modal visible={personalModal} transparent animationType="slide">
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <Pressable style={s.modalOverlay} onPress={() => setPersonalModal(false)}>
              <Animated.View
                entering={FadeInUp}
                style={[s.modalSheet, { backgroundColor: theme.surface }]}
              >
                <View style={[s.modalHandle, { backgroundColor: theme.border }]} />
                <Text style={[s.modalTitle, { color: theme.text }]}>Edit Personal Details</Text>
                <Text style={[s.inputLabel, { color: theme.textMuted }]}>Full Name</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                  placeholder="Your full name"
                  placeholderTextColor={theme.inputPlaceholder}
                />
                <TouchableOpacity
                  style={[s.saveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSavePersonal}
                  disabled={personalSaving}
                >
                  {personalSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.saveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── Vehicle Modal ── */}
        <Modal visible={vehicleModal} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <Pressable style={s.modalOverlay} onPress={() => setVehicleModal(false)}>
              <Animated.View entering={FadeInUp} style={[s.modalSheet, { backgroundColor: theme.surface }]}>
                <View style={[s.modalHandle, { backgroundColor: theme.border }]} />
                <Text style={[s.modalTitle, { color: theme.text }]}>Vehicle Information</Text>
                <Text style={[s.inputLabel, { color: theme.textMuted }]}>Vehicle Model</Text>
                <TextInput
                  value={editVehicleModel}
                  onChangeText={setEditVehicleModel}
                  style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                  placeholder="e.g. Honda Activa"
                  placeholderTextColor={theme.inputPlaceholder}
                />
                <Text style={[s.inputLabel, { color: theme.textMuted }]}>Registration Number</Text>
                <TextInput
                  value={editVehicleReg}
                  onChangeText={setEditVehicleReg}
                  style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                  placeholder="e.g. AP09AB1234"
                  placeholderTextColor={theme.inputPlaceholder}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[s.saveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSaveVehicle}
                  disabled={vehicleSaving}
                >
                  {vehicleSaving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save</Text>}
                </TouchableOpacity>
              </Animated.View>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── Bank Modal ── */}
        <Modal visible={bankModal} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <Pressable style={s.modalOverlay} onPress={() => setBankModal(false)}>
              <Animated.View entering={FadeInUp} style={[s.modalSheet, { backgroundColor: theme.surface }]}>
                <View style={[s.modalHandle, { backgroundColor: theme.border }]} />
                <Text style={[s.modalTitle, { color: theme.text }]}>Bank Details</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                  <Text style={[s.inputLabel, { color: theme.textMuted }]}>Account Holder Name</Text>
                  <TextInput value={bankAccountName} onChangeText={setBankAccountName}
                    style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                    placeholder="Full name on bank account" placeholderTextColor={theme.inputPlaceholder} />
                  <Text style={[s.inputLabel, { color: theme.textMuted }]}>Bank Name</Text>
                  <TextInput value={bankSearchQuery} onChangeText={handleBankSearch}
                    style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                    placeholder="Search bank..." placeholderTextColor={theme.inputPlaceholder} />
                  {bankDropdownOpen && (
                    <View style={[s.dropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                      {bankSearching ? <ActivityIndicator color={theme.primary} style={{ padding: 12 }} /> :
                        bankOptions.map((b, i) => (
                          <TouchableOpacity key={i}
                            style={[s.dropdownItem, { borderBottomColor: theme.divider }]}
                            onPress={() => {
                              setBankName(b.name || b.bankName || "");
                              setBankSearchQuery(b.name || b.bankName || "");
                              setBankSelected(true);
                              setBankDropdownOpen(false);
                            }}>
                            <Text style={[s.dropdownText, { color: theme.text }]}>{b.name || b.bankName}</Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  )}
                  <Text style={[s.inputLabel, { color: theme.textMuted }]}>Account Number</Text>
                  <TextInput value={bankAccountNumber} onChangeText={setBankAccountNumber} keyboardType="number-pad"
                    style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                    placeholder="Account number" placeholderTextColor={theme.inputPlaceholder} />
                  <Text style={[s.inputLabel, { color: theme.textMuted }]}>Confirm Account Number</Text>
                  <TextInput value={bankConfirmNumber} onChangeText={setBankConfirmNumber} keyboardType="number-pad"
                    style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                    placeholder="Re-enter account number" placeholderTextColor={theme.inputPlaceholder} />
                  <Text style={[s.inputLabel, { color: theme.textMuted }]}>IFSC Code</Text>
                  <TextInput value={bankIfscCode} onChangeText={setBankIfscCode} autoCapitalize="characters"
                    style={[s.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }]}
                    placeholder="IFSC Code" placeholderTextColor={theme.inputPlaceholder} />
                </ScrollView>
                <TouchableOpacity
                  style={[s.saveBtn, { backgroundColor: theme.primary, marginTop: 16 }]}
                  onPress={handleSaveBank} disabled={bankSaving}>
                  {bankSaving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Bank Details</Text>}
                </TouchableOpacity>
              </Animated.View>
            </Pressable>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── Locked Support Modal ── */}
        <Modal visible={showLockedSupport} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <Animated.View entering={FadeInUp} style={[s.lockedModal, { backgroundColor: theme.surface }]}>
              <MaterialCommunityIcons name="lock-check" size={44} color={theme.primary} style={{ marginBottom: 12 }} />
              <Text style={[s.lockedModalTitle, { color: theme.text }]}>Details are locked</Text>
              <Text style={[s.lockedModalSub, { color: theme.textMuted }]}>
                Your account is verified. To modify personal, vehicle, or bank details, contact our support team.
              </Text>
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: "#25D366", marginTop: 16 }]}
                onPress={() => { setShowLockedSupport(false); Linking.openURL(lockedWhatsappUrl); }}
              >
                <MaterialCommunityIcons name="whatsapp" size={18} color="#fff" />
                <Text style={[s.saveBtnText, { marginLeft: 8 }]}>Contact Support on WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowLockedSupport(false)} style={{ marginTop: 12, padding: 8 }}>
                <Text style={[{ color: theme.textMuted, fontSize: 14 }]}>Close</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        {/* ── Help Modal ── */}
        <Modal visible={showHelp} transparent animationType="slide">
          <Pressable style={s.modalOverlay} onPress={() => setShowHelp(false)}>
            <Animated.View entering={FadeInUp} style={[s.modalSheet, { backgroundColor: theme.surface }]}>
              <View style={[s.modalHandle, { backgroundColor: theme.border }]} />
              <Text style={[s.modalTitle, { color: theme.text }]}>Help & Support</Text>
              <Text style={[{ color: theme.textMuted, fontSize: 14, lineHeight: 22 }]}>
                For any issues or queries, contact us:{"\n\n"}
                📞 WhatsApp: +91 6309981555{"\n"}
                🕐 Available: 9 AM – 9 PM IST
              </Text>
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: "#25D366", marginTop: 20 }]}
                onPress={() => Linking.openURL(`https://wa.me/916309981555`)}
              >
                <MaterialCommunityIcons name="whatsapp" size={18} color="#fff" />
                <Text style={[s.saveBtnText, { marginLeft: 8 }]}>Open WhatsApp</Text>
              </TouchableOpacity>
            </Animated.View>
          </Pressable>
        </Modal>

        {/* ── Logout Confirmation ── */}
        <Modal visible={showLogoutModal} transparent animationType="fade">
          <View style={s.modalOverlay}>
            <Animated.View entering={FadeInUp} style={[s.logoutModal, { backgroundColor: theme.surface }]}>
              <MaterialCommunityIcons name="logout-variant" size={44} color={theme.danger} style={{ marginBottom: 8 }} />
              <Text style={[s.logoutModalTitle, { color: theme.text }]}>Sign out?</Text>
              <Text style={[{ color: theme.textMuted, fontSize: 14, textAlign: "center", marginBottom: 24 }]}>
                You will need to log in again to accept deliveries.
              </Text>
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: theme.danger }]}
                onPress={confirmLogout}
              >
                <Text style={s.saveBtnText}>Yes, Sign Out</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowLogoutModal(false)}
                style={{ marginTop: 12, padding: 10 }}
              >
                <Text style={[{ color: theme.textMuted, fontSize: 14 }]}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </>
  );
}

// ─── Styles factory (theme-aware) ─────────────────────────────────────────────

function makeStyles(theme: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    safe: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: theme.headerBg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: { fontSize: 20, fontWeight: "800", color: theme.headerText, letterSpacing: -0.5 },
    themeToggleBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primaryGlow,
      alignItems: "center",
      justifyContent: "center",
    },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 100, paddingTop: 12 },

    // Hero card
    heroCard: { borderRadius: 20, padding: 20, marginBottom: 12 },
    heroRow: { flexDirection: "row", alignItems: "center" },
    avatarContainer: { position: "relative" },
    avatarRing: {
      width: 76,
      height: 76,
      borderRadius: 38,
      borderWidth: 3,
      borderColor: "#F97316",
      overflow: "hidden",
      backgroundColor: "#1F2937",
    },
    avatar: { width: "100%", height: "100%" },
    avatarPlaceholder: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#1F2937",
    },
    cameraBadge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "#F97316",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#111827",
    },
    heroName: { color: "#FFFFFF", fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
    heroPhone: { color: "#94A3B8", fontSize: 13, marginTop: 2 },
    heroBadge: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 6,
      backgroundColor: "#F9731620",
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 8,
      gap: 4,
    },
    heroBadgeText: { color: "#F97316", fontSize: 11, fontWeight: "700" },
    heroStatusRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 14,
    },
    heroStatusChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    heroStatusDot: { width: 7, height: 7, borderRadius: 4 },
    heroStatusText: { fontSize: 11, fontWeight: "700" },

    // Stats
    statsRow: { flexDirection: "row", marginBottom: 12 },

    // Locked banner
    lockedBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 12,
    },
    lockedBannerText: { flex: 1, fontSize: 12, fontWeight: "600", lineHeight: 16 },

    // Section title
    sectionTitle: {
      fontSize: 12,
      fontWeight: "800",
      color: theme.textSoft,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 8,
      marginTop: 16,
      marginLeft: 4,
    },

    // Menu card
    menuCard: {
      borderRadius: 16,
      borderWidth: 1,
      overflow: "hidden",
      marginBottom: 4,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 8,
      elevation: 2,
    },
    menuDivider: { height: 1, marginLeft: 66 },

    // Logout
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      marginTop: 20,
    },
    logoutText: { fontSize: 15, fontWeight: "700" },

    // Footer
    footer: { alignItems: "center", marginTop: 24, paddingBottom: 12, gap: 4 },
    footerText: { fontSize: 12 },

    // Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
    },
    modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 16 },
    inputLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      marginBottom: 12,
    },
    saveBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      paddingVertical: 14,
    },
    saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },

    // Language modal
    langRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 8,
    },
    langLabel: { flex: 1, fontSize: 16, fontWeight: "600" },

    // Dropdown
    dropdown: {
      borderWidth: 1,
      borderRadius: 12,
      marginTop: -8,
      marginBottom: 8,
      overflow: "hidden",
    },
    dropdownItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
    dropdownText: { fontSize: 14 },

    // Locked modal
    lockedModal: {
      margin: 24,
      borderRadius: 20,
      padding: 28,
      alignItems: "center",
    },
    lockedModalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
    lockedModalSub: { fontSize: 14, textAlign: "center", lineHeight: 22 },

    // Logout modal
    logoutModal: {
      margin: 32,
      borderRadius: 20,
      padding: 28,
      alignItems: "center",
    },
    logoutModalTitle: { fontSize: 20, fontWeight: "800", marginBottom: 8 },
  });
}
