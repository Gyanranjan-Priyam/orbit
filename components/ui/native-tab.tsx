import { useColorScheme } from '@/hooks/use-color-scheme';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

/**
 * Native iOS 18 style glass effect tab bar background
 * Provides the modern translucent blur effect with proper styling
 */
export function NativeTabBackground() {
  const colorScheme = useColorScheme();

  if (Platform.OS !== 'ios') {
    // Fallback for Android
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF',
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colorScheme === 'dark' ? '#38383A' : '#C6C6C8',
          },
        ]}
      />
    );
  }

  return (
    <>
      {/* iOS Glass effect with blur */}
      <BlurView
        intensity={100}
        tint={colorScheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Subtle top border for depth */}
      <View
        style={[
          styles.topBorder,
          {
            backgroundColor:
              colorScheme === 'dark'
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(0, 0, 0, 0.04)',
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
});

/**
 * Native tab bar style configuration for iOS 18 glass effect
 */
export const nativeTabBarStyle = {
  position: 'absolute' as const,
  borderTopWidth: 0,
  backgroundColor: 'transparent',
  elevation: 0,
  height: Platform.OS === 'ios' ? 85 : 65,
};

/**
 * Hook to get the proper tab bar style
 */
export function useNativeTabBarStyle() {
  return nativeTabBarStyle;
}
