import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { partnerTheme } from '@/constants/partnerTheme';

interface WelcomeBackModalProps {
  visible: boolean;
  phone: string;
}

export function WelcomeBackModal({ visible, phone }: WelcomeBackModalProps) {
  const slideY    = useRef(new Animated.Value(100)).current;
  const opacity   = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.88)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const progress  = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const formattedPhone = phone.replace(/(\d{5})(\d{5})/, '$1 $2');

  useEffect(() => {
    if (!visible) return;

    // reset
    slideY.setValue(100);
    opacity.setValue(0);
    cardScale.setValue(0.88);
    checkScale.setValue(0);
    ringScale.setValue(0.6);
    progress.setValue(0);
    glowOpacity.setValue(0);

    // overlay fade + card spring
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 260, useNativeDriver: true,
      }),
      Animated.spring(slideY, {
        toValue: 0, tension: 70, friction: 11, useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1, tension: 70, friction: 11, useNativeDriver: true,
      }),
    ]).start(() => {
      // pop in glow ring then check icon
      Animated.sequence([
        Animated.spring(ringScale, {
          toValue: 1, tension: 90, friction: 8, useNativeDriver: true,
        }),
        Animated.spring(checkScale, {
          toValue: 1, tension: 130, friction: 7, useNativeDriver: true,
        }),
      ]).start();

      // glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.6, duration: 700, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        ]),
      ).start();

      // progress bar over 2.4s
      Animated.timing(progress, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    });
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                { translateY: slideY },
                { scale: cardScale },
              ],
            },
          ]}
        >
          {/* Glow ring + check icon */}
          <View style={styles.iconArea}>
            <Animated.View style={[styles.glowRing, { opacity: glowOpacity }]} />
            <Animated.View style={[styles.outerRing, { transform: [{ scale: ringScale }] }]}>
              <LinearGradient
                colors={['#0E8A63', '#14C476']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.checkCircle}
              >
                <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                  <MaterialCommunityIcons name="check-bold" size={38} color="#fff" />
                </Animated.View>
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Copy */}
          <Text style={styles.title}>Welcome back, partner!</Text>
          <Text style={styles.phone}>+91 {formattedPhone}</Text>
          <Text style={styles.subtitle}>
            Sending a secure OTP to your registered mobile number...
          </Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Trust chips */}
          <View style={styles.chips}>
            {[
              { icon: 'shield-check-outline', label: 'Verified partner' },
              { icon: 'lock-outline',         label: 'OTP secured' },
              { icon: 'cellphone-key',        label: 'Firebase auth' },
            ].map((c) => (
              <View key={c.label} style={styles.chip}>
                <MaterialCommunityIcons
                  name={c.icon as any}
                  size={11}
                  color={partnerTheme.colors.primary}
                />
                <Text style={styles.chipText}>{c.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,18,14,0.72)',
    justifyContent: 'flex-end',
    paddingBottom: 36,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 36,
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 28,
  },
  iconArea: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  glowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 54,
    backgroundColor: 'rgba(14,138,99,0.18)',
    transform: [{ scale: 1.2 }],
  },
  outerRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(14,138,99,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0E8A63',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    color: partnerTheme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  phone: {
    color: partnerTheme.colors.primary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  subtitle: {
    color: partnerTheme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  progressTrack: {
    width: '100%',
    height: 5,
    backgroundColor: partnerTheme.colors.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: partnerTheme.colors.primary,
    borderRadius: 5,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF8F4',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
  },
  chipText: {
    color: partnerTheme.colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
});
