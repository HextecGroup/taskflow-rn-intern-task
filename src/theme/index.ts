import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationLightTheme } from '@react-navigation/native';
import type { Theme as NavigationTheme } from '@react-navigation/native';
import { MD3DarkTheme, MD3LightTheme, useTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

import type { HistoryActionType, SyncStatus, TaskStatus } from '../types';

export interface AppCustomColors {
  success: string;
  warning: string;
  status: Record<TaskStatus, string>;
  sync: Record<SyncStatus, string>;
  history: Record<HistoryActionType, string>;
}

export type AppTheme = MD3Theme & { custom: AppCustomColors };

const lightCustom: AppCustomColors = {
  success: '#15803D',
  warning: '#B45309',
  status: { new: '#2563EB', in_progress: '#D97706', completed: '#16A34A', cancelled: '#64748B' },
  sync: { pending: '#D97706', synced: '#16A34A', failed: '#DC2626' },
  history: {
    created: '#4F46E5',
    updated: '#0284C7',
    status_changed: '#D97706',
    attachment_changed: '#7C3AED',
    deleted: '#DC2626',
    synced: '#16A34A',
  },
};

const darkCustom: AppCustomColors = {
  success: '#4ADE80',
  warning: '#FBBF24',
  status: { new: '#60A5FA', in_progress: '#FBBF24', completed: '#4ADE80', cancelled: '#94A3B8' },
  sync: { pending: '#FBBF24', synced: '#4ADE80', failed: '#F87171' },
  history: {
    created: '#A5B4FC',
    updated: '#7DD3FC',
    status_changed: '#FBBF24',
    attachment_changed: '#C4B5FD',
    deleted: '#F87171',
    synced: '#4ADE80',
  },
};

export const lightTheme: AppTheme = {
  ...MD3LightTheme,
  roundness: 3,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4F46E5',
    onPrimary: '#FFFFFF',
    primaryContainer: '#E0E7FF',
    onPrimaryContainer: '#1E1B4B',
    secondary: '#0284C7',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#E0F2FE',
    onSecondaryContainer: '#0C4A6E',
    tertiary: '#7C3AED',
    tertiaryContainer: '#EDE9FE',
    onTertiaryContainer: '#2E1065',
    background: '#F5F6FA',
    onBackground: '#111827',
    surface: '#FFFFFF',
    onSurface: '#111827',
    surfaceVariant: '#EEF0F6',
    onSurfaceVariant: '#4B5563',
    outline: '#9CA3AF',
    outlineVariant: '#E2E5EC',
    error: '#DC2626',
    errorContainer: '#FEE2E2',
    onErrorContainer: '#7F1D1D',
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#F8F8FD',
      level3: '#F3F3FB',
      level4: '#F1F1FA',
      level5: '#EDEDF8',
    },
  },
  custom: lightCustom,
};

export const darkTheme: AppTheme = {
  ...MD3DarkTheme,
  roundness: 3,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#A5B4FC',
    onPrimary: '#1E1B4B',
    primaryContainer: '#3730A3',
    onPrimaryContainer: '#E0E7FF',
    secondary: '#7DD3FC',
    onSecondary: '#082F49',
    secondaryContainer: '#075985',
    onSecondaryContainer: '#E0F2FE',
    tertiary: '#C4B5FD',
    tertiaryContainer: '#5B21B6',
    onTertiaryContainer: '#EDE9FE',
    background: '#0B0D14',
    onBackground: '#E5E7EB',
    surface: '#141824',
    onSurface: '#E5E7EB',
    surfaceVariant: '#1F2433',
    onSurfaceVariant: '#AEB4C2',
    outline: '#5B6275',
    outlineVariant: '#2A3040',
    error: '#F87171',
    errorContainer: '#7F1D1D',
    onErrorContainer: '#FEE2E2',
    elevation: {
      level0: 'transparent',
      level1: '#161B28',
      level2: '#1A2030',
      level3: '#1E2436',
      level4: '#20273A',
      level5: '#232B40',
    },
  },
  custom: darkCustom,
};

export function getNavigationTheme(theme: AppTheme): NavigationTheme {
  const base = theme.dark ? NavigationDarkTheme : NavigationLightTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outlineVariant,
      notification: theme.colors.error,
    },
  };
}

/** Typed access to the app theme (Paper theme + custom semantic colors). */
export const useAppTheme = (): AppTheme => useTheme<AppTheme>();
