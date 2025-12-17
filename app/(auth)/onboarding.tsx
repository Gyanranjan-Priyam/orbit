import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Missing Information', 'Please select your role');
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Update user metadata with onboarding info
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1 && !role) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Animated.View entering={FadeInUp.delay(100)}>
            <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Welcome! 👋
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
              Let's set up your profile
            </Text>
          </Animated.View>

          {/* Progress Indicator */}
          <Animated.View entering={FadeInDown.delay(200)} style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(currentStep / 3) * 100}%`,
                    backgroundColor: '#007AFF',
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
              Step {currentStep} of 3
            </Text>
          </Animated.View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Step 1: Role Selection */}
          {currentStep === 1 && (
            <Animated.View entering={FadeInUp.springify()} exiting={FadeInDown}>
              <Text style={[styles.stepTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                What's your role?
              </Text>
              <Text style={[styles.stepDescription, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                This helps us personalize your experience
              </Text>

              <View style={styles.rolesGrid}>
                {ROLES.map((roleOption, index) => (
                  <Animated.View
                    key={roleOption}
                    entering={FadeInDown.delay(index * 50).springify()}
                  >
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setRole(roleOption);
                      }}
                      style={({ pressed }) => [
                        styles.roleCard,
                        {
                          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                          borderColor: role === roleOption ? '#007AFF' : 'transparent',
                          borderWidth: 2,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      {role === roleOption && (
                        <View style={styles.selectedBadge}>
                          <Text style={styles.checkmark}>✓</Text>
                        </View>
                      )}
                      <Text style={[styles.roleText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        {roleOption}
                      </Text>
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Step 2: Organization */}
          {currentStep === 2 && (
            <Animated.View entering={FadeInUp.springify()} exiting={FadeInDown}>
              <Text style={[styles.stepTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Organization Details
              </Text>
              <Text style={[styles.stepDescription, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                Optional - You can skip this step
              </Text>

              <View style={styles.formSection}>
                <Text style={[styles.label, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
                  ORGANIZATION NAME
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: isDark ? '#FFFFFF' : '#000000' }]}
                    value={organization}
                    onChangeText={setOrganization}
                    placeholder="Enter organization name"
                    placeholderTextColor={isDark ? '#48484A' : '#C6C6C8'}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>
            </Animated.View>
          )}

          {/* Step 3: Contact Details */}
          {currentStep === 3 && (
            <Animated.View entering={FadeInUp.springify()} exiting={FadeInDown}>
              <Text style={[styles.stepTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Contact Information
              </Text>
              <Text style={[styles.stepDescription, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                Optional - Help your team reach you
              </Text>

              <View style={styles.formSection}>
                <Text style={[styles.label, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
                  PHONE NUMBER
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.input, { color: isDark ? '#FFFFFF' : '#000000' }]}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="+1 (555) 000-0000"
                    placeholderTextColor={isDark ? '#48484A' : '#C6C6C8'}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Summary */}
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  },
                ]}
              >
                <Text style={[styles.summaryTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  Summary
                </Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                    Role
                  </Text>
                  <Text style={[styles.summaryValue, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    {role}
                  </Text>
                </View>
                {organization && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                      Organization
                    </Text>
                    <Text style={[styles.summaryValue, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                      {organization}
                    </Text>
                  </View>
                )}
                {phoneNumber && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                      Phone
                    </Text>
                    <Text style={[styles.summaryValue, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                      {phoneNumber}
                    </Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Footer Buttons */}
        <BlurView
          intensity={isDark ? 80 : 100}
          tint={isDark ? 'dark' : 'light'}
          style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}
        >
          <View style={styles.buttonContainer}>
            {currentStep > 1 && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.secondaryButton,
                  {
                    backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                  },
                ]}
                onPress={handleBack}
                disabled={loading}
              >
                <Text style={[styles.secondaryButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  Back
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                {
                  backgroundColor: '#007AFF',
                  opacity: loading ? 0.5 : 1,
                  flex: currentStep === 1 ? 1 : 0.6,
                },
              ]}
              onPress={currentStep === 3 ? handleComplete : handleNext}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Saving...' : currentStep === 3 ? 'Complete' : 'Next'}
              </Text>
            </TouchableOpacity>

            {currentStep === 2 && (
              <TouchableOpacity
                style={[styles.skipButton]}
                onPress={handleNext}
                disabled={loading}
              >
                <Text style={[styles.skipButtonText, { color: '#007AFF' }]}>
                  Skip
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.374,
  },
  subtitle: {
    fontSize: 17,
    letterSpacing: -0.408,
  },
  progressContainer: {
    marginTop: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(142, 142, 147, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 13,
    marginTop: 8,
    letterSpacing: -0.08,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.352,
  },
  stepDescription: {
    fontSize: 17,
    marginBottom: 32,
    letterSpacing: -0.408,
  },

  // Role Selection
  rolesGrid: {
    gap: 12,
  },
  roleCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  roleText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.408,
  },
  selectedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Form Section
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: -0.08,
  },
  inputContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    letterSpacing: -0.408,
  },

  // Summary Card
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
    letterSpacing: -0.408,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 17,
    letterSpacing: -0.408,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.408,
  },

  // Footer
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(60, 60, 67, 0.18)',
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    flex: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.408,
  },
  secondaryButton: {
    flex: 0.4,
  },
  secondaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.408,
  },
  skipButton: {
    paddingHorizontal: 12,
  },
  skipButtonText: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.408,
  },
});
