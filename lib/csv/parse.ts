import Papa from 'papaparse';
import { TASK_STATUSES, type TaskStatus } from '@/lib/validation/task';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const STATUS_BY_INPUT: Record<string, TaskStatus> = {
  '할 일': 'todo',
  '할일': 'todo',
  '진행 중': 'doing',
  '진행중': 'doing',
  '완료': 'done',
  todo: 'todo',
  doing: 'doing',
  done: 'done',
};

export type ParsedRow = {
  title: string;
  description: string | null;
  assignee: string | null;
  status: TaskStatus;
  progress: number;
  startDate: string | null;
  dueDate: string | null;
  parentTitle: string | null;
  parentMatched: 'existing' | 'csv' | 'none';
};

export type ParsePreview = {
  valid: ParsedRow[];
  excluded: { rowNumber: number; reason: string }[];
  warnings: { rowNumber: number; title: string; reason: string }[];
  counts: { add: number; exclude: number };
};

function clampProgress(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function normalizeStatus(raw: string): TaskStatus {
  const mapped = STATUS_BY_INPUT[raw];
  if (mapped) return mapped;
  if (TASK_STATUSES.includes(raw as TaskStatus)) return raw as TaskStatus;
  return 'todo';
}

export async function parseCsvFile(file: File, existingTitles: string[]): Promise<ParsePreview> {
  const text = (await file.text()).replace(/^﻿/, '');
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
  });

  const data = result.data;
  const valid: ParsedRow[] = [];
  const excluded: { rowNumber: number; reason: string }[] = [];
  const warnings: { rowNumber: number; title: string; reason: string }[] = [];

  // CSV 같은 batch에서 등장한 title (비어있지 않은 것만) — 부모 매칭 후보
  const csvTitles = new Set<string>();
  for (const row of data) {
    const title = (row['제목'] ?? '').trim();
    if (title) csvTitles.add(title);
  }

  const dbTitleSet = new Set(existingTitles);

  data.forEach((row, idx) => {
    const rowNumber = idx + 2; // 1행은 헤더
    const title = (row['제목'] ?? '').trim();
    if (!title) {
      excluded.push({ rowNumber, reason: '제목 누락' });
      return;
    }

    const description = (row['설명'] ?? '').trim() || null;
    const assignee = (row['담당자'] ?? '').trim() || null;
    const status = normalizeStatus((row['상태'] ?? '').trim());
    const progress = clampProgress((row['진행률'] ?? '').trim());

    const rawStart = (row['시작일'] ?? '').trim();
    const startDate = ISO_DATE_RE.test(rawStart) ? rawStart : null;
    const rawDue = (row['목표 기한'] ?? '').trim();
    const dueDate = ISO_DATE_RE.test(rawDue) ? rawDue : null;

    const rawParent = (row['상위 작업 제목'] ?? '').trim();
    let parentTitle: string | null = null;
    let parentMatched: ParsedRow['parentMatched'] = 'none';

    if (rawParent) {
      // 우선순위: 기존 DB → CSV 같은 batch (SPEC §F-1 "먼저 매칭되는 것")
      if (dbTitleSet.has(rawParent)) {
        parentTitle = rawParent;
        parentMatched = 'existing';
      } else if (csvTitles.has(rawParent)) {
        parentTitle = rawParent;
        parentMatched = 'csv';
      } else {
        warnings.push({
          rowNumber,
          title,
          reason: `상위 매칭 실패 → 최상위로 처리 (${rawParent})`,
        });
      }
    }

    valid.push({
      title,
      description,
      assignee,
      status,
      progress,
      startDate,
      dueDate,
      parentTitle,
      parentMatched,
    });
  });

  return {
    valid,
    excluded,
    warnings,
    counts: { add: valid.length, exclude: excluded.length },
  };
}
