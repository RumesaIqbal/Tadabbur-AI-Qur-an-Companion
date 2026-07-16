import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: any;
}

export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
}: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.title}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primaryGreen,
    borderRadius: 18,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  disabled: {
    opacity: 0.6,
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: '600',
    color: colors.white,
  },
});