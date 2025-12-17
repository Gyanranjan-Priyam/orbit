import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { Project } from '@/types/project';
import { BlurView } from 'expo-blur';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function ProjectDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  const isDark = colorScheme === 'dark';
  const isOwner = currentUser && project && currentUser.id === project.user_id;

  useEffect(() => {
    fetchProject();
    const unsubscribe = subscribeToProject();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id]);

  useEffect(() => {
    // Hide splash screen when loading is complete
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore errors if splash screen is already hidden
      });
    }
  }, [loading]);

  const fetchProject = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProject(data);
      setEditedName(data.name);
      setEditedDescription(data.description || '');
    } catch (error) {
      console.error('Error fetching project:', error);
      Alert.alert('Error', 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToProject = () => {
    const channel = supabase
      .channel(`project-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setProject(payload.new as Project);
            setEditedName(payload.new.name);
            setEditedDescription(payload.new.description || '');
          } else if (payload.eventType === 'DELETE') {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/project');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateProject = async () => {
    if (!isOwner) {
      Alert.alert('Permission Denied', 'Only the project owner can edit this project');
      return;
    }

    if (!editedName.trim()) {
      Alert.alert('Error', 'Project name cannot be empty');
      return;
    }

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: editedName.trim(),
          description: editedDescription.trim() || null,
        })
        .eq('id', id)
        .eq('user_id', currentUser.id);

      if (error) throw error;
      setEditing(false);
    } catch (error: any) {
      console.error('Error updating project:', error);
      Alert.alert('Error', error.message || 'Failed to update project');
    }
  };

  const deleteProject = async () => {
    if (!isOwner) {
      Alert.alert('Permission Denied', 'Only the project owner can delete this project');
      return;
    }

    Alert.alert(
      'Delete Project',
      'Are you sure you want to delete this project? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', id)
                .eq('user_id', currentUser.id);

              if (error) throw error;
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/project');
              }
            } catch (error: any) {
              console.error('Error deleting project:', error);
              Alert.alert('Error', error.message || 'Failed to delete project');
            }
          },
        },
      ]
    );
  };

  const toggleStatus = async () => {
    if (!project) return;

    if (!isOwner) {
      Alert.alert('Permission Denied', 'Only the project owner can change the status');
      return;
    }

    const newStatus =
      project.status === 'active'
        ? 'completed'
        : project.status === 'completed'
        ? 'archived'
        : 'active';

    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('user_id', currentUser.id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating status:', error);
      Alert.alert('Error', error.message || 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? '#000' : '#F5F5F5' }]}>
        <Text style={{ color: isDark ? '#FFF' : '#000' }}>Loading...</Text>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? '#000' : '#F5F5F5' }]}>
        <Text style={{ color: isDark ? '#FFF' : '#000' }}>Project not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#F5F5F5' }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTransparent: true,
          headerBlurEffect: isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight',
          headerTitle: '',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (editing) {
                  setEditing(false);
                  setEditedName(project?.name || '');
                  setEditedDescription(project?.description || '');
                } else {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/(tabs)/project');
                  }
                }
              }}
            >
              <Text style={[styles.headerButton, { color: '#007AFF' }]}>
                {editing ? 'Cancel' : '← Back'}
              </Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            isOwner ? (
              <TouchableOpacity
                onPress={() => {
                  if (editing) {
                    updateProject();
                  } else {
                    setEditing(true);
                  }
                }}
              >
                <Text style={[styles.headerButton, { color: '#007AFF' }]}>
                  {editing ? 'Done' : 'Edit'}
                </Text>
              </TouchableOpacity>
            ) : null
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
        ]}
      >
        <Animated.View entering={FadeIn}>
          {/* Project Header with Gradient */}
          <View style={styles.heroSection}>
            <BlurView
              intensity={80}
              tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
              style={styles.headerCard}
            >
              <View style={styles.iconRow}>
                <View
                  style={[
                    styles.projectIcon,
                    { backgroundColor: project.color || '#007AFF' },
                  ]}
                >
                  <Text style={styles.projectIconText}>
                    {project.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                
                <TouchableOpacity
                  onPress={toggleStatus}
                  style={[
                    styles.statusBadgeLarge,
                    {
                      backgroundColor:
                        project.status === 'active'
                          ? 'rgba(52, 199, 89, 0.2)'
                          : project.status === 'completed'
                          ? 'rgba(0, 122, 255, 0.2)'
                          : 'rgba(142, 142, 147, 0.2)',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusTextLarge,
                      {
                        color:
                          project.status === 'active'
                            ? '#34C759'
                            : project.status === 'completed'
                            ? '#007AFF'
                            : '#8E8E93',
                      },
                    ]}
                  >
                    {project.status === 'active' ? '● Active' : project.status === 'completed' ? '✓ Completed' : '◆ Archived'}
                  </Text>
                </TouchableOpacity>
              </View>

              {editing ? (
                <View style={styles.editForm}>
                  <BlurView
                    intensity={60}
                    tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
                    style={styles.inputContainer}
                  >
                    <TextInput
                      style={[styles.input, { color: isDark ? '#FFF' : '#000' }]}
                      value={editedName}
                      onChangeText={setEditedName}
                      placeholder="Project name"
                      placeholderTextColor={isDark ? '#8E8E93' : '#C6C6C8'}
                    />
                  </BlurView>
                  <BlurView
                    intensity={60}
                    tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
                    style={[styles.inputContainer, { marginTop: 12 }]}
                  >
                    <TextInput
                      style={[
                        styles.input,
                        styles.textArea,
                        { color: isDark ? '#FFF' : '#000' },
                      ]}
                      value={editedDescription}
                      onChangeText={setEditedDescription}
                      placeholder="Description"
                      placeholderTextColor={isDark ? '#8E8E93' : '#C6C6C8'}
                      multiline
                      numberOfLines={4}
                    />
                  </BlurView>
                </View>
              ) : (
                <View style={styles.projectHeader}>
                  <Text
                    style={[styles.projectName, { color: isDark ? '#FFF' : '#000' }]}
                  >
                    {project.name}
                  </Text>
                  {project.description && (
                    <Text
                      style={[
                        styles.projectDescription,
                        { color: isDark ? '#8E8E93' : '#666' },
                      ]}
                    >
                      {project.description}
                    </Text>
                  )}
                </View>
              )}
            </BlurView>
          </View>

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <BlurView
              intensity={80}
              tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
              style={styles.statCard}
            >
              <Text style={styles.statEmoji}>📅</Text>
              <Text style={[styles.statCardLabel, { color: isDark ? '#8E8E93' : '#666' }]}>
                Created
              </Text>
              <Text style={[styles.statCardValue, { color: isDark ? '#FFF' : '#000' }]}>
                {new Date(project.created_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </BlurView>

            <BlurView
              intensity={80}
              tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
              style={styles.statCard}
            >
              <Text style={styles.statEmoji}>🔄</Text>
              <Text style={[styles.statCardLabel, { color: isDark ? '#8E8E93' : '#666' }]}>
                Updated
              </Text>
              <Text style={[styles.statCardValue, { color: isDark ? '#FFF' : '#000' }]}>
                {new Date(project.updated_at).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </BlurView>
          </View>

          {/* Project Info Section */}
          <BlurView
            intensity={80}
            tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
            style={styles.infoCard}
          >
            <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#000' }]}>
              Project Information
            </Text>
            
            {/* Description */}
            {project.description && (
              <View style={styles.infoRowColumn}>
                <Text style={[styles.infoLabel, { color: isDark ? '#8E8E93' : '#666' }]}>
                  Description
                </Text>
                <Text style={[styles.infoValueMultiline, { color: isDark ? '#FFF' : '#000' }]}>
                  {project.description}
                </Text>
              </View>
            )}

            {/* Status */}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: isDark ? '#8E8E93' : '#666' }]}>
                Status
              </Text>
              <View
                style={[
                  styles.statusBadgeSmall,
                  {
                    backgroundColor:
                      project.status === 'active'
                        ? 'rgba(52, 199, 89, 0.2)'
                        : project.status === 'completed'
                        ? 'rgba(0, 122, 255, 0.2)'
                        : 'rgba(142, 142, 147, 0.2)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusTextSmall,
                    {
                      color:
                        project.status === 'active'
                          ? '#34C759'
                          : project.status === 'completed'
                          ? '#007AFF'
                          : '#8E8E93',
                    },
                  ]}
                >
                  {project.status === 'active' ? 'Active' : project.status === 'completed' ? 'Completed' : 'Archived'}
                </Text>
              </View>
            </View>

            {/* Created Date */}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: isDark ? '#8E8E93' : '#666' }]}>
                Created On
              </Text>
              <Text style={[styles.infoValue, { color: isDark ? '#FFF' : '#000' }]}>
                {new Date(project.created_at).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </View>

            {/* Last Updated */}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: isDark ? '#8E8E93' : '#666' }]}>
                Last Updated
              </Text>
              <Text style={[styles.infoValue, { color: isDark ? '#FFF' : '#000' }]}>
                {new Date(project.updated_at).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </View>

            {/* Project ID */}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: isDark ? '#8E8E93' : '#666' }]}>
                Project ID
              </Text>
              <Text style={[styles.infoValue, { color: isDark ? '#FFF' : '#000', fontFamily: 'monospace' }]} numberOfLines={1}>
                {project.id.substring(0, 12)}...
              </Text>
            </View>

            {/* Color Theme */}
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.infoLabel, { color: isDark ? '#8E8E93' : '#666' }]}>
                Color Theme
              </Text>
              <View style={styles.colorPreview}>
                <View style={[styles.colorDot, { backgroundColor: project.color || '#007AFF' }]} />
                <Text style={[styles.infoValue, { color: isDark ? '#FFF' : '#000', fontFamily: 'monospace' }]}>
                  {project.color || '#007AFF'}
                </Text>
              </View>
            </View>
          </BlurView>

          {/* Actions - Only show for project owner */}
          {isOwner && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={deleteProject}
              >
                <BlurView
                  intensity={80}
                  tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
                  style={styles.deleteButtonInner}
                >
                  <Text style={styles.deleteIcon}>🗑️</Text>
                  <Text style={styles.deleteButtonText}>Delete Project</Text>
                </BlurView>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerButton: {
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  heroSection: {
    marginBottom: 20,
  },
  headerCard: {
    padding: 24,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  projectIcon: {
    width: 70,
    height: 70,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  projectIconText: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '700',
  },
  statusBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusTextLarge: {
    fontSize: 15,
    fontWeight: '700',
  },
  projectHeader: {
    marginTop: 4,
  },
  projectName: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  projectDescription: {
    fontSize: 17,
    lineHeight: 24,
    opacity: 0.8,
  },
  editForm: {
    marginTop: 12,
  },
  inputContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  statCardLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoRowColumn: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    maxWidth: '60%',
    textAlign: 'right',
  },
  infoValueMultiline: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    marginTop: 8,
  },
  statusBadgeSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusTextSmall: {
    fontSize: 14,
    fontWeight: '600',
  },
  colorPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  actions: {
    marginTop: 8,
  },
  deleteButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  deleteButtonInner: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  deleteIcon: {
    fontSize: 20,
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '600',
  },
});
