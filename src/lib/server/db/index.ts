import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

const client = postgres(env.POSTGRES_DATABASE_URL);
export const db = drizzle(client, { schema });
