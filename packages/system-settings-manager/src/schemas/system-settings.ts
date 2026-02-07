import { sql } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const systemSettings = pgTable('system_settings', {
	key: text('key').primaryKey(),
	value: jsonb('value').$type<unknown>().notNull(),
	description: text('description'),
	updatedBy: text('updated_by'),
	createdAt: timestamp('created_at', { withTimezone: true })
		.default(sql`now()`)
		.notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.default(sql`now()`)
		.notNull(),
	deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export type SystemSettingDrizzleModel = typeof systemSettings.$inferSelect
export type SystemSettingDrizzleInput = typeof systemSettings.$inferInsert
