import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Skip notification registration in Expo Go (not supported on Android SDK 53+)
    const isExpoGo = Constants.executionEnvironment === 'storeClient';
    if (isExpoGo && Platform.OS === 'android') {
      console.log('Push notifications not supported in Expo Go on Android. Use a development build.');
      return;
    }

    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        saveTokenToDatabase(token);
      }
    });

    // Listener for when notification is received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Listener for when user taps on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      // Handle navigation based on notification data
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const saveTokenToDatabase = async (token: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update push token for existing profile
      const { error } = await supabase
        .from('profiles')
        .update({
          push_token: token,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving push token:', error);
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  };

  return {
    expoPushToken,
    notification,
  };
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }
    
    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'c173c3dc-983a-4c49-ab7f-7d9bb3fa1ce6',
      })).data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function sendPushNotification(expoPushToken: string, title: string, body: string, data?: any) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

export async function sendTaskAssignmentNotification(
  assigneeId: string,
  taskTitle: string,
  assignerName: string
) {
  try {
    // Get assignee's push token
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', assigneeId)
      .single();

    if (profile && profile.push_token) {
      await sendPushNotification(
        profile.push_token,
        'New Task Assigned',
        `${assignerName} assigned you "${taskTitle}"`,
        { type: 'task_assignment', taskTitle }
      );
    }
  } catch (error) {
    console.error('Error sending task assignment notification:', error);
  }
}

export async function sendTaskStatusUpdateNotification(
  taskId: string,
  taskTitle: string,
  newStatus: string,
  updaterName: string,
  currentUserId: string
) {
  try {
    // Get task details to find owner and assignee
    const { data: task } = await supabase
      .from('tasks')
      .select('user_id, assignee_id')
      .eq('id', taskId)
      .single();

    if (!task) return;

    // Notify task owner if they didn't make the change
    if (task.user_id && task.user_id !== currentUserId) {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', task.user_id)
        .single();

      if (ownerProfile && ownerProfile.push_token) {
        await sendPushNotification(
          ownerProfile.push_token,
          'Task Status Updated',
          `${updaterName} updated "${taskTitle}" to ${newStatus}`,
          { type: 'task_status_update', taskId, taskTitle, status: newStatus }
        );
      }
    }

    // Notify assignee if they exist and didn't make the change
    if (task.assignee_id && task.assignee_id !== currentUserId && task.assignee_id !== task.user_id) {
      const { data: assigneeProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', task.assignee_id)
        .single();

      if (assigneeProfile && assigneeProfile.push_token) {
        await sendPushNotification(
          assigneeProfile.push_token,
          'Task Status Updated',
          `${updaterName} updated "${taskTitle}" to ${newStatus}`,
          { type: 'task_status_update', taskId, taskTitle, status: newStatus }
        );
      }
    }
  } catch (error) {
    console.error('Error sending task status update notification:', error);
  }
}

export async function sendTaskCommentNotification(
  taskId: string,
  taskTitle: string,
  comment: string,
  commenterName: string,
  currentUserId: string
) {
  try {
    // Get task details to find owner and assignee
    const { data: task } = await supabase
      .from('tasks')
      .select('user_id, assignee_id')
      .eq('id', taskId)
      .single();

    if (!task) return;

    const commentPreview = comment.length > 50 ? comment.substring(0, 50) + '...' : comment;

    // Notify task owner if they didn't make the comment
    if (task.user_id && task.user_id !== currentUserId) {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', task.user_id)
        .single();

      if (ownerProfile && ownerProfile.push_token) {
        await sendPushNotification(
          ownerProfile.push_token,
          `New comment on "${taskTitle}"`,
          `${commenterName}: ${commentPreview}`,
          { type: 'task_comment', taskId, taskTitle, comment }
        );
      }
    }

    // Notify assignee if they exist and didn't make the comment
    if (task.assignee_id && task.assignee_id !== currentUserId && task.assignee_id !== task.user_id) {
      const { data: assigneeProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', task.assignee_id)
        .single();

      if (assigneeProfile && assigneeProfile.push_token) {
        await sendPushNotification(
          assigneeProfile.push_token,
          `New comment on "${taskTitle}"`,
          `${commenterName}: ${commentPreview}`,
          { type: 'task_comment', taskId, taskTitle, comment }
        );
      }
    }
  } catch (error) {
    console.error('Error sending task comment notification:', error);
  }
}
