import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function TabBarBackground() {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    console.log('📱 Android TabBarBackground loaded - Adaptive navigation bar');
    console.log('Bottom inset:', insets.bottom);
  }, [insets.bottom]);

  return (
    <View 
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: '#FFFFFF' }
      ]} 
    />
  );
}

export function useTabBarStyle() {
  const insets = useSafeAreaInsets();
  const hasNavigationBar = insets.bottom > 0;

  return {
    position: 'absolute' as const,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    elevation: 8,
    height: hasNavigationBar ? 60 + insets.bottom : 60,
    paddingBottom: hasNavigationBar ? insets.bottom : 8,
    paddingTop: 8,
  };
}

// Keep static export for compatibility
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
