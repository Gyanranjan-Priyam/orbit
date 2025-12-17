import { useColorScheme } from '@/hooks/use-color-scheme';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

export function TabBarBackground() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    console.log('🎨 iOS TabBarBackground loaded - Liquid glass effect active!');
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Main blur layer */}
      <BlurView
        intensity={95}
        tint={colorScheme === 'dark' ? 'dark' : 'extraLight'}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Gradient overlay for enhanced glass effect */}
      <LinearGradient
        colors={
          colorScheme === 'dark'
            ? ['rgba(28, 28, 30, 0.90)', 'rgba(28, 28, 30, 0.80)']
            : ['rgba(249, 249, 249, 0.92)', 'rgba(255, 255, 255, 0.78)']
        }
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />
      
      {/* Top border/highlight */}
      <View
        style={[
          styles.topBorder,
          {
            backgroundColor:
              colorScheme === 'dark'
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(0, 0, 0, 0.08)',
          },
        ]}
      />
    </View>
  );
}

export const useTabBarStyle = () => ({
  position: 'absolute' as const,
  borderTopWidth: 0,
  backgroundColor: 'rgba(0, 0, 0, 0)', // Fully transparent
  elevation: 0,
  height: 88,
  paddingBottom: 34,
  paddingTop: 8,
});

const styles = StyleSheet.create({
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0.5,
  },
});
