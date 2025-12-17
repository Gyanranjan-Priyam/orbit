import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const APP_LOCK_KEY = '@app_lock_enabled';

export function useAppLock() {
  const [isAppLockEnabled, setIsAppLockEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);

  useEffect(() => {
    loadAppLockSettings();
    checkBiometricSupport();
    
    // Listen to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  const loadAppLockSettings = async () => {
    try {
      const enabled = await AsyncStorage.getItem(APP_LOCK_KEY);
      setIsAppLockEnabled(enabled === 'true');
      
      // Lock the app on initial load if enabled
      if (enabled === 'true') {
        setIsLocked(true);
      }
    } catch (error) {
      console.error('Error loading app lock settings:', error);
    }
  };

  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        setBiometricType(null);
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        setBiometricType(null);
        return;
      }

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Touch ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        setBiometricType('Iris');
      } else {
        setBiometricType('Biometric');
      }
    } catch (error) {
      console.error('Error checking biometric support:', error);
      setBiometricType(null);
    }
  };

  const handleAppStateChange = async (nextAppState: string) => {
    if (nextAppState === 'active' && isAppLockEnabled) {
      setIsLocked(true);
    }
  };

  const toggleAppLock = async (enabled: boolean): Promise<boolean> => {
    try {
      // If enabling, verify biometrics first
      if (enabled) {
        const result = await authenticateWithBiometrics();
        if (!result.success) {
          return false;
        }
      }

      await AsyncStorage.setItem(APP_LOCK_KEY, enabled.toString());
      setIsAppLockEnabled(enabled);
      
      if (!enabled) {
        setIsLocked(false);
      }
      
      return true;
    } catch (error) {
      console.error('Error toggling app lock:', error);
      return false;
    }
  };

  const authenticateWithBiometrics = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access the app',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        setIsLocked(false);
        return { success: true };
      } else {
        return { 
          success: false, 
          error: result.error || 'Authentication failed' 
        };
      }
    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      return { 
        success: false, 
        error: error.message || 'Authentication error' 
      };
    }
  };

  const unlock = async (): Promise<boolean> => {
    const result = await authenticateWithBiometrics();
    return result.success;
  };

  return {
    isAppLockEnabled,
    isLocked,
    biometricType,
    isBiometricSupported: biometricType !== null,
    toggleAppLock,
    unlock,
  };
}
