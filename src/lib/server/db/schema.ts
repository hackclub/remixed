import {
	pgTable,
	serial,
	text,
	integer,
	timestamp,
	pgEnum,
	json,
	real,
	boolean,
} from 'drizzle-orm/pg-core';
import { PROJECT_CATEGORIES } from '$lib';

export const roleEnum = pgEnum('role', ['USER', 'STAFF', 'REVIEWER', 'ORGANIZER', 'HQ']);
export const categoryEnum = pgEnum('category', PROJECT_CATEGORIES);
export const shipStatusEnum = pgEnum('ship_status', [
	'PENDING',
	'APPROVED',
	'REJECTED',
	'CANCELLED',
	'REVIEWER_APPROVED',
]);
export const orderStatusEnum = pgEnum('order_status', ['PENDING', 'FULFILLED']);
export const auditCategory = pgEnum('audit_category', [
	'ORDER_INFO',
	'FULFILL',
	'EDIT_USER',
	'SHIP_REVIEW',
	'SHOP_ITEM',
	'PROJECT',
]);
export const reviewTypeEnum = pgEnum('review_type', [
	'APPROVAL',
	'REJECTION',
	'COMMENT',
	'HQ_APPROVAL',
	'HQ_REJECTION',
]);

export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	hcaId: text('hca_id').unique(),
	slackId: text('slack_id').notNull().unique(),
	username: text('username').notNull(),
	avatarUrl: text('avatar_url'),
	accessToken: text('access_token'), // encrypted Hackatime token
	hackatimeId: text('hackatime_id'),
	notesBalance: integer('notes_balance').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	roles: roleEnum('roles').array().notNull().default(['USER']),
	referrals: integer('referrals').notNull().default(0),
	email: text('email'),
	firstName: text('first_name'),
	lastName: text('last_name'),
	birthday: text('birthday'),
	addressLine1: text('address_line_1'),
	addressLine2: text('address_line_2'),
	city: text('city'),
	state: text('state'),
	country: text('country'),
	zipCode: text('zipcode'),
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
	committedSeconds: integer('committed_seconds').notNull().default(0),
});

export const ships = pgTable('ships', {
	id: serial('id').primaryKey(),
	projectId: integer('project_id')
		.notNull()
		.references(() => projects.id),
	seconds: integer('seconds').notNull(),
	capturedSeconds: integer('captured_seconds'),
	status: shipStatusEnum('status').notNull().default('PENDING'),
	submittedAt: timestamp('submitted_at').notNull().defaultNow(),
	feedback: text('feedback'),
});

export const shipReviews = pgTable('ship_reviews', {
	id: serial('id').primaryKey(),
	shipId: integer('ship_id')
		.notNull()
		.references(() => ships.id),
	reviewerId: integer('reviewer_id')
		.notNull()
		.references(() => users.id),
	type: reviewTypeEnum('type').notNull(),
	userComment: text('user_comment'),
	internalComment: text('internal_comment'),
	isInternal: boolean('is_internal').notNull().default(false),
	adjustedHours: real('adjusted_hours'),
	notesPerHour: integer('notes_per_hour'),
	slackMessageTs: text('slack_message_ts'),
	slackChannelId: text('slack_channel_id'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/**
 * A community reviewer's proposed approval of a ship. A suggestion is NOT a
 * review event — it is a recommendation surfaced to HQ members, who either
 * authorize it (which materializes the real reviewer + HQ approval reviews) or
 * discard it (which simply drops the suggestion). A ship is `REVIEWER_APPROVED`
 * exactly while it has a live suggestion awaiting HQ action.
 */
export const shipSuggestions = pgTable('ship_suggestions', {
	id: serial('id').primaryKey(),
	shipId: integer('ship_id')
		.notNull()
		.references(() => ships.id),
	reviewerId: integer('reviewer_id')
		.notNull()
		.references(() => users.id),
	userComment: text('user_comment'),
	internalComment: text('internal_comment'),
	adjustedHours: real('adjusted_hours'),
	notesPerHour: integer('notes_per_hour'),
	// A discarded suggestion is kept (soft-deleted) so the community review
	// remains visible in history as a "discarded approval" rather than vanishing.
	// A live, pending-HQ suggestion has discardedAt IS NULL.
	discardedAt: timestamp('discarded_at'),
	discardedById: integer('discarded_by_id').references(() => users.id),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
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
	fulfillerContext: text('fulfiller_context'),
	cost: integer('cost').notNull(),
	imageUrl: text('imageUrl'),
	categories: text('categories').array().default([]),
});

export const deletedProjects = pgTable('deleted_projects', {
	id: serial('id').primaryKey(),
	originalId: integer('original_id').notNull().unique(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	title: text('title').notNull(),
	description: text('description'),
	coverArt: text('cover_art_url'),
	category: categoryEnum('category').notNull(),
	hackatimeProjects: text('hackatime_projects').array().notNull(),
	hackatimeSeconds: integer('hackatime_seconds'),
	githubUrl: text('github_url'),
	demoUrl: text('demo_url'),
	createdAt: timestamp('created_at').notNull(),
	deletedAt: timestamp('deleted_at').notNull().defaultNow(),
	deletedByUserId: integer('deleted_by_user_id')
		.notNull()
		.references(() => users.id),
});

export const deletedShips = pgTable('deleted_ships', {
	id: serial('id').primaryKey(),
	originalId: integer('original_id').notNull().unique(),
	projectId: integer('project_id').notNull(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	seconds: integer('seconds').notNull(),
	status: shipStatusEnum('status').notNull(),
	submittedAt: timestamp('submitted_at').notNull(),
	feedback: text('feedback'),
	deletedAt: timestamp('deleted_at').notNull().defaultNow(),
	deletedByUserId: integer('deleted_by_user_id')
		.notNull()
		.references(() => users.id),
});

export const deletedShopItems = pgTable('deleted_shop_items', {
	id: serial('id').primaryKey(),
	originalId: integer('original_id').notNull().unique(),
	name: text('name').notNull(),
	description: text('description'),
	cost: integer('cost').notNull(),
	imageUrl: text('image_url'),
	categories: text('categories').array().default([]),
	deletedAt: timestamp('deleted_at').notNull().defaultNow(),
	deletedByUserId: integer('deleted_by_user_id')
		.notNull()
		.references(() => users.id),
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
	reference: text('reference'),
	adminNotes: text('admin_notes'),
	userNotes: text('user_notes'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	fulfilledAt: timestamp('fulfilled_at'),
});

export const mcpTokens = pgTable('mcp_tokens', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	tokenHash: text('token_hash').notNull().unique(),
	tokenPrefix: text('token_prefix').notNull(),
	createdByUserId: integer('created_by_user_id')
		.notNull()
		.references(() => users.id),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	lastUsedAt: timestamp('last_used_at'),
	revokedAt: timestamp('revoked_at'),
});

export const auditLogs = pgTable('audit_logs', {
	id: serial('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	category: auditCategory('category').notNull(),
	data: json('data').$type<Record<string, unknown> | null>(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
});
