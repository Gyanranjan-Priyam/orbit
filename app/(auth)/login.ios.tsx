import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

WebBrowser.maybeCompleteAuthSession();

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/(tabs)');
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace('/(tabs)');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
            
            // Navigate to tabs
            router.replace('/(tabs)');
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
      colors={['#007AFF', '#0051D5']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* Decorative Background Elements */}
      <View style={styles.backgroundCircle1} />
      <View style={styles.backgroundCircle2} />

      <View style={styles.content}>
        {/* Logo/Header */}
        <Animated.View 
          entering={FadeInUp.delay(200).duration(1000)}
          style={styles.header}
        >
          <View style={styles.iconContainer}>
            <Image 
              source={require('@/assets/images/icon.png')} 
              style={styles.logoImage}
            />
          </View>
          <Text style={styles.title}>Orbit</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </Animated.View>

        {/* Glass Card with Buttons */}
        <Animated.View 
          entering={FadeInDown.delay(400).duration(1000)}
          style={styles.cardContainer}
        >
          <BlurView intensity={40} tint="light" style={styles.glassCard}>
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={styles.googleButton}
                onPress={() => handleOAuth('google')}
                disabled={loading}
              >
                <View style={styles.googleButtonContent}>
                  <Ionicons name="logo-google" size={24} color="#DB4437" />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                  {loading && <ActivityIndicator size="small" color="#666" />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.githubButton}
                onPress={() => handleOAuth('github')}
                disabled={loading}
              >
                <View style={styles.githubButtonContent}>
                  <Ionicons name="logo-github" size={24} color="#FFFFFF" />
                  <Text style={styles.githubButtonText}>Continue with GitHub</Text>
                  {loading && <ActivityIndicator size="small" color="#FFF" />}
                </View>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>

        {/* Footer */}
        <Animated.Text 
          entering={FadeInUp.delay(600).duration(1000)}
          style={styles.footer}
        >
          By continuing, you agree to our{'\n'}
          <Text style={styles.footerLink}>Terms of Service</Text> and{' '}
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </Animated.Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundCircle1: {
    position: 'absolute',
    width: height * 0.8,
    height: height * 0.8,
    borderRadius: height * 0.4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -height * 0.4,
    right: -height * 0.2,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: height * 0.6,
    height: height * 0.6,
    borderRadius: height * 0.3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -height * 0.3,
    left: -height * 0.1,
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
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  cardContainer: {
    marginHorizontal: 0,
  },
  glassCard: {
    borderRadius: 24,
    overflow: 'hidden',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  buttonsContainer: {
    gap: 20,
  },
  appleButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 12,
  },
  appleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  githubButton: {
    backgroundColor: '#24292e',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  githubButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  githubButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 20,
  },
  footerLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
