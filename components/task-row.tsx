'use client';

import { Box, HStack, IconButton, Menu, Portal, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { StatusBadge } from './status-badge';
import { TaskDeleteDialog } from './task-delete-dialog';
import { TaskFormModal } from './task-form-modal';
import type { Task } from '@/lib/db/schema';

type Props = {
  task: Task;
  childCount: number;
};

function formatDateRange(startDate: string | null, dueDate: string | null) {
  if (!startDate && !dueDate) return '—';
  return `${startDate ?? '—'} ~ ${dueDate ?? '—'}`;
}

export function TaskRow({ task, childCount }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <Box
        borderWidth="1px"
        borderRadius="md"
        p="3"
        cursor="pointer"
        _hover={{ bg: 'bg.muted' }}
        onClick={() => setEditOpen(true)}
        role="button"
        aria-label={`작업 ${task.title} 편집`}
      >
        <HStack gap="4">
          <Box flex="1" minW="0">
            <Text fontWeight="medium" truncate>
              {task.title}
            </Text>
            {task.description && (
              <Text fontSize="sm" color="fg.muted" truncate>
                {task.description}
              </Text>
            )}
          </Box>
          <Box w="100px">
            <Text fontSize="sm" color={task.assignee ? undefined : 'fg.muted'}>
              {task.assignee ?? '—'}
            </Text>
          </Box>
          <Box w="80px">
            <StatusBadge status={task.status} taskId={task.id} interactive />
          </Box>
          <Box w="140px">
            <HStack gap="2">
              <Text fontSize="sm" minW="40px">
                {task.progress}%
              </Text>
              <Box flex="1" h="2" bg="bg.muted" borderRadius="sm" overflow="hidden">
                <Box h="full" w={`${task.progress}%`} bg="blue.500" />
              </Box>
            </HStack>
          </Box>
          <Box w="200px" textAlign="right">
            <Text fontSize="sm">{formatDateRange(task.startDate, task.dueDate)}</Text>
          </Box>
          <Box>
            <Menu.Root>
              <Menu.Trigger asChild>
                <IconButton
                  aria-label="작업 메뉴"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  ⋯
                </IconButton>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content onClick={(e) => e.stopPropagation()}>
                    <Menu.Item
                      value="delete"
                      color="fg.error"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteOpen(true);
                      }}
                    >
                      삭제
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          </Box>
        </HStack>
      </Box>

      {editOpen && (
        <TaskFormModal task={task} open={editOpen} onOpenChange={setEditOpen} />
      )}
      {deleteOpen && (
        <TaskDeleteDialog
          task={task}
          childCount={childCount}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      )}
    </>
  );
}
