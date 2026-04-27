import { asc, count, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { TasksView } from '@/components/tasks-view';

// Task 목록은 매 요청마다 fresh DB fetch가 본질. 빌드 시점 prerender(default)는 도쿄 Supabase outbound로 60s timeout을 유발한다.
export const dynamic = 'force-dynamic';

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

  return <TasksView tasks={allTasks} childCounts={childCounts} />;
}
