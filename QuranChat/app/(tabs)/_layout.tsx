import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import CustomTabBar from '../../components/CustomTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.goldAccent,
        tabBarInactiveTintColor: colors.secondaryText,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent', // the tab bar itself is now dark; we keep transparent to let the custom bar's background show
          borderRadius: 30,
          marginHorizontal: 20,
          marginBottom: 20,
          height: 70,
          // No shadow properties
          borderTopWidth: 0,
          overflow: 'hidden',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: 'QuranAI',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}