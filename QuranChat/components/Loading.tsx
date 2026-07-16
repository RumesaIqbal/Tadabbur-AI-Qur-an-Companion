import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function Loading() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#D4AF37" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a1a1a', // dark background
  },
});