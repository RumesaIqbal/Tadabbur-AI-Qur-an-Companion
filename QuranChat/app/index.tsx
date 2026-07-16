import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../theme';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={[colors.primaryGreen, colors.darkGreen]}
      style={styles.container}
    >
      <Animated.View entering={FadeIn.duration(1000)} style={styles.content}>
        {/* Logo placeholder – a golden circle with a stylized "Q" */}
        <View style={styles.logo}>
          <Text style={styles.logoText}>Q</Text>
        </View>

        <Animated.Text entering={SlideInDown.delay(300)} style={styles.title}>
          Qur'an Chat
        </Animated.Text>
        <ActivityIndicator animating color={colors.goldAccent} style={styles.loader} />
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.goldAccent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  logoText: {
    fontSize: 48,
    fontWeight: typography.fontWeight.bold,
    color: colors.primaryGreen,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
    letterSpacing: 2,
    marginBottom: spacing.xl,
  },
  loader: {
    marginTop: spacing.md,
  },
});