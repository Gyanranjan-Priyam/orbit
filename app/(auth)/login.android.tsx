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
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  // Animation values
  const logoScale = useSharedValue(1);
  const bgRotate = useSharedValue(0);
  const bgTranslateY = useSharedValue(0);

  useEffect(() => {
    // Start background animations
    bgRotate.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1
    );
    
    bgTranslateY.value = withRepeat(
      withSequence(
        withTiming(-20, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Logo pulse animation
    logoScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

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

  const animatedBgStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${bgRotate.value}deg` },
      { translateY: bgTranslateY.value }
    ]
  }));

  const animatedLogoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }]
  }));

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
    <View style={styles.container}>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Animated Background Elements */}
      <Animated.View style={[styles.bgCircle, styles.bgCircle1, animatedBgStyle]} />
      <Animated.View style={[styles.bgCircle, styles.bgCircle2, animatedBgStyle]} />
      
      {/* Glass Overlay */}
      <View style={styles.overlay} />

      <View style={styles.content}>
        {/* Logo/Header */}
        <Animated.View 
          entering={FadeInUp.delay(200).duration(1000)}
          style={styles.header}
        >
          <Animated.View style={[styles.iconContainer, animatedLogoStyle]}>
            <View style={styles.glowContainer}>
              <Image 
                source={require('@/assets/images/icon.png')} 
                style={styles.logoImage}
              />
            </View>
          </Animated.View>
          <Text style={styles.title}>Orbit</Text>
          <Text style={styles.subtitle}>Your workspace, reimagined</Text>
        </Animated.View>

        {/* Login Options */}
        <Animated.View 
          entering={FadeInDown.delay(400).duration(1000)}
          style={styles.cardContainer}
        >
          <View style={styles.glassCard}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            
            <View style={styles.buttonsContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.socialButton,
                  styles.googleButton,
                  pressed && styles.buttonPressed
                ]}
                onPress={() => handleOAuth('google')}
                disabled={loading}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="logo-google" size={24} color="#DB4437" />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                  {loading && <ActivityIndicator size="small" color="#666" style={styles.loader} />}
                </View>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.socialButton,
                  styles.githubButton,
                  pressed && styles.buttonPressed
                ]}
                onPress={() => handleOAuth('github')}
                disabled={loading}
              >
                <View style={styles.buttonContent}>
                  <Ionicons name="logo-github" size={24} color="#FFFFFF" />
                  <Text style={styles.githubButtonText}>Continue with GitHub</Text>
                  {loading && <ActivityIndicator size="small" color="#FFF" style={styles.loader} />}
                </View>
              </Pressable>
            </View>
          </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  bgCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.4,
  },
  bgCircle1: {
    width: width * 1.2,
    height: width * 1.2,
    backgroundColor: '#38BDF8', // Sky Blue
    top: -width * 0.4,
    left: -width * 0.2,
    opacity: 0.15,
  },
  bgCircle2: {
    width: width,
    height: width,
    backgroundColor: '#818CF8', // Indigo
    bottom: -width * 0.2,
    right: -width * 0.2,
    opacity: 0.15,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.3)', // Slight dark overlay
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    marginBottom: 24,
  },
  glowContainer: {
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 15,
    borderRadius: 30,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 1,
    textShadowColor: 'rgba(56, 189, 248, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  cardContainer: {
    width: '100%',
  },
  glassCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonsContainer: {
    gap: 16,
  },
  socialButton: {
    borderRadius: 16,
    padding: 16,
    height: 56,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
  },
  githubButton: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  githubButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loader: {
    marginLeft: 8,
  },
  footer: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 18,
  },
  footerLink: {
    color: '#94A3B8',
    fontWeight: '600',
  },
});
