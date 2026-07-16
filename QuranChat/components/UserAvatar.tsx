import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';

interface UserAvatarProps {
  size?: number;
  name?: string;
  imageUrl?: string;
}

export default function UserAvatar({ size = 48, name = 'U', imageUrl }: UserAvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      {imageUrl ? (
        // In a real app, use Image component with source={{ uri: imageUrl }}
        <View style={styles.imagePlaceholder} />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: colors.primaryGreen,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.goldAccent,
    borderRadius: 999,
  },
  initials: {
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },
});