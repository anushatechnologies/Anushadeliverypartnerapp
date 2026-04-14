import React from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { partnerTheme } from '@/constants/partnerTheme';

interface PartnerInputProps extends TextInputProps {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  helperText?: string;
  keyboardType?: KeyboardTypeOptions;
  rightSlot?: React.ReactNode;
  prefix?: string;
}

export function PartnerInput({
  label,
  icon,
  helperText,
  rightSlot,
  prefix,
  style,
  ...props
}: PartnerInputProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={partnerTheme.colors.primary}
          style={styles.icon}
        />
        {prefix ? (
          <View style={styles.prefixBox}>
            <Text style={styles.prefixText}>{prefix}</Text>
          </View>
        ) : null}
        <TextInput
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          textContentType="none"
          {...props}
          style={[styles.input, style]}
          placeholderTextColor={partnerTheme.colors.textSoft}
        />
        {rightSlot}
      </View>
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: partnerTheme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  field: {
    minHeight: 58,
    borderRadius: partnerTheme.radius.md,
    backgroundColor: partnerTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  icon: {
    marginTop: 1,
  },
  prefixBox: {
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: partnerTheme.colors.border,
    marginRight: 4,
  },
  prefixText: {
    color: partnerTheme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    color: partnerTheme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 16,
  },
  helper: {
    color: partnerTheme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
});
