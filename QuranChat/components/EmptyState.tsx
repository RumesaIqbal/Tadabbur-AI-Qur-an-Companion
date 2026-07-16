import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';

interface EmptyStateProps {
  title: string;
  description: string;
  icon: string;
}

export default function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={60} color={colors.secondaryText} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.xxl,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primaryText,
    marginTop: spacing.md,
  },
  description: {
    fontSize: typography.fontSize.md,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});