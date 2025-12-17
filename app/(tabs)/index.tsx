import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { Project } from '@/types/project';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  due_date?: string;
  project_id?: string;
  priority?: 'low' | 'medium' | 'high';
}

interface Stats {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
}

export default function HomeScreen() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    activeProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  useEffect(() => {
    loadUserData();
    loadDashboardData();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load projects stats
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id);

      const activeProjects = projects?.filter(p => p.status === 'active') || [];
      
      // Load tasks stats
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);

      const completedTasks = tasks?.filter(t => t.completed) || [];
      const pendingTasks = tasks?.filter(t => !t.completed) || [];

      setStats({
        totalProjects: projects?.length || 0,
        activeProjects: activeProjects.length,
        totalTasks: tasks?.length || 0,
        completedTasks: completedTasks.length,
        pendingTasks: pendingTasks.length,
      });

      // Load recent projects (top 3)
      const recentProjects = projects
        ?.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 3) || [];
      setRecentProjects(recentProjects);

      // Load upcoming tasks (top 5 pending)
      const upcoming = pendingTasks
        .sort((a, b) => {
          if (a.due_date && b.due_date) {
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          }
          return 0;
        })
        .slice(0, 5);
      setUpcomingTasks(upcoming);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const completionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0;
  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
        <BlurView
          intensity={isDark ? 80 : 100}
          tint={isDark ? 'dark' : 'light'}
          style={styles.headerBlur}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={[styles.greeting, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                {getGreeting()}
              </Text>
              <Text style={[styles.userName, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                {userName} 👋
              </Text>
            </View>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#FFFFFF' : '#000000'}
          />
        }
      >
        {/* Stats Overview */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Overview
          </Text>
          <View style={styles.statsGrid}>
            <BlurView
              intensity={80}
              tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
              style={styles.statCard}
            >
              <LinearGradient
                colors={isDark ? ['#007AFF', '#0051D5'] : ['#007AFF', '#005ED8']}
                style={styles.statGradient}
              >
                <Text style={styles.statValue}>{stats.totalProjects}</Text>
                <Text style={styles.statLabel}>Total Projects</Text>
              </LinearGradient>
            </BlurView>

            <BlurView
              intensity={80}
              tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
              style={styles.statCard}
            >
              <LinearGradient
                colors={isDark ? ['#34C759', '#2DA546'] : ['#34C759', '#30B84A']}
                style={styles.statGradient}
              >
                <Text style={styles.statValue}>{stats.activeProjects}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </LinearGradient>
            </BlurView>

            <BlurView
              intensity={80}
              tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
              style={styles.statCard}
            >
              <LinearGradient
                colors={isDark ? ['#FF9500', '#E08500'] : ['#FF9500', '#F08800']}
                style={styles.statGradient}
              >
                <Text style={styles.statValue}>{stats.pendingTasks}</Text>
                <Text style={styles.statLabel}>Pending Tasks</Text>
              </LinearGradient>
            </BlurView>

            <BlurView
              intensity={80}
              tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
              style={styles.statCard}
            >
              <LinearGradient
                colors={isDark ? ['#FF3B30', '#D62F26'] : ['#FF3B30', '#E63428']}
                style={styles.statGradient}
              >
                <Text style={styles.statValue}>{completionRate}%</Text>
                <Text style={styles.statLabel}>Completion</Text>
              </LinearGradient>
            </BlurView>
          </View>
        </Animated.View>

        {/* Progress Card */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.section}>
          <BlurView
            intensity={80}
            tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
            style={styles.progressCard}
          >
            <Text style={[styles.cardTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Progress Today
            </Text>
            <View style={styles.progressInfo}>
              <View style={styles.progressTextContainer}>
                <Text style={[styles.progressCount, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  {stats.completedTasks}/{stats.totalTasks}
                </Text>
                <Text style={[styles.progressLabel, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                  Tasks Completed
                </Text>
              </View>
              <View style={styles.circularProgress}>
                <View style={[styles.progressCircle, { borderColor: '#34C759' }]}>
                  <Text style={[styles.progressPercentage, { color: '#34C759' }]}>
                    {completionRate}%
                  </Text>
                </View>
              </View>
            </View>
          </BlurView>
        </Animated.View>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Recent Projects
              </Text>
              <Link href="/(tabs)/project" asChild>
                <TouchableOpacity onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </Link>
            </View>
            {recentProjects.map((project, index) => (
              <Link key={project.id} href={`/project/${project.id}` as any} asChild>
                <TouchableOpacity
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                  style={{ marginBottom: 12 }}
                >
                  <BlurView
                    intensity={80}
                    tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
                    style={styles.projectCard}
                  >
                    <View style={[styles.projectIcon, { backgroundColor: project.color || '#007AFF' }]}>
                      <Text style={styles.projectIconText}>
                        {project.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.projectInfo}>
                      <Text style={[styles.projectName, { color: isDark ? '#FFFFFF' : '#000000' }]} numberOfLines={1}>
                        {project.name}
                      </Text>
                      <Text style={[styles.projectMeta, { color: isDark ? '#8E8E93' : '#8E8E93' }]} numberOfLines={1}>
                        {project.description || 'No description'}
                      </Text>
                    </View>
                    <View style={[
                      styles.projectStatus,
                      {
                        backgroundColor: project.status === 'active'
                          ? 'rgba(52, 199, 89, 0.2)'
                          : 'rgba(142, 142, 147, 0.2)'
                      }
                    ]}>
                      <Text style={[
                        styles.projectStatusText,
                        { color: project.status === 'active' ? '#34C759' : '#8E8E93' }
                      ]}>
                        {project.status}
                      </Text>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              </Link>
            ))}
          </Animated.View>
        )}

        {/* Upcoming Tasks */}
        {upcomingTasks.length > 0 && (
          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                Upcoming Tasks
              </Text>
              <Link href="/(tabs)/task" asChild>
                <TouchableOpacity onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              </Link>
            </View>
            <BlurView
              intensity={80}
              tint={isDark ? 'systemMaterialDark' : 'systemMaterialLight'}
              style={styles.tasksList}
            >
              {upcomingTasks.map((task, index) => (
                <View key={task.id}>
                  <View style={styles.taskItem}>
                    <View style={[styles.taskCheckbox, task.completed && styles.taskCheckboxCompleted]}>
                      {task.completed && <Text style={styles.taskCheck}>✓</Text>}
                    </View>
                    <View style={styles.taskContent}>
                      <Text
                        style={[
                          styles.taskTitle,
                          { color: isDark ? '#FFFFFF' : '#000000' },
                          task.completed && styles.taskTitleCompleted
                        ]}
                        numberOfLines={1}
                      >
                        {task.title}
                      </Text>
                      {task.due_date && (
                        <Text style={[styles.taskDueDate, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </View>
                  {index < upcomingTasks.length - 1 && (
                    <View style={[styles.taskDivider, { backgroundColor: isDark ? '#38383A' : '#E5E5EA' }]} />
                  )}
                </View>
              ))}
            </BlurView>
          </Animated.View>
        )}

        {/* Empty State */}
        {!loading && stats.totalProjects === 0 && (
          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🚀</Text>
            <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              Get Started
            </Text>
            <Text style={[styles.emptyText, { color: isDark ? '#8E8E93' : '#8E8E93' }]}>
              Create your first project to start organizing your tasks
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(tabs)/project');
              }}
            >
              <Text style={styles.emptyButtonText}>Create Project</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    zIndex: 10,
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
  greeting: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.374,
    marginBottom: 2,
  },
  userName: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.374,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statGradient: {
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },

  // Progress Card
  progressCard: {
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTextContainer: {
    flex: 1,
  },
  progressCount: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  circularProgress: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: '800',
  },

  // Project Cards
  projectCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  projectIconText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  projectInfo: {
    flex: 1,
    marginRight: 12,
  },
  projectName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  projectMeta: {
    fontSize: 14,
  },
  projectStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  projectStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Tasks List
  tasksList: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8E8E93',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCheckboxCompleted: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  taskCheck: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  taskDueDate: {
    fontSize: 13,
  },
  taskDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 36,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
