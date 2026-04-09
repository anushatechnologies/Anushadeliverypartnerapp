import React from "react";
import { View, Text, StyleSheet, Modal, Dimensions } from "react-native";
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");

export type PopupType = "success" | "redirect" | "error";

interface Props {
  visible: boolean;
  type: PopupType;
  title: string;
  message: string;
}

export default function PremiumPopup({ visible, type, title, message }: Props) {
  if (!visible) return null;

  const iconName = type === "success" ? "check-decagram" : type === "redirect" ? "rocket-launch" : "alert-circle";
  const iconColor = type === "success" ? "#0A8754" : type === "redirect" ? "#0E8A63" : "#FF2D55";

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.overlay}>
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />
        
        <Animated.View entering={ZoomIn.delay(100).springify()} exiting={ZoomOut.duration(150)} style={styles.card}>
          <View style={[styles.iconWrapper, { backgroundColor: `${iconColor}15` }]}>
            <MaterialCommunityIcons name={iconName as any} size={48} color={iconColor} />
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          
          <View style={styles.loaderLine}>
            <Animated.View entering={FadeIn.delay(400)} style={[styles.loaderProgress, { backgroundColor: iconColor }]} />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: width * 0.85,
    backgroundColor: "#ffffff",
    borderRadius: 32,
    padding: 30,
    alignItems: "center",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)"
  },
  iconWrapper: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "500",
  },
  loaderLine: {
    width: "50%",
    height: 5,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    marginTop: 28,
    overflow: "hidden"
  },
  loaderProgress: {
    width: "100%",
    height: "100%",
    borderRadius: 3,
  }
});
