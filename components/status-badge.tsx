'use client';

import { Badge } from '@chakra-ui/react';
import { useTransition } from 'react';
import { updateTaskStatus } from '@/lib/actions/tasks';
import { TASK_STATUSES, nextStatus, type TaskStatus } from '@/lib/validation/task';

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '할 일',
  doing: '진행 중',
  done: '완료',
};

const STATUS_PALETTES: Record<TaskStatus, string> = {
  todo: 'gray',
  doing: 'blue',
  done: 'green',
};

type Props = {
  status: string;
  taskId?: string;
  interactive?: boolean;
};

export function StatusBadge({ status, taskId, interactive = false }: Props) {
  const [isPending, startTransition] = useTransition();
  const safe: TaskStatus = TASK_STATUSES.includes(status as TaskStatus) ? (status as TaskStatus) : 'todo';

  if (!interactive || !taskId) {
    return (
      <Badge colorPalette={STATUS_PALETTES[safe]} variant="subtle">
        {STATUS_LABELS[safe]}
      </Badge>
    );
  }

  const handleClick: React.MouseEventHandler = (e) => {
    e.stopPropagation();
    if (isPending) return;
    const next = nextStatus(safe);
    startTransition(async () => {
      await updateTaskStatus(taskId, next);
    });
  };

  return (
    <Badge
      colorPalette={STATUS_PALETTES[safe]}
      variant="subtle"
      cursor="pointer"
      opacity={isPending ? 0.5 : 1}
      onClick={handleClick}
      role="button"
      aria-label={`상태: ${STATUS_LABELS[safe]}, 클릭하면 다음 상태로`}
      data-testid="status-badge"
    >
      {STATUS_LABELS[safe]}
    </Badge>
  );
}
