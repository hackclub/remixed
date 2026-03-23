import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const connectionString = process.env.POSTGRES_DATABASE_URL;

if (!connectionString) {
	throw new Error('POSTGRES_DATABASE_URL is required to run Drizzle migrations');
}

console.log('Running Drizzle migrations...');

const client = postgres(connectionString, { max: 1 });

try {
	await migrate(drizzle(client), { migrationsFolder: './drizzle' });
	console.log('Drizzle migrations complete');
} finally {
	await client.end();
}
