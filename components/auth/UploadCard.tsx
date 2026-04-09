import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { partnerTheme } from '@/constants/partnerTheme';

interface UploadCardProps {
  title: string;
  subtitle: string;
  helper: string;
  imageUri: string | null;
  onPress: () => void;
  optional?: boolean;
}

export function UploadCard({
  title,
  subtitle,
  helper,
  imageUri,
  onPress,
  optional,
}: UploadCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.preview}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <MaterialCommunityIcons
            name="image-plus"
            size={28}
            color={partnerTheme.colors.textSoft}
          />
        )}
      </View>

      <View style={styles.copy}>
        <View style={styles.topRow}>
          <Text style={styles.title}>{title}</Text>
          <Text style={[styles.badge, optional && styles.optionalBadge]}>
            {optional ? 'Optional' : imageUri ? 'Ready' : 'Required'}
          </Text>
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.helper}>{helper}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: partnerTheme.radius.md,
    backgroundColor: partnerTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
    padding: 14,
    flexDirection: 'row',
    gap: 14,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  preview: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: partnerTheme.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  copy: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  title: {
    color: partnerTheme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  badge: {
    color: partnerTheme.colors.success,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    backgroundColor: '#E7F8EC',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: partnerTheme.radius.pill,
  },
  optionalBadge: {
    color: partnerTheme.colors.accent,
    backgroundColor: partnerTheme.colors.accentSoft,
  },
  subtitle: {
    color: partnerTheme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  helper: {
    color: partnerTheme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});
