import { useAppLock } from '@/hooks/use-app-lock';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface UserStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
}

export default function SettingsScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editOrganization, setEditOrganization] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [updating, setUpdating] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isAppLockEnabled, isBiometricSupported, biometricType, toggleAppLock } = useAppLock();

  useEffect(() => {
    loadUserData();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setEditRole(session.user.user_metadata?.role || '');
        setEditOrganization(session.user.user_metadata?.organization || '');
        setEditPhone(session.user.user_metadata?.phone_number || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditName(user?.user_metadata?.full_name || user?.user_metadata?.name || '');
    setEditBio(user?.user_metadata?.bio || '');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    try {
      setUpdating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: editName.trim(),
          bio: editBio.trim() || null,
        },
      });

      if (error) throw error;

      if (data.user) {
        setUser(data.user);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowEditModal(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveAccountInfo = async () => {
    if (!editRole.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Role is required');
      return;
    }

    try {
      setUpdating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const { data, error } = await supabase.auth.updateUser({
        data: {
          role: editRole.trim(),
          organization: editOrganization.trim() || null,
          phone_number: editPhone.trim() || null,
        },
      });

      if (error) throw error;

      if (data.user) {
        setUser(data.user);
        setEditRole(data.user.user_metadata?.role || '');
        setEditOrganization(data.user.user_metadata?.organization || '');
        setEditPhone(data.user.user_metadata?.phone_number || '');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditingAccount(false);
      Alert.alert('Success', 'Account information updated successfully');
    } catch (error: any) {
      console.error('Error updating account info:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to update account information');
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
        <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
          <BlurView
            intensity={isDark ? 80 : 100}
            tint={isDark ? 'dark' : 'light'}
            style={styles.headerBlur}
          >
            <View style={styles.headerContent}>
              <Text style={[styles.largeTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Settings
              </Text>
            </View>
          </BlurView>
        </View>
        <View style={styles.notSignedInContainer}>
          <Text style={[styles.notSignedInText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
            Sign in to access settings
          </Text>
        </View>
      </View>
    );
  }

  const getInitials = () => {
    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email;
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
      {/* Header */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <BlurView
          intensity={isDark ? 80 : 100}
          tint={isDark ? 'dark' : 'light'}
          style={styles.headerBlur}
        >
          <View style={styles.headerContent}>
            <Text style={[styles.largeTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Settings
            </Text>
          </View>
        </BlurView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section - WhatsApp style */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Pressable
            style={({ pressed }) => [
              styles.profileSection,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                opacity: pressed ? 0.95 : 1,
              },
            ]}
            onPress={handleEditProfile}
          >
            <View style={[styles.avatar, { backgroundColor: '#007AFF' }]}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: isDark ? '#FFFFFF' : '#000000' }]} numberOfLines={1}>
                {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={[styles.profileBio, { color: isDark ? '#8E8E93' : '#8E8E93' }]} numberOfLines={1}>
                {user.user_metadata?.bio || 'Hey there! I am using Task Manager'}
              </Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* Settings List */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.section}>
          <View style={[styles.settingsGroup, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
            {/* Account */}
            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                pressed && { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAccountModal(true);
              }}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🔑</Text>
                <Text style={[styles.settingLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  Account
                </Text>
              </View>
              <Text style={[styles.chevronRight, { color: isDark ? '#3A3A3C' : '#C6C6C8' }]}>›</Text>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: isDark ? '#38383A' : '#C6C6C8', marginLeft: 52 }]} />

            {/* Privacy */}
            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                pressed && { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowPrivacyModal(true);
              }}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🔒</Text>
                <Text style={[styles.settingLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  Privacy
                </Text>
              </View>
              <Text style={[styles.chevronRight, { color: isDark ? '#3A3A3C' : '#C6C6C8' }]}>›</Text>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: isDark ? '#38383A' : '#C6C6C8', marginLeft: 52 }]} />

            {/* Notifications */}
            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                pressed && { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert('Notifications', 'Notification settings coming soon!');
              }}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🔔</Text>
                <Text style={[styles.settingLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  Notifications
                </Text>
              </View>
              <Text style={[styles.chevronRight, { color: isDark ? '#3A3A3C' : '#C6C6C8' }]}>›</Text>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: isDark ? '#38383A' : '#C6C6C8', marginLeft: 52 }]} />

            {/* Storage */}
            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                pressed && { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert('Storage', 'Storage management coming soon!');
              }}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>💾</Text>
                <Text style={[styles.settingLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  Storage
                </Text>
              </View>
              <Text style={[styles.chevronRight, { color: isDark ? '#3A3A3C' : '#C6C6C8' }]}>›</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Help & Support */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <View style={[styles.settingsGroup, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                pressed && { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert('Help', 'Help center coming soon!');
              }}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>❓</Text>
                <Text style={[styles.settingLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  Help
                </Text>
              </View>
              <Text style={[styles.chevronRight, { color: isDark ? '#3A3A3C' : '#C6C6C8' }]}>›</Text>
            </Pressable>

            <View style={[styles.divider, { backgroundColor: isDark ? '#38383A' : '#C6C6C8', marginLeft: 52 }]} />

            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                pressed && { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert('Invite Friends', 'Invite feature coming soon!');
              }}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>💌</Text>
                <Text style={[styles.settingLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  Invite a friend
                </Text>
              </View>
              <Text style={[styles.chevronRight, { color: isDark ? '#3A3A3C' : '#C6C6C8' }]}>›</Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Sign Out */}
        <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.section}>
          <View style={[styles.settingsGroup, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
            <Pressable
              style={({ pressed }) => [
                styles.settingRow,
                pressed && { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' },
              ]}
              onPress={handleSignOut}
            >
              <Text style={[styles.signOutLabel, { color: '#FF3B30' }]}>
                Sign Out
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
          <BlurView
            intensity={isDark ? 80 : 100}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}
          >
            <View style={styles.modalHeaderContent}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowEditModal(false);
                }}
                style={styles.modalButton}
                disabled={updating}
              >
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Profile
              </Text>
              <TouchableOpacity
                onPress={handleSaveProfile}
                style={styles.modalButton}
                disabled={updating}
              >
                <Text style={[styles.modalDone, { fontWeight: '600', opacity: updating ? 0.5 : 1 }]}>
                  {updating ? 'Saving...' : 'Done'}
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ paddingTop: 24, paddingBottom: insets.bottom + 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <View style={[styles.avatarLarge, { backgroundColor: '#007AFF' }]}>
                <Text style={styles.avatarLargeText}>{getInitials()}</Text>
              </View>
            </View>

            {/* Name Input */}
            <View style={[styles.formRow, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
              <Text style={[styles.formLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Name
              </Text>
              <TextInput
                style={[styles.formInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
                placeholderTextColor={isDark ? '#48484A' : '#C6C6C8'}
                autoCapitalize="words"
                returnKeyType="next"
                editable={!updating}
              />
            </View>

            <View style={[styles.formDivider, { backgroundColor: isDark ? '#38383A' : '#C6C6C8' }]} />

            {/* Bio Input */}
            <View style={[styles.formRow, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
              <Text style={[styles.formLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Bio
              </Text>
              <TextInput
                style={[styles.formInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Hey there! I am using Task Manager"
                placeholderTextColor={isDark ? '#48484A' : '#C6C6C8'}
                multiline
                maxLength={140}
                editable={!updating}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Account Information Modal */}
      <Modal
        visible={showAccountModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAccountModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
          <BlurView
            intensity={isDark ? 80 : 100}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}
          >
            <View style={styles.modalHeaderContent}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsEditingAccount(false);
                  setShowAccountModal(false);
                }}
                style={styles.modalButton}
                disabled={updating}
              >
                <Text style={styles.modalCancel}>Close</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Account
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (isEditingAccount) {
                    handleSaveAccountInfo();
                  } else {
                    setIsEditingAccount(true);
                  }
                }}
                style={styles.modalButton}
                disabled={updating}
              >
                <Text style={[styles.modalDone, { fontWeight: '600', opacity: updating ? 0.5 : 1 }]}>
                  {updating ? 'Saving...' : isEditingAccount ? 'Save' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ paddingTop: 24, paddingBottom: insets.bottom + 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Personal Information Section */}
            <View style={styles.accountSection}>
              <Text style={[styles.sectionHeader, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
                PERSONAL INFORMATION
              </Text>
              <View style={[styles.settingsGroup, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Name
                  </Text>
                  <Text style={[styles.infoValue, { color: isDark ? '#8E8E93' : '#8E8E93' }]} numberOfLines={1}>
                    {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Not set'}
                  </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: isDark ? '#38383A' : '#C6C6C8', marginLeft: 16 }]} />

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Email
                  </Text>
                  <Text style={[styles.infoValue, { color: isDark ? '#8E8E93' : '#8E8E93' }]} numberOfLines={1}>
                    {user?.email || 'Not set'}
                  </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: isDark ? '#38383A' : '#C6C6C8', marginLeft: 16 }]} />

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    User ID
                  </Text>
                  <Text style={[styles.infoValue, { color: isDark ? '#8E8E93' : '#8E8E93' }]} numberOfLines={1}>
                    {user?.id?.slice(0, 12)}...
                  </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: isDark ? '#38383A' : '#C6C6C8', marginLeft: 16 }]} />

                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    Member Since
                  </Text>
                  <Text style={[styles.infoValue, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                    {new Date(user?.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            </View>

            {/* Professional Information Section */}
            <View style={styles.accountSection}>
              <Text style={[styles.sectionHeader, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
                PROFESSIONAL INFORMATION
              </Text>
              <View style={[styles.settingsGroup, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                {isEditingAccount ? (
                  <>
                    {/* Editable Role */}
                    <View style={[styles.formRow, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                      <Text style={[styles.formLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Role *
                      </Text>
                      <TextInput
                        style={[styles.formInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
                        value={editRole}
                        onChangeText={setEditRole}
                        placeholder="e.g. Developer, Designer, Manager"
                        placeholderTextColor={isDark ? '#48484A' : '#C6C6C8'}
                        autoCapitalize="words"
                        editable={!updating}
                      />
                    </View>

                    <View style={[styles.formDivider, { backgroundColor: isDark ? '#38383A' : '#C6C6C8' }]} />

                    {/* Editable Organization */}
                    <View style={[styles.formRow, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                      <Text style={[styles.formLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Organization
                      </Text>
                      <TextInput
                        style={[styles.formInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
                        value={editOrganization}
                        onChangeText={setEditOrganization}
                        placeholder="Your organization name"
                        placeholderTextColor={isDark ? '#48484A' : '#C6C6C8'}
                        autoCapitalize="words"
                        editable={!updating}
                      />
                    </View>

                    <View style={[styles.formDivider, { backgroundColor: isDark ? '#38383A' : '#C6C6C8' }]} />

                    {/* Editable Phone */}
                    <View style={[styles.formRow, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                      <Text style={[styles.formLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Phone Number
                      </Text>
                      <TextInput
                        style={[styles.formInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
                        value={editPhone}
                        onChangeText={setEditPhone}
                        placeholder="+1 (555) 123-4567"
                        placeholderTextColor={isDark ? '#48484A' : '#C6C6C8'}
                        keyboardType="phone-pad"
                        editable={!updating}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    {/* Read-only Role */}
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Role
                      </Text>
                      <Text style={[styles.infoValue, { color: isDark ? '#8E8E93' : '#8E8E93' }]} numberOfLines={1}>
                        {user?.user_metadata?.role || 'Not set'}
                      </Text>
                    </View>

                    <View style={[styles.divider, { backgroundColor: isDark ? '#38383A' : '#C6C6C8', marginLeft: 16 }]} />

                    {/* Read-only Organization */}
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Organization
                      </Text>
                      <Text style={[styles.infoValue, { color: isDark ? '#8E8E93' : '#8E8E93' }]} numberOfLines={1}>
                        {user?.user_metadata?.organization || 'Not set'}
                      </Text>
                    </View>

                    <View style={[styles.divider, { backgroundColor: isDark ? '#38383A' : '#C6C6C8', marginLeft: 16 }]} />

                    {/* Read-only Phone */}
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        Phone Number
                      </Text>
                      <Text style={[styles.infoValue, { color: isDark ? '#8E8E93' : '#8E8E93' }]} numberOfLines={1}>
                        {user?.user_metadata?.phone_number || 'Not set'}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Privacy Settings Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
          <BlurView
            intensity={isDark ? 80 : 100}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.modalHeader, { paddingTop: insets.top + 8 }]}
          >
            <View style={styles.modalHeaderContent}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPrivacyModal(false);
                }}
                style={styles.modalButton}
              >
                <Text style={styles.modalCancel}>Close</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Privacy & Security
              </Text>
              <View style={[styles.modalButton, { opacity: 0 }]}>
                <Text style={styles.modalDone}>Done</Text>
              </View>
            </View>
          </BlurView>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ paddingTop: 24, paddingBottom: insets.bottom + 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Security Section */}
            <View style={styles.accountSection}>
              <Text style={[styles.sectionHeader, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
                SECURITY
              </Text>
              <View style={[styles.settingsGroup, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                {/* App Lock Toggle */}
                <View style={styles.privacyRow}>
                  <View style={styles.privacyLeft}>
                    <Text style={[styles.privacyLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                      {biometricType === 'Face ID' ? 'Face ID Lock' : biometricType === 'Touch ID' ? 'Touch ID Lock' : 'App Lock'}
                    </Text>
                    <Text style={[styles.privacyDescription, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                      {isBiometricSupported 
                        ? Platform.OS === 'ios' 
                          ? `Require ${biometricType} to unlock app`
                          : 'Biometric authentication (iOS only for now)'
                        : 'Biometric authentication not available'}
                    </Text>
                  </View>
                  <Switch
                    value={isAppLockEnabled}
                    onValueChange={async (value) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (!isBiometricSupported && value) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        Alert.alert(
                          'Not Available',
                          Platform.OS === 'ios'
                            ? `${biometricType || 'Biometric authentication'} is not set up on this device. Please enable it in Settings.`
                            : 'Biometric authentication is currently only available on iOS. Android support coming soon!'
                        );
                        return;
                      }
                      const success = await toggleAppLock(value);
                      if (!success && value) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        Alert.alert('Failed', 'Could not enable app lock. Please try again.');
                      } else if (success) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }
                    }}
                    disabled={!isBiometricSupported || Platform.OS !== 'ios'}
                    trackColor={{ false: isDark ? '#39393D' : '#E5E5EA', true: '#34C759' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={isDark ? '#39393D' : '#E5E5EA'}
                  />
                </View>
              </View>
            </View>

            {/* Privacy Info Section */}
            <View style={styles.accountSection}>
              <Text style={[styles.sectionHeader, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
                ABOUT APP LOCK
              </Text>
              <View style={[styles.settingsGroup, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                <View style={[styles.formRow, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                  <Text style={[styles.privacyInfoText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                    {Platform.OS === 'ios' 
                      ? `When enabled, you'll need to authenticate with ${biometricType || 'biometrics'} every time you open the app or return from the background.`
                      : 'App Lock with biometric authentication is currently available on iOS only. We\'re working on bringing this feature to Android soon!'}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    zIndex: 100,
  },
  headerBlur: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60, 60, 67, 0.18)',
  },
  headerContent: {
    paddingTop: 8,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.374,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
  },
  notSignedInContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notSignedInText: {
    fontSize: 17,
    letterSpacing: -0.408,
  },

  // Profile Section
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.45,
  },
  profileBio: {
    fontSize: 15,
    letterSpacing: -0.24,
    lineHeight: 20,
  },
  chevronRight: {
    fontSize: 20,
    fontWeight: '400',
  },

  // Section Styling
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 8,
    marginLeft: 24,
    textTransform: 'uppercase',
    letterSpacing: -0.08,
  },

  // Settings Group (iOS grouped list style)
  settingsGroup: {
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 17,
    letterSpacing: -0.408,
  },
  settingValue: {
    fontSize: 17,
    letterSpacing: -0.408,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 50,
  },

  // Stats Row
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.408,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  infoLabel: {
    fontSize: 17,
    letterSpacing: -0.408,
  },
  infoValue: {
    fontSize: 17,
    letterSpacing: -0.408,
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },

  // Sign Out
  signOutLabel: {
    fontSize: 17,
    fontWeight: '400',
    textAlign: 'center',
    flex: 1,
    letterSpacing: -0.408,
  },

  // Version
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 13,
    letterSpacing: -0.08,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60, 60, 67, 0.18)',
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  modalButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 70,
  },
  modalCancel: {
    fontSize: 17,
    color: '#007AFF',
    letterSpacing: -0.408,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.408,
  },
  modalDone: {
    fontSize: 17,
    color: '#007AFF',
    textAlign: 'right',
    letterSpacing: -0.408,
  },
  modalContent: {
    flex: 1,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLargeText: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '700',
  },
  formRow: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  formLabel: {
    fontSize: 13,
    marginBottom: 8,
    opacity: 0.6,
  },
  formInput: {
    fontSize: 17,
    letterSpacing: -0.408,
    minHeight: 24,
  },
  formDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 20,
  },
  accountSection: {
    marginBottom: 32,
  },
  editButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.408,
  },

  // Privacy Modal Styles
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  privacyLeft: {
    flex: 1,
    marginRight: 16,
  },
  privacyLabel: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.408,
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 13,
    letterSpacing: -0.08,
    lineHeight: 18,
  },
  privacyInfoText: {
    fontSize: 13,
    letterSpacing: -0.08,
    lineHeight: 18,
  },
});
