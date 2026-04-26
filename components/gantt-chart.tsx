'use client';

import { Box, HStack, Heading } from '@chakra-ui/react';
import { useMemo } from 'react';
import { GanttRow } from './gantt-row';
import {
  addDays,
  daysBetween,
  getDateWindow,
  todayIso,
  xForDate,
} from '@/lib/gantt/dates';
import { flattenTree } from '@/lib/tasks/tree';
import type { Task } from '@/lib/db/schema';

const PX_PER_DAY = 24;
const LEFT_WIDTH = 360;
const ROW_HEIGHT = 40;
const HEADER_MONTH_HEIGHT = 28;
const HEADER_WEEK_HEIGHT = 28;

const NO_COLLAPSE = new Set<string>();

type Props = { tasks: Task[] };

type MonthSegment = { label: string; xStart: number; widthPx: number };

function buildMonthSegments(windowStart: string, windowDays: number): MonthSegment[] {
  const segments: MonthSegment[] = [];
  let cursor = windowStart;
  while (daysBetween(windowStart, cursor) < windowDays) {
    const [y, m] = cursor.split('-').map(Number);
    const nextY = m === 12 ? y + 1 : y;
    const nextM = m === 12 ? 1 : m + 1;
    const firstOfNextMonth = `${nextY}-${String(nextM).padStart(2, '0')}-01`;
    const cursorDays = daysBetween(windowStart, cursor);
    const nextDays = Math.min(daysBetween(windowStart, firstOfNextMonth), windowDays);
    segments.push({
      label: `${y}년 ${m}월`,
      xStart: cursorDays * PX_PER_DAY,
      widthPx: (nextDays - cursorDays) * PX_PER_DAY,
    });
    cursor = firstOfNextMonth;
  }
  return segments;
}

function buildWeekStarts(windowStart: string, windowDays: number): string[] {
  const starts: string[] = [];
  for (let d = windowStart; daysBetween(windowStart, d) < windowDays; d = addDays(d, 7)) {
    starts.push(d);
  }
  return starts;
}

export function GanttChart({ tasks }: Props) {
  const today = useMemo(() => todayIso(), []);
  const dateWindow = useMemo(() => getDateWindow(tasks, today), [tasks, today]);
  const flatNodes = useMemo(() => flattenTree(tasks, NO_COLLAPSE), [tasks]);

  const rightWidth = dateWindow.days * PX_PER_DAY;
  const todayX = xForDate(today, dateWindow.start, PX_PER_DAY);
  const monthSegments = useMemo(
    () => buildMonthSegments(dateWindow.start, dateWindow.days),
    [dateWindow.start, dateWindow.days],
  );
  const weekStarts = useMemo(
    () => buildWeekStarts(dateWindow.start, dateWindow.days),
    [dateWindow.start, dateWindow.days],
  );

  return (
    <Box maxW="6xl" mx="auto" p="6">
      <Heading size="lg" mb="6">
        WBS · 간트
      </Heading>
      <Box
        overflowX="auto"
        border="1px solid"
        borderColor="gray.200"
        borderRadius="md"
      >
        <Box minW={`${LEFT_WIDTH + rightWidth}px`} position="relative">
          <HStack
            gap="0"
            h={`${HEADER_MONTH_HEIGHT}px`}
            bg="gray.50"
            align="stretch"
          >
            <Box
              w={`${LEFT_WIDTH}px`}
              minW={`${LEFT_WIDTH}px`}
              position="sticky"
              left="0"
              bg="gray.50"
              borderRight="1px solid"
              borderColor="gray.200"
              zIndex={2}
            />
            <Box position="relative" flex="1" minW={`${rightWidth}px`}>
              {monthSegments.map((seg) => (
                <Box
                  key={seg.label}
                  position="absolute"
                  top="0"
                  left={`${seg.xStart}px`}
                  width={`${seg.widthPx}px`}
                  height="full"
                  borderRight="1px solid"
                  borderColor="gray.200"
                  px="2"
                  fontSize="xs"
                  fontWeight="medium"
                  color="gray.700"
                  display="flex"
                  alignItems="center"
                >
                  {seg.label}
                </Box>
              ))}
            </Box>
          </HStack>

          <HStack
            gap="0"
            h={`${HEADER_WEEK_HEIGHT}px`}
            bg="gray.50"
            align="stretch"
            borderBottom="1px solid"
            borderColor="gray.200"
          >
            <Box
              w={`${LEFT_WIDTH}px`}
              minW={`${LEFT_WIDTH}px`}
              position="sticky"
              left="0"
              bg="gray.50"
              borderRight="1px solid"
              borderColor="gray.200"
              zIndex={2}
              px="3"
              fontSize="xs"
              fontWeight="medium"
              color="gray.600"
              display="flex"
              alignItems="center"
            >
              작업
            </Box>
            <Box position="relative" flex="1" minW={`${rightWidth}px`}>
              {weekStarts.map((iso, i) => {
                const [, m, d] = iso.split('-').map(Number);
                return (
                  <Box
                    key={iso}
                    position="absolute"
                    top="0"
                    left={`${i * 7 * PX_PER_DAY}px`}
                    width={`${7 * PX_PER_DAY}px`}
                    height="full"
                    borderRight="1px solid"
                    borderColor="gray.200"
                    px="2"
                    fontSize="xs"
                    color="gray.600"
                    display="flex"
                    alignItems="center"
                  >
                    {m}/{d}
                  </Box>
                );
              })}
            </Box>
          </HStack>

          {flatNodes.length === 0 ? (
            <Box
              h={`${ROW_HEIGHT}px`}
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="gray.500"
              fontSize="sm"
            >
              아직 작업이 없습니다.
            </Box>
          ) : (
            flatNodes.map(({ task, depth }) => (
              <GanttRow
                key={task.id}
                task={task}
                depth={depth}
                windowStart={dateWindow.start}
                pxPerDay={PX_PER_DAY}
                leftWidth={LEFT_WIDTH}
                rightWidth={rightWidth}
                rowHeight={ROW_HEIGHT}
              />
            ))
          )}

          {/* 오늘 세로 강조선 — 좌측 sticky 셀(z-index 2)이 LEFT_WIDTH 안쪽을 가려준다. */}
          <Box
            position="absolute"
            top="0"
            bottom="0"
            left={`${LEFT_WIDTH + todayX}px`}
            width="1px"
            bg="red.500"
            zIndex={1}
            pointerEvents="none"
          />
        </Box>
      </Box>
    </Box>
  );
}
