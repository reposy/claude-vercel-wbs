import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { z } from 'zod';
import { tasks as tasksTable } from '@/lib/db/schema';

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getClient() {
  if (!_client) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL이 설정되지 않았습니다');
    }
    _client = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
    _db = drizzle(_client);
  }
  return { client: _client, db: _db! };
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다');

export const taskStatus = z.enum(['todo', 'doing', 'done']);

export const createTaskInput = {
  title: z.string().min(1, '제목은 필수입니다'),
  description: z.string().optional(),
  assignee: z.string().optional(),
  status: taskStatus.optional(),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: isoDate.optional(),
  dueDate: isoDate.optional(),
  parentId: z.string().uuid().optional(),
} as const;

export const updateTaskInput = {
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  assignee: z.string().nullable().optional(),
  status: taskStatus.optional(),
  progress: z.number().int().min(0).max(100).optional(),
  startDate: isoDate.nullable().optional(),
  dueDate: isoDate.nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
} as const;

export const getTaskInput = {
  id: z.string().uuid(),
} as const;

export const deleteTaskInput = {
  id: z.string().uuid(),
} as const;

type CreateTaskArgs = {
  title: string;
  description?: string;
  assignee?: string;
  status?: 'todo' | 'doing' | 'done';
  progress?: number;
  startDate?: string;
  dueDate?: string;
  parentId?: string;
};

type UpdateTaskArgs = {
  id: string;
  title?: string;
  description?: string | null;
  assignee?: string | null;
  status?: 'todo' | 'doing' | 'done';
  progress?: number;
  startDate?: string | null;
  dueDate?: string | null;
  parentId?: string | null;
};

function assertDateOrder(start: string | null | undefined, due: string | null | undefined) {
  if (start && due && due < start) {
    throw new Error('목표 기한은 시작일 이후여야 합니다');
  }
}

export async function listTasks() {
  const { db } = getClient();
  const rows = await db.select().from(tasksTable);
  return rows;
}

export async function getTask(args: { id: string }) {
  const { db } = getClient();
  const rows = await db.select().from(tasksTable).where(eq(tasksTable.id, args.id)).limit(1);
  if (rows.length === 0) {
    throw new Error(`작업을 찾을 수 없습니다: ${args.id}`);
  }
  return rows[0];
}

export async function createTask(args: CreateTaskArgs) {
  assertDateOrder(args.startDate, args.dueDate);

  const { db } = getClient();

  let status = args.status ?? 'todo';
  const progress = args.progress ?? 0;
  if (progress === 100) status = 'done';

  const inserted = await db
    .insert(tasksTable)
    .values({
      title: args.title,
      description: args.description ?? null,
      assignee: args.assignee ?? null,
      status,
      progress,
      startDate: args.startDate ?? null,
      dueDate: args.dueDate ?? null,
      parentId: args.parentId ?? null,
    })
    .returning();

  return inserted[0];
}

export async function updateTask(args: UpdateTaskArgs) {
  const { db } = getClient();

  const existing = await db.select().from(tasksTable).where(eq(tasksTable.id, args.id)).limit(1);
  if (existing.length === 0) {
    throw new Error(`작업을 찾을 수 없습니다: ${args.id}`);
  }
  const current = existing[0];

  const nextStartDate = args.startDate !== undefined ? args.startDate : current.startDate;
  const nextDueDate = args.dueDate !== undefined ? args.dueDate : current.dueDate;
  assertDateOrder(nextStartDate, nextDueDate);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (args.title !== undefined) patch.title = args.title;
  if (args.description !== undefined) patch.description = args.description;
  if (args.assignee !== undefined) patch.assignee = args.assignee;
  if (args.startDate !== undefined) patch.startDate = args.startDate;
  if (args.dueDate !== undefined) patch.dueDate = args.dueDate;
  if (args.parentId !== undefined) patch.parentId = args.parentId;
  if (args.status !== undefined) patch.status = args.status;
  if (args.progress !== undefined) {
    patch.progress = args.progress;
    if (args.progress === 100) patch.status = 'done';
  }

  const updated = await db
    .update(tasksTable)
    .set(patch)
    .where(eq(tasksTable.id, args.id))
    .returning();

  return updated[0];
}

export async function deleteTask(args: { id: string }) {
  const { db } = getClient();

  const deleted = await db
    .delete(tasksTable)
    .where(eq(tasksTable.id, args.id))
    .returning({ id: tasksTable.id });

  if (deleted.length === 0) {
    throw new Error(`작업을 찾을 수 없습니다: ${args.id}`);
  }
  return { id: deleted[0].id, deleted: true };
}

export async function closeMcpDb() {
  if (_client) {
    await _client.end({ timeout: 5 });
    _client = null;
    _db = null;
  }
}
