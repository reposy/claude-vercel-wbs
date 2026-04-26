import type { Task } from '@/lib/db/schema';

// 'YYYY-MM-DD' 문자열 사전순 비교만 사용. new Date() 변환은 UTC 새벽 함정으로 하루 어긋남.
export function isOverdue(
  task: Pick<Task, 'dueDate' | 'status'>,
  today: string,
): boolean {
  if (task.status === 'done') return false;
  if (!task.dueDate) return false;
  return task.dueDate < today;
}
