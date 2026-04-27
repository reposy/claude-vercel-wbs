import Papa from 'papaparse';
import { flattenTree } from '@/lib/tasks/tree';
import type { Task } from '@/lib/db/schema';

export const CSV_HEADER = [
  '제목',
  '설명',
  '담당자',
  '상태',
  '진행률',
  '시작일',
  '목표 기한',
  '상위 작업 제목',
] as const;

export const STATUS_LABEL: Record<string, string> = {
  todo: '할 일',
  doing: '진행 중',
  done: '완료',
};

const BOM = '﻿';

export function buildCsvFilename(today: Date = new Date()): string {
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `wbs-${yyyy}-${mm}-${dd}.csv`;
}

export function serializeTasksToCsv(tasks: Task[]): string {
  const titleById = new Map(tasks.map((t) => [t.id, t.title]));
  const ordered = flattenTree(tasks, new Set()).map((n) => n.task);

  const rows = ordered.map((t) => [
    t.title,
    t.description ?? '',
    t.assignee ?? '',
    STATUS_LABEL[t.status] ?? STATUS_LABEL.todo,
    String(t.progress),
    t.startDate ?? '',
    t.dueDate ?? '',
    t.parentId ? (titleById.get(t.parentId) ?? '') : '',
  ]);

  const body = Papa.unparse(
    { fields: [...CSV_HEADER], data: rows },
    { newline: '\r\n' },
  );
  return BOM + body;
}
