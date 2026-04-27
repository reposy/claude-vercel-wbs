'use client';

import { Box, Button, HStack, Spacer } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { GanttChart } from './gantt-chart';
import { TaskList } from './task-list';
import { CsvExportButton } from './csv-export-button';
import { CsvImportModal } from './csv-import-modal';
import { todayIso } from '@/lib/gantt/dates';
import type { Task } from '@/lib/db/schema';

type View = 'list' | 'gantt';

type Props = {
  tasks: Task[];
  childCounts: Record<string, number>;
};

export function TasksView({ tasks, childCounts }: Props) {
  const [view, setView] = useState<View>('list');
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  // 사용자 로컬 기준 "오늘". 목록·간트 양쪽 Overdue 판정과 간트 오늘선이 같은 값을 공유한다.
  const today = useMemo(() => todayIso(), []);

  return (
    <Box>
      <HStack
        maxW={{ base: 'full', '2xl': '1600px' }}
        mx="auto"
        px={{ base: '4', md: '6' }}
        pt="6"
        gap="2"
        flexWrap="wrap"
      >
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
        <Spacer />
        <CsvExportButton tasks={tasks} />
        <Button size="sm" variant="outline" onClick={() => setCsvImportOpen(true)}>
          CSV 불러오기
        </Button>
      </HStack>
      {view === 'list' ? (
        <TaskList tasks={tasks} childCounts={childCounts} today={today} />
      ) : (
        <GanttChart tasks={tasks} today={today} />
      )}
      <CsvImportModal
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        existingTasks={tasks}
      />
    </Box>
  );
}
