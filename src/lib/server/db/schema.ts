import {
	pgTable,
	serial,
	text,
	integer,
	timestamp,
	pgEnum,
	PgTable,
	json,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['USER', 'STAFF', 'REVIEWER', 'ORGANIZER']);
export const categoryEnum = pgEnum('category', ['GAME', 'WEBSITE', 'DESKTOP_APP', 'CLI', 'OTHER']);
export const shipStatusEnum = pgEnum('ship_status', ['PENDING', 'APPROVED', 'REJECTED']);
export const orderStatusEnum = pgEnum('order_status', ['PENDING', 'FULFILLED']);
export const auditCategory = pgEnum('audit_category', [
	'ORDER_INFO',
	'FULFILL',
	'EDIT_USER',
	'SHIP_REVIEW',
	'SHOP_ITEM',
]);

export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	hcaId: text('hca_id').unique(),
	slackId: text('slack_id').notNull().unique(),
	username: text('username').notNull(),
	avatarUrl: text('avatar_url'),
	accessToken: text('access_token'), // encrypted Hackatime token
	notesBalance: integer('notes_balance').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	roles: roleEnum('roles').array().notNull().default(['USER']),
	referrals: integer('referrals').notNull().default(0),
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
	createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const ships = pgTable('ships', {
	id: serial('id').primaryKey(),
	projectId: integer('project_id')
		.notNull()
		.references(() => projects.id),
	seconds: integer('seconds').notNull(),
	status: shipStatusEnum('status').notNull().default('PENDING'),
	submittedAt: timestamp('submitted_at').notNull().defaultNow(),
	feedback: text('feedback'),
});

export const notesLedger = pgTable('notes_ledger', {
	id: serial('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	delta: integer('delta').notNull(),
	reason: text('reason').notNull(),
	refId: integer('ref_id'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const shopItems = pgTable('shop_items', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	description: text('description'),
	cost: integer('cost').notNull(),
	imageUrl: text('imageUrl'),
});

// important fields will be encrypted
export const orders = pgTable('orders', {
	id: serial('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	itemId: integer('item_id')
		.notNull()
		.references(() => shopItems.id),
	status: orderStatusEnum('status').notNull().default('PENDING'),
	fullName: text('full_name').notNull(),
	email: text('email').notNull(),
	addressLine1: text('address_line_1').notNull(),
	addressLine2: text('address_line_2'),
	city: text('city').notNull(),
	state: text('state').notNull(),
	country: text('country').notNull(),
	zipCode: text('zipcode').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
	id: serial('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	category: auditCategory('category').notNull(),
	data: json('data'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
});
