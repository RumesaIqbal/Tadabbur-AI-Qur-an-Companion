import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface TopicChipProps {
  label: string;
  onPress: () => void;
}

export default function TopicChip({ label, onPress }: TopicChipProps) {
  return (
    <TouchableOpacity style={styles.chip} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.primaryText,
  },
});