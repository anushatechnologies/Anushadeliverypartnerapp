import React from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
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
import { partnerGradient, partnerHeroGradient, partnerTheme } from '@/constants/partnerTheme';

interface AuthScaffoldProps {
  eyebrow?: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBackPress?: () => void;
}

export function AuthScaffold({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  onBackPress,
}: AuthScaffoldProps) {
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.orbPrimary} />
        <View style={styles.orbSecondary} />

        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <View style={styles.headerRow}>
              {onBackPress ? (
                <Pressable style={styles.backButton} onPress={onBackPress}>
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={22}
                    color={partnerTheme.colors.text}
                  />
                </Pressable>
              ) : (
                <View style={styles.backPlaceholder} />
              )}
            </View>

            <LinearGradient colors={partnerHeroGradient} style={styles.brandCard}>
              <View style={styles.brandTopRow}>
                <View style={styles.logoFrame}>
                  <Image
                    source={require('@/assets/icon.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.logoCopy}>
                  <Text style={styles.brandName}>Anusha Partner</Text>
                  <Text style={styles.brandTagline}>Delivery onboarding and live order desk</Text>
                </View>
              </View>

              <View style={styles.brandPillRow}>
                <LinearGradient colors={partnerGradient} style={styles.brandPill}>
                  <MaterialCommunityIcons
                    name="shield-check-outline"
                    size={14}
                    color="#FFFFFF"
                  />
                  <Text style={styles.brandPillText}>Secure OTP + admin verification</Text>
                </LinearGradient>
              </View>
            </LinearGradient>

            <View style={styles.sheet}>
              {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>

              <View style={styles.content}>{children}</View>
            </View>

            {footer ? <View style={styles.footer}>{footer}</View> : null}

            {/* Extra bottom padding so keyboard never hides the last input */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: partnerTheme.colors.canvas,
  },
  safe: {
    flex: 1,
  },
  kav: {
    flex: 1,
  },
  orbPrimary: {
    position: 'absolute',
    top: -90,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(249, 115, 22, 0.14)',
  },
  orbSecondary: {
    position: 'absolute',
    bottom: -130,
    left: -60,
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },
  headerRow: {
    minHeight: 52,
    justifyContent: 'center',
    marginBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 44,
    height: 44,
  },
  brandCard: {
    borderRadius: partnerTheme.radius.xl,
    padding: 24,
    shadowColor: partnerTheme.colors.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 10,
  },
  brandTopRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  logoFrame: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 58,
    height: 58,
  },
  logoCopy: {
    flex: 1,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  brandTagline: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    fontWeight: '600',
  },
  brandPillRow: {
    marginTop: 20,
  },
  brandPill: {
    alignSelf: 'flex-start',
    borderRadius: partnerTheme.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  brandPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  sheet: {
    marginTop: 18,
    borderRadius: partnerTheme.radius.xl,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    padding: 24,
    shadowColor: partnerTheme.colors.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 8,
  },
  eyebrow: {
    color: partnerTheme.colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  title: {
    color: partnerTheme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: partnerTheme.colors.textMuted,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
    fontWeight: '500',
  },
  content: {
    marginTop: 24,
    gap: 16,
  },
  footer: {
    marginTop: 18,
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 32,
  },
});
