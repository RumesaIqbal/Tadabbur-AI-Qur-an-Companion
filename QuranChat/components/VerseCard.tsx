import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface VerseCardProps {
  arabic: string;
  translation: string;
  reference: string;
  onPress?: () => void;
}

export default function VerseCard({ arabic, translation, reference, onPress }: VerseCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.arabic}>{arabic}</Text>
      <Text style={styles.translation}>{translation}</Text>
      <Text style={styles.reference}>{reference}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: spacing.sm,
  },
  arabic: {
    fontSize: typography.fontSize.xl,
    textAlign: 'right',
    color: colors.primaryText,
    marginBottom: spacing.xs,
    fontFamily: 'System',
  },
  translation: {
    fontSize: typography.fontSize.md,
    color: colors.primaryText,
    marginBottom: spacing.xs,
  },
  reference: {
    fontSize: typography.fontSize.sm,
    color: colors.secondaryText,
  },
});