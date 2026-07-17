// app/index.tsx
import { useEffect } from 'react';
import { View, StyleSheet, Image, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { colors, spacing, typography } from '../theme';

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
      colors={['#0a1a1a', '#0F2E2E', '#1a3a3a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0a1a1a" />

      <Animated.View entering={FadeIn.duration(1000)} style={styles.content}>
        <View style={styles.logoCircle}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Animated.Text entering={SlideInDown.delay(300)} style={styles.title}>
          Tadabbur
        </Animated.Text>

        <Text style={styles.subtitle}>Reflection upon the Qur'an</Text>

        <ActivityIndicator
          animating
          color="#D4AF37"
          size="large"
          style={styles.loader}
        />
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
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1a2a2a', // same as login page
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.goldAccent,
    shadowColor: colors.goldAccent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  logoImage: {
    width: 90,
    height: 90,
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(212, 175, 55, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    fontStyle: 'italic',
    color: colors.goldAccent,
    letterSpacing: 0.5,
    marginBottom: spacing.xl,
  },
  loader: {
    marginTop: spacing.md,
  },
});