import { AppLockScreen } from '@/components/app-lock-screen';
import { useAppLock } from '@/hooks/use-app-lock';
import { useNotifications } from '@/hooks/use-notifications';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const { isLocked, biometricType, unlock } = useAppLock();
  
  // Initialize push notifications
  useNotifications();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoaded(true);
      // Hide splash screen after loading
      SplashScreen.hideAsync();
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (session) {
      // User is authenticated
      const onboardingCompleted = session.user?.user_metadata?.onboarding_completed;
      
      // Don't redirect if already on the correct page
      if (segments[1] === 'onboarding') {
        return;
      }
      
      // Check if user needs onboarding
      if (!onboardingCompleted && !segments[1]?.includes('onboarding')) {
        console.log('User needs onboarding, redirecting...');
        router.replace('/(auth)/onboarding');
      } else if (onboardingCompleted && inAuthGroup && segments[1] === 'login') {
        // User completed onboarding and is in auth group, go to tabs
        console.log('User onboarded, redirecting to tabs');
        router.replace('/(tabs)');
      }
    } else if (!session && !inAuthGroup) {
      // Redirect to login if not signed in and not in auth group
      router.replace('/(auth)/login');
    }
  }, [session, isLoaded, segments]);

  return (
    <>
      <Slot />
      {session && <AppLockScreen visible={isLocked} biometricType={biometricType} onUnlock={unlock} />}
    </>
  );
}

export default function RootLayout() {
  return <InitialLayout />;
}
