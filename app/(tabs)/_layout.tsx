import { useColorScheme } from '@/hooks/use-color-scheme';
import { MaterialIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as NavigationBar from 'expo-navigation-bar';
import { withLayoutContext } from 'expo-router';
import { NativeTabs, NativeTabTrigger } from 'expo-router/unstable-native-tabs';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { Navigator } = createBottomTabNavigator();
export const MaterialBottomTabs = withLayoutContext(Navigator);

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setPositionAsync('absolute');
      NavigationBar.setBackgroundColorAsync('transparent');
    }
  }, []);

  // iOS - Native Tabs with SF Symbols
  if (Platform.OS === 'ios') {
    return (
      <NativeTabs
        blurEffect={
          colorScheme === 'dark'
            ? 'systemChromeMaterialDark'
            : 'systemChromeMaterialLight'
        }
        disableTransparentOnScrollEdge={false}
        minimizeBehavior="onScrollDown"
        tintColor="#007AFF"
        iconColor={{
          default: '#8E8E93',
          selected: '#007AFF',
        }}
        labelStyle={{
          default: {
            fontSize: 11,
            fontWeight: '500',
            color: '#8E8E93',
          },
          selected: {
            fontSize: 11,
            fontWeight: '600',
            color: '#007AFF',
          },
        }}
      >
        <NativeTabTrigger
          name="index"
          options={{
            title: 'Home',
            icon: { sf: 'house.fill' },
          }}
        />
        <NativeTabTrigger
          name="project"
          options={{
            title: 'Projects',
            icon: { sf: 'folder.fill' },
          }}
        />
        <NativeTabTrigger
          name="task"
          options={{
            title: 'Tasks',
            icon: { sf: 'checklist' },
          }}
        />
        <NativeTabTrigger
          name="members"
          options={{
            title: 'Members',
            icon: { sf: 'person.2.fill' },
          }}
        />
        <NativeTabTrigger
          name="profile"
          options={{
            title: 'Settings',
            icon: { sf: 'gearshape.fill' },
          }}
        />
      </NativeTabs>
    );
  }

  // Android - Material Design Bottom Tabs
  const primaryColor = isDark ? '#BB86FC' : '#6200EE';
  const backgroundColor = isDark ? '#1E1E1E' : '#FFFFFF';
  const inactiveColor = isDark ? '#B3B3B3' : '#757575';

  return (
    <MaterialBottomTabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: primaryColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          position: 'absolute',
          bottom: 16,
          left: 16,
          right: 16,
          height: 72,
          borderRadius: 24,
          backgroundColor: backgroundColor,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          paddingBottom: 0,
          paddingTop: 0,
        },
        tabBarItemStyle: {
          height: 72,
          paddingVertical: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 4,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}
    >
      <MaterialBottomTabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: focused ? (isDark ? 'rgba(187, 134, 252, 0.12)' : 'rgba(98, 0, 238, 0.08)') : 'transparent',
              paddingHorizontal: 20,
              paddingVertical: 4,
              borderRadius: 16,
              minWidth: 64,
            }}>
              <MaterialIcons name={focused ? "home" : "home"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <MaterialBottomTabs.Screen
        name="project"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: focused ? (isDark ? 'rgba(187, 134, 252, 0.12)' : 'rgba(98, 0, 238, 0.08)') : 'transparent',
              paddingHorizontal: 20,
              paddingVertical: 4,
              borderRadius: 16,
              minWidth: 64,
            }}>
              <MaterialIcons name={focused ? "folder" : "folder-open"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <MaterialBottomTabs.Screen
        name="task"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: focused ? (isDark ? 'rgba(187, 134, 252, 0.12)' : 'rgba(98, 0, 238, 0.08)') : 'transparent',
              paddingHorizontal: 20,
              paddingVertical: 4,
              borderRadius: 16,
              minWidth: 64,
            }}>
              <MaterialIcons name={focused ? "fact-check" : "checklist"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <MaterialBottomTabs.Screen
        name="members"
        options={{
          title: 'Members',
          tabBarIcon: ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: focused ? (isDark ? 'rgba(187, 134, 252, 0.12)' : 'rgba(98, 0, 238, 0.08)') : 'transparent',
              paddingHorizontal: 20,
              paddingVertical: 4,
              borderRadius: 16,
              minWidth: 64,
            }}>
              <MaterialIcons name={focused ? "groups" : "groups"} size={24} color={color} />
            </View>
          ),
        }}
      />
      <MaterialBottomTabs.Screen
        name="profile"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused, size }: { color: string; focused: boolean; size: number }) => (
            <View style={{
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: focused ? (isDark ? 'rgba(187, 134, 252, 0.12)' : 'rgba(98, 0, 238, 0.08)') : 'transparent',
              paddingHorizontal: 20,
              paddingVertical: 4,
              borderRadius: 16,
              minWidth: 64,
            }}>
              <MaterialIcons name={focused ? "settings" : "settings"} size={24} color={color} />
            </View>
          ),
        }}
      />
    </MaterialBottomTabs>
  );
}
