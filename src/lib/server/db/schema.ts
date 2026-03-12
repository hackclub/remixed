import { pgTable, serial, text, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['USER', 'ADMIN']);
export const categoryEnum = pgEnum('category', ['GAME', 'WEBSITE', 'DESKTOP_APP', 'CLI', 'OTHER']);
export const shipStatusEnum = pgEnum('ship_status', ['PENDING', 'APPROVED', 'REJECTED']);
export const orderStatusEnum = pgEnum('order_status', ['PENDING', 'FULFILLED']);

export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	slackId: text('slack_id').notNull().unique(),
	username: text('username').notNull(),
	avatarUrl: text('avatar_url'),
	accessToken: text('access_token').notNull(), // encrypted
	notesBalance: integer('notes_balance').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	role: roleEnum('role').notNull().default('USER')
});

export const projects = pgTable('projects', {
	id: serial('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	title: text('title').notNull(),
	description: text('description'),
	coverArt: text('cover_art_url'),
	category: categoryEnum('category').notNull(),
	hackatimeProjects: text('hackatime_projects').array().notNull().default([]),
	hackatimeSeconds: integer('hackatime_seconds'),
	githubUrl: text('github_url'),
	demoUrl: text('demo_url'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const ships = pgTable('ships', {
	id: serial('id').primaryKey(),
	projectId: integer('project_id')
		.notNull()
		.references(() => projects.id),
	seconds: integer('seconds').notNull(),
	status: shipStatusEnum('status').notNull().default('PENDING'),
	submittedAt: timestamp('submitted_at').notNull().defaultNow()
});

export const reviews = pgTable('reviews', {
	id: serial('id').primaryKey(),
	shipId: integer('ship_id')
		.notNull()
		.references(() => ships.id),
	reviewerId: integer('reviewer_id')
		.notNull()
		.references(() => users.id),
	decision: shipStatusEnum('decision').notNull(),
	note: text('note'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const notesLedger = pgTable('notes_ledger', {
	id: serial('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	delta: integer('delta').notNull(),
	reason: text('reason').notNull(),
	refId: integer('ref_id'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const shopItems = pgTable('shop_items', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	cost: integer('cost').notNull(),
	stock: integer('stock')
});

export const orders = pgTable('orders', {
	id: serial('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	itemId: integer('item_id')
		.notNull()
		.references(() => shopItems.id),
	status: orderStatusEnum('status').notNull().default('PENDING'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});
