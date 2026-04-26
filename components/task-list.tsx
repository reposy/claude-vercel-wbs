'use client';

import { Box, Button, HStack, Heading, Stack } from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { EmptyState } from './empty-state';
import { TaskFormModal } from './task-form-modal';
import { TaskRow } from './task-row';
import type { Task } from '@/lib/db/schema';

type Props = {
  tasks: Task[];
  childCounts: Record<string, number>;
};

type FlatNode = { task: Task; depth: number };

function flattenTree(tasks: Task[], collapsedIds: Set<string>): FlatNode[] {
  const childrenByParent = new Map<string | null, Task[]>();
  for (const t of tasks) {
    const key = t.parentId;
    const list = childrenByParent.get(key) ?? [];
    list.push(t);
    childrenByParent.set(key, list);
  }

  const result: FlatNode[] = [];
  function visit(parentId: string | null, depth: number) {
    const children = childrenByParent.get(parentId) ?? [];
    for (const child of children) {
      result.push({ task: child, depth });
      if (!collapsedIds.has(child.id)) {
        visit(child.id, depth + 1);
      }
    }
  }
  visit(null, 0);
  return result;
}

export function TaskList({ tasks, childCounts }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingChildToId, setAddingChildToId] = useState<string | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const titleMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tasks) m.set(t.id, t.title);
    return m;
  }, [tasks]);

  const flatNodes = useMemo(() => flattenTree(tasks, collapsedIds), [tasks, collapsedIds]);

  function toggleExpanded(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 모달이 가리키는 task — id 기준으로 매 렌더 lookup해 revalidate 후 stale ref 회피.
  const editingTask = editingId ? tasks.find((t) => t.id === editingId) : undefined;
  const addingChildToTask = addingChildToId ? tasks.find((t) => t.id === addingChildToId) : undefined;

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
          {flatNodes.map(({ task, depth }) => (
            <TaskRow
              key={task.id}
              task={task}
              childCount={childCounts[task.id] ?? 0}
              depth={depth}
              isExpanded={!collapsedIds.has(task.id)}
              onToggleExpanded={toggleExpanded}
              onEditClick={() => setEditingId(task.id)}
              onAddChildClick={() => setAddingChildToId(task.id)}
            />
          ))}
        </Stack>
      )}

      {/* TaskFormModal은 페이지 전체에 3개만 mount — 신규 최상위 / 편집 / 자식 추가.
          행 단위 mount(N×2)는 큰 트리(50+)에서 Dialog Portal/Backdrop이 폭증.
          PR #18의 "Dialog 항상 mount" 패턴은 그대로 (open prop으로만 visibility 제어). */}
      <TaskFormModal open={createOpen} onOpenChange={setCreateOpen} />
      <TaskFormModal
        task={editingTask}
        parentTitle={editingTask?.parentId ? titleMap.get(editingTask.parentId) : undefined}
        open={!!editingTask}
        onOpenChange={(o) => {
          if (!o) setEditingId(null);
        }}
      />
      <TaskFormModal
        initialParentId={addingChildToId}
        parentTitle={addingChildToTask?.title}
        open={!!addingChildToTask}
        onOpenChange={(o) => {
          if (!o) setAddingChildToId(null);
        }}
      />

    </Box>
  );
}
