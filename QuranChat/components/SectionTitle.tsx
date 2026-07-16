import { Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';

interface SectionTitleProps {
  title: string;
}

export default function SectionTitle({ title }: SectionTitleProps) {
  return <Text style={styles.title}>{title}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primaryText,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});