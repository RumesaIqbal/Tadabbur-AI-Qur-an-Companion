import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
}

export default function SearchBar({ placeholder = 'Search...', value, onChangeText }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color={colors.secondaryText} style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.secondaryText}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginVertical: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.primaryText,
    paddingVertical: spacing.xs,
  },
});