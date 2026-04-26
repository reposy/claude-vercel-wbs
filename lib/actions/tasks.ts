'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import {
  ERROR_MESSAGES,
  TASK_STATUSES,
  validateTaskInput,
  type TaskInput,
  type ValidationError,
} from '@/lib/validation/task';

export type ActionResult = { ok: true } | { ok: false; errors: ValidationError[] };

function applyAutoCompleteRule(input: TaskInput): TaskInput {
  if (input.progress === 100) return { ...input, status: 'done' };
  return input;
}

function normalize(input: TaskInput) {
  return {
    title: input.title.trim(),
    description: input.description?.trim() ? input.description.trim() : null,
    assignee: input.assignee?.trim() ? input.assignee.trim() : null,
    status: input.status ?? 'todo',
    progress: input.progress ?? 0,
    startDate: input.startDate || null,
    dueDate: input.dueDate || null,
    parentId: input.parentId || null,
  };
}

function saveFailure(): ActionResult {
  return { ok: false, errors: [{ field: 'general', message: ERROR_MESSAGES.saveFailed }] };
}

function deleteFailure(): ActionResult {
  return { ok: false, errors: [{ field: 'general', message: ERROR_MESSAGES.deleteFailed }] };
}

export async function createTask(input: TaskInput): Promise<ActionResult> {
  const adjusted = applyAutoCompleteRule(input);
  const errors = validateTaskInput(adjusted);
  if (errors.length) return { ok: false, errors };

  try {
    await db.insert(tasks).values(normalize(adjusted));
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    console.error('createTask failed', e);
    return saveFailure();
  }
}

export async function updateTask(id: string, input: TaskInput): Promise<ActionResult> {
  const adjusted = applyAutoCompleteRule(input);
  const errors = validateTaskInput(adjusted, { selfId: id });
  if (errors.length) return { ok: false, errors };

  try {
    await db
      .update(tasks)
      .set({ ...normalize(adjusted), updatedAt: new Date() })
      .where(eq(tasks.id, id));
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    console.error('updateTask failed', e);
    return saveFailure();
  }
}

export async function updateTaskStatus(id: string, status: string): Promise<ActionResult> {
  if (!TASK_STATUSES.includes(status as (typeof TASK_STATUSES)[number])) {
    return { ok: false, errors: [{ field: 'status', message: ERROR_MESSAGES.statusInvalid }] };
  }
  try {
    await db
      .update(tasks)
      .set({ status, updatedAt: new Date() })
      .where(eq(tasks.id, id));
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    console.error('updateTaskStatus failed', e);
    return saveFailure();
  }
}

export async function deleteTask(id: string): Promise<ActionResult> {
  try {
    await db.delete(tasks).where(eq(tasks.id, id));
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    console.error('deleteTask failed', e);
    return deleteFailure();
  }
}
