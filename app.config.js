// ⚠️ IMPORTANT: Replace these with your actual keys before running the app
// Get Clerk key from: https://dashboard.clerk.com/last-active?path=api-keys
// Get Supabase keys from: https://app.supabase.com/project/_/settings/api

const CLERK_PUBLISHABLE_KEY = 'pk_test_YOUR_KEY_HERE';
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

export default {
  expo: {
    name: 'Orbit',
    slug: 'orbit',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'apps',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.orbit.app',
      infoPlist: {
        NSUserNotificationsUsageDescription: 'This app uses notifications to alert you when tasks are assigned to you.',
      },
    },
    android: {
      package: 'com.orbit.app',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        'RECEIVE_BOOT_COMPLETED',
        'VIBRATE',
        'WAKE_LOCK',
        'com.google.android.c2dm.permission.RECEIVE',
      ],
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#ffffff',
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      clerkPublishableKey: CLERK_PUBLISHABLE_KEY,
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
      eas: {
        projectId: 'c173c3dc-983a-4c49-ab7f-7d9bb3fa1ce6',
      },
    },
  },
};
