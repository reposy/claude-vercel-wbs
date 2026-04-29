import { config } from 'dotenv';
config({ path: '.env.local' });

import { writeFileSync, readFileSync } from 'node:fs';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL이 설정되지 않았습니다 (.env.local 확인)');
}

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer } from '../lib/mcp/server';
import { closeMcpDb } from '../lib/mcp/tools/tasks';
import { tasks } from '../lib/db/schema';

type ToolResult = { name: string; ok: boolean; evidence: string };

const cleanupClient = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const cleanupDb = drizzle(cleanupClient);

function parseTextContent(result: unknown): unknown {
  const r = result as { content?: Array<{ type: string; text?: string }>; isError?: boolean };
  const text = r.content?.[0]?.text;
  if (typeof text !== 'string') {
    throw new Error('응답에 text content가 없습니다');
  }
  if (r.isError) {
    throw new Error(`tool error: ${text}`);
  }
  return JSON.parse(text);
}

async function main() {
  const existsRows = await cleanupDb.execute(
    sql`select to_regclass('public.tasks') as reg`,
  );
  const reg = (existsRows as unknown as Array<{ reg: string | null }>)[0]?.reg;
  if (!reg) {
    throw new Error(
      'tasks 테이블이 없습니다. supabase status로 컨테이너 RUNNING 확인 후 npm run db:migrate를 실행하세요.',
    );
  }

  const server = createMcpServer();
  const client = new Client({ name: 'verify-mcp', version: '0.0.1' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  const results: ToolResult[] = [];
  const createdIds: string[] = [];

  try {
    try {
      const r = await client.callTool({ name: 'list_tasks', arguments: {} });
      const arr = parseTextContent(r);
      const ok = Array.isArray(arr);
      results.push({
        name: 'list_tasks',
        ok,
        evidence: ok ? `count=${(arr as unknown[]).length}` : 'not array',
      });
    } catch (e) {
      results.push({
        name: 'list_tasks',
        ok: false,
        evidence: e instanceof Error ? e.message : String(e),
      });
    }

    let createdId = '';
    try {
      const r = await client.callTool({
        name: 'create_task',
        arguments: {
          title: 'verify-mcp test task',
          description: 'verify-mcp script가 만든 작업',
          progress: 25,
        },
      });
      const row = parseTextContent(r) as { id?: string };
      const ok = typeof row.id === 'string' && row.id.length > 0;
      if (ok && row.id) {
        createdId = row.id;
        createdIds.push(row.id);
      }
      results.push({
        name: 'create_task',
        ok,
        evidence: ok ? `id=${row.id}` : `bad row: ${JSON.stringify(row)}`,
      });
    } catch (e) {
      results.push({
        name: 'create_task',
        ok: false,
        evidence: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      if (!createdId) throw new Error('create_task 실패로 skip');
      const r = await client.callTool({
        name: 'get_task',
        arguments: { id: createdId },
      });
      const row = parseTextContent(r) as { id?: string; title?: string };
      const ok = row.id === createdId;
      results.push({
        name: 'get_task',
        ok,
        evidence: ok ? `id=${row.id} title=${row.title}` : `mismatch: ${JSON.stringify(row)}`,
      });
    } catch (e) {
      results.push({
        name: 'get_task',
        ok: false,
        evidence: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      if (!createdId) throw new Error('create_task 실패로 skip');
      const r = await client.callTool({
        name: 'update_task',
        arguments: { id: createdId, progress: 100 },
      });
      const row = parseTextContent(r) as { status?: string; progress?: number };
      const ok = row.status === 'done' && row.progress === 100;
      results.push({
        name: 'update_task',
        ok,
        evidence: ok
          ? `status=done progress=100`
          : `status=${row.status} progress=${row.progress}`,
      });
    } catch (e) {
      results.push({
        name: 'update_task',
        ok: false,
        evidence: e instanceof Error ? e.message : String(e),
      });
    }

    try {
      if (!createdId) throw new Error('create_task 실패로 skip');
      await client.callTool({
        name: 'delete_task',
        arguments: { id: createdId },
      });
      const list = await client.callTool({ name: 'list_tasks', arguments: {} });
      const arr = parseTextContent(list) as Array<{ id: string }>;
      const stillThere = arr.some((t) => t.id === createdId);
      const ok = !stillThere;
      results.push({
        name: 'delete_task',
        ok,
        evidence: ok ? `absent id=${createdId}` : `still present id=${createdId}`,
      });
      if (ok) {
        const idx = createdIds.indexOf(createdId);
        if (idx >= 0) createdIds.splice(idx, 1);
      }
    } catch (e) {
      results.push({
        name: 'delete_task',
        ok: false,
        evidence: e instanceof Error ? e.message : String(e),
      });
    }
  } finally {
    for (const id of createdIds) {
      try {
        await cleanupDb.delete(tasks).where(eq(tasks.id, id));
      } catch (e) {
        console.error('cleanup 실패', id, e);
      }
    }

    try {
      await client.close();
    } catch {}
    try {
      await server.close();
    } catch {}
  }

  const all_passed = results.every((r) => r.ok) && results.length === 5;
  const payload = { tools: results, all_passed };
  writeFileSync('verify-result.json', JSON.stringify(payload, null, 2));
  console.log(readFileSync('verify-result.json', 'utf-8'));

  await closeMcpDb();
  await cleanupClient.end({ timeout: 5 });
  process.exit(all_passed ? 0 : 1);
}

main().catch(async (err) => {
  console.error('verify-mcp 실패:', err);
  try {
    await closeMcpDb();
  } catch {}
  try {
    await cleanupClient.end({ timeout: 5 });
  } catch {}
  process.exit(1);
});
