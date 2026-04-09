import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { partnerTheme } from '@/constants/partnerTheme';

interface StepProgressProps {
  steps: readonly string[];
  activeIndex: number;
  completedSteps?: boolean[];
}

export function StepProgress({ steps, activeIndex, completedSteps }: StepProgressProps) {
  return (
    <View style={styles.wrapper}>
      {steps.map((step, index) => {
        const isActive = index === activeIndex;
        const isComplete = completedSteps?.[index] ?? index < activeIndex;

        return (
          <View
            key={step}
            style={[
              styles.step,
              isActive && styles.activeStep,
              isComplete && styles.completeStep,
            ]}
          >
            <View
              style={[
                styles.dot,
                isActive && styles.activeDot,
                isComplete && styles.completeDot,
              ]}
            >
              {isComplete ? (
                <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.dotText,
                    isActive && styles.activeDotText,
                  ]}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.stepLabel,
                isActive && styles.activeLabel,
                isComplete && styles.completeLabel,
              ]}
            >
              {step}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: partnerTheme.colors.surfaceMuted,
    borderRadius: partnerTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: partnerTheme.colors.border,
  },
  activeStep: {
    borderColor: partnerTheme.colors.borderStrong,
    backgroundColor: '#FFFFFF',
  },
  completeStep: {
    borderColor: '#BBF7D0',
    backgroundColor: '#F0FDF4',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: partnerTheme.colors.canvasAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    backgroundColor: partnerTheme.colors.primary,
  },
  completeDot: {
    backgroundColor: partnerTheme.colors.success,
  },
  dotText: {
    color: partnerTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
  },
  activeDotText: {
    color: '#FFFFFF',
  },
  stepLabel: {
    color: partnerTheme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  activeLabel: {
    color: partnerTheme.colors.text,
  },
  completeLabel: {
    color: partnerTheme.colors.success,
  },
});
