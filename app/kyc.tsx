import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Dimensions,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { useUser } from "../context/UserContext";
import CustomTouchableOpacity from "../components/CustomTouchableOpacity";
import { profileService } from "../services/profileService";
import { documentService } from "../services/documentService";

const { width } = Dimensions.get("window");

export default function KYC() {
  const router = useRouter();
  const { authState } = useUser();
  const [pan, setPan] = useState<string | null>(authState.user?.panPhoto || null);
  const [aadhaar, setAadhaar] = useState<string | null>(authState.user?.aadhaarPhoto || null);
  const [dl, setDl] = useState<string | null>(authState.user?.licensePhoto || null);

  const [dpId, setDpId] = useState<number | null>(null);
  const [docStatuses, setDocStatuses] = useState<Record<string, string>>({});
  const [docNumbers, setDocNumbers] = useState<Record<string, string>>({});
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Document Number States
  const [panNumber, setPanNumber] = useState<string>("");
  const [aadhaarNumber, setAadhaarNumber] = useState<string>("");
  const [dlNumber, setDlNumber] = useState<string>("");

  React.useEffect(() => {
    fetchBackendStatus();
  }, []);

  const fetchBackendStatus = async () => {
    try {
      const res = await profileService.getStatus();
      let deliveryPersonId = dpId;
      
      if (res.success && res.deliveryPerson) {
        deliveryPersonId = res.deliveryPerson.id;
        setDpId(deliveryPersonId);
      }

      if (deliveryPersonId) {
        try {
          const docs = await profileService.getDocumentsById(deliveryPersonId);
          if (docs && Array.isArray(docs)) {
            const sMap: Record<string, string> = {};
            const uMap: Record<string, string> = {};
            const nMap: Record<string, string> = {};
            
            docs.forEach((d: any) => {
              sMap[d.documentType] = d.status;
              uMap[d.documentType] = d.documentUrl || d.url || "";
              nMap[d.documentType] = d.documentNumber;
            });
            
            setDocStatuses(sMap);
            setDocNumbers(nMap);
            
            if (uMap['PAN_CARD']) setPan(uMap['PAN_CARD']);
            if (uMap['AADHAAR_CARD']) setAadhaar(uMap['AADHAAR_CARD']);
            if (uMap['DRIVING_LICENSE']) setDl(uMap['DRIVING_LICENSE']);
            
            if (nMap['PAN_CARD']) setPanNumber(nMap['PAN_CARD']);
            if (nMap['AADHAAR_CARD']) setAadhaarNumber(nMap['AADHAAR_CARD']);
            if (nMap['DRIVING_LICENSE']) setDlNumber(nMap['DRIVING_LICENSE']);
          }
        } catch (docErr) {
          console.warn("Failed fetching explicit docs", docErr);
        }
      }
    } catch(e) {
      console.warn("Failed to load backend status", e);
    } finally {
      setLoadingDocs(false);
    }
  };


  const [pickerModal, setPickerModal] = useState<{visible: boolean, docType: string, title: string, setter: ((uri: string) => void) | null}>({
    visible: false, docType: "", title: "", setter: null
  });

  const handleCamera = async () => {
    const activeSetter = pickerModal.setter;
    const activeDocType = pickerModal.docType;
    setPickerModal({ visible: false, title: "", docType: "", setter: null }); 

    setTimeout(async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return Alert.alert("Required", "Camera access is needed.");

      try {
        const result = await ImagePicker.launchCameraAsync({ quality: 0.3 });
        if (!result.canceled && activeSetter) {
          activeSetter(result.assets[0].uri);
          setDocStatuses(prev => ({ ...prev, [activeDocType]: 'NEW_SELECTION' }));
        }
      } catch (e: any) {
        console.warn("Camera Intent Error", e);
      }
    }, 400); // 400ms delay allows the modal exit animation to finish entirely
  };

  const handleGallery = async () => {
    const activeSetter = pickerModal.setter;
    const activeDocType = pickerModal.docType;
    setPickerModal({ visible: false, title: "", docType: "", setter: null });

    setTimeout(async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return Alert.alert("Required", "Gallery access is needed.");
      
      try {
        const result = await ImagePicker.launchImageLibraryAsync({ 
           mediaTypes: ['images'], 
           quality: 0.3
        });
        if (!result.canceled && activeSetter) {
          activeSetter(result.assets[0].uri);
          setDocStatuses(prev => ({ ...prev, [activeDocType]: 'NEW_SELECTION' }));
        }
      } catch (e: any) {
        console.warn("Gallery Intent Error", e);
      }
    }, 400);
  };

  const openPicker = (setter: (uri: string) => void, title: string, docType: string) => {
    setPickerModal({ visible: true, title, docType, setter });
  };

  const handleComplete = async () => {
    if (!dpId) return Alert.alert("Error", "Account identity missing. Please reload.");

    const toUpload: { type: string, uri: string }[] = [];
    if (pan?.startsWith('file://')) toUpload.push({ type: 'PAN_CARD', uri: pan });
    if (aadhaar?.startsWith('file://')) toUpload.push({ type: 'AADHAAR_CARD', uri: aadhaar });
    if (dl?.startsWith('file://')) toUpload.push({ type: 'DRIVING_LICENSE', uri: dl });

    if (toUpload.length === 0) {
      if (pan && aadhaar && dl) return Alert.alert("Information", "All documents are uploaded and awaiting admin view.");
      return Alert.alert("Incomplete", "Please upload the required documents.");
    }
    
    setSubmitting(true);
    try {
      for (const doc of toUpload) {
        let existingDocNumber = docNumbers[doc.type];
        if (!existingDocNumber || existingDocNumber === "REUPLOAD" || existingDocNumber === "") {
          if (doc.type === 'PAN_CARD') existingDocNumber = panNumber;
          else if (doc.type === 'AADHAAR_CARD') existingDocNumber = aadhaarNumber;
          else if (doc.type === 'DRIVING_LICENSE') existingDocNumber = dlNumber;
          else existingDocNumber = "";
        }
        
        if (!existingDocNumber) {
           throw new Error(`Missing Document Number for ${doc.type}`);
        }
        
        await documentService.uploadDocument(dpId, doc.type, existingDocNumber, doc.uri);
      }
      
      Alert.alert("Success", "Documents submitted directly to Admin for verification.", [
        { text: "OK", onPress: () => {
           fetchBackendStatus(); // refresh UI local state instead of hard back so they see PENDING
        }}
      ]);
    } catch (err: any) {
      console.warn("KYC Upload Reject:", err?.response?.data || err?.message);
      const apiError = err?.response?.data?.message || err?.response?.data?.error || "Could not submit documents. Please try again.";
      Alert.alert("Upload Protocol Error", apiError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
           <CustomTouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#1A1A1A" />
           </CustomTouchableOpacity>
           <Text style={styles.headerTitle}>KYC Verification</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <Animated.View entering={FadeInDown.duration(600)} style={styles.infoBox}>
             <MaterialCommunityIcons name="shield-check" size={32} color="#702DFF" />
             <Text style={styles.infoTitle}>Secure Verification</Text>
             <Text style={styles.infoText}>Please upload clear photos of your original documents for identity verification. It usually takes 2-4 hours to verify.</Text>
          </Animated.View>

          <DocCard 
            title="PAN Card" 
            subtitle="Permanent Account Number"
            image={pan} 
            status={docStatuses["PAN_CARD"]}
            onUpload={() => openPicker(setPan, "PAN Card", "PAN_CARD")} 
            delay={100}
            docNo={panNumber}
            setDocNo={setPanNumber}
          />
          
          <DocCard 
            title="Aadhaar Card" 
            subtitle="Front side of Aadhaar"
            image={aadhaar} 
            status={docStatuses["AADHAAR_CARD"]}
            onUpload={() => openPicker(setAadhaar, "Aadhaar Card", "AADHAAR_CARD")} 
            delay={200}
            docNo={aadhaarNumber}
            setDocNo={setAadhaarNumber}
          />
          
          <DocCard 
            title="Driving License" 
            subtitle="Valid Motor Vehicle License"
            image={dl} 
            status={docStatuses["DRIVING_LICENSE"]}
            onUpload={() => openPicker(setDl, "Driving License", "DRIVING_LICENSE")} 
            delay={300}
            docNo={dlNumber}
            setDocNo={setDlNumber}
          />

          <CustomTouchableOpacity 
             onPress={handleComplete} 
             disabled={submitting}
             style={[styles.submitBtn, (pan && aadhaar && dl && !submitting) ? styles.submitBtnActive : null]}
          >
             <Text style={styles.submitBtnText}>{submitting ? "Uploading..." : "Submit Documents"}</Text>
             {!submitting && <MaterialCommunityIcons name="check-decagram" size={20} color="#fff" />}
          </CustomTouchableOpacity>

        </ScrollView>
      </SafeAreaView>

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
                 <CustomTouchableOpacity onPress={handleCamera} style={styles.actionCard}>
                    <View style={[styles.actionIconBox, { backgroundColor: '#F3E8FF' }]}>
                       <MaterialCommunityIcons name="camera" size={32} color="#702DFF" />
                    </View>
                    <Text style={styles.actionCardTitle}>Camera</Text>
                    <Text style={styles.actionCardSub}>Take a live photo</Text>
                 </CustomTouchableOpacity>

                 <CustomTouchableOpacity onPress={handleGallery} style={styles.actionCard}>
                     <View style={[styles.actionIconBox, { backgroundColor: '#ECFDF5' }]}>
                       <MaterialCommunityIcons name="folder-image" size={32} color="#10B981" />
                    </View>
                    <Text style={styles.actionCardTitle}>Device Files</Text>
                    <Text style={styles.actionCardSub}>Upload from device safely</Text>
                 </CustomTouchableOpacity>
              </View>

              <CustomTouchableOpacity onPress={() => setPickerModal(prev => ({...prev, visible: false}))} style={styles.sheetCancelBtn}>
                 <Text style={styles.sheetCancelText}>Cancel</Text>
              </CustomTouchableOpacity>
           </Animated.View>
        </View>
      </Modal>

    </View>
  );
}

function DocCard({ title, subtitle, image, status, onUpload, delay, docNo, setDocNo }: any) {
  const isApproved = status === 'APPROVED';
  const isRejected = status === 'REJECTED';
  const isPending = status === 'PENDING';
  const isNew = status === 'NEW_SELECTION';
  
  // Lock edit capability once pending or approved to prevent duplicate submissions
  const isLocked = isApproved || isPending;

  return (
    <Animated.View entering={FadeInDown.delay(delay)} style={[styles.docCard, isRejected && { borderColor: '#FEE2E2', borderWidth: 2 }]}>
       <View style={styles.docCardHeader}>
          <View>
             <Text style={styles.docTitle}>{title}</Text>
             <Text style={styles.docSubtitle}>{subtitle}</Text>
          </View>
          
          {isApproved && (
            <View style={styles.successBadge}>
               <MaterialCommunityIcons name="check-decagram" size={14} color="#15803D" />
               <Text style={styles.successText}>Verified</Text>
            </View>
          )}
          {isRejected && (
            <View style={[styles.successBadge, { backgroundColor: '#FEF2F2' }]}>
               <MaterialCommunityIcons name="alert-circle" size={14} color="#DC2626" />
               <Text style={[styles.successText, { color: '#B91C1C' }]}>Rejected</Text>
            </View>
          )}
          {isPending && (
            <View style={[styles.successBadge, { backgroundColor: '#FEF3C7' }]}>
               <MaterialCommunityIcons name="clock-outline" size={14} color="#D97706" />
               <Text style={[styles.successText, { color: '#B45309' }]}>In Review</Text>
            </View>
          )}
          {isNew && (
            <View style={[styles.successBadge, { backgroundColor: '#E0E7FF' }]}>
               <MaterialCommunityIcons name="cloud-upload" size={14} color="#4338CA" />
               <Text style={[styles.successText, { color: '#4338CA' }]}>Ready to Send</Text>
            </View>
          )}
          {(!status || status === 'NONE') && (
            <View style={styles.pendingBadge}>
               <Text style={styles.pendingText}>Required</Text>
            </View>
          )}
       </View>

       <Pressable onPress={isLocked ? undefined : onUpload} style={[styles.uploadArea, image && styles.uploadAreaDone, isLocked && { opacity: 0.8 }]}>
          {image ? (
            <>
              <Image source={{ uri: image }} style={styles.previewImage} />
              {isRejected && (
                 <View style={styles.rejectedOverlay}>
                    <MaterialCommunityIcons name="camera-retake" size={32} color="#fff" />
                    <Text style={styles.rejectedOverlayText}>Tap to Re-upload</Text>
                 </View>
              )}
            </>
          ) : (
            <>
               <View style={styles.uploadIconWrap}>
                  <MaterialCommunityIcons name="camera-plus-outline" size={28} color="#702DFF" />
               </View>
               <Text style={styles.uploadText}>Tap to capture photo</Text>
            </>
          )}
       </Pressable>

        {(!isLocked && setDocNo !== undefined) && (
           <View style={styles.numberInputContainer}>
              <Text style={styles.numberInputLabel}>{title} Number</Text>
              <View style={styles.numberInputWrap}>
                <MaterialCommunityIcons name="card-text-outline" size={18} color="#702DFF" />
                <TextInput
                  placeholder={`Enter exactly as printed`}
                  placeholderTextColor="#9CA3AF"
                  style={styles.numberInput}
                  value={docNo}
                  onChangeText={setDocNo}
                  autoCapitalize="characters"
                />
              </View>
           </View>
        )}
    </Animated.View>
  );
}



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, gap: 16 },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#1A1A1A' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 60 },
  infoBox: { backgroundColor: '#F3E8FF', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 28, borderWidth: 1, borderColor: 'rgba(112, 45, 255, 0.1)' },
  infoTitle: { color: '#702DFF', fontSize: 18, fontWeight: '800', marginTop: 12 },
  infoText: { color: '#6B7280', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  docCard: { backgroundColor: '#FFFFFF', borderRadius: 28, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  docCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  docTitle: { color: '#1A1A1A', fontSize: 16, fontWeight: '800' },
  docSubtitle: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginTop: 2 },
  successBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  successText: { color: '#15803D', fontSize: 10, fontWeight: '900' },
  pendingBadge: { backgroundColor: '#F9FAFB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6' },
  pendingText: { color: '#9CA3AF', fontSize: 10, fontWeight: '800' },
  uploadArea: { width: '100%', height: 160, borderRadius: 20, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#702DFF', backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  uploadAreaDone: { borderStyle: 'solid', borderColor: '#F3F4F6' },
  previewImage: { width: '100%', height: '100%' },
  rejectedOverlay: { position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(220, 38, 38, 0.6)', justifyContent: 'center', alignItems: 'center' },
  rejectedOverlayText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14, marginTop: 8 },
  uploadIconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center' },
  uploadText: { color: '#702DFF', fontSize: 13, fontWeight: '700', marginTop: 12 },
  submitBtn: { backgroundColor: '#F9FAFB', height: 60, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  submitBtnActive: { backgroundColor: '#702DFF', borderColor: '#702DFF' },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  
  // Modal Styles
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
  numberInputContainer: { marginTop: 16 },
  numberInputLabel: { color: '#6B7280', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  numberInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 14, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: '#E5E7EB' },
  numberInput: { flex: 1, fontSize: 14, color: '#1A1A1A', fontWeight: '700', marginLeft: 10, letterSpacing: 1 }
});