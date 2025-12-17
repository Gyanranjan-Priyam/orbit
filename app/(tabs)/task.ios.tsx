import { useColorScheme } from '@/hooks/use-color-scheme';
import { sendTaskAssignmentNotification, sendTaskCommentNotification, sendTaskStatusUpdateNotification } from '@/hooks/use-notifications';
import { supabase } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
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
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  project_id?: string;
  assignee_id?: string;
  created_at: string;
  assignee?: {
    full_name?: string;
    email: string;
  };
  project?: {
    name: string;
    color: string;
  };
}

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  organization?: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user?: {
    full_name?: string;
    email: string;
  };
}

export default function TaskScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  
  // Form state
  const [taskName, setTaskName] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'todo' | 'in_progress' | 'completed' | 'cancelled'>('in_progress');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    fetchData();

    // Set up real-time subscription for tasks
    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          console.log('Task change received:', payload);
          // Refresh tasks when any change occurs
          fetchData();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedTask) {
      fetchComments();
      
      // Set up real-time subscription for comments
      const channel = supabase
        .channel(`task-comments-${selectedTask.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'task_comments',
            filter: `task_id=eq.${selectedTask.id}`,
          },
          (payload) => {
            console.log('Comment change received:', payload);
            fetchComments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedTask]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch tasks created by user or assigned to user
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(full_name, email),
          project:projects(name, color)
        `)
        .or(`user_id.eq.${user.id},assignee_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Fetch organization members
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, email, full_name, organization')
        .order('full_name');

      setMembers(profileData || []);

      // Fetch user's projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name, color')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('name');

      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async () => {
    if (!taskName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please enter a task name');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create a task');
        return;
      }

      const { error } = await supabase.from('tasks').insert({
        user_id: user.id,
        title: taskName.trim(),
        status: selectedStatus,
        due_date: dueDate.toISOString(),
        assignee_id: selectedAssignee,
        project_id: selectedProject,
        priority: 'medium',
      });

      if (error) throw error;

      // Send push notification if task is assigned to someone
      if (selectedAssignee && selectedAssignee !== user.id) {
        const assignerName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Someone';
        await sendTaskAssignmentNotification(
          selectedAssignee,
          taskName.trim(),
          assignerName
        );
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating task:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to create task');
    }
  };

  const resetForm = () => {
    setTaskName('');
    setDueDate(new Date());
    setSelectedAssignee(null);
    setSelectedStatus('in_progress');
    setSelectedProject(null);
    setEditingTask(null);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskName(task.title);
    setDueDate(task.due_date ? new Date(task.due_date) : new Date());
    setSelectedAssignee(task.assignee_id || null);
    setSelectedStatus(task.status);
    setSelectedProject(task.project_id || null);
    setShowCreateModal(true);
    setShowContextMenu(false);
  };

  const updateTask = async () => {
    if (!taskName.trim() || !editingTask) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Please enter a task name');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      const { error } = await supabase
        .from('tasks')
        .update({
          title: taskName.trim(),
          status: selectedStatus,
          due_date: dueDate.toISOString(),
          assignee_id: selectedAssignee,
          project_id: selectedProject,
        })
        .eq('id', editingTask.id)
        .eq('user_id', user.id);

      if (error) {
        if (error.code === 'PGRST116') {
          Alert.alert('Permission Denied', 'Only the task owner can update this task');
        } else {
          throw error;
        }
        return;
      }

      // Send notification if assignee changed
      if (selectedAssignee && selectedAssignee !== editingTask.assignee_id && selectedAssignee !== user.id) {
        const assignerName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Someone';
        await sendTaskAssignmentNotification(
          selectedAssignee,
          taskName.trim(),
          assignerName
        );
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error updating task:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to update task');
    }
  };

  const deleteTask = async (task: Task) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      // Check if current user is the task owner
      const { data: taskData } = await supabase
        .from('tasks')
        .select('user_id')
        .eq('id', task.id)
        .single();

      if (taskData && taskData.user_id !== user.id) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Permission Denied', 'Only the task owner can delete this task');
        setShowContextMenu(false);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      
      Alert.alert(
        'Delete Task',
        `Are you sure you want to delete "${task.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', task.id)
                .eq('user_id', user.id);

              if (error) throw error;

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              fetchData();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error deleting task:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to delete task');
    } finally {
      setShowContextMenu(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#34C759';
      case 'in_progress': return '#007AFF';
      case 'todo': return '#FF9500';
      default: return '#8E8E93';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress': return 'In Progress';
      case 'todo': return 'To Do';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const fetchComments = async () => {
    if (!selectedTask) return;

    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:profiles!task_comments_user_id_fkey(full_name, email)
        `)
        .eq('task_id', selectedTask.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !selectedTask) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: selectedTask.id,
          user_id: user.id,
          comment: newComment.trim(),
        });

      if (error) throw error;

      // Send notification to task owner and assignee
      const commenterName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Someone';
      await sendTaskCommentNotification(
        selectedTask.id,
        selectedTask.title,
        newComment.trim(),
        commenterName,
        user.id
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewComment('');
      fetchComments();
    } catch (error: any) {
      console.error('Error adding comment:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to add comment');
    }
  };

  const updateTaskStatus = async (newStatus: Task['status']) => {
    if (!selectedTask) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', selectedTask.id)
        .or(`user_id.eq.${user.id},assignee_id.eq.${user.id}`);

      if (error) throw error;

      // Send notification to task owner and assignee
      const updaterName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Someone';
      await sendTaskStatusUpdateNotification(
        selectedTask.id,
        selectedTask.title,
        newStatus,
        updaterName,
        user.id
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedTask({ ...selectedTask, status: newStatus });
      fetchData();
    } catch (error: any) {
      console.error('Error updating task status:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error.message || 'Failed to update status');
    }
  };

  const openTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
    setShowContextMenu(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
      {/* Large Title Header */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <BlurView
          intensity={isDark ? 80 : 100}
          tint={isDark ? 'dark' : 'light'}
          style={styles.headerBlur}
        >
          <View style={styles.headerContent}>
            <Text style={[styles.largeTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Tasks
            </Text>
          </View>
        </BlurView>
      </View>

      {/* Tasks List */}
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
            <Text style={{ color: '#8E8E93', fontSize: 17 }}>
              Loading...
            </Text>
          </View>
        ) : tasks.length === 0 ? (
          <Animated.View entering={FadeInUp.springify()} style={styles.emptyState}>
            <View
              style={[
                styles.emptyIconContainer,
                { backgroundColor: isDark ? 'rgba(120, 120, 128, 0.16)' : 'rgba(120, 120, 128, 0.12)' },
              ]}
            >
              <Text style={styles.emptyIcon}>✓</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              No Tasks Yet
            </Text>
            <Text style={[styles.emptyText, { color: '#8E8E93' }]}>
              Tap the + button to create your first task
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.tasksList}>
            {tasks.map((task, index) => (
              <Animated.View
                key={task.id}
                entering={FadeInDown.delay(index * 30).springify()}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.taskCard,
                    {
                      backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    openTaskDetail(task);
                  }}
                  onLongPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setSelectedTask(task);
                    setShowContextMenu(true);
                  }}
                >
                  <View style={styles.taskHeader}>
                    <View style={styles.taskTitleRow}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: getStatusColor(task.status) },
                        ]}
                      />
                      <Text
                        style={[
                          styles.taskTitle,
                          {
                            color: isDark ? '#FFFFFF' : '#000000',
                            textDecorationLine: task.status === 'completed' ? 'line-through' : 'none',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {task.title}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(task.status) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(task.status) },
                        ]}
                      >
                        {getStatusLabel(task.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.taskMeta}>
                    {task.due_date && (
                      <View style={styles.metaItem}>
                        <Text style={styles.metaIcon}>📅</Text>
                        <Text style={[styles.metaText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                          {formatDate(task.due_date)}
                        </Text>
                      </View>
                    )}
                    {task.assignee && (
                      <View style={styles.metaItem}>
                        <Text style={styles.metaIcon}>👤</Text>
                        <Text style={[styles.metaText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                          {task.assignee.full_name || task.assignee.email}
                        </Text>
                      </View>
                    )}
                    {task.project && (
                      <View style={styles.metaItem}>
                        <View style={[styles.projectDot, { backgroundColor: task.project.color }]} />
                        <Text style={[styles.metaText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                          {task.project.name}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <View style={[styles.fabContainer, { bottom: insets.bottom + 80 }]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowCreateModal(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Create Task Modal */}
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
                  resetForm();
                }}
                style={styles.modalButton}
              >
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                {editingTask ? 'Edit Task' : 'New Task'}
              </Text>
              <TouchableOpacity
                onPress={editingTask ? updateTask : createTask}
                style={styles.modalButton}
              >
                <Text style={[styles.modalDone, { fontWeight: '600' }]}>
                  {editingTask ? 'Save' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </BlurView>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Task Name */}
            <View style={styles.formSection}>
              <Text style={[styles.sectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
                TASK NAME
              </Text>
              <View
                style={[
                  styles.inputGroup,
                  { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
              >
                <TextInput
                  style={[styles.input, { color: isDark ? '#FFFFFF' : '#000000' }]}
                  value={taskName}
                  onChangeText={setTaskName}
                  placeholder="Make a youtube video"
                  placeholderTextColor={isDark ? '#48484A' : '#C6C6C8'}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Due Date */}
            <View style={styles.formSection}>
              <Text style={[styles.sectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
                DUE DATE
              </Text>
              <Pressable
                style={[
                  styles.inputGroup,
                  { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
                onPress={() => {
                  const tomorrow = new Date(dueDate);
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setDueDate(tomorrow);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                onLongPress={() => {
                  setDueDate(new Date());
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <View style={styles.dateRow}>
                  <Text style={styles.dateIcon}>📅</Text>
                  <Text style={[styles.dateText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    {dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={[styles.dateHint, { color: isDark ? '#48484A' : '#C6C6C8' }]}>
                  Tap to add day · Hold to reset
                </Text>
              </Pressable>
            </View>

            {/* Assignee */}
            <View style={styles.formSection}>
              <Text style={[styles.sectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
                ASSIGNEE
              </Text>
              <View
                style={[
                  styles.inputGroup,
                  { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipScroll}
                >
                  {members.map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedAssignee(member.id === selectedAssignee ? null : member.id);
                      }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selectedAssignee === member.id
                            ? '#007AFF'
                            : (isDark ? '#2C2C2E' : '#E5E5EA'),
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.chipAvatar,
                          {
                            backgroundColor: selectedAssignee === member.id
                              ? 'rgba(255,255,255,0.3)'
                              : '#007AFF',
                          },
                        ]}
                      >
                        <Text style={styles.chipAvatarText}>
                          {(member.full_name || member.email).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: selectedAssignee === member.id
                              ? '#FFFFFF'
                              : (isDark ? '#FFFFFF' : '#000000'),
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {member.full_name || member.email}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Status */}
            <View style={styles.formSection}>
              <Text style={[styles.sectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
                STATUS
              </Text>
              <View
                style={[
                  styles.inputGroup,
                  { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
              >
                {(['in_progress', 'todo', 'completed'] as const).map((status, index) => (
                  <TouchableOpacity
                    key={status}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedStatus(status);
                    }}
                    style={[
                      styles.statusRow,
                      index > 0 && {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: isDark ? '#38383A' : '#C6C6C8',
                      },
                    ]}
                    activeOpacity={0.6}
                  >
                    <Text style={[styles.statusLabel, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                      {getStatusLabel(status)}
                    </Text>
                    {selectedStatus === status && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Project */}
            <View style={styles.formSection}>
              <Text style={[styles.sectionLabel, { color: isDark ? '#8E8E93' : '#6D6D72' }]}>
                PROJECT
              </Text>
              <View
                style={[
                  styles.inputGroup,
                  { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                ]}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipScroll}
                >
                  {projects.map((project) => (
                    <TouchableOpacity
                      key={project.id}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedProject(project.id === selectedProject ? null : project.id);
                      }}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selectedProject === project.id
                            ? project.color
                            : (isDark ? '#2C2C2E' : '#E5E5EA'),
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.chipIcon,
                          {
                            backgroundColor: selectedProject === project.id
                              ? 'rgba(255,255,255,0.3)'
                              : project.color,
                          },
                        ]}
                      >
                        <Text style={styles.chipIconText}>
                          {project.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: selectedProject === project.id
                              ? '#FFFFFF'
                              : (isDark ? '#FFFFFF' : '#000000'),
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {project.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Context Menu Modal */}
      <Modal
        visible={showContextMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowContextMenu(false)}
      >
        <Pressable
          style={styles.contextMenuOverlay}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowContextMenu(false);
          }}
        >
          <View style={styles.glassContainer}>
            <BlurView 
              intensity={100} 
              tint={isDark ? 'dark' : 'light'} 
              style={styles.contextMenuContainer}
            >
              <View
                style={[
                  styles.contextMenuContent,
                  { 
                    backgroundColor: isDark 
                      ? 'rgba(28, 28, 30, 0.85)' 
                      : 'rgba(255, 255, 255, 0.85)',
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.contextMenuItem}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (selectedTask) openEditTask(selectedTask);
                  }}
                >
                  <Text style={[styles.contextMenuText, { color: '#007AFF' }]}>Edit</Text>
                </TouchableOpacity>
                
                <View
                  style={[
                    styles.contextMenuDivider,
                    { backgroundColor: isDark ? 'rgba(84, 84, 88, 0.6)' : 'rgba(60, 60, 67, 0.3)' },
                  ]}
                />
                
                <TouchableOpacity
                  style={styles.contextMenuItem}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (selectedTask) {
                      setShowContextMenu(false);
                      deleteTask(selectedTask);
                    }
                  }}
                >
                  <Text style={[styles.contextMenuText, { color: '#FF3B30' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </View>
        </Pressable>
      </Modal>

      {/* Task Detail Modal */}
      <Modal
        visible={showTaskDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowTaskDetail(false);
          setSelectedTask(null);
          setComments([]);
        }}
      >
        {selectedTask && (
          <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
            <BlurView intensity={95} tint={isDark ? 'dark' : 'light'} style={[styles.headerBlur, { paddingTop: insets.top }]}>
              <View style={styles.detailHeader}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowTaskDetail(false);
                    setSelectedTask(null);
                    setComments([]);
                  }}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </BlurView>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 20 }}
            >
              {/* Task Title */}
              <Text style={[styles.detailTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                {selectedTask.title}
              </Text>

              {/* Task Meta */}
              <View style={styles.detailMeta}>
                {selectedTask.due_date && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>📅</Text>
                    <Text style={[styles.metaText, { color: '#8E8E93' }]}>
                      {formatDate(selectedTask.due_date)}
                    </Text>
                  </View>
                )}
                {selectedTask.assignee && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>👤</Text>
                    <Text style={[styles.metaText, { color: '#8E8E93' }]}>
                      {selectedTask.assignee.full_name || selectedTask.assignee.email}
                    </Text>
                  </View>
                )}
                {selectedTask.project && (
                  <View style={styles.metaItem}>
                    <View style={[styles.projectDot, { backgroundColor: selectedTask.project.color }]} />
                    <Text style={[styles.metaText, { color: '#8E8E93' }]}>
                      {selectedTask.project.name}
                    </Text>
                  </View>
                )}
              </View>

              {/* Status Update */}
              <View style={styles.detailSection}>
                <Text style={[styles.sectionTitle, { color: '#8E8E93' }]}>
                  PROGRESS STATUS
                </Text>
                <View style={styles.statusContainer}>
                  {(['todo', 'in_progress', 'completed', 'cancelled'] as const).map((status) => (
                    <Pressable
                      key={status}
                      style={({ pressed }) => [
                        styles.statusButton,
                        {
                          backgroundColor: selectedTask.status === status
                            ? getStatusColor(status)
                            : isDark ? '#1C1C1E' : '#FFFFFF',
                          opacity: pressed ? 0.6 : 1,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        updateTaskStatus(status);
                      }}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          {
                            color: selectedTask.status === status
                              ? '#FFFFFF'
                              : (isDark ? '#FFFFFF' : '#000000'),
                          },
                        ]}
                      >
                        {getStatusLabel(status)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Comments Section */}
              <View style={styles.detailSection}>
                <Text style={[styles.sectionTitle, { color: '#8E8E93' }]}>
                  COMMENTS ({comments.length})
                </Text>

                {/* Comment Input */}
                <View style={styles.commentInputContainer}>
                  <TextInput
                    style={[
                      styles.commentInput,
                      { 
                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                        color: isDark ? '#FFFFFF' : '#000000',
                      },
                    ]}
                    value={newComment}
                    onChangeText={setNewComment}
                    placeholder="Add a comment..."
                    placeholderTextColor="#8E8E93"
                    multiline
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      { 
                        backgroundColor: newComment.trim() ? '#007AFF' : '#E5E5EA',
                        opacity: newComment.trim() ? 1 : 0.5,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      addComment();
                    }}
                    disabled={!newComment.trim()}
                  >
                    <Text style={styles.sendButtonText}>↑</Text>
                  </TouchableOpacity>
                </View>

                {/* Comments List */}
                <View style={styles.commentsList}>
                  {comments.length === 0 ? (
                    <Text style={[styles.emptyCommentsText, { color: '#8E8E93' }]}>
                      No comments yet. Be the first to comment!
                    </Text>
                  ) : (
                    comments.map((comment) => (
                      <View
                        key={comment.id}
                        style={[
                          styles.commentItem,
                          { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                      >
                        <View style={styles.commentHeader}>
                          <View style={styles.commentAvatar}>
                            <Text style={styles.commentAvatarText}>
                              {(comment.user?.full_name || comment.user?.email || 'U').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.commentMeta}>
                            <Text style={[styles.commentAuthor, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                              {comment.user?.full_name || comment.user?.email || 'Unknown'}
                            </Text>
                            <Text style={[styles.commentTime, { color: '#8E8E93' }]}>
                              {new Date(comment.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.commentText, { color: isDark ? '#E0E0E0' : '#3C3C43' }]}>
                          {comment.comment}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
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
  tasksList: {
    gap: 12,
  },
  taskCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60, 60, 67, 0.12)',
  },
  taskHeader: {
    marginBottom: 12,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    letterSpacing: -0.408,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
    letterSpacing: -0.08,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    fontSize: 15,
    letterSpacing: -0.24,
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
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
  formSection: {
    marginBottom: 28,
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  dateIcon: {
    fontSize: 20,
  },
  dateText: {
    fontSize: 17,
    letterSpacing: -0.408,
    flex: 1,
  },
  dateHint: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
    letterSpacing: -0.08,
  },
  chipScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  chipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  chipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipIconText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  chipText: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.24,
    maxWidth: 120,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statusLabel: {
    fontSize: 17,
    letterSpacing: -0.408,
  },
  checkmark: {
    fontSize: 17,
    color: '#007AFF',
    fontWeight: '600',
  },
  contextMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassContainer: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  contextMenuContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 250,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  contextMenuContent: {
    borderRadius: 16,
    overflow: 'hidden',
    backdropFilter: 'blur(40px)',
  },
  contextMenuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  contextMenuText: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.408,
  },
  contextMenuDivider: {
    height: StyleSheet.hairlineWidth,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  detailTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.364,
  },
  detailMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 24,
  },
  detailSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: -0.078,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.24,
  },
  commentInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  commentInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 40,
    maxHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonText: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  commentsList: {
    gap: 12,
  },
  emptyCommentsText: {
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: 24,
    fontStyle: 'italic',
    letterSpacing: -0.24,
  },
  commentItem: {
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  commentMeta: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.24,
  },
  commentTime: {
    fontSize: 13,
    letterSpacing: -0.078,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 20,
    marginLeft: 42,
    letterSpacing: -0.24,
  },
});
