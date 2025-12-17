import { useColorScheme } from '@/hooks/use-color-scheme';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export function TabBarBackground() {
  const colorScheme = useColorScheme();

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Main blur layer */}
      <BlurView
        intensity={100}
        tint={colorScheme === 'dark' ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Gradient overlay for enhanced glass effect */}
      <LinearGradient
        colors={
          colorScheme === 'dark'
            ? ['rgba(28, 28, 30, 0.85)', 'rgba(28, 28, 30, 0.75)']
            : ['rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.70)']
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
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.05)',
          },
        ]}
      />
    </View>
  );
}

export const tabBarStyle = {
  position: 'absolute' as const,
  borderTopWidth: 0,
  backgroundColor: 'transparent',
  elevation: 0,
  height: 88,
  paddingBottom: 34,
  paddingTop: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.1,
  shadowRadius: 10,
};

const styles = StyleSheet.create({
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0.5,
  },
});

