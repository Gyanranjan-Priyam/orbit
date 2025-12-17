import React from 'react';
import { StyleSheet, View } from 'react-native';

export function TabBarBackground() {
  return (
    <View 
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: '#FFFFFF' }
      ]} 
    />
  );
}

export const tabBarStyle = {
  position: 'absolute' as const,
  borderTopWidth: 1,
  borderTopColor: '#E5E5EA',
  backgroundColor: '#FFFFFF',
  elevation: 8,
  height: 60,
  paddingBottom: 8,
  paddingTop: 8,
};
