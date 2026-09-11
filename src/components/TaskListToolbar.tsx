import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, IconButton, Searchbar, SegmentedButtons } from 'react-native-paper';

import type { SortDirection, TaskSortKey, TaskStatus } from '../types';
import { TASK_STATUSES } from '../types';
import { DUE_FILTER_LABELS, DUE_FILTERS, SORT_LABELS, type DueFilter } from '../utils/sort';
import { STATUS_ICONS, STATUS_LABELS } from '../utils/status';

interface TaskListToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  statusFilter: TaskStatus | 'all';
  onStatusFilterChange: (status: TaskStatus | 'all') => void;
  dueFilter: DueFilter;
  onDueFilterChange: (due: DueFilter) => void;
  sortKey: TaskSortKey;
  sortDirection: SortDirection;
  onSortKeyChange: (key: TaskSortKey) => void;
  onToggleSortDirection: () => void;
}

const SORT_KEYS: TaskSortKey[] = ['createdAt', 'dueDate', 'status'];

const DUE_ICONS: Record<DueFilter, string> = {
  all: 'calendar-blank-outline',
  overdue: 'alert-circle-outline',
  today: 'calendar-today',
  week: 'calendar-week',
};

export function TaskListToolbar({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  dueFilter,
  onDueFilterChange,
  sortKey,
  sortDirection,
  onSortKeyChange,
  onToggleSortDirection,
}: TaskListToolbarProps) {
  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search title, description, address"
        value={query}
        onChangeText={onQueryChange}
        style={styles.search}
        inputStyle={styles.searchInput}
        accessibilityLabel="Search tasks"
      />

      <View style={styles.sortRow}>
        <SegmentedButtons
          style={styles.flex}
          density="small"
          value={sortKey}
          onValueChange={(value) => onSortKeyChange(value as TaskSortKey)}
          buttons={SORT_KEYS.map((key) => ({
            value: key,
            label: SORT_LABELS[key],
            accessibilityLabel: `Sort by ${SORT_LABELS[key]}`,
            labelStyle: styles.segmentLabel,
          }))}
        />
        <IconButton
          icon={sortDirection === 'asc' ? 'sort-ascending' : 'sort-descending'}
          mode="contained-tonal"
          size={20}
          onPress={onToggleSortDirection}
          accessibilityLabel={`Sort direction: ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip compact selected={statusFilter === 'all'} showSelectedOverlay onPress={() => onStatusFilterChange('all')}>
          All
        </Chip>
        {TASK_STATUSES.map((status) => (
          <Chip
            key={status}
            compact
            icon={STATUS_ICONS[status]}
            selected={statusFilter === status}
            showSelectedOverlay
            onPress={() => onStatusFilterChange(statusFilter === status ? 'all' : status)}
          >
            {STATUS_LABELS[status]}
          </Chip>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {DUE_FILTERS.map((due) => (
          <Chip
            key={due}
            compact
            icon={DUE_ICONS[due]}
            selected={dueFilter === due}
            showSelectedOverlay
            onPress={() => onDueFilterChange(dueFilter === due ? 'all' : due)}
            accessibilityLabel={`Due date filter: ${DUE_FILTER_LABELS[due]}`}
          >
            {DUE_FILTER_LABELS[due]}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    paddingTop: 12,
    paddingBottom: 4,
  },
  search: {
    marginHorizontal: 16,
    height: 46,
  },
  searchInput: {
    minHeight: 0,
    fontSize: 15,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 8,
    gap: 4,
  },
  segmentLabel: {
    fontSize: 12,
    marginHorizontal: 0,
  },
  flex: {
    flex: 1,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 16,
  },
});
