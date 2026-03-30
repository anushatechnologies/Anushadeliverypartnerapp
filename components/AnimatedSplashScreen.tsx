import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  withSpring,
} from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function AnimatedSplashScreen() {
  // Delivery Boy Ride Animation
  const rideX = useSharedValue(-width * 0.3);
  const bounce = useSharedValue(0);
  const wheelRotation = useSharedValue(0);
  const exhaustOpacity = useSharedValue(0);

  // Logo animations
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);

  // Road dots animation
  const roadDash = useSharedValue(0);

  // Progress bar
  const progress = useSharedValue(0);

  // Floating particles
  const particle1Y = useSharedValue(0);
  const particle2Y = useSharedValue(0);
  const particle3Y = useSharedValue(0);

  useEffect(() => {
    // Logo fade in with spring
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
    logoScale.value = withDelay(200, withSpring(1, { damping: 12, stiffness: 100 }));

    // Delivery boy rides across screen
    rideX.value = withRepeat(
      withSequence(
        withTiming(width * 0.15, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(-width * 0.3, { duration: 0 }) // reset
      ),
      -1
    );

    // Bounce effect (simulates road bumps)
    bounce.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 200, easing: Easing.inOut(Easing.ease) }),
        withTiming(-3, { duration: 150, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 150, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );

    // Wheel rotation
    wheelRotation.value = withRepeat(
      withTiming(360, { duration: 600, easing: Easing.linear }),
      -1,
      false
    );

    // Exhaust puffs
    exhaustOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 300 }),
        withTiming(0, { duration: 400 })
      ),
      -1
    );

    // Road animation
    roadDash.value = withRepeat(
      withTiming(-100, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );

    // Floating particles
    particle1Y.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    );
    particle2Y.value = withDelay(500, withRepeat(
      withSequence(
        withTiming(-20, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    ));
    particle3Y.value = withDelay(1000, withRepeat(
      withSequence(
        withTiming(-10, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1, true
    ));

    // Progress bar
    progress.value = withRepeat(
      withSequence(
        withTiming(100, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 0 })
      ),
      -1
    );
  }, []);

  // Animated styles
  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const riderStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: rideX.value },
      { translateY: bounce.value },
    ],
  }));

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${wheelRotation.value}deg` }],
  }));

  const exhaustStyle = useAnimatedStyle(() => ({
    opacity: exhaustOpacity.value,
    transform: [
      { translateX: interpolate(exhaustOpacity.value, [0, 0.8], [-20, 0]) },
      { scale: interpolate(exhaustOpacity.value, [0, 0.8], [1.5, 0.5]) },
    ],
  }));

  const roadDashStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: roadDash.value }],
  }));

  const particle1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: particle1Y.value }],
  }));
  const particle2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: particle2Y.value }],
  }));
  const particle3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: particle3Y.value }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View style={styles.container}>
      {/* Background gradient blobs */}
      <View style={styles.bgBlobTop} />
      <View style={styles.bgBlobBottom} />
      <View style={styles.bgBlobRight} />

      {/* Floating particles */}
      <Animated.View style={[styles.particle, styles.particle1, particle1Style]} />
      <Animated.View style={[styles.particle, styles.particle2, particle2Style]} />
      <Animated.View style={[styles.particle, styles.particle3, particle3Style]} />

      {/* Logo Section */}
      <Animated.View style={[styles.logoSection, logoAnimStyle]}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../assets/icon.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      {/* Brand Text */}
      <Animated.View entering={FadeInDown.delay(500).duration(600).springify()} style={styles.brandSection}>
        <Text style={styles.brandName}>Anusha</Text>
        <Text style={styles.brandSub}>Delivery Partner</Text>
      </Animated.View>

      {/* Delivery Boy Animation Scene */}
      <Animated.View entering={FadeIn.delay(800).duration(600)} style={styles.sceneContainer}>
        {/* Road */}
        <View style={styles.road}>
          <View style={styles.roadSurface}>
            <Animated.View style={[styles.roadDashes, roadDashStyle]}>
              {Array.from({ length: 20 }).map((_, i) => (
                <View key={i} style={styles.roadDash} />
              ))}
            </Animated.View>
          </View>
        </View>

        {/* Delivery Boy */}
        <Animated.View style={[styles.deliveryBoy, riderStyle]}>
          {/* Exhaust smoke */}
          <Animated.View style={[styles.exhaustSmoke, exhaustStyle]}>
            <View style={styles.smokePuff1} />
            <View style={styles.smokePuff2} />
          </Animated.View>

          {/* Scooter Body */}
          <View style={styles.scooterBody}>
            {/* Delivery Bag */}
            <View style={styles.deliveryBag}>
              <Text style={styles.bagLogo}>A</Text>
            </View>

            {/* Rider */}
            <View style={styles.riderBody}>
              {/* Helmet */}
              <View style={styles.helmet}>
                <View style={styles.helmetVisor} />
              </View>
              {/* Body */}
              <View style={styles.torso} />
              {/* Arms */}
              <View style={styles.arm} />
            </View>

            {/* Scooter frame */}
            <View style={styles.scooterFrame}>
              <View style={styles.scooterSeat} />
              <View style={styles.scooterChassis} />
              <View style={styles.handlebar} />
            </View>

            {/* Rear wheel */}
            <View style={styles.wheelContainer}>
              <Animated.View style={[styles.wheel, styles.rearWheel, wheelStyle]}>
                <View style={styles.wheelSpoke} />
                <View style={[styles.wheelSpoke, { transform: [{ rotateZ: "90deg" }] }]} />
              </Animated.View>
            </View>

            {/* Front wheel */}
            <View style={[styles.wheelContainer, styles.frontWheelContainer]}>
              <Animated.View style={[styles.wheel, wheelStyle]}>
                <View style={styles.wheelSpoke} />
                <View style={[styles.wheelSpoke, { transform: [{ rotateZ: "90deg" }] }]} />
              </Animated.View>
            </View>
          </View>

          {/* Speed lines */}
          <View style={styles.speedLines}>
            <View style={[styles.speedLine, { width: 18, top: 8 }]} />
            <View style={[styles.speedLine, { width: 25, top: 18 }]} />
            <View style={[styles.speedLine, { width: 14, top: 28 }]} />
          </View>
        </Animated.View>
      </Animated.View>

      {/* Loading Status */}
      <Animated.View entering={FadeInUp.delay(1000).duration(600)} style={styles.loadingSection}>
        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressBarStyle]} />
        </View>

        <Text style={styles.loadingText}>Getting things ready...</Text>

        {/* Feature Pills */}
        <View style={styles.featurePills}>
          <View style={styles.pill}>
            <MaterialCommunityIcons name="lightning-bolt" size={14} color="#0A8754" />
            <Text style={styles.pillText}>Fast Delivery</Text>
          </View>
          <View style={styles.pill}>
            <MaterialCommunityIcons name="shield-check" size={14} color="#0A8754" />
            <Text style={styles.pillText}>Secure</Text>
          </View>
          <View style={styles.pill}>
            <MaterialCommunityIcons name="cash-multiple" size={14} color="#0A8754" />
            <Text style={styles.pillText}>Best Earnings</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  // Background blobs
  bgBlobTop: { position: "absolute", top: -120, right: -80, width: 350, height: 350, borderRadius: 175, backgroundColor: "#DBEAFE", opacity: 0.5 },
  bgBlobBottom: { position: "absolute", bottom: -180, left: -120, width: 500, height: 500, borderRadius: 250, backgroundColor: "#E2F2E9", opacity: 0.6 },
  bgBlobRight: { position: "absolute", top: height * 0.4, right: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: "#FEF9C3", opacity: 0.4 },

  // Floating particles
  particle: { position: "absolute", borderRadius: 20, backgroundColor: "#0A8754", opacity: 0.12 },
  particle1: { top: "15%", left: "10%", width: 12, height: 12 },
  particle2: { top: "25%", right: "15%", width: 8, height: 8 },
  particle3: { bottom: "30%", left: "20%", width: 10, height: 10 },

  // Logo
  logoSection: { marginBottom: 16 },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 16,
    shadowColor: "#1E40AF",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(30, 64, 175, 0.05)",
    overflow: "hidden",
  },
  logoImage: { width: 105, height: 105 },

  // Brand text
  brandSection: { alignItems: "center", marginBottom: 36 },
  brandName: { fontSize: 36, fontWeight: "900", color: "#0F172A", letterSpacing: -1.5 },
  brandSub: { fontSize: 14, fontWeight: "700", color: "#3B82F6", letterSpacing: 2, textTransform: "uppercase", marginTop: 4 },

  // Delivery scene
  sceneContainer: { width: width * 0.85, height: 120, alignItems: "center", justifyContent: "flex-end", marginBottom: 40, overflow: "hidden" },

  // Road
  road: { position: "absolute", bottom: 0, width: "120%", height: 24 },
  roadSurface: { flex: 1, backgroundColor: "#E2E8F0", borderRadius: 12, justifyContent: "center", overflow: "hidden" },
  roadDashes: { flexDirection: "row", gap: 16, paddingLeft: 0 },
  roadDash: { width: 20, height: 3, backgroundColor: "#CBD5E1", borderRadius: 2 },

  // Delivery boy
  deliveryBoy: { position: "absolute", bottom: 20, left: "40%" },

  // Scooter
  scooterBody: { position: "relative", width: 90, height: 80 },

  // Delivery bag
  deliveryBag: {
    position: "absolute",
    top: 5,
    left: 2,
    width: 24,
    height: 22,
    backgroundColor: "#3B82F6",
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
    borderWidth: 1,
    borderColor: "#2563EB",
  },
  bagLogo: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },

  // Rider body
  riderBody: { position: "absolute", top: -8, left: 22, zIndex: 4 },
  helmet: {
    width: 22,
    height: 18,
    backgroundColor: "#3B82F6",
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  helmetVisor: {
    position: "absolute",
    bottom: 2,
    left: 2,
    right: 2,
    height: 6,
    backgroundColor: "#1E3A5F",
    borderRadius: 3,
  },
  torso: {
    width: 18,
    height: 20,
    backgroundColor: "#3B82F6",
    marginLeft: 2,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  arm: {
    position: "absolute",
    top: 20,
    right: -8,
    width: 14,
    height: 5,
    backgroundColor: "#3B82F6",
    borderRadius: 3,
    transform: [{ rotateZ: "20deg" }],
  },

  // Scooter frame
  scooterFrame: { position: "absolute", top: 30, left: 10, zIndex: 3 },
  scooterSeat: { width: 30, height: 8, backgroundColor: "#1E293B", borderRadius: 4, marginLeft: 5 },
  scooterChassis: {
    width: 60,
    height: 14,
    backgroundColor: "#60A5FA",
    borderRadius: 8,
    marginTop: 2,
    marginLeft: -5,
  },
  handlebar: {
    position: "absolute",
    top: -2,
    right: -18,
    width: 6,
    height: 16,
    backgroundColor: "#475569",
    borderRadius: 3,
    transform: [{ rotateZ: "-15deg" }],
  },

  // Wheels
  wheelContainer: { position: "absolute", bottom: 0, left: 5, zIndex: 2 },
  frontWheelContainer: { left: 62 },
  wheel: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: "#1E293B",
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  rearWheel: {},
  wheelSpoke: {
    position: "absolute",
    width: 1.5,
    height: "80%",
    backgroundColor: "#64748B",
  },

  // Speed lines
  speedLines: { position: "absolute", left: -30, top: 10 },
  speedLine: { height: 2, backgroundColor: "#94A3B8", borderRadius: 1, marginBottom: 0, opacity: 0.6 },

  // Exhaust
  exhaustSmoke: { position: "absolute", left: -25, bottom: 15, flexDirection: "row", gap: 4 },
  smokePuff1: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#CBD5E1" },
  smokePuff2: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#E2E8F0", marginTop: 3 },

  // Loading section
  loadingSection: { position: "absolute", bottom: 60, width: width * 0.75, alignItems: "center" },

  // Progress bar
  progressTrack: { width: "100%", height: 5, backgroundColor: "#E2E8F0", borderRadius: 3, overflow: "hidden", marginBottom: 14 },
  progressFill: { height: "100%", backgroundColor: "#3B82F6", borderRadius: 3 },

  loadingText: { color: "#94A3B8", fontSize: 13, fontWeight: "700", letterSpacing: 0.5, marginBottom: 20 },

  // Feature pills
  featurePills: { flexDirection: "row", gap: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  pillText: { fontSize: 11, fontWeight: "700", color: "#0A8754" },
});
