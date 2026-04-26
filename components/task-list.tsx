'use client';

import { Box, Button, HStack, Heading, Stack } from '@chakra-ui/react';
import { useState } from 'react';
import { EmptyState } from './empty-state';
import { TaskFormModal } from './task-form-modal';
import { TaskRow } from './task-row';
import type { Task } from '@/lib/db/schema';

type Props = {
  tasks: Task[];
  childCounts: Record<string, number>;
};

export function TaskList({ tasks, childCounts }: Props) {
  const [createOpen, setCreateOpen] = useState(false);

  const addButton = (
    <Button colorPalette="blue" onClick={() => setCreateOpen(true)}>
      + 작업 추가
    </Button>
  );

  return (
    <Box maxW="6xl" mx="auto" p="6">
      <HStack justify="space-between" mb="6">
        <Heading size="lg">WBS</Heading>
        {tasks.length > 0 && addButton}
      </HStack>

      {tasks.length === 0 ? (
        <EmptyState>{addButton}</EmptyState>
      ) : (
        <Stack gap="2">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} childCount={childCounts[task.id] ?? 0} />
          ))}
        </Stack>
      )}

      {createOpen && <TaskFormModal open={createOpen} onOpenChange={setCreateOpen} />}
    </Box>
  );
}
