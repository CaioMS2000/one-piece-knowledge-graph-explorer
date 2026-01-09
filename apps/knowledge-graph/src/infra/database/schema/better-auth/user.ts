import { pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const authUserRole = pgEnum('auth_user_role', [
	'platform_admin',
	'tenant_manager',
	'tenant_employee',
])

export const authUsers = pgTable('auth_users', {
	id: text('id').primaryKey(),
	email: text('email').unique(),
	hashed_password: text('hashed_password'),
	role: authUserRole('role').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
})

export type AuthUser = typeof authUsers.$inferSelect
export type InsertAuthUser = typeof authUsers.$inferInsert
