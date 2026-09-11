import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Icon } from 'react-native-paper';

import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { HistoryScreen } from '../screens/HistoryScreen';
import { MapScreen } from '../screens/MapScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { TaskDetailsScreen } from '../screens/TaskDetailsScreen';
import { TaskFormScreen } from '../screens/TaskFormScreen';
import { TaskListScreen } from '../screens/TaskListScreen';
import { useAppTheme } from '../theme';
import type { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, { active: string; inactive: string }> = {
  Tasks: { active: 'clipboard-check', inactive: 'clipboard-check-outline' },
  Map: { active: 'map', inactive: 'map-outline' },
  History: { active: 'history', inactive: 'history' },
  Settings: { active: 'cog', inactive: 'cog-outline' },
};

const renderThemeToggle = () => <ThemeToggleButton />;

function MainTabs() {
  const theme = useAppTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerRight: renderThemeToggle,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant },
        tabBarIcon: ({ focused, color, size }) => (
          <Icon source={focused ? TAB_ICONS[route.name].active : TAB_ICONS[route.name].inactive} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Tasks" component={TaskListScreen} options={{ title: 'Tasks' }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ title: 'Map' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const theme = useAppTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} options={{ title: 'Task details' }} />
      <Stack.Screen name="TaskForm" component={TaskFormScreen} options={{ presentation: 'modal', title: 'New task' }} />
    </Stack.Navigator>
  );
}
