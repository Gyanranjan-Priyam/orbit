import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
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
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    loadMembers();

    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => loadMembers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUser(user);
      const currentOrg = user.user_metadata?.organization;
      if (!currentOrg) {
        setMembers([]);
        return;
      }

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, phone_number, created_at')
        .eq('organization', currentOrg)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mappedMembers: Member[] = (profiles || []).map((profile) => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name || profile.email.split('@')[0] || 'Unknown',
        role: profile.role || 'Member',
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

  const filteredMembers = members.filter(
    (member) =>
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (id: string) => {
    const colors = [
      '#F44336',
      '#E91E63',
      '#9C27B0',
      '#673AB7',
      '#3F51B5',
      '#2196F3',
      '#03A9F4',
      '#00BCD4',
      '#009688',
      '#4CAF50',
      '#8BC34A',
      '#CDDC39',
      '#FFEB3B',
      '#FFC107',
      '#FF9800',
      '#FF5722',
    ];
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#121212' : '#F5F5F5' }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#BB86FC' : '#6200EE'} />
          <Text style={[styles.loadingText, { color: isDark ? '#B3B3B3' : '#757575' }]}>
            Loading team...
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
        <View>
          <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Team
          </Text>
          <Text style={[styles.headerSubtitle, { color: isDark ? '#B3B3B3' : '#757575' }]}>
            {currentUser?.user_metadata?.organization || 'No Organization'}
          </Text>
        </View>
        <View style={[styles.memberCountBadge, { backgroundColor: isDark ? '#2C2C2C' : '#E0E0E0' }]}>
          <MaterialIcons name="people" size={16} color={isDark ? '#BB86FC' : '#6200EE'} />
          <Text style={[styles.memberCountText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            {members.length}
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBar,
            { 
              backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
              borderColor: isDark ? '#333' : '#E0E0E0',
              borderWidth: 1,
            },
          ]}
        >
          <MaterialIcons name="search" size={20} color={isDark ? '#757575' : '#9E9E9E'} />
          <TextInput
            style={[styles.searchInput, { color: isDark ? '#FFFFFF' : '#000000' }]}
            placeholder="Search by name, email, or role..."
            placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <MaterialIcons name="close" size={16} color={isDark ? '#757575' : '#9E9E9E'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDark ? '#BB86FC' : '#6200EE']}
            tintColor={isDark ? '#BB86FC' : '#6200EE'}
          />
        }
      >
        {filteredMembers.length === 0 ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.emptyState}>
            <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? '#2C2C2C' : '#E0E0E0' }]}>
              <MaterialIcons name="person-search" size={48} color={isDark ? '#B3B3B3' : '#757575'} />
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              No Members Found
            </Text>
            <Text style={[styles.emptyMessage, { color: isDark ? '#B3B3B3' : '#757575' }]}>
              We couldn't find anyone matching "{searchQuery}"
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.grid}>
            {filteredMembers.map((member, index) => (
              <Animated.View 
                key={member.id} 
                entering={FadeInDown.delay(index * 50).springify()}
                layout={Layout.springify()}
              >
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedMember(member);
                  }}
                  style={({ pressed }) => [
                    styles.card,
                    { 
                      backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    }
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: getAvatarColor(member.id) },
                      ]}
                    >
                      <Text style={styles.avatarText}>{getInitials(member.full_name)}</Text>
                    </View>
                    {member.id === currentUser?.id && (
                      <View style={[styles.badge, { backgroundColor: isDark ? '#BB86FC' : '#6200EE' }]}>
                        <Text style={styles.badgeText}>YOU</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.cardContent}>
                    <Text style={[styles.memberName, { color: isDark ? '#FFFFFF' : '#000000' }]} numberOfLines={1}>
                      {member.full_name}
                    </Text>
                    <Text style={[styles.memberRole, { color: isDark ? '#BB86FC' : '#6200EE' }]}>
                      {member.role}
                    </Text>
                    <Text style={[styles.memberEmail, { color: isDark ? '#B3B3B3' : '#757575' }]} numberOfLines={1}>
                      {member.email}
                    </Text>
                  </View>

                  <View style={[styles.cardFooter, { borderTopColor: isDark ? '#333' : '#F0F0F0' }]}>
                    <Text style={[styles.joinedText, { color: isDark ? '#757575' : '#9E9E9E' }]}>
                      Joined {new Date(member.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Member Detail Modal */}
      <Modal
        visible={!!selectedMember}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedMember(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.bottomSheet, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', paddingBottom: insets.bottom + 20 }]}>
            {selectedMember && (
              <>
                <View style={styles.bottomSheetHeader}>
                  <View style={styles.dragHandle} />
                  <TouchableOpacity 
                    onPress={() => setSelectedMember(null)}
                    style={[styles.closeButton, { backgroundColor: isDark ? '#2C2C2C' : '#F0F0F0' }]}
                  >
                    <MaterialIcons name="close" size={20} color={isDark ? '#FFF' : '#000'} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalContent}>
                  <View style={[styles.modalAvatar, { backgroundColor: getAvatarColor(selectedMember.id) }]}>
                    <Text style={styles.modalAvatarText}>{getInitials(selectedMember.full_name)}</Text>
                  </View>
                  
                  <Text style={[styles.modalName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    {selectedMember.full_name}
                  </Text>
                  <Text style={[styles.modalRole, { color: isDark ? '#BB86FC' : '#6200EE' }]}>
                    {selectedMember.role}
                  </Text>

                  <View style={[styles.infoSection, { backgroundColor: isDark ? '#2C2C2C' : '#F9F9F9' }]}>
                    <View style={styles.infoRow}>
                      <View style={[styles.iconBox, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
                        <MaterialIcons name="email" size={20} color={isDark ? '#B3B3B3' : '#757575'} />
                      </View>
                      <View style={styles.infoTextContainer}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#B3B3B3' : '#757575' }]}>Email</Text>
                        <Text style={[styles.infoValue, { color: isDark ? '#FFFFFF' : '#000000' }]}>{selectedMember.email}</Text>
                      </View>
                    </View>

                    {selectedMember.phone_number && (
                      <>
                        <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
                        <View style={styles.infoRow}>
                          <View style={[styles.iconBox, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
                            <MaterialIcons name="phone" size={20} color={isDark ? '#B3B3B3' : '#757575'} />
                          </View>
                          <View style={styles.infoTextContainer}>
                            <Text style={[styles.infoLabel, { color: isDark ? '#B3B3B3' : '#757575' }]}>Phone</Text>
                            <Text style={[styles.infoValue, { color: isDark ? '#FFFFFF' : '#000000' }]}>{selectedMember.phone_number}</Text>
                          </View>
                        </View>
                      </>
                    )}

                    <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]} />
                    <View style={styles.infoRow}>
                      <View style={[styles.iconBox, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
                        <MaterialIcons name="calendar-today" size={20} color={isDark ? '#B3B3B3' : '#757575'} />
                      </View>
                      <View style={styles.infoTextContainer}>
                        <Text style={[styles.infoLabel, { color: isDark ? '#B3B3B3' : '#757575' }]}>Joined</Text>
                        <Text style={[styles.infoValue, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                          {new Date(selectedMember.created_at).toLocaleDateString(undefined, { dateStyle: 'full' })}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: isDark ? '#BB86FC' : '#6200EE' }]}
                    onPress={() => {
                      // Implement chat or other action
                      Alert.alert('Coming Soon', 'Direct messaging will be available soon!');
                    }}
                  >
                    <MaterialIcons name="chat" size={20} color="#FFF" />
                    <Text style={styles.actionButtonText}>Send Message</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  memberCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  memberCountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  grid: {
    gap: 16,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardContent: {
    marginBottom: 16,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
  },
  cardFooter: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
  joinedText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
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
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(128,128,128,0.4)',
    borderRadius: 2,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: 24,
    alignItems: 'center',
  },
  modalAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalAvatarText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
  },
  modalName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalRole: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 32,
  },
  infoSection: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  actionButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

