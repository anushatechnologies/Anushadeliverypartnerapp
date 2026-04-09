import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { partnerTheme } from '@/constants/partnerTheme';

type NoticeVariant = 'success' | 'info';

interface PartnerFlowNoticeProps {
  title: string;
  description: string;
  caption: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  variant?: NoticeVariant;
}

export function PartnerFlowNotice({
  title,
  description,
  caption,
  icon,
  variant = 'info',
}: PartnerFlowNoticeProps) {
  const entrance = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entrance, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.04,
            duration: 760,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0.92,
            duration: 760,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    ]).start();
  }, [entrance, pulse]);

  const palette = variant === 'success'
    ? {
        surface: '#ECFDF3',
        border: '#BBF7D0',
        iconSurface: '#16A34A',
      }
    : {
        surface: '#EFF6FF',
        border: '#BFDBFE',
        iconSurface: '#2563EB',
      };

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.row}>
        <Animated.View
          style={[
            styles.iconWrap,
            {
              backgroundColor: palette.iconSurface,
              transform: [{ scale: pulse }],
            },
          ]}
        >
          <MaterialCommunityIcons name={icon} size={20} color="#FFFFFF" />
        </Animated.View>

        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          <Text style={styles.caption}>{caption}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: partnerTheme.radius.md,
    borderWidth: 1,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: partnerTheme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  description: {
    color: partnerTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  caption: {
    color: partnerTheme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
});
