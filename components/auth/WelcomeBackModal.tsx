import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { partnerTheme } from '@/constants/partnerTheme';

const { width } = Dimensions.get('window');

interface WelcomeBackModalProps {
  visible: boolean;
  phone: string;
}

export function WelcomeBackModal({ visible, phone }: WelcomeBackModalProps) {
  const slideY      = useRef(new Animated.Value(300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale   = useRef(new Animated.Value(0.92)).current;
  const checkScale  = useRef(new Animated.Value(0)).current;
  const ringScale   = useRef(new Animated.Value(0.5)).current;
  const progress    = useRef(new Animated.Value(0)).current;
  const glowPulse   = useRef(new Animated.Value(0.3)).current;
  const wave1       = useRef(new Animated.Value(0.6)).current;
  const wave2       = useRef(new Animated.Value(0.4)).current;

  const formattedPhone = phone.replace(/(\d{5})(\d{5})/, '$1 $2');

  useEffect(() => {
    if (!visible) return;

    // Reset
    [slideY, overlayOpacity, cardScale, checkScale, ringScale, progress, glowPulse, wave1, wave2]
      .forEach((a, i) => {
        const defaults = [300, 0, 0.92, 0, 0.5, 0, 0.3, 0.6, 0.4];
        a.setValue(defaults[i]);
      });

    // Phase 1: backdrop + card slide up
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(slideY, { toValue: 0, tension: 68, friction: 11, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, tension: 68, friction: 11, useNativeDriver: true }),
    ]).start(() => {
      // Phase 2: rings + check pop in
      Animated.sequence([
        Animated.spring(ringScale, { toValue: 1, tension: 100, friction: 7, useNativeDriver: true }),
        Animated.spring(checkScale, { toValue: 1, tension: 140, friction: 6, useNativeDriver: true }),
      ]).start();

      // Glow pulse loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, { toValue: 0.8, duration: 750, useNativeDriver: true }),
          Animated.timing(glowPulse, { toValue: 0.25, duration: 750, useNativeDriver: true }),
        ]),
      ).start();

      // Ripple waves
      Animated.loop(
        Animated.sequence([
          Animated.timing(wave1, { toValue: 1.4, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(wave1, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(wave2, { toValue: 1.4, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(wave2, { toValue: 0.4, duration: 0, useNativeDriver: true }),
        ]),
      ).start();

      // Progress bar — 2.5s
      Animated.timing(progress, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    });
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Animated.View
          style={[
            styles.card,
            { transform: [{ translateY: slideY }, { scale: cardScale }] },
          ]}
        >
          {/* Green gradient strip at top */}
          <LinearGradient
            colors={['#0E8A63', '#14C476']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.topStrip}
          />

          {/* Icon area with ripple waves */}
          <View style={styles.iconArea}>
            {/* Ripple wave 1 */}
            <Animated.View
              style={[
                styles.wave,
                {
                  borderColor: 'rgba(14,138,99,0.15)',
                  transform: [{ scale: wave1 }],
                },
              ]}
            />
            {/* Ripple wave 2 */}
            <Animated.View
              style={[
                styles.wave,
                {
                  borderColor: 'rgba(14,138,99,0.10)',
                  transform: [{ scale: wave2 }],
                },
              ]}
            />

            {/* Glow */}
            <Animated.View style={[styles.iconGlow, { opacity: glowPulse }]} />

            {/* Outer ring */}
            <Animated.View style={[styles.outerRing, { transform: [{ scale: ringScale }] }]}>
              {/* Inner circle with check */}
              <LinearGradient
                colors={['#0E8A63', '#14C476']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={styles.checkCircle}
              >
                <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                  <MaterialCommunityIcons name="check-bold" size={40} color="#fff" />
                </Animated.View>
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Text content */}
          <Text style={styles.eyebrow}>PARTNER ACCOUNT FOUND</Text>
          <Text style={styles.title}>Welcome back!</Text>

          <View style={styles.phoneRow}>
            <MaterialCommunityIcons name="phone-check" size={18} color={partnerTheme.colors.primary} />
            <Text style={styles.phoneText}>+91 {formattedPhone}</Text>
          </View>

          <Text style={styles.subtitle}>
            Sending a secure OTP to your registered number. You will be redirected automatically.
          </Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[styles.progressFill, { width: progressWidth }]}
            />
          </View>

          {/* Trust badges */}
          <View style={styles.badges}>
            {[
              { icon: 'shield-check' as const, label: 'Verified partner' },
              { icon: 'firebase'     as const, label: 'Firebase OTP' },
              { icon: 'lock-check'   as const, label: 'End-to-end secure' },
            ].map((b) => (
              <View key={b.label} style={styles.badge}>
                <MaterialCommunityIcons name={b.icon} size={12} color={partnerTheme.colors.primary} />
                <Text style={styles.badgeText}>{b.label}</Text>
              </View>
            ))}
          </View>

          {/* Bottom safe area padding */}
          <View style={styles.bottomPad} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8,16,12,0.75)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 28,
    paddingTop: 0,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 30,
  },
  topStrip: {
    height: 5,
    width: '40%',
    borderRadius: 3,
    marginTop: 14,
    marginBottom: 4,
  },

  iconArea: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  wave: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
  },
  iconGlow: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(14,138,99,0.18)',
  },
  outerRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(14,138,99,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(14,138,99,0.25)',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0E8A63',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.40,
    shadowRadius: 14,
    elevation: 10,
  },

  eyebrow: {
    color: partnerTheme.colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    color: partnerTheme.colors.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF8F4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
  },
  phoneText: {
    color: partnerTheme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  subtitle: {
    color: partnerTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 8,
    marginTop: 2,
  },

  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: partnerTheme.colors.border,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: partnerTheme.colors.primary,
    borderRadius: 6,
  },

  badges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
  },
  badge: {
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
  badgeText: {
    color: partnerTheme.colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  bottomPad: {
    height: 28,
  },
});
