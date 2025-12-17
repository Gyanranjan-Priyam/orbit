import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Member {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone_number?: string;
  created_at: string;
}

export default function MembersScreen() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    loadMembers();

    // Subscribe to profile changes for real-time updates
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          loadMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to view members');
        return;
      }

      setCurrentUser(user);
      const currentOrg = user.user_metadata?.organization;

      if (!currentOrg) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Fetch all profiles from the same organization
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, phone_number, created_at')
        .eq('organization', currentOrg)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching profiles:', error);
        Alert.alert('Error', 'Failed to load team members');
        setMembers([]);
        return;
      }

      // Map profiles to members format
      const mappedMembers: Member[] = (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name || profile.email.split('@')[0] || 'Unknown',
        role: profile.role || 'Not set',
        phone_number: profile.phone_number,
        created_at: profile.created_at,
      }));

      setMembers(mappedMembers);

    } catch (error: any) {
      console.error('Error loading members:', error);
      Alert.alert('Error', 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMembers();
    setRefreshing(false);
  };

  const filteredMembers = members.filter(member => 
    member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (id: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#FFD93D', '#6BCF7F', '#A78BFA', '#F472B6', '#FB923C'
    ];
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
        <BlurView
          intensity={80}
          tint={isDark ? 'dark' : 'light'}
          style={[styles.header, { paddingTop: insets.top }]}
        >
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Team Members
            </Text>
          </View>
        </BlurView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[styles.loadingText, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
            Loading members...
          </Text>
        </View>
      </View>
    );
  }

  if (!currentUser?.user_metadata?.organization) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
        <BlurView
          intensity={80}
          tint={isDark ? 'dark' : 'light'}
          style={[styles.header, { paddingTop: insets.top }]}
        >
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Team Members
            </Text>
          </View>
        </BlurView>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyIcon, { color: isDark ? '#3A3A3C' : '#C6C6C8' }]}>
            👥
          </Text>
          <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            No Organization Set
          </Text>
          <Text style={[styles.emptyMessage, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
            Please set your organization in Settings to view team members
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
      {/* Header with Glass Effect */}
      <BlurView
        intensity={80}
        tint={isDark ? 'dark' : 'light'}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Team Members
          </Text>
          <Text style={[styles.headerSubtitle, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
            {currentUser?.user_metadata?.organization}
          </Text>
        </View>
      </BlurView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
      >
        {/* Search Bar */}
        <Animated.View
          entering={FadeInDown.delay(100).springify()}
          style={styles.searchContainer}
        >
          <View style={[styles.searchBar, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
            <Text style={[styles.searchIcon, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
              🔍
            </Text>
            <TextInput
              style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
              placeholder="Search members..."
              placeholderTextColor={isDark ? '#48484A' : '#C6C6C8'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSearchQuery('');
                }}
              >
                <Text style={styles.clearButton}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Members Count */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.statsContainer}
        >
          <Text style={[styles.statsText, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
            {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
            {searchQuery ? ' found' : ''}
          </Text>
        </Animated.View>

        {/* Members List */}
        {filteredMembers.length === 0 ? (
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            style={styles.emptySearchContainer}
          >
            <Text style={[styles.emptyIcon, { color: isDark ? '#3A3A3C' : '#C6C6C8' }]}>
              🔍
            </Text>
            <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              No Members Found
            </Text>
            <Text style={[styles.emptyMessage, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
              Try adjusting your search
            </Text>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            style={[styles.membersGroup, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}
          >
            {filteredMembers.map((member, index) => (
              <View key={member.id}>
                <TouchableOpacity
                  style={styles.memberRow}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Alert.alert(
                      member.full_name,
                      `Email: ${member.email}\nRole: ${member.role}${member.phone_number ? `\nPhone: ${member.phone_number}` : ''}\nJoined: ${new Date(member.created_at).toLocaleDateString()}`
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: getAvatarColor(member.id) }
                    ]}
                  >
                    <Text style={styles.avatarText}>
                      {getInitials(member.full_name)}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberHeader}>
                      <Text style={[styles.memberName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        {member.full_name}
                        {member.id === currentUser?.id && (
                          <Text style={styles.youBadge}> (You)</Text>
                        )}
                      </Text>
                    </View>
                    <Text style={[styles.memberRole, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
                      {member.role}
                    </Text>
                    <Text style={[styles.memberEmail, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
                      {member.email}
                    </Text>
                  </View>
                  <Text style={[styles.chevron, { color: isDark ? '#3A3A3C' : '#C6C6C8' }]}>
                    ›
                  </Text>
                </TouchableOpacity>
                {index < filteredMembers.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: isDark ? '#38383A' : '#C6C6C8' }]} />
                )}
              </View>
            ))}
          </Animated.View>
        )}

        {/* Note about real-time updates */}
        <Animated.View
          entering={FadeInDown.delay(400).springify()}
          style={styles.noteContainer}
        >
          <Text style={[styles.noteText, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
            Team members are automatically synced when they update their profile information.
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60, 60, 67, 0.12)',
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.35,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  clearButton: {
    fontSize: 18,
    color: '#8E8E93',
    paddingHorizontal: 8,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  statsText: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  membersGroup: {
    marginHorizontal: 20,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 17,
    fontWeight: '600',
  },
  youBadge: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },
  memberRole: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    fontWeight: '400',
  },
  chevron: {
    fontSize: 24,
    fontWeight: '400',
    marginLeft: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 84,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptySearchContainer: {
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
  },
  noteContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  noteText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    textAlign: 'center',
  },
});
