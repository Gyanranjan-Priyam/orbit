import { useColorScheme } from '@/hooks/use-color-scheme';
import { sendTaskAssignmentNotification, sendTaskCommentNotification, sendTaskStatusUpdateNotification } from '@/hooks/use-notifications';
import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
  const [currentUser, setCurrentUser] = useState<any>(null);
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

      setCurrentUser(user);

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
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'in_progress': return '#2196F3';
      case 'todo': return '#FF9800';
      case 'cancelled': return '#757575';
      default: return '#757575';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress': return 'In Progress';
      case 'todo': return 'To Do';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
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
            Tasks
          </Text>
          <Text style={[styles.headerSubtitle, { color: isDark ? '#B3B3B3' : '#757575' }]}>
            {tasks.filter(t => t.status !== 'completed').length} Pending Tasks
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.iconButton, { backgroundColor: isDark ? '#2C2C2C' : '#E0E0E0' }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // Filter logic can be added here
          }}
        >
          <MaterialIcons name="filter-list" size={24} color={isDark ? '#FFF' : '#000'} />
        </TouchableOpacity>
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
            <MaterialIcons name="hourglass-empty" size={48} color={isDark ? '#333' : '#CCC'} />
            <Text style={[styles.loadingText, { color: isDark ? '#B3B3B3' : '#757575' }]}>
              Loading tasks...
            </Text>
          </View>
        ) : tasks.length === 0 ? (
          <Animated.View entering={FadeInUp.springify()} style={styles.emptyState}>
            <View
              style={[
                styles.emptyIconContainer,
                { backgroundColor: isDark ? '#2C2C2C' : '#E0E0E0' },
              ]}
            >
              <MaterialIcons name="check-circle-outline" size={48} color={isDark ? '#B3B3B3' : '#757575'} />
            </View>
            <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              All Caught Up!
            </Text>
            <Text style={[styles.emptyText, { color: isDark ? '#B3B3B3' : '#757575' }]}>
              You have no pending tasks. Enjoy your day or create a new task to get started.
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.tasksList}>
            {tasks.map((task, index) => {
              const isOwner = currentUser && task.user_id === currentUser.id;
              
              return (
                <Animated.View
                  key={task.id}
                  entering={FadeInDown.delay(index * 30).springify()}
                  layout={Layout.springify()}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.taskCard,
                      { 
                        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      },
                    ]}
                    onPress={() => openTaskDetail(task)}
                    onLongPress={() => {
                      if (isOwner) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert(
                          task.title,
                          'Choose an action',
                          [
                            { text: 'Edit', onPress: () => openEditTask(task) },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteTask(task) },
                            { text: 'Cancel', style: 'cancel' },
                          ]
                        );
                      }
                    }}
                  >
                    <View style={[styles.cardLeftBorder, { backgroundColor: getStatusColor(task.status) }]} />
                    
                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <Text 
                          style={[
                            styles.taskTitle, 
                            { 
                              color: isDark ? '#FFFFFF' : '#000000', 
                              textDecorationLine: task.status === 'completed' ? 'line-through' : 'none', 
                              opacity: task.status === 'completed' ? 0.6 : 1 
                            }
                          ]}
                          numberOfLines={1}
                        >
                          {task.title}
                        </Text>
                        {task.priority === 'urgent' && (
                          <MaterialIcons name="priority-high" size={16} color="#F44336" />
                        )}
                      </View>

                      <View style={styles.cardFooter}>
                        <View style={styles.footerLeft}>
                          {task.project && (
                            <View style={[styles.projectBadge, { backgroundColor: task.project.color + '20' }]}>
                              <View style={[styles.projectDot, { backgroundColor: task.project.color }]} />
                              <Text style={[styles.projectText, { color: task.project.color }]}>
                                {task.project.name}
                              </Text>
                            </View>
                          )}
                          {task.due_date && (
                            <View style={styles.metaItem}>
                              <MaterialIcons name="event" size={14} color={isDark ? '#888' : '#666'} />
                              <Text style={[styles.metaText, { color: isDark ? '#888' : '#666' }]}>
                                {formatDate(task.due_date)}
                              </Text>
                            </View>
                          )}
                        </View>

                        {task.assignee && (
                          <View style={[styles.assigneeAvatarSmall, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
                            <Text style={[styles.assigneeInitials, { color: isDark ? '#FFF' : '#000' }]}>
                              {(task.assignee.full_name || task.assignee.email).charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
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

      {/* Create/Edit Task Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.bottomSheet, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.bottomSheetHeader}>
              <Text style={[styles.bottomSheetTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                {editingTask ? 'Edit Task' : 'New Task'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }} 
                style={[styles.closeButton, { backgroundColor: isDark ? '#2C2C2C' : '#F0F0F0' }]}
              >
                <MaterialIcons name="close" size={20} color={isDark ? '#FFF' : '#000'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>TASK TITLE</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#FFF' : '#000', backgroundColor: isDark ? '#2C2C2C' : '#F9F9F9', borderColor: isDark ? '#333' : '#E0E0E0' }]}
                  value={taskName}
                  onChangeText={setTaskName}
                  placeholder="What needs to be done?"
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  autoFocus={!editingTask}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>DUE DATE</Text>
                  <Pressable
                    style={[styles.inputButton, { backgroundColor: isDark ? '#2C2C2C' : '#F9F9F9', borderColor: isDark ? '#333' : '#E0E0E0' }]}
                    onPress={() => {
                       const tomorrow = new Date(dueDate);
                       tomorrow.setDate(tomorrow.getDate() + 1);
                       setDueDate(tomorrow);
                    }}
                  >
                    <MaterialIcons name="event" size={20} color={isDark ? '#AAA' : '#666'} />
                    <Text style={[styles.inputText, { color: isDark ? '#FFF' : '#000' }]}>
                      {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  </Pressable>
                </View>

                <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>STATUS</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {(['todo', 'in_progress', 'completed'] as const).map((status) => (
                      <Pressable
                        key={status}
                        style={[
                          styles.statusChipSmall,
                          { 
                            backgroundColor: selectedStatus === status ? getStatusColor(status) : (isDark ? '#2C2C2C' : '#F9F9F9'),
                            borderColor: selectedStatus === status ? getStatusColor(status) : (isDark ? '#333' : '#E0E0E0'),
                            borderWidth: 1
                          }
                        ]}
                        onPress={() => setSelectedStatus(status)}
                      >
                        <Text style={{ color: selectedStatus === status ? '#FFF' : (isDark ? '#AAA' : '#666'), fontSize: 12, fontWeight: '600' }}>
                          {getStatusLabel(status)}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>ASSIGNEE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.assigneeScroll}>
                  {members.map((member) => (
                    <Pressable
                      key={member.id}
                      style={[
                        styles.assigneeChip,
                        {
                          backgroundColor: selectedAssignee === member.id ? (isDark ? '#BB86FC' : '#6200EE') : (isDark ? '#2C2C2C' : '#F9F9F9'),
                          borderColor: isDark ? '#333' : '#E0E0E0',
                        },
                      ]}
                      onPress={() => setSelectedAssignee(member.id)}
                    >
                      <View style={styles.assigneeAvatar}>
                        <Text style={styles.assigneeAvatarText}>
                          {(member.full_name || member.email).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.assigneeText, { color: selectedAssignee === member.id ? '#FFF' : (isDark ? '#FFF' : '#000') }]}>
                        {member.full_name || member.email}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: isDark ? '#AAA' : '#666' }]}>PROJECT</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectScroll}>
                  {projects.map((project) => (
                    <Pressable
                      key={project.id}
                      style={[
                        styles.projectChip,
                        {
                          backgroundColor: selectedProject === project.id ? (isDark ? '#BB86FC' : '#6200EE') : (isDark ? '#2C2C2C' : '#F9F9F9'),
                          borderColor: isDark ? '#333' : '#E0E0E0',
                        },
                      ]}
                      onPress={() => setSelectedProject(project.id)}
                    >
                      <View style={[styles.projectIcon, { backgroundColor: project.color }]}>
                        <Text style={styles.projectIconText}>{project.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={[styles.projectChipText, { color: selectedProject === project.id ? '#FFF' : (isDark ? '#FFF' : '#000') }]}>
                        {project.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity
                onPress={editingTask ? updateTask : createTask}
                style={[styles.primaryButton, { backgroundColor: isDark ? '#BB86FC' : '#6200EE' }]}
              >
                <Text style={styles.primaryButtonText}>{editingTask ? 'Save Changes' : 'Create Task'}</Text>
                <MaterialIcons name="check" size={20} color="#FFF" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Task Detail Modal */}
      <Modal
        visible={showTaskDetail}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowTaskDetail(false);
          setSelectedTask(null);
          setComments([]);
        }}
      >
        {selectedTask && (
          <View style={[styles.modalContainer, { backgroundColor: isDark ? '#121212' : '#FAFAFA' }]}>
            <StatusBar
              barStyle={isDark ? 'light-content' : 'dark-content'}
              backgroundColor={isDark ? '#1F1F1F' : '#FFFFFF'}
            />

            <View style={[styles.detailHeader, { paddingTop: insets.top + 16, backgroundColor: isDark ? '#1F1F1F' : '#FFFFFF' }]}>
              <TouchableOpacity
                onPress={() => {
                  setShowTaskDetail(false);
                  setSelectedTask(null);
                  setComments([]);
                }}
                style={styles.backButton}
              >
                <MaterialIcons name="arrow-back" size={24} color={isDark ? '#FFF' : '#000'} />
              </TouchableOpacity>
              <View style={styles.headerActions}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedTask.status) + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedTask.status) }]}>
                    {getStatusLabel(selectedTask.status)}
                  </Text>
                </View>
              </View>
            </View>

            <ScrollView style={styles.detailContent} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
              <View style={styles.detailMain}>
                <Text style={[styles.detailTitle, { color: isDark ? '#FFF' : '#000' }]}>{selectedTask.title}</Text>
                
                <View style={styles.detailMetaRow}>
                  {selectedTask.project && (
                    <View style={[styles.metaChip, { backgroundColor: selectedTask.project.color + '20' }]}>
                      <View style={[styles.projectDot, { backgroundColor: selectedTask.project.color }]} />
                      <Text style={[styles.metaChipText, { color: selectedTask.project.color }]}>{selectedTask.project.name}</Text>
                    </View>
                  )}
                  {selectedTask.due_date && (
                    <View style={[styles.metaChip, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
                      <MaterialIcons name="event" size={14} color={isDark ? '#AAA' : '#666'} />
                      <Text style={[styles.metaChipText, { color: isDark ? '#AAA' : '#666' }]}>{formatDate(selectedTask.due_date)}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionHeader, { color: isDark ? '#AAA' : '#666' }]}>ASSIGNEE</Text>
                  <View style={styles.assigneeRow}>
                    <View style={[styles.assigneeAvatarLarge, { backgroundColor: isDark ? '#333' : '#E0E0E0' }]}>
                      <Text style={[styles.assigneeInitialsLarge, { color: isDark ? '#FFF' : '#000' }]}>
                        {(selectedTask.assignee?.full_name || selectedTask.assignee?.email || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.assigneeNameLarge, { color: isDark ? '#FFF' : '#000' }]}>
                      {selectedTask.assignee?.full_name || selectedTask.assignee?.email || 'Unassigned'}
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionHeader, { color: isDark ? '#AAA' : '#666' }]}>UPDATE STATUS</Text>
                  <View style={styles.statusGrid}>
                    {(['todo', 'in_progress', 'completed'] as const).map((status) => (
                      <Pressable
                        key={status}
                        style={[
                          styles.statusButton,
                          { 
                            backgroundColor: selectedTask.status === status ? getStatusColor(status) : (isDark ? '#2C2C2C' : '#F5F5F5'),
                            borderColor: selectedTask.status === status ? getStatusColor(status) : 'transparent',
                            borderWidth: 1
                          }
                        ]}
                        onPress={() => updateTaskStatus(status)}
                      >
                        <Text style={{ color: selectedTask.status === status ? '#FFF' : (isDark ? '#AAA' : '#666'), fontWeight: '600' }}>
                          {getStatusLabel(status)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.sectionHeader, { color: isDark ? '#AAA' : '#666' }]}>COMMENTS</Text>
                  <View style={styles.commentsContainer}>
                    {comments.map((comment) => (
                      <View key={comment.id} style={[styles.commentBubble, { backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5' }]}>
                        <View style={styles.commentHeader}>
                          <Text style={[styles.commentUser, { color: isDark ? '#FFF' : '#000' }]}>
                            {comment.user?.full_name || comment.user?.email}
                          </Text>
                          <Text style={[styles.commentDate, { color: isDark ? '#888' : '#999' }]}>
                            {new Date(comment.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text style={[styles.commentBody, { color: isDark ? '#DDD' : '#333' }]}>{comment.comment}</Text>
                      </View>
                    ))}
                  </View>
                  
                  <View style={[styles.inputContainer, { backgroundColor: isDark ? '#2C2C2C' : '#F5F5F5' }]}>
                    <TextInput
                      style={[styles.commentInput, { color: isDark ? '#FFF' : '#000' }]}
                      placeholder="Add a comment..."
                      placeholderTextColor={isDark ? '#888' : '#999'}
                      value={newComment}
                      onChangeText={setNewComment}
                      multiline
                    />
                    <TouchableOpacity 
                      onPress={addComment}
                      disabled={!newComment.trim()}
                      style={[styles.sendButton, { opacity: newComment.trim() ? 1 : 0.5 }]}
                    >
                      <MaterialIcons name="send" size={20} color={isDark ? '#BB86FC' : '#6200EE'} />
                    </TouchableOpacity>
                  </View>
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
  tasksList: {
    gap: 16,
  },
  taskCard: {
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  cardLeftBorder: {
    width: 6,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  projectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  projectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  projectText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  assigneeAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeInitials: {
    fontSize: 10,
    fontWeight: '700',
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
  bottomSheetContent: {
    padding: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
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
  inputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    gap: 10,
  },
  inputText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusChipSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  assigneeScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  assigneeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  assigneeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  assigneeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  projectScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  projectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  projectIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectIconText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  projectChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailContent: {
    padding: 24,
  },
  detailMain: {
    gap: 24,
  },
  detailMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assigneeAvatarLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeInitialsLarge: {
    fontSize: 16,
    fontWeight: '700',
  },
  assigneeNameLarge: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  commentsContainer: {
    gap: 16,
  },
  commentBubble: {
    padding: 12,
    borderRadius: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: '700',
  },
  commentDate: {
    fontSize: 11,
  },
  commentBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 24,
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 80,
  },
  sendButton: {
    padding: 8,
  },
});
