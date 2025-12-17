import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { Project } from '@/types/project';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import Animated, {
    FadeInDown,
    FadeInUp,
    Layout,
    SlideInDown
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PROJECT_COLORS = [
  '#F44336', // Material Red
  '#E91E63', // Pink
  '#9C27B0', // Purple
  '#673AB7', // Deep Purple
  '#3F51B5', // Indigo
  '#2196F3', // Blue
  '#03A9F4', // Light Blue
  '#00BCD4', // Cyan
  '#009688', // Teal
  '#4CAF50', // Green
  '#8BC34A', // Light Green
  '#FFC107', // Amber
  '#FF9800', // Orange
  '#FF5722', // Deep Orange
  '#795548', // Brown
  '#607D8B', // Blue Grey
];

export default function ProjectScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[5]); // Default to Blue
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  const isDark = colorScheme === 'dark';

  useEffect(() => {
    fetchProjects();
    const cleanup = subscribeToProjects();
    return cleanup;
  }, []);

  const fetchProjects = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToProjects = () => {
    let userId: string | null = null;

    supabase.auth.getUser().then(({ data }) => {
      userId = data.user?.id || null;
    });

    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
        },
        (payload) => {
          const projectData = (payload.new || payload.old) as any;
          if (userId && projectData && projectData.user_id !== userId) {
            return;
          }

          if (payload.eventType === 'INSERT') {
            setProjects((prev) => [payload.new as Project, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setProjects((prev) =>
              prev.map((p) =>
                p.id === payload.new.id ? (payload.new as Project) : p
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setProjects((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createProject = async () => {
    if (!newProjectName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please enter a project name');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create a project');
        return;
      }

      const { error } = await supabase.from('projects').insert({
        user_id: user.id,
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || null,
        color: selectedColor,
        status: 'active',
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDescription('');
      setSelectedColor(PROJECT_COLORS[5]);
    } catch (error: any) {
      console.error('Error creating project:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create project');
    }
  };

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
            Projects
          </Text>
          <Text style={[styles.headerSubtitle, { color: isDark ? '#B3B3B3' : '#757575' }]}>
            {projects.length} Active Projects
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.iconButton, { backgroundColor: isDark ? '#2C2C2C' : '#E0E0E0' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Add search or filter functionality here later
          }}
        >
          <MaterialIcons name="search" size={24} color={isDark ? '#FFF' : '#000'} />
        </TouchableOpacity>
      </View>

      {/* Projects List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingState}>
            <MaterialIcons name="hourglass-empty" size={48} color={isDark ? '#333' : '#CCC'} />
            <Text style={[styles.loadingText, { color: isDark ? '#B3B3B3' : '#757575' }]}>
              Loading projects...
            </Text>
          </View>
        ) : projects.length === 0 ? (
          <Animated.View entering={FadeInUp.springify()} style={styles.emptyState}>
            <View
              style={[
                styles.emptyIconContainer,
                { backgroundColor: isDark ? '#2C2C2C' : '#E0E0E0' },
              ]}
            >
              <MaterialIcons name="folder-open" size={48} color={isDark ? '#B3B3B3' : '#757575'} />
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              No Projects Yet
            </Text>
            <Text style={[styles.emptyText, { color: isDark ? '#B3B3B3' : '#757575' }]}>
              Create your first project to start tracking tasks and collaborating with your team.
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.projectsList}>
            {projects.map((project, index) => (
              <Animated.View
                key={project.id}
                entering={FadeInDown.delay(index * 50).springify()}
                layout={Layout.springify()}
              >
                <Link href={`/project/${project.id}` as any} asChild>
                  <Pressable
                    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    style={({ pressed }) => [
                      styles.projectCard,
                      {
                        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                    ]}
                  >
                    <View style={[styles.cardHeader, { borderBottomColor: isDark ? '#333' : '#F0F0F0' }]}>
                      <View style={[styles.projectIcon, { backgroundColor: project.color || selectedColor }]}>
                        <Text style={styles.projectIconText}>
                          {project.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.headerInfo}>
                        <Text
                          style={[
                            styles.projectName,
                            { color: isDark ? '#FFFFFF' : '#000000' },
                          ]}
                          numberOfLines={1}
                        >
                          {project.name}
                        </Text>
                        <Text style={[styles.projectDate, { color: isDark ? '#888' : '#999' }]}>
                          Updated {new Date(project.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={24} color={isDark ? '#666' : '#CCC'} />
                    </View>

                    <View style={styles.cardBody}>
                      {project.description ? (
                        <Text
                          style={[
                            styles.projectDescription,
                            { color: isDark ? '#B3B3B3' : '#666666' },
                          ]}
                          numberOfLines={2}
                        >
                          {project.description}
                        </Text>
                      ) : (
                        <Text style={[styles.projectDescription, { color: isDark ? '#555' : '#CCC', fontStyle: 'italic' }]}>
                          No description provided
                        </Text>
                      )}
                      
                      <View style={styles.projectMeta}>
                        <View style={[styles.metaItem, { backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5' }]}>
                          <MaterialIcons name="check-circle-outline" size={16} color={isDark ? '#AAA' : '#666'} />
                          <Text style={[styles.metaText, { color: isDark ? '#AAA' : '#666' }]}>
                            Active
                          </Text>
                        </View>
                        {/* Placeholder for member count if available later */}
                        <View style={[styles.metaItem, { backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5' }]}>
                          <MaterialIcons name="people-outline" size={16} color={isDark ? '#AAA' : '#666'} />
                          <Text style={[styles.metaText, { color: isDark ? '#AAA' : '#666' }]}>
                            Team
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </Link>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View 
        entering={SlideInDown.delay(300)}
        style={[styles.fabContainer, { bottom: insets.bottom + 100 }]}
      >
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: isDark ? '#BB86FC' : '#6200EE',
              shadowColor: isDark ? '#BB86FC' : '#6200EE',
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowCreateModal(true);
          }}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Create Project Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { 
                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                paddingBottom: insets.bottom + 20 
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                New Project
              </Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                style={[styles.closeButton, { backgroundColor: isDark ? '#2C2C2C' : '#F0F0F0' }]}
              >
                <MaterialIcons name="close" size={20} color={isDark ? '#FFF' : '#000'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>PROJECT NAME</Text>
                <TextInput
                  style={[
                    styles.input,
                    { 
                      color: isDark ? '#FFFFFF' : '#000000',
                      backgroundColor: isDark ? '#2C2C2C' : '#F9F9F9',
                      borderColor: isDark ? '#333' : '#E0E0E0'
                    }
                  ]}
                  value={newProjectName}
                  onChangeText={setNewProjectName}
                  placeholder="e.g. Mobile App Redesign"
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  autoFocus
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>DESCRIPTION</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    { 
                      color: isDark ? '#FFFFFF' : '#000000',
                      backgroundColor: isDark ? '#2C2C2C' : '#F9F9F9',
                      borderColor: isDark ? '#333' : '#E0E0E0'
                    }
                  ]}
                  value={newProjectDescription}
                  onChangeText={setNewProjectDescription}
                  placeholder="What is this project about?"
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>COLOR THEME</Text>
                <View style={styles.colorGrid}>
                  {PROJECT_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedColor(color);
                      }}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && styles.selectedColorOption
                      ]}
                    >
                      {selectedColor === color && (
                        <MaterialIcons name="check" size={16} color="#FFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                onPress={createProject}
                style={[
                  styles.createButton,
                  { backgroundColor: isDark ? '#BB86FC' : '#6200EE' }
                ]}
              >
                <Text style={styles.createButtonLabel}>Create Project</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#FFF" />
              </TouchableOpacity>
            </ScrollView>
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
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
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
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  projectsList: {
    gap: 16,
  },
  projectCard: {
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  projectIconText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  projectDate: {
    fontSize: 12,
  },
  cardBody: {
    padding: 16,
  },
  projectDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  projectMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    right: 24,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    marginBottom: 24,
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
  textArea: {
    minHeight: 100,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: '#FFF',
    elevation: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    gap: 8,
  },
  createButtonLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
