import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT, RADIUS, SHADOW, SPACING, TOUCH_TARGET } from '../theme/theme';

export default function PrimaryButton({
  label,
  onPress,
  icon,
  variant = 'primary', // 'primary' | 'outline' | 'ghost'
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
}) {
  const isOutline = variant === 'outline';
  const isGhost = variant === 'ghost';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      activeOpacity={0.8}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.base,
        fullWidth && styles.fullWidth,
        isOutline && styles.outline,
        isGhost && styles.ghost,
        !isOutline && !isGhost && SHADOW.button,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={isOutline || isGhost ? COLORS.primary : COLORS.textOnPrimary} />
        ) : (
          <>
            {icon && (
              <Ionicons
                name={icon}
                size={22}
                color={isOutline || isGhost ? COLORS.primary : COLORS.textOnPrimary}
                style={styles.icon}
              />
            )}
            <Text
              style={[
                styles.label,
                (isOutline || isGhost) && styles.labelOutline,
              ]}
            >
              {label}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  fullWidth: {
    width: '100%',
  },
  outline: {
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TOUCH_TARGET.minHeight,
  },
  icon: {
    marginRight: SPACING.sm,
  },
  label: {
    color: COLORS.textOnPrimary,
    fontSize: FONT.size.md,
    fontWeight: FONT.weight.bold,
  },
  labelOutline: {
    color: COLORS.primary,
  },
});
