import React, { useEffect } from 'react';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors, spacing, typography } from '../theme';

const TabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  return (
    <View style={styles.container}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const icon =
          options.tabBarIcon &&
          options.tabBarIcon({
            focused: isFocused,
            color: isFocused ? colors.goldAccent : colors.secondaryText,
            size: 24,
          });

        // Scale animation for the icon
        const scale = useSharedValue(isFocused ? 1.1 : 1);
        useEffect(() => {
          scale.value = withSpring(isFocused ? 1.15 : 1, { damping: 12, stiffness: 100 });
        }, [isFocused]);

        const animatedIconStyle = useAnimatedStyle(() => ({
          transform: [{ scale: scale.value }],
        }));

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={[styles.tabButton, isFocused && styles.activeTab]} // ✅ highlight box on focus
            activeOpacity={0.7}
          >
            <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
              {icon}
            </Animated.View>
            <Text
              style={[
                styles.label,
                {
                  color: isFocused ? colors.goldAccent : colors.secondaryText,
                  fontWeight: isFocused ? '700' : '500',
                },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1a2a2a', // dark theme – matches the app
    borderRadius: 30,
    height: 70,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0,
    
    // No shadow
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderRadius: 20,
    paddingHorizontal: 4,
  },
  activeTab: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)', // gold highlight box
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  iconContainer: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
    letterSpacing: 0.3,
  },
});

export default TabBar;