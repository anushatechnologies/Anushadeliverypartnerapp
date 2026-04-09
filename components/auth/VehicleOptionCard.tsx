import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { partnerTheme } from '@/constants/partnerTheme';

interface VehicleOptionCardProps {
  label: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  selected: boolean;
  onPress: () => void;
}

export function VehicleOptionCard({
  label,
  description,
  icon,
  selected,
  onPress,
}: VehicleOptionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={selected ? '#FFFFFF' : partnerTheme.colors.primary}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: partnerTheme.radius.md,
    backgroundColor: partnerTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardSelected: {
    borderColor: partnerTheme.colors.primary,
    backgroundColor: '#F1FBF7',
    shadowColor: partnerTheme.colors.glow,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 18,
    backgroundColor: '#E8F6F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: {
    backgroundColor: partnerTheme.colors.primary,
  },
  copy: {
    flex: 1,
  },
  label: {
    color: partnerTheme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  description: {
    color: partnerTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    fontWeight: '500',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: partnerTheme.colors.borderStrong,
  },
  radioSelected: {
    borderColor: partnerTheme.colors.primary,
    backgroundColor: partnerTheme.colors.primary,
  },
});
