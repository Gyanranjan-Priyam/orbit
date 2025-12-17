import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
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

  useEffect(() => {
    loadUserData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: editName.trim(),
          bio: editBio.trim() || null,
        },
      });

      if (error) throw error;
      if (data.user) setUser(data.user);

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
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const getInitials = () => {
    const name =
      user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <View style={styles.centerContent}>
          <MaterialIcons name="lock-outline" size={48} color={isDark ? '#333' : '#CCC'} />
          <Text style={[styles.messageText, { color: isDark ? '#B3B3B3' : '#757575' }]}>
            Please sign in to access settings
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 20,
            backgroundColor: isDark ? '#121212' : '#F5F5F5',
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          Settings
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Pressable
            onPress={handleEditProfile}
            style={({ pressed }) => [
              styles.profileCard,
              { 
                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={styles.profileHeader}>
              <View style={[styles.avatar, { backgroundColor: isDark ? '#BB86FC' : '#6200EE' }]}>
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  {user?.user_metadata?.full_name || user?.user_metadata?.name || 'User'}
                </Text>
                <Text style={[styles.profileEmail, { color: isDark ? '#B3B3B3' : '#757575' }]}>
                  {user?.email}
                </Text>
              </View>
              <View style={[styles.editButton, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]}>
                <MaterialIcons name="edit" size={20} color={isDark ? '#FFF' : '#000'} />
              </View>
            </View>
            {user?.user_metadata?.bio && (
              <Text style={[styles.profileBio, { color: isDark ? '#B3B3B3' : '#757575' }]}>
                {user?.user_metadata?.bio}
              </Text>
            )}
          </Pressable>
        </Animated.View>

        {/* Settings Groups */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#BB86FC' : '#6200EE' }]}>ACCOUNT</Text>
          <View style={[styles.card, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
            <SettingItem
              icon="person-outline"
              label="Personal Information"
              onPress={() => setShowAccountModal(true)}
              isDark={isDark}
            />
            <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]} />
            <SettingItem
              icon="lock-outline"
              label="Privacy & Security"
              onPress={() => Alert.alert('Coming Soon')}
              isDark={isDark}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#BB86FC' : '#6200EE' }]}>PREFERENCES</Text>
          <View style={[styles.card, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
            <SettingItem
              icon="notifications-none"
              label="Notifications"
              onPress={() => Alert.alert('Coming Soon')}
              isDark={isDark}
            />
            <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]} />
            <SettingItem
              icon="language"
              label="Language"
              value="English"
              onPress={() => Alert.alert('Coming Soon')}
              isDark={isDark}
            />
            <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]} />
            <SettingItem
              icon="dark-mode"
              label="Appearance"
              value={isDark ? 'Dark' : 'Light'}
              onPress={() => Alert.alert('Coming Soon', 'Theme follows system settings')}
              isDark={isDark}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#BB86FC' : '#6200EE' }]}>SUPPORT</Text>
          <View style={[styles.card, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF' }]}>
            <SettingItem
              icon="help-outline"
              label="Help Center"
              onPress={() => Alert.alert('Coming Soon')}
              isDark={isDark}
            />
            <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]} />
            <SettingItem
              icon="info-outline"
              label="About"
              onPress={() => Alert.alert('About', 'Version 1.0.0')}
              isDark={isDark}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: '#FFEBEE' }]}
          onPress={handleSignOut}
        >
          <MaterialIcons name="logout" size={20} color="#D32F2F" />
          <Text style={[styles.signOutText, { color: '#D32F2F' }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: isDark ? '#666' : '#999' }]}>
          Version 1.0.0 (Build 100)
        </Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.bottomSheet, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.bottomSheetHeader}>
              <Text style={[styles.bottomSheetTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>Edit Profile</Text>
              <TouchableOpacity 
                onPress={() => setShowEditModal(false)}
                style={[styles.closeButton, { backgroundColor: isDark ? '#2C2C2C' : '#F0F0F0' }]}
              >
                <MaterialIcons name="close" size={20} color={isDark ? '#FFF' : '#000'} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>FULL NAME</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#FFF' : '#000', backgroundColor: isDark ? '#2C2C2C' : '#F9F9F9', borderColor: isDark ? '#333' : '#E0E0E0' }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your name"
                  placeholderTextColor={isDark ? '#666' : '#999'}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>BIO</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#FFF' : '#000', backgroundColor: isDark ? '#2C2C2C' : '#F9F9F9', borderColor: isDark ? '#333' : '#E0E0E0', height: 100, textAlignVertical: 'top' }]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Tell us about yourself"
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  multiline
                />
              </View>

              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={updating}
                style={[styles.primaryButton, { backgroundColor: isDark ? '#BB86FC' : '#6200EE', opacity: updating ? 0.7 : 1 }]}
              >
                <Text style={styles.primaryButtonText}>{updating ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Account Modal */}
      <Modal
        visible={showAccountModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAccountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.bottomSheet, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.bottomSheetHeader}>
              <Text style={[styles.bottomSheetTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>Account Details</Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowAccountModal(false);
                  setIsEditingAccount(false);
                }}
                style={[styles.closeButton, { backgroundColor: isDark ? '#2C2C2C' : '#F0F0F0' }]}
              >
                <MaterialIcons name="close" size={20} color={isDark ? '#FFF' : '#000'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>EMAIL</Text>
                <View style={[styles.readOnlyInput, { backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5' }]}>
                  <Text style={{ color: isDark ? '#AAA' : '#666' }}>{user?.email}</Text>
                  <MaterialIcons name="lock" size={16} color={isDark ? '#666' : '#999'} />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>ROLE</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#FFF' : '#000', backgroundColor: isDark ? '#2C2C2C' : '#F9F9F9', borderColor: isDark ? '#333' : '#E0E0E0' }]}
                  value={editRole}
                  onChangeText={setEditRole}
                  placeholder="e.g. Developer"
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  editable={isEditingAccount}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>ORGANIZATION</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#FFF' : '#000', backgroundColor: isDark ? '#2C2C2C' : '#F9F9F9', borderColor: isDark ? '#333' : '#E0E0E0' }]}
                  value={editOrganization}
                  onChangeText={setEditOrganization}
                  placeholder="Your organization"
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  editable={isEditingAccount}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>PHONE</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#FFF' : '#000', backgroundColor: isDark ? '#2C2C2C' : '#F9F9F9', borderColor: isDark ? '#333' : '#E0E0E0' }]}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="+1 234 567 8900"
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  keyboardType="phone-pad"
                  editable={isEditingAccount}
                />
              </View>

              <TouchableOpacity
                onPress={() => {
                  if (isEditingAccount) {
                    handleSaveAccountInfo();
                  } else {
                    setIsEditingAccount(true);
                  }
                }}
                disabled={updating}
                style={[styles.primaryButton, { backgroundColor: isDark ? '#BB86FC' : '#6200EE', opacity: updating ? 0.7 : 1 }]}
              >
                <Text style={styles.primaryButtonText}>
                  {updating ? 'Saving...' : isEditingAccount ? 'Save Changes' : 'Edit Details'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SettingItem({ icon, label, value, onPress, isDark }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingItem,
        { backgroundColor: pressed ? (isDark ? '#2C2C2C' : '#F5F5F5') : 'transparent' }
      ]}
    >
      <View style={[styles.settingIcon, { backgroundColor: isDark ? '#333' : '#F0F0F0' }]}>
        <MaterialIcons name={icon} size={20} color={isDark ? '#FFF' : '#000'} />
      </View>
      <Text style={[styles.settingLabel, { color: isDark ? '#FFF' : '#000' }]}>{label}</Text>
      {value && <Text style={[styles.settingValue, { color: isDark ? '#AAA' : '#666' }]}>{value}</Text>}
      <MaterialIcons name="chevron-right" size={20} color={isDark ? '#666' : '#CCC'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  messageText: {
    fontSize: 16,
  },
  profileCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBio: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 14,
    marginRight: 4,
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
    marginBottom: 24,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  readOnlyInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
