// app/_layout.tsx
import { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native'; // ensure Text is imported if used
import { Stack, useRouter, useSegments } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../services/supabase';

import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated';

configureReanimatedLogger({
  level: ReanimatedLogLevel.warn,
  strict: false,
});

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const inAuthGroup = segments[0] === 'login' || segments[0] === 'auth';
      if (!session && !inAuthGroup) {
        router.replace('/login');
      } else if (session && inAuthGroup) {
        router.replace('/(tabs)/home');
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      const inAuthGroup = segments[0] === 'login' || segments[0] === 'auth';
      if (!data.session && !inAuthGroup) {
        router.replace('/login');
      } else if (data.session && inAuthGroup) {
        router.replace('/(tabs)/home');
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0a1a1a' },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="auth/callback" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="chat/index" options={{ presentation: 'modal' }} />
            <Stack.Screen name="verse/[id]" options={{ presentation: 'modal' }} />
          </Stack>
        </View>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1a1a',
  },
});