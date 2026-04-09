import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
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
import { partnerTheme } from '@/constants/partnerTheme';

const PERMS = [
  {
    key: 'location' as const,
    icon: 'map-marker-radius' as const,
    color: '#0E8A63',
    bg: '#EFF8F4',
    title: 'Location access',
    subtitle: 'Required to receive nearby orders, track live deliveries, and calculate delivery distance accurately.',
    badge: 'Required',
    required: true,
  },
  {
    key: 'notifications' as const,
    icon: 'bell-ring' as const,
    color: '#F59E0B',
    bg: '#FFF8ED',
    title: 'Push notifications',
    subtitle: 'Get instant alerts the moment a new order is dispatched to you. Never miss a delivery.',
    badge: 'Required',
    required: true,
  },
  {
    key: 'camera' as const,
    icon: 'camera' as const,
    color: '#2563EB',
    bg: '#EFF3FF',
    title: 'Camera & storage',
    subtitle: 'Capture delivery confirmation photos and upload KYC documents during onboarding.',
    badge: 'Recommended',
    required: false,
  },
];

type PermKey = 'location' | 'notifications' | 'camera';

export default function PermissionsScreen() {
  const router = useRouter();
  const [granted, setGranted] = useState<Record<PermKey, boolean>>({
    location: false,
    notifications: false,
    camera: false,
  });
  const [requesting, setRequesting] = useState<PermKey | null>(null);

  // Per-card scale for tap feedback
  const scales = useRef(
    Object.fromEntries(PERMS.map((p) => [p.key, new Animated.Value(1)])) as Record<PermKey, Animated.Value>,
  ).current;

  // Header elements entrance
  const headerSlide = useRef(new Animated.Value(-30)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pop = (key: PermKey) => {
    Animated.sequence([
      Animated.timing(scales[key], { toValue: 0.96, duration: 70, useNativeDriver: true }),
      Animated.spring(scales[key], { toValue: 1, tension: 130, friction: 6, useNativeDriver: true }),
    ]).start();
  };

  const requestPerm = async (key: PermKey) => {
    setRequesting(key);
    try {
      let ok = false;
      if (key === 'location') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        ok = status === 'granted';
        if (ok) await Location.requestBackgroundPermissionsAsync().catch(() => {});
      } else if (key === 'notifications') {
        const { status } = await Notifications.requestPermissionsAsync();
        ok = status === 'granted';
      } else {
        const cam = await ImagePicker.requestCameraPermissionsAsync();
        const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
        ok = cam.status === 'granted' || lib.status === 'granted';
      }

      if (ok) {
        setGranted((prev) => ({ ...prev, [key]: true }));
        pop(key);
      } else {
        Alert.alert(
          'Permission needed',
          key === 'location'
            ? 'Location is required to receive and complete delivery orders. Enable it in Settings → Anusha Partner → Location.'
            : key === 'notifications'
            ? 'Notifications ensure you never miss a new order. Enable them in Settings → Anusha Partner → Notifications.'
            : 'Camera and storage help with KYC uploads and delivery proofs.',
        );
      }
    } finally {
      setRequesting(null);
    }
  };

  const proceed = async () => {
    await AsyncStorage.setItem('@anusha_permissions_shown', '1');
    router.replace('/');
  };

  const allowAllAndContinue = async () => {
    for (const p of PERMS) {
      if (!granted[p.key]) await requestPerm(p.key);
    }
    await AsyncStorage.setItem('@anusha_permissions_shown', '1');
    router.replace('/');
  };

  const allRequired = granted.location && granted.notifications;
  const grantedCount = Object.values(granted).filter(Boolean).length;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Gradient background */}
      <LinearGradient
        colors={['#071410', '#0E3D29', '#0E8A63']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Hero section ── */}
          <Animated.View
            style={[
              styles.hero,
              { opacity: headerOpacity, transform: [{ translateY: headerSlide }] },
            ]}
          >
            <View style={styles.shieldWrap}>
              <View style={styles.shieldGlow} />
              <LinearGradient
                colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.06)']}
                style={styles.shieldCircle}
              >
                <MaterialCommunityIcons name="shield-check" size={44} color="#fff" />
              </LinearGradient>
            </View>

            <Text style={styles.heroTitle}>Quick setup</Text>
            <Text style={styles.heroSub}>
              Allow a few permissions to start receiving orders and delivering with Anusha Bazaar.
            </Text>

            {/* Progress indicator */}
            <View style={styles.progressRow}>
              {PERMS.map((p) => (
                <View
                  key={p.key}
                  style={[
                    styles.progressDot,
                    granted[p.key] && styles.progressDotDone,
                  ]}
                />
              ))}
              <Text style={styles.progressLabel}>{grantedCount}/{PERMS.length} allowed</Text>
            </View>
          </Animated.View>

          {/* ── Permission cards ── */}
          <View style={styles.cardsWrap}>
            {PERMS.map((perm, i) => {
              const isGranted = granted[perm.key];
              const isLoading = requesting === perm.key;

              return (
                <Animated.View
                  key={perm.key}
                  style={{ transform: [{ scale: scales[perm.key] }] }}
                >
                  <View style={[styles.card, isGranted && styles.cardGranted]}>
                    {/* Left icon */}
                    <View style={[styles.cardIconBox, { backgroundColor: isGranted ? perm.color : perm.bg }]}>
                      <MaterialCommunityIcons
                        name={isGranted ? 'check-bold' : perm.icon}
                        size={24}
                        color={isGranted ? '#fff' : perm.color}
                      />
                    </View>

                    {/* Content */}
                    <View style={styles.cardBody}>
                      <View style={styles.cardTitleRow}>
                        <Text style={[styles.cardTitle, isGranted && styles.cardTitleGranted]}>
                          {perm.title}
                        </Text>
                        <View style={[
                          styles.badge,
                          isGranted
                            ? styles.badgeGranted
                            : perm.required
                              ? styles.badgeRequired
                              : styles.badgeOptional,
                        ]}>
                          <Text style={[
                            styles.badgeText,
                            isGranted
                              ? styles.badgeTextGranted
                              : perm.required
                                ? styles.badgeTextRequired
                                : styles.badgeTextOptional,
                          ]}>
                            {isGranted ? '✓ Allowed' : perm.badge}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.cardSub}>{perm.subtitle}</Text>

                      {!isGranted && (
                        <Pressable
                          style={({ pressed }) => [
                            styles.allowBtn,
                            { borderColor: perm.color },
                            pressed && { opacity: 0.7 },
                          ]}
                          onPress={() => requestPerm(perm.key)}
                          disabled={isLoading}
                        >
                          <MaterialCommunityIcons
                            name={isLoading ? 'loading' : 'arrow-right-circle'}
                            size={15}
                            color={perm.color}
                          />
                          <Text style={[styles.allowBtnText, { color: perm.color }]}>
                            {isLoading ? 'Requesting...' : `Allow ${perm.title}`}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </View>

          {/* ── Actions ── */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.88 }]}
              onPress={allRequired ? proceed : allowAllAndContinue}
            >
              <LinearGradient
                colors={allRequired ? ['#0E8A63', '#14C476'] : ['#0E8A63', '#14A06D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryBtnInner}
              >
                <MaterialCommunityIcons
                  name={allRequired ? 'arrow-right-circle' : 'check-all'}
                  size={22}
                  color="#fff"
                />
                <Text style={styles.primaryBtnText}>
                  {allRequired ? 'Continue to app' : 'Allow all & continue'}
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable style={styles.skipBtn} onPress={proceed}>
              <Text style={styles.skipText}>Skip for now</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="rgba(255,255,255,0.5)" />
            </Pressable>

            <Text style={styles.privacyNote}>
              Your location is only used while delivering. We never share your data with third parties.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#071410' },
  safe: { flex: 1 },
  scroll: { paddingBottom: 24 },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 28,
    gap: 12,
  },
  shieldWrap: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  shieldGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 52,
    backgroundColor: 'rgba(14,138,99,0.25)',
    transform: [{ scale: 1.3 }],
  },
  shieldCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  progressDot: {
    width: 28,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  progressDotDone: {
    backgroundColor: '#14C476',
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },

  // Cards
  cardsWrap: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    flexDirection: 'row',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
  },
  cardGranted: {
    backgroundColor: '#F6FDF9',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
  },
  cardIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    gap: 6,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    color: partnerTheme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  cardTitleGranted: {
    color: '#15803D',
  },
  cardSub: {
    color: partnerTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeRequired: {
    backgroundColor: '#FFF1F1',
  },
  badgeOptional: {
    backgroundColor: '#EFF3FF',
  },
  badgeGranted: {
    backgroundColor: '#DCFCE7',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextRequired: {
    color: '#DC2626',
  },
  badgeTextOptional: {
    color: '#2563EB',
  },
  badgeTextGranted: {
    color: '#15803D',
  },
  allowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 2,
  },
  allowBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Actions
  actions: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 12,
    alignItems: 'center',
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0E8A63',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  primaryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    gap: 10,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 8,
  },
  skipText: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 13,
    fontWeight: '600',
  },
  privacyNote: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 16,
  },
});
