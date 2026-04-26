import type { Task } from '@/lib/db/schema';

export type FlatNode = { task: Task; depth: number };

export function flattenTree(tasks: Task[], collapsedIds: Set<string>): FlatNode[] {
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
