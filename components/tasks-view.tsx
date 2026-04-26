'use client';

import { Box, Button, HStack } from '@chakra-ui/react';
import { useState } from 'react';
import { GanttChart } from './gantt-chart';
import { TaskList } from './task-list';
import type { Task } from '@/lib/db/schema';

type View = 'list' | 'gantt';

type Props = {
  tasks: Task[];
  childCounts: Record<string, number>;
};

export function TasksView({ tasks, childCounts }: Props) {
  const [view, setView] = useState<View>('list');

  return (
    <Box>
      <HStack maxW={{ base: 'full', '2xl': '1600px' }} mx="auto" px={{ base: '4', md: '6' }} pt="6" gap="2">
        <Button
          size="sm"
          variant={view === 'list' ? 'solid' : 'outline'}
          colorPalette="blue"
          onClick={() => setView('list')}
        >
          목록
        </Button>
        <Button
          size="sm"
          variant={view === 'gantt' ? 'solid' : 'outline'}
          colorPalette="blue"
          onClick={() => setView('gantt')}
        >
          간트
        </Button>
      </HStack>
      {view === 'list' ? (
        <TaskList tasks={tasks} childCounts={childCounts} />
      ) : (
        <GanttChart tasks={tasks} />
      )}
    </Box>
  );
}
