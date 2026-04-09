import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { partnerGradient, partnerTheme } from '@/constants/partnerTheme';

interface PartnerButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
}

export function PartnerButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
  variant = 'primary',
  style,
}: PartnerButtonProps) {
  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : partnerTheme.colors.text} />
      ) : (
        <>
          <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>
            {label}
          </Text>
          {icon ? (
            <MaterialCommunityIcons
              name={icon}
              size={18}
              color={variant === 'primary' ? '#FFFFFF' : partnerTheme.colors.primary}
            />
          ) : null}
        </>
      )}
    </>
  );

  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={style}>
      {({ pressed }) =>
        variant === 'primary' ? (
          <LinearGradient
            colors={disabled ? ['#B4C4BC', '#B4C4BC'] : partnerGradient}
            style={[styles.base, pressed && !disabled && styles.pressed]}
          >
            {content}
          </LinearGradient>
        ) : (
          <Pressable
            disabled
            style={[
              styles.base,
              styles.secondary,
              disabled && styles.secondaryDisabled,
              pressed && !disabled && styles.pressed,
            ]}
          >
            {content}
          </Pressable>
        )
      }
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: partnerTheme.radius.md,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  secondary: {
    backgroundColor: partnerTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: partnerTheme.colors.borderStrong,
  },
  secondaryDisabled: {
    opacity: 0.6,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  secondaryLabel: {
    color: partnerTheme.colors.text,
  },
});
