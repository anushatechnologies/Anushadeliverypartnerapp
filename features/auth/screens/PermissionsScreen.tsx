import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { height } = Dimensions.get('window');

/* ─── Step definitions ─────────────────────────────────────────────────── */
const STEPS = [
  {
    key: 'notifications' as const,
    gradientColors: ['#1A0800', '#8B3010', '#FF6B35'] as const,
    iconBg: '#FF6B35' as const,
    illustrationIcon: 'bell-badge' as const,
    pill: 'Recommended',
    title: 'Never miss\nan order!',
    subtitle:
      'Get instant alerts the moment a delivery is assigned to you. Partners with notifications enabled earn significantly more.',
    features: ['Instant order alerts', 'Pickup reminders', 'Payout notifications'],
    cta: 'Turn on notifications',
    skip: 'Maybe later',
  },
  {
    key: 'location' as const,
    gradientColors: ['#001508', '#063D20', '#0E8A63'] as const,
    iconBg: '#0E8A63' as const,
    illustrationIcon: 'map-marker-check' as const,
    pill: 'Required',
    title: 'Enable GPS\nto go live',
    subtitle:
      'We use your location to match nearby orders and calculate delivery distance. Required to start earning.',
    features: ['Order matching near you', 'Live delivery tracking', 'Accurate distance fare'],
    cta: 'Allow location access',
    skip: 'Skip for now',
    privacy: 'Used only while delivering · Never shared',
  },
  {
    key: 'camera' as const,
    gradientColors: ['#00091A', '#0D2B5E', '#2563EB'] as const,
    iconBg: '#2563EB' as const,
    illustrationIcon: 'camera-enhance' as const,
    pill: 'Optional',
    title: 'Capture &\ndeliver with proof',
    subtitle:
      'Take delivery confirmation photos and upload your KYC documents with one tap.',
    features: ['Delivery proof photos', 'KYC document uploads', 'Instant camera access'],
    cta: 'Allow camera & gallery',
    skip: 'Skip',
  },
] as const;

type PermKey = 'notifications' | 'location' | 'camera';

/* ─── Pulsing ring component ───────────────────────────────────────────── */
function PulseRing({ color, size, delay = 0 }: { color: string; size: number; delay?: number }) {
  const anim = useRef(new Animated.Value(0.85)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.08, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.85, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ).start();
    }, delay);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: color + '50',
        transform: [{ scale: anim }],
      }}
    />
  );
}

/* ─── Single step screen ───────────────────────────────────────────────── */
function PermStep({
  step,
  stepIndex,
  onAllow,
  onSkip,
  loading,
}: {
  step: (typeof STEPS)[number];
  stepIndex: number;
  onAllow: () => void;
  onSkip: () => void;
  loading: boolean;
}) {
  const slideY     = useRef(new Animated.Value(50)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const iconScale  = useRef(new Animated.Value(0.5)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slideY.setValue(50);
    opacity.setValue(0);
    iconScale.setValue(0.5);
    iconOpacity.setValue(0);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.spring(iconScale, { toValue: 1, tension: 75, friction: 7, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    }, 220);
  }, [stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Full-screen gradient */}
      <LinearGradient
        colors={[...step.gradientColors] as [string, string, string]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Background orb top-right */}
      <View style={[styles.orbTR, { backgroundColor: step.iconBg + '20' }]} />
      {/* Background orb bottom-left */}
      <View style={[styles.orbBL, { backgroundColor: step.iconBg + '15' }]} />

      <SafeAreaView style={styles.stepSafe}>
        {/* Step dots */}
        <View style={styles.topBar}>
          <View style={styles.dotsRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === stepIndex
                    ? { width: 32, backgroundColor: '#fff' }
                    : i < stepIndex
                    ? { width: 18, backgroundColor: step.iconBg }
                    : { width: 10, backgroundColor: 'rgba(255,255,255,0.25)' },
                ]}
              />
            ))}
          </View>
          <Text style={styles.stepCountText}>{stepIndex + 1} / {STEPS.length}</Text>
        </View>

        {/* Illustration */}
        <View style={styles.illustrationWrap}>
          <PulseRing color={step.iconBg} size={260} delay={0} />
          <PulseRing color={step.iconBg} size={200} delay={350} />
          <PulseRing color={step.iconBg} size={150} delay={700} />

          <Animated.View
            style={[
              styles.iconCircleOuter,
              { opacity: iconOpacity, transform: [{ scale: iconScale }] },
            ]}
          >
            <LinearGradient
              colors={[step.iconBg + 'DD', step.iconBg]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <MaterialCommunityIcons name={step.illustrationIcon} size={88} color="#fff" />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Text content */}
        <Animated.View
          style={[styles.textBlock, { opacity, transform: [{ translateY: slideY }] }]}
        >
          {/* Pill */}
          <View style={[styles.pill, { backgroundColor: step.iconBg + '33', borderColor: step.iconBg + '66' }]}>
            <View style={[styles.pillDot, { backgroundColor: step.iconBg }]} />
            <Text style={styles.pillLabel}>{step.pill}</Text>
          </View>

          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.subtitle}>{step.subtitle}</Text>

          <View style={styles.featureList}>
            {step.features.map((f) => (
              <View key={f} style={styles.featureRow}>
                <View style={[styles.featureTick, { backgroundColor: step.iconBg + '33' }]}>
                  <MaterialCommunityIcons name="check" size={12} color={step.iconBg} />
                </View>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View style={[styles.actions, { opacity }]}>
          <Pressable
            style={({ pressed }) => [
              styles.ctaBtn,
              { shadowColor: step.iconBg },
              pressed && styles.ctaBtnPressed,
            ]}
            onPress={onAllow}
            disabled={loading}
          >
            <LinearGradient
              colors={['#ffffff', '#f0f0f0']}
              style={styles.ctaBtnInner}
            >
              <MaterialCommunityIcons
                name={loading ? 'loading' : 'arrow-right-circle'}
                size={22}
                color={step.iconBg}
              />
              <Text style={[styles.ctaBtnText, { color: step.iconBg }]}>
                {loading ? 'Requesting...' : step.cta}
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable style={styles.skipRow} onPress={onSkip} disabled={loading}>
            <Text style={styles.skipText}>{step.skip}</Text>
          </Pressable>

          {'privacy' in step && step.privacy ? (
            <View style={styles.privacyRow}>
              <MaterialCommunityIcons name="shield-lock-outline" size={12} color="rgba(255,255,255,0.38)" />
              <Text style={styles.privacyText}>{step.privacy}</Text>
            </View>
          ) : null}
        </Animated.View>
      </SafeAreaView>
    </>
  );
}

/* ─── All-done splash ───────────────────────────────────────────────────── */
function DoneSplash({ onFinish }: { onFinish: () => void }) {
  const scale  = useRef(new Animated.Value(0.4)).current;
  const fade   = useRef(new Animated.Value(0)).current;
  const tickS  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 65, friction: 8, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start(() => {
      Animated.spring(tickS, { toValue: 1, tension: 110, friction: 7, useNativeDriver: true }).start();
    });
    const t = setTimeout(onFinish, 1800);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <LinearGradient colors={['#001508', '#063D20', '#0E8A63']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.doneSafe}>
        <Animated.View style={[styles.doneWrap, { opacity: fade, transform: [{ scale }] }]}>
          <LinearGradient colors={['#0E8A63', '#14C476']} style={styles.doneCircle}>
            <Animated.View style={{ transform: [{ scale: tickS }] }}>
              <MaterialCommunityIcons name="check-bold" size={70} color="#fff" />
            </Animated.View>
          </LinearGradient>
          <Text style={styles.doneTitle}>You're all set!</Text>
          <Text style={styles.doneSub}>Taking you to the partner dashboard...</Text>
        </Animated.View>
      </SafeAreaView>
    </>
  );
}

/* ─── Root ──────────────────────────────────────────────────────────────── */
export default function PermissionsScreen() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goNext = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      if (stepIndex + 1 >= STEPS.length) {
        setDone(true);
      } else {
        setStepIndex((i) => i + 1);
      }
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const handleAllow = async () => {
    setLoading(true);
    try {
      const key = STEPS[stepIndex].key;
      if (key === 'location') {
        // Triggers native Android dialog: "While using this app / Ask every time / Don't allow"
        const fg = await Location.requestForegroundPermissionsAsync();
        if (fg.status === 'granted') {
          await Location.requestBackgroundPermissionsAsync().catch(() => {});
        }
      } else if (key === 'notifications') {
        await Notifications.requestPermissionsAsync();
      } else {
        await ImagePicker.requestCameraPermissionsAsync();
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
    } catch (_) {
      // Always advance even if denied
    } finally {
      setLoading(false);
      goNext();
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem('@anusha_permissions_shown', '1');
    router.replace('/');
  };

  if (done) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <DoneSplash onFinish={finish} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <PermStep
          step={STEPS[stepIndex]}
          stepIndex={stepIndex}
          onAllow={handleAllow}
          onSkip={goNext}
          loading={loading}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  /* Step */
  stepSafe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 2,
  },
  dotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 5, borderRadius: 3 },
  stepCountText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Illustration */
  illustrationWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: height * 0.28,
  },
  iconCircleOuter: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.55,
    shadowRadius: 36,
    elevation: 28,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbTR: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    top: -80,
    right: -80,
  },
  orbBL: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    bottom: height * 0.25,
    left: -60,
  },

  /* Text block */
  textBlock: { gap: 10, paddingBottom: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -0.9,
    lineHeight: 44,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  featureList: { gap: 7, marginTop: 2 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureTick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Actions */
  actions: { gap: 10, paddingBottom: 6 },
  ctaBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 14,
  },
  ctaBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
  },
  ctaBtnText: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  ctaBtnPressed: { opacity: 0.87, transform: [{ scale: 0.98 }] },
  skipRow: { alignItems: 'center', paddingVertical: 8 },
  skipText: {
    color: 'rgba(255,255,255,0.40)',
    fontSize: 14,
    fontWeight: '600',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  privacyText: {
    color: 'rgba(255,255,255,0.32)',
    fontSize: 11,
    fontWeight: '500',
  },

  /* Done splash */
  doneSafe: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  doneWrap: { alignItems: 'center', gap: 22 },
  doneCircle: {
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0E8A63',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 22,
  },
  doneTitle: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  doneSub: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 15,
    fontWeight: '600',
  },
});
