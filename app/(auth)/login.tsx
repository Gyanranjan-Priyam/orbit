import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkOnboardingStatus(session.user);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkOnboardingStatus(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboardingStatus = async (user: any) => {
    const onboardingCompleted = user?.user_metadata?.onboarding_completed;
    
    if (onboardingCompleted) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/onboarding');
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple' | 'github') => {
    setLoading(true);
    try {
      console.log('Starting OAuth flow for', provider);
      
      const redirectUrl = makeRedirectUri({
        scheme: 'apps',
      });
      console.log('Redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
      
      if (data.url) {
        // Open the OAuth URL
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success' && result.url) {
          // Extract the URL parameters from hash
          const url = result.url;
          const accessToken = url.match(/access_token=([^&]+)/)?.[1];
          const refreshToken = url.match(/refresh_token=([^&]+)/)?.[1];
          
          console.log('Auth result:', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });
          
          if (accessToken && refreshToken) {
            // Set the session
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: decodeURIComponent(accessToken),
              refresh_token: decodeURIComponent(refreshToken),
            });
            
            if (sessionError) throw sessionError;
            console.log('Session set successfully:', !!sessionData.session);
            
            // Check onboarding status before navigating
            if (sessionData.session?.user) {
              checkOnboardingStatus(sessionData.session.user);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('OAuth error:', err);
      Alert.alert('Error', err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#F2F2F7', '#FFFFFF']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.content}>
        {/* Logo/Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Image 
              source={require('@/assets/images/icon.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Orbit</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {/* Sign In Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.googleButton]}
            onPress={() => handleOAuth('google')}
            disabled={loading}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="logo-google" size={24} color="#DB4437" />
              <Text style={styles.buttonText}>Continue with Google</Text>
            </View>
            {loading && <ActivityIndicator size="small" color="#666" />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.githubButton]}
            onPress={() => handleOAuth('github')}
            disabled={loading}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="logo-github" size={24} color="#FFFFFF" />
              <Text style={[styles.buttonText, styles.githubButtonText]}>Continue with GitHub</Text>
            </View>
            {loading && <ActivityIndicator size="small" color="#FFF" />}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    color: '#8E8E93',
  },
  buttonsContainer: {
    gap: 16,
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  googleButton: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  githubButton: {
    backgroundColor: '#24292e',
  },
  githubButtonText: {
    color: '#FFFFFF',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  footer: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 18,
  },
});
