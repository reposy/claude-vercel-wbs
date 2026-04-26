'use server';

import { revalidatePath } from 'next/cache';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import type { ParsedRow } from '@/lib/csv/parse';

export type CsvImportResult =
  | { ok: true; inserted: number }
  | { ok: false; error: string };

export async function applyCsvImport(rows: ParsedRow[]): Promise<CsvImportResult> {
  if (rows.length === 0) {
    return { ok: true, inserted: 0 };
  }

  try {
    await db.transaction(async (tx) => {
      // pass 1: 모든 valid row를 parentId=null 로 insert
      const newIds: string[] = [];
      const csvTitleToNewId = new Map<string, string>();

      for (const row of rows) {
        const [inserted] = await tx
          .insert(tasks)
          .values({
            title: row.title,
            description: row.description,
            assignee: row.assignee,
            status: row.status,
            progress: row.progress,
            startDate: row.startDate,
            dueDate: row.dueDate,
            parentId: null,
          })
          .returning({ id: tasks.id });
        newIds.push(inserted.id);
        // 같은 제목이 batch에 여러 번이면 첫 행을 부모 매칭 후보로 (SPEC §F-1)
        if (!csvTitleToNewId.has(row.title)) {
          csvTitleToNewId.set(row.title, inserted.id);
        }
      }

      // pass 2 준비: 기존 DB의 (title → id) 맵. createdAt 오름차순으로 첫 매칭만 채택.
      const newIdSet = new Set(newIds);
      const allRows = await tx
        .select({ id: tasks.id, title: tasks.title })
        .from(tasks)
        .orderBy(asc(tasks.createdAt));
      const existingTitleToId = new Map<string, string>();
      for (const t of allRows) {
        if (newIdSet.has(t.id)) continue;
        if (!existingTitleToId.has(t.title)) {
          existingTitleToId.set(t.title, t.id);
        }
      }

      // pass 2: parentId 업데이트
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.parentTitle) continue;
        let parentId: string | undefined;
        if (row.parentMatched === 'existing') {
          parentId = existingTitleToId.get(row.parentTitle);
        } else if (row.parentMatched === 'csv') {
          parentId = csvTitleToNewId.get(row.parentTitle);
        }
        if (!parentId) continue;
        await tx.update(tasks).set({ parentId }).where(eq(tasks.id, newIds[i]));
      }
    });
  } catch (e) {
    console.error('applyCsvImport failed', e);
    return { ok: false, error: '가져오기 적용 중 오류가 발생했습니다.' };
  }

  revalidatePath('/');
  return { ok: true, inserted: rows.length };
}
