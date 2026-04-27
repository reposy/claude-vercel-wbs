import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// prepare:false → Supabase Transaction Pooler(6543) 호환. max:1 → Vercel serverless function 인스턴스당 단일 connection.
const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });

export const db = drizzle(client, { schema });
