import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    FadeOutLeft,
    SlideInRight,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ROLES = [
  'Developer',
  'Designer',
  'Manager',
  'Product Owner',
  'Team Lead',
  'Freelancer',
  'Student',
  'Other',
];

const ROLE_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  'Developer': 'code',
  'Designer': 'brush',
  'Manager': 'people',
  'Product Owner': 'assignment',
  'Team Lead': 'group-work',
  'Freelancer': 'laptop',
  'Student': 'school',
  'Other': 'person',
};

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const [role, setRole] = useState('');
  const [organization, setOrganization] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleComplete = async () => {
    if (!role) {
      Alert.alert('Missing Information', 'Please select your role');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        data: {
          role,
          organization: organization || null,
          phone_number: phoneNumber || null,
          onboarding_completed: true,
        },
      });

      if (error) throw error;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', error.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !role) {
      Alert.alert('Missing Information', 'Please select your role');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(currentStep - 1);
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepWrapper}>
          <View
            style={[
              styles.stepDot,
              {
                backgroundColor: step <= currentStep 
                  ? (isDark ? '#BB86FC' : '#6200EE') 
                  : (isDark ? '#333' : '#E0E0E0'),
                width: step === currentStep ? 24 : 8,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#000' }]}>
            {currentStep === 1 ? 'Who are you?' : currentStep === 2 ? 'Workplace' : 'Contact'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: isDark ? '#AAA' : '#666' }]}>
            {currentStep === 1 
              ? 'Select the role that best describes you.' 
              : currentStep === 2 
              ? 'Where do you currently work?' 
              : 'How can we reach you?'}
          </Text>
        </Animated.View>
        {renderStepIndicator()}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {currentStep === 1 && (
            <Animated.View entering={SlideInRight} exiting={FadeOutLeft}>
              <View style={styles.rolesGrid}>
                {ROLES.map((roleOption, index) => (
                  <Animated.View 
                    key={roleOption} 
                    entering={FadeInUp.delay(index * 50).springify()}
                    style={{ width: '48%', marginBottom: 16 }}
                  >
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setRole(roleOption);
                      }}
                      style={({ pressed }) => [
                        styles.roleCard,
                        {
                          backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                          borderColor: role === roleOption 
                            ? (isDark ? '#BB86FC' : '#6200EE') 
                            : 'transparent',
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                      ]}
                    >
                      <View style={[
                        styles.iconContainer,
                        { backgroundColor: role === roleOption 
                            ? (isDark ? 'rgba(187, 134, 252, 0.1)' : 'rgba(98, 0, 238, 0.1)') 
                            : (isDark ? '#2C2C2C' : '#F0F0F0') 
                        }
                      ]}>
                        <MaterialIcons 
                          name={ROLE_ICONS[roleOption] || 'person'} 
                          size={28} 
                          color={role === roleOption 
                            ? (isDark ? '#BB86FC' : '#6200EE') 
                            : (isDark ? '#AAA' : '#757575')
                          } 
                        />
                      </View>
                      <Text style={[
                        styles.roleText, 
                        { 
                          color: isDark ? '#FFF' : '#000',
                          fontWeight: role === roleOption ? '700' : '500'
                        }
                      ]}>
                        {roleOption}
                      </Text>
                      {role === roleOption && (
                        <View style={styles.checkBadge}>
                          <MaterialIcons name="check" size={12} color="#FFF" />
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          )}

          {currentStep === 2 && (
            <Animated.View entering={SlideInRight} exiting={FadeOutLeft}>
              <View style={[styles.inputCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
                <View style={styles.inputIcon}>
                  <MaterialIcons name="business" size={24} color={isDark ? '#BB86FC' : '#6200EE'} />
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputLabel, { color: isDark ? '#AAA' : '#666' }]}>ORGANIZATION</Text>
                  <TextInput
                    style={[styles.textInput, { color: isDark ? '#FFF' : '#000' }]}
                    value={organization}
                    onChangeText={setOrganization}
                    placeholder="Company or Team Name"
                    placeholderTextColor={isDark ? '#555' : '#CCC'}
                    autoCapitalize="words"
                    autoFocus
                  />
                </View>
              </View>
              <Text style={[styles.helperText, { color: isDark ? '#666' : '#999' }]}>
                This will be displayed on your profile.
              </Text>
            </Animated.View>
          )}

          {currentStep === 3 && (
            <Animated.View entering={SlideInRight} exiting={FadeOutLeft}>
              <View style={[styles.inputCard, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
                <View style={styles.inputIcon}>
                  <MaterialIcons name="phone" size={24} color={isDark ? '#BB86FC' : '#6200EE'} />
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={[styles.inputLabel, { color: isDark ? '#AAA' : '#666' }]}>PHONE NUMBER</Text>
                  <TextInput
                    style={[styles.textInput, { color: isDark ? '#FFF' : '#000' }]}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="+1 (555) 000-0000"
                    placeholderTextColor={isDark ? '#555' : '#CCC'}
                    keyboardType="phone-pad"
                    autoFocus
                  />
                </View>
              </View>
              <Text style={[styles.helperText, { color: isDark ? '#666' : '#999' }]}>
                Used for account recovery and notifications.
              </Text>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20, backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
        <View style={styles.footerButtons}>
          {currentStep > 1 ? (
            <TouchableOpacity
              onPress={handleBack}
              style={[styles.navButton, styles.backButton, { borderColor: isDark ? '#333' : '#E0E0E0' }]}
            >
              <MaterialIcons name="arrow-back" size={24} color={isDark ? '#FFF' : '#000'} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 56 }} /> // Spacer
          )}

          <TouchableOpacity
            onPress={currentStep === 3 ? handleComplete : handleNext}
            style={[
              styles.navButton, 
              styles.nextButton, 
              { backgroundColor: isDark ? '#BB86FC' : '#6200EE' }
            ]}
            disabled={loading}
          >
            {loading ? (
              <MaterialIcons name="hourglass-empty" size={24} color="#FFF" />
            ) : (
              <MaterialIcons name={currentStep === 3 ? "check" : "arrow-forward"} size={24} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 8,
  },
  stepWrapper: {
    height: 4,
    justifyContent: 'center',
  },
  stepDot: {
    height: 4,
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  roleCard: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    height: 140,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  roleText: {
    fontSize: 14,
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputIcon: {
    marginRight: 16,
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  textInput: {
    fontSize: 18,
    fontWeight: '500',
    padding: 0,
  },
  helperText: {
    marginTop: 12,
    marginLeft: 4,
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    elevation: 0,
  },
  nextButton: {
    // Background color set in render
  },
});