import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

let database: PostgresJsDatabase<typeof schema> | undefined;

function getDb() {
	if (!env.POSTGRES_DATABASE_URL) {
		throw new Error('POSTGRES_DATABASE_URL is required');
	}

	if (!database) {
		const client = postgres(env.POSTGRES_DATABASE_URL);
		database = drizzle(client, { schema });
	}

	return database;
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
	get(_target, property, receiver) {
		return Reflect.get(getDb(), property, receiver);
	},
});
