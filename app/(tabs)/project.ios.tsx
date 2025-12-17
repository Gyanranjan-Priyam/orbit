import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { Project } from '@/types/project';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
   Alert,
   Modal,
   Pressable,
   ScrollView,
   StyleSheet,
   Text,
   TextInput,
   TouchableOpacity,
   View
} from 'react-native';
import Animated, {
   FadeInDown,
   FadeInUp,
   Layout
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PROJECT_COLORS = [
  '#FF3B30', // Red
  '#FF9500', // Orange
  '#FFCC00', // Yellow
  '#34C759', // Green
  '#00C7BE', // Teal
  '#30B0C7', // Cyan
  '#32ADE6', // Light Blue
  '#007AFF', // Blue
  '#5856D6', // Indigo
  '#AF52DE', // Purple
  '#FF2D55', // Pink
  '#A2845E', // Brown
];

export default function ProjectScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0]);
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

    // Get current user ID for filtering
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
          // Filter to only show current user's projects
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
      setSelectedColor(PROJECT_COLORS[0]);
    } catch (error: any) {
      console.error('Error creating project:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create project');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
      {/* Large Title Header - iOS Style */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <BlurView
          intensity={isDark ? 80 : 100}
          tint={isDark ? 'dark' : 'light'}
          style={styles.headerBlur}
        >
          <View style={styles.headerContent}>
            <Text style={[styles.largeTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Projects
            </Text>
          </View>
        </BlurView>
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
            <Text style={{ color: isDark ? '#8E8E93' : '#8E8E93', fontSize: 17 }}>
              Loading...
            </Text>
          </View>
        ) : projects.length === 0 ? (
          <Animated.View
            entering={FadeInUp.springify()}
            style={styles.emptyState}
          >
            <View style={[
              styles.emptyIconContainer,
              { backgroundColor: isDark ? 'rgba(120, 120, 128, 0.16)' : 'rgba(120, 120, 128, 0.12)' }
            ]}>
              <Text style={styles.emptyIcon}>📁</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              No Projects Yet
            </Text>
            <Text style={[styles.emptyText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
              Tap the + button to create your first project
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.projectsGrid}>
            {projects.map((project, index) => (
              <Animated.View
                key={project.id}
                entering={FadeInDown.delay(index * 50).springify()}
                layout={Layout.springify()}
                style={styles.projectCardWrapper}
              >
                <Link href={`/project/${project.id}` as any} asChild>
                  <Pressable
                    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    style={({ pressed }) => [
                      styles.projectCardPressable,
                      pressed && styles.projectCardPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.projectCard,
                        {
                          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                          shadowColor: isDark ? '#000' : '#000',
                          shadowOpacity: isDark ? 0.5 : 0.1,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.projectIconLarge,
                          { backgroundColor: project.color || selectedColor },
                        ]}
                      >
                        <Text style={styles.projectIconTextLarge}>
                          {project.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      
                      <View style={styles.projectDetails}>
                        <Text
                          style={[
                            styles.projectName,
                            { color: isDark ? '#FFFFFF' : '#000000' },
                          ]}
                          numberOfLines={1}
                        >
                          {project.name}
                        </Text>
                        
                        {project.description && (
                          <Text
                            style={[
                              styles.projectDescription,
                              { color: isDark ? '#8E8E93' : '#8E8E93' },
                            ]}
                            numberOfLines={2}
                          >
                            {project.description}
                          </Text>
                        )}
                        
                        <View style={styles.projectFooter}>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor:
                                  project.status === 'active'
                                    ? isDark ? 'rgba(52, 199, 89, 0.18)' : 'rgba(52, 199, 89, 0.15)'
                                    : isDark ? 'rgba(142, 142, 147, 0.18)' : 'rgba(142, 142, 147, 0.15)',
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.statusDot,
                                {
                                  backgroundColor:
                                    project.status === 'active' ? '#34C759' : '#8E8E93',
                                },
                              ]}
                            />
                            <Text
                              style={[
                                styles.statusText,
                                {
                                  color:
                                    project.status === 'active'
                                      ? '#34C759'
                                      : '#8E8E93',
                                },
                              ]}
                            >
                              {project.status}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.chevronContainer}>
                        <Text style={[styles.chevron, { color: isDark ? '#3A3A3C' : '#C6C6C8' }]}>
                          ›
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                </Link>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button - iOS Style */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + 80 }]}>
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: '#007AFF',
              shadowColor: '#007AFF',
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowCreateModal(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Create Project Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
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
                  setShowCreateModal(false);
                }}
                style={styles.modalButton}
              >
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                New Project
              </Text>
              <TouchableOpacity
                onPress={createProject}
                style={styles.modalButton}
              >
                <Text style={[styles.modalDone, { fontWeight: '600' }]}>Create</Text>
              </TouchableOpacity>
            </View>
          </BlurView>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Project Name */}
            <View style={styles.formSection}>
              <Text style={[styles.sectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
                PROJECT NAME
              </Text>
              <View
                style={[
                  styles.inputGroup,
                  {
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: isDark ? '#FFFFFF' : '#000000' }]}
                  value={newProjectName}
                  onChangeText={setNewProjectName}
                  placeholder="My Awesome Project"
                  placeholderTextColor={isDark ? '#48484A' : '#C6C6C8'}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Description */}
            <View style={styles.formSection}>
              <Text style={[styles.sectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
                DESCRIPTION (OPTIONAL)
              </Text>
              <View
                style={[
                  styles.inputGroup,
                  {
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    { color: isDark ? '#FFFFFF' : '#000000' },
                  ]}
                  value={newProjectDescription}
                  onChangeText={setNewProjectDescription}
                  placeholder="Add a description..."
                  placeholderTextColor={isDark ? '#48484A' : '#C6C6C8'}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Color Picker */}
            <View style={styles.formSection}>
              <Text style={[styles.sectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
                COLOR
              </Text>
              <View
                style={[
                  styles.colorPickerContainer,
                  {
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  },
                ]}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.colorScrollContent}
                >
                  {PROJECT_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedColor(color);
                      }}
                      style={styles.colorOptionWrapper}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          selectedColor === color && {
                            transform: [{ scale: 1.15 }],
                            borderWidth: 3,
                            borderColor: isDark ? '#FFFFFF' : '#FFFFFF',
                          },
                        ]}
                      >
                        {selectedColor === color && (
                          <Text style={styles.colorCheckmark}>✓</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Preview */}
            <View style={styles.formSection}>
              <Text style={[styles.sectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
                PREVIEW
              </Text>
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  },
                ]}
              >
                <View
                  style={[
                    styles.previewIcon,
                    { backgroundColor: selectedColor },
                  ]}
                >
                  <Text style={styles.previewIconText}>
                    {newProjectName ? newProjectName.charAt(0).toUpperCase() : 'P'}
                  </Text>
                </View>
                <View style={styles.previewDetails}>
                  <Text
                    style={[
                      styles.previewName,
                      { color: isDark ? '#FFFFFF' : '#000000' },
                    ]}
                    numberOfLines={1}
                  >
                    {newProjectName || 'Project Name'}
                  </Text>
                  {newProjectDescription && (
                    <Text
                      style={[
                        styles.previewDescription,
                        { color: isDark ? '#8E8E93' : '#8E8E93' },
                      ]}
                      numberOfLines={2}
                    >
                      {newProjectDescription}
                    </Text>
                  )}
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
  // Header Styles
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
  
  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  
  // Loading & Empty States
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.352,
  },
  emptyText: {
    fontSize: 17,
    lineHeight: 22,
    textAlign: 'center',
    letterSpacing: -0.408,
  },
  
  // Project Cards
  projectsGrid: {
    gap: 12,
  },
  projectCardWrapper: {
    marginBottom: 0,
  },
  projectCardPressable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  projectCardPressed: {
    opacity: 0.6,
  },
  projectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60, 60, 67, 0.12)',
  },
  projectIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  projectIconTextLarge: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  projectDetails: {
    flex: 1,
  },
  projectName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.408,
  },
  projectDescription: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 8,
    letterSpacing: -0.24,
  },
  projectFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
    letterSpacing: -0.08,
  },
  chevronContainer: {
    marginLeft: 8,
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 24,
    fontWeight: '400',
  },
  
  // Floating Action Button
  fabContainer: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -2,
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
  
  // Form Sections
  formSection: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '400',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: -0.08,
  },
  inputGroup: {
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
  textArea: {
    height: 100,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  
  // Color Picker
  colorPickerContainer: {
    borderRadius: 12,
    paddingVertical: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  colorScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  colorOptionWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  colorCheckmark: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  
  // Preview Card
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  previewIconText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  previewDetails: {
    flex: 1,
  },
  previewName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.408,
  },
  previewDescription: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.24,
  },
});
