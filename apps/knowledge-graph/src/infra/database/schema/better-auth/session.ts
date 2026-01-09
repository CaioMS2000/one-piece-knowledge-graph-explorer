import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { authUsers } from './user'

export const authSessions = pgTable('auth_sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => authUsers.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
})

export type AuthSession = typeof authSessions.$inferSelect
