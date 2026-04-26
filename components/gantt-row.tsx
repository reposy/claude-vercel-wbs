'use client';

import { Box, HStack } from '@chakra-ui/react';
import { daysBetween, xForDate } from '@/lib/gantt/dates';
import { isOverdue } from '@/lib/tasks/overdue';
import type { Task } from '@/lib/db/schema';

const STATUS_BAR_DARK: Record<string, string> = {
  todo: 'gray.500',
  doing: 'blue.500',
  done: 'green.500',
};

const STATUS_BAR_LIGHT: Record<string, string> = {
  todo: 'gray.200',
  doing: 'blue.100',
  done: 'green.100',
};

type Props = {
  task: Task;
  depth: number;
  windowStart: string;
  pxPerDay: number;
  leftWidth: number;
  rightWidth: number;
  rowHeight: number;
  today: string;
};

export function GanttRow({
  task,
  depth,
  windowStart,
  pxPerDay,
  leftWidth,
  rightWidth,
  rowHeight,
  today,
}: Props) {
  const hasSchedule = task.startDate !== null && task.dueDate !== null;
  const dark = STATUS_BAR_DARK[task.status] ?? 'gray.500';
  const light = STATUS_BAR_LIGHT[task.status] ?? 'gray.200';
  const overdue = isOverdue(task, today);

  let bar: { x: number; width: number } | null = null;
  if (hasSchedule) {
    const x = xForDate(task.startDate!, windowStart, pxPerDay);
    const widthDays = daysBetween(task.startDate!, task.dueDate!) + 1;
    bar = { x, width: widthDays * pxPerDay };
  }

  return (
    <HStack
      gap="0"
      h={`${rowHeight}px`}
      align="stretch"
      borderTop="1px solid"
      borderColor="gray.100"
    >
      <HStack
        w={`${leftWidth}px`}
        minW={`${leftWidth}px`}
        position="sticky"
        left="0"
        bg="white"
        borderRight="1px solid"
        borderColor="gray.200"
        zIndex={2}
        px="3"
        gap="2"
      >
        <Box
          flex="1"
          pl={`${depth * 16}px`}
          fontSize="sm"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {task.title}
        </Box>
        <Box fontSize="xs" color="gray.600" minW="40px" textAlign="right">
          {task.progress}%
        </Box>
      </HStack>

      <Box position="relative" flex="1" minW={`${rightWidth}px`}>
        {bar ? (
          <Box
            position="absolute"
            top="50%"
            transform="translateY(-50%)"
            left={`${bar.x}px`}
            width={`${bar.width}px`}
            height="20px"
            bg={light}
            borderRadius="sm"
            outlineWidth={overdue ? '2px' : undefined}
            outlineStyle={overdue ? 'dashed' : undefined}
            outlineColor={overdue ? 'red.500' : undefined}
            draggable={false}
            userSelect="none"
            cursor="default"
          >
            <Box
              position="absolute"
              top="0"
              left="0"
              width={`${task.progress}%`}
              height="full"
              bg={dark}
              borderRadius="sm"
            />
          </Box>
        ) : (
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            height="full"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="gray.400"
            fontSize="xs"
          >
            — 일정 없음 —
          </Box>
        )}
      </Box>
    </HStack>
  );
}
