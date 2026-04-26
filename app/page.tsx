import { asc, count, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { TaskList } from '@/components/task-list';

export default async function Page() {
  const allTasks = await db.select().from(tasks).orderBy(asc(tasks.createdAt));
  const childCountRows = await db
    .select({ parentId: tasks.parentId, n: count() })
    .from(tasks)
    .where(isNotNull(tasks.parentId))
    .groupBy(tasks.parentId);

  const childCounts: Record<string, number> = {};
  for (const row of childCountRows) {
    if (row.parentId) childCounts[row.parentId] = Number(row.n);
  }

  return <TaskList tasks={allTasks} childCounts={childCounts} />;
}
