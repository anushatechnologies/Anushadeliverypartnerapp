import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
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
  Extrapolation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function AppLoader() {
  const pulseLoop = useSharedValue(0);
  const loadingProgress = useSharedValue(0);
  const mapPinY = useSharedValue(0);
  const ringScale1 = useSharedValue(1);
  const ringOpacity1 = useSharedValue(1);
  const ringScale2 = useSharedValue(1);
  const ringOpacity2 = useSharedValue(1);

  useEffect(() => {
    // Elegant floating animation for center pin
    mapPinY.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Background slow pulse effect
    pulseLoop.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Expanding rings (ripples) - now in Blue
    const ringConfig = { duration: 2800, easing: Easing.out(Easing.ease) };
    
    // Ring 1
    ringScale1.value = withRepeat(withTiming(4, ringConfig), -1, false);
    ringOpacity1.value = withRepeat(withTiming(0, ringConfig), -1, false);

    // Ring 2 (Delayed)
    const timer = setTimeout(() => {
      ringScale2.value = withRepeat(withTiming(4, ringConfig), -1, false);
      ringOpacity2.value = withRepeat(withTiming(0, ringConfig), -1, false);
    }, 1400);

    // Realistic progress bar loading
    loadingProgress.value = withTiming(100, { duration: 3000, easing: Easing.bezier(0.4, 0, 0.2, 1) });

    return () => clearTimeout(timer);
  }, []);

  const pinAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mapPinY.value }, { scale: 1.05 }],
  }));

  const shadowAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(mapPinY.value, [-15, 0], [0.6, 1], Extrapolation.CLAMP) }],
    opacity: interpolate(mapPinY.value, [-15, 0], [0.3, 0.7], Extrapolation.CLAMP),
  }));

  const backgroundPulse = useAnimatedStyle(() => ({
    opacity: interpolate(pulseLoop.value, [0, 1], [0.85, 1]),
  }));

  const Ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale1.value }],
    opacity: ringOpacity1.value,
  }));

  const Ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale2.value }],
    opacity: ringOpacity2.value,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${loadingProgress.value}%`,
  }));

  return (
    <View style={styles.container}>
      {/* Dynamic Background Gradient */}
      <Animated.View style={[StyleSheet.absoluteFill, backgroundPulse]}>
        <LinearGradient
          colors={['#020617', '#0F172A', '#020617']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Futuristic Blue Orbs */}
      <View style={styles.orbTop} />
      <View style={styles.orbBottom} />

      <Animated.View entering={FadeInDown.delay(300).springify().damping(12)} style={styles.contentWrapper}>
        
        {/* Core Animation Area */}
        <View style={styles.animationArea}>
          {/* Ripples */}
          <Animated.View style={[styles.ring, Ring1Style]} />
          <Animated.View style={[styles.ring, Ring2Style]} />

          {/* Glowing Platform Icon */}
          <View style={styles.pinContainer}>
            <Animated.View style={[styles.pin, pinAnimStyle]}>
              <LinearGradient
                colors={['#3B82F6', '#1E3A8A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pinGradient}
              >
                <MaterialCommunityIcons name="moped-electric" size={42} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
            <Animated.View style={[styles.pinShadow, shadowAnimStyle]} />
          </View>
        </View>

        {/* Brand Presence */}
        <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.textContainer}>
          <Text style={styles.brandTitle}>ANUSHA</Text>
          <Text style={styles.brandSubtitle}>DELIVERY PARTNER</Text>
        </Animated.View>

      </Animated.View>

      {/* Progress Experience */}
      <Animated.View entering={FadeIn.delay(1000).duration(800)} style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>Initiating secure session...</Text>
          <MaterialCommunityIcons name="shield-check" size={15} color="#3B82F6" />
        </View>
        <View style={styles.progressTrack}>
           <Animated.View style={[styles.progressFill, progressStyle]}>
              <LinearGradient 
                colors={['#3B82F6', '#93C5FD']} 
                start={{x: 0, y:0}} 
                end={{x:1, y:0}} 
                style={StyleSheet.absoluteFill} 
              />
           </Animated.View>
        </View>

        {/* Capability Badges */}
        <View style={styles.badgesWrapper}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="lightning-bolt" size={13} color="#DBEAFE" />
            <Text style={styles.badgeText}>Real-time tracking</Text>
          </View>
          <View style={styles.badgeDot} />
          <View style={styles.badge}>
            <MaterialCommunityIcons name="map-marker-distance" size={13} color="#DBEAFE" />
            <Text style={styles.badgeText}>Optimized maps</Text>
          </View>
        </View>
      </Animated.View>
      
      {/* Brand Attribution Footer */}
      <Animated.View entering={FadeInUp.delay(1200)} style={styles.footerContainer}>
        <Text style={styles.footerLabel}>Powered by</Text>
        <Text style={styles.footerBrand}>ANUSHA BAZAAR</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbTop: {
    position: 'absolute',
    top: -height * 0.15,
    left: -width * 0.25,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: 'rgba(59, 130, 246, 0.1)', // Subtle Blue Glow
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 100,
    elevation: 20,
  },
  orbBottom: {
    position: 'absolute',
    bottom: -height * 0.1,
    right: -width * 0.2,
    width: width,
    height: width,
    borderRadius: width * 0.5,
    backgroundColor: 'rgba(30, 58, 138, 0.08)',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
    elevation: 15,
  },
  contentWrapper: {
    alignItems: 'center',
    marginTop: -height * 0.1,
  },
  animationArea: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  ring: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  pinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 15,
    borderWidth: 2.5,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    overflow: 'hidden',
  },
  pinGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinShadow: {
    width: 40,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000000',
    marginTop: 20,
    opacity: 0.4,
  },
  textContainer: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    textShadowColor: 'rgba(59, 130, 246, 0.8)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 15,
  },
  brandSubtitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#93C5FD',
    letterSpacing: 6,
    marginTop: 10,
    textAlign: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 120,
    width: width * 0.85,
    alignItems: 'center',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  progressText: {
    color: '#DBEAFE',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  progressTrack: {
    width: '100%',
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
  badgesWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.15)',
  },
  badgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
  },
  badgeText: {
    color: '#DBEAFE',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerContainer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  footerLabel: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 4,
  },
  footerBrand: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
