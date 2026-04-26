export const TASK_STATUSES = ['todo', 'doing', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export type TaskInput = {
  title: string;
  description?: string | null;
  assignee?: string | null;
  status?: string;
  progress?: number;
  startDate?: string | null;
  dueDate?: string | null;
  parentId?: string | null;
};

export type ValidationError = {
  field: 'title' | 'status' | 'progress' | 'startDate' | 'dueDate' | 'parentId' | 'general';
  message: string;
};

export const ERROR_MESSAGES = {
  titleRequired: '제목을 입력해 주세요',
  statusInvalid: '상태 값이 올바르지 않습니다',
  progressOutOfRange: '진행률은 0과 100 사이의 정수여야 합니다',
  dueBeforeStart: '목표 기한은 시작일 이후여야 합니다',
  selfParent: '상위 작업은 자기 자신이 될 수 없습니다',
  saveFailed: '저장 중 오류가 발생했습니다. 다시 시도해 주세요.',
  deleteFailed: '삭제 중 오류가 발생했습니다. 다시 시도해 주세요.',
} as const;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateTaskDates(input: { startDate?: string | null; dueDate?: string | null }): ValidationError | null {
  const { startDate, dueDate } = input;
  if (!startDate || !dueDate) return null;
  if (!ISO_DATE_RE.test(startDate) || !ISO_DATE_RE.test(dueDate)) return null;
  if (dueDate < startDate) {
    return { field: 'dueDate', message: ERROR_MESSAGES.dueBeforeStart };
  }
  return null;
}

export function validateTaskInput(input: TaskInput, opts: { selfId?: string } = {}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.title || input.title.trim().length === 0) {
    errors.push({ field: 'title', message: ERROR_MESSAGES.titleRequired });
  }

  if (input.status !== undefined && !TASK_STATUSES.includes(input.status as TaskStatus)) {
    errors.push({ field: 'status', message: ERROR_MESSAGES.statusInvalid });
  }

  if (input.progress !== undefined) {
    const p = input.progress;
    if (!Number.isInteger(p) || p < 0 || p > 100) {
      errors.push({ field: 'progress', message: ERROR_MESSAGES.progressOutOfRange });
    }
  }

  const dateError = validateTaskDates({ startDate: input.startDate, dueDate: input.dueDate });
  if (dateError) errors.push(dateError);

  if (opts.selfId && input.parentId && input.parentId === opts.selfId) {
    errors.push({ field: 'parentId', message: ERROR_MESSAGES.selfParent });
  }

  return errors;
}

export function nextStatus(current: string): TaskStatus {
  const idx = TASK_STATUSES.indexOf(current as TaskStatus);
  if (idx === -1) return 'todo';
  return TASK_STATUSES[(idx + 1) % TASK_STATUSES.length];
}

export function clampProgress(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.trunc(n);
}
