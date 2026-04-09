import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
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
import { useRouter } from 'expo-router';
import { partnerGradient, partnerTheme } from '@/constants/partnerTheme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    image: require('@/assets/images/hero_illustration.jpg'),
    headline: 'Deliver with Anusha Bazaar',
    sub: 'Join our partner network and earn daily delivering local orders across your city.',
  },
  {
    image: require('@/assets/images/partner_banner.jpg'),
    headline: 'Fast OTP. Easy KYC.',
    sub: 'Sign in with your mobile, complete verification step by step, and go live fast.',
  },
  {
    image: require('@/assets/images/delivery_person.jpg'),
    headline: 'Track. Deliver. Earn.',
    sub: 'Live order dashboard, payout tracking, and real-time status — all in one place.',
  },
] as const;

const PERKS = [
  { icon: 'bike-fast' as const, text: 'Live order dispatch' },
  { icon: 'cash-multiple' as const, text: 'Daily payouts' },
  { icon: 'shield-check-outline' as const, text: 'Secure OTP login' },
  { icon: 'map-marker-check-outline' as const, text: 'GPS delivery tracking' },
];

export default function LandingScreen() {
  const router = useRouter();
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      const next = (activeSlide + 1) % SLIDES.length;

      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 340, useNativeDriver: true }),
      ]).start();

      setActiveSlide(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    }, 3200);

    return () => clearInterval(interval);
  }, [activeSlide, fadeAnim]);

  const slide = SLIDES[activeSlide];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe}>
        {/* Hero image area */}
        <View style={styles.heroBox}>
          <Animated.View style={[styles.heroImageWrap, { opacity: fadeAnim }]}>
            <Image source={slide.image} style={styles.heroImage} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(10,18,14,0.72)', 'rgba(10,18,14,0.96)']}
              style={styles.heroOverlay}
            />
          </Animated.View>

          {/* Slide headline */}
          <Animated.View style={[styles.heroCopy, { opacity: fadeAnim }]}>
            <Text style={styles.heroHeadline}>{slide.headline}</Text>
            <Text style={styles.heroSub}>{slide.sub}</Text>
          </Animated.View>

          {/* Dots */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === activeSlide ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Bottom card */}
        <View style={styles.card}>
          {/* Brand row */}
          <View style={styles.brandRow}>
            <View style={styles.logoFrame}>
              <Image
                source={require('@/assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.brandCopy}>
              <Text style={styles.brandName}>Anusha Partner</Text>
              <Text style={styles.brandSub}>Delivery onboarding & live order desk</Text>
            </View>
          </View>

          {/* Perks row */}
          <View style={styles.perksRow}>
            {PERKS.map((p) => (
              <View key={p.text} style={styles.perkChip}>
                <MaterialCommunityIcons name={p.icon} size={15} color={partnerTheme.colors.primary} />
                <Text style={styles.perkText}>{p.text}</Text>
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.buttonStack}>
            <Pressable
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
              onPress={() => router.push('/login')}
            >
              <LinearGradient
                colors={partnerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                <MaterialCommunityIcons name="cellphone-check" size={20} color="#fff" />
                <Text style={styles.btnPrimaryText}>Login with mobile</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnPressed]}
              onPress={() => router.push('/register')}
            >
              <MaterialCommunityIcons name="account-plus-outline" size={20} color={partnerTheme.colors.primary} />
              <Text style={styles.btnSecondaryText}>Create partner account</Text>
            </Pressable>
          </View>

          <Text style={styles.footer}>
            Verified partner network · Secure OTP · Admin reviewed
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A120E',
  },
  safe: {
    flex: 1,
  },
  heroBox: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImageWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroCopy: {
    position: 'absolute',
    bottom: 56,
    left: 24,
    right: 24,
  },
  heroHeadline: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    fontWeight: '500',
  },
  dots: {
    position: 'absolute',
    bottom: 28,
    left: 24,
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  dotActive: {
    width: 22,
    backgroundColor: partnerTheme.colors.primary,
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoFrame: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#EFF8F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
  },
  logo: {
    width: 40,
    height: 40,
  },
  brandCopy: {
    flex: 1,
  },
  brandName: {
    color: partnerTheme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  brandSub: {
    color: partnerTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  perksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  perkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EFF8F4',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
  },
  perkText: {
    color: partnerTheme.colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  buttonStack: {
    gap: 10,
  },
  btnPrimary: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: partnerTheme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 24,
    gap: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: partnerTheme.colors.border,
    backgroundColor: '#F7FAF7',
  },
  btnSecondaryText: {
    color: partnerTheme.colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  footer: {
    textAlign: 'center',
    color: partnerTheme.colors.textSoft,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
