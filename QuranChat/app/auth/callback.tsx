// app/auth/callback.tsx
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/supabase';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../../theme';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/login');
      }
    };
    checkSession();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.primaryGreen} />
    </View>
  );
}