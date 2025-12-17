import { useColorScheme } from '@/hooks/use-color-scheme';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface AppLockScreenProps {
  visible: boolean;
  biometricType: string | null;
  onUnlock: () => Promise<boolean>;
}

export function AppLockScreen({ visible, biometricType, onUnlock }: AppLockScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (visible) {
      // Auto-trigger authentication when lock screen appears
      handleUnlock();
    }
  }, [visible]);

  const handleUnlock = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await onUnlock();
    
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
    >
      <BlurView
        intensity={100}
        tint={isDark ? 'dark' : 'light'}
        style={styles.container}
      >
        <Animated.View 
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.content}
        >
          {/* Lock Icon */}
          <View style={[styles.lockIconContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            App Locked
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
            {biometricType === 'Face ID' 
              ? 'Use Face ID to unlock' 
              : biometricType === 'Touch ID'
              ? 'Use Touch ID to unlock'
              : 'Authenticate to unlock'}
          </Text>

          {/* Unlock Button */}
          <TouchableOpacity
            style={[styles.unlockButton, { backgroundColor: '#007AFF' }]}
            onPress={handleUnlock}
            activeOpacity={0.8}
          >
            <Text style={styles.unlockButtonText}>
              {biometricType === 'Face ID' ? '👤 Unlock with Face ID' : 
               biometricType === 'Touch ID' ? '👆 Unlock with Touch ID' :
               '🔓 Unlock App'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  lockIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  lockIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  unlockButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
