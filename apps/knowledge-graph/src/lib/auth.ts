import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { env } from '@/config/env'
import { authSessions, authUsers } from '@/infra/database/schema'
import { database } from '@/lib/drizzle'

const baseUrlString = process.env.APP_BASE_URL ?? `http://localhost:${env.PORT}`
const baseUrl = new URL(baseUrlString)
baseUrl.pathname = '/auth'

export const auth = betterAuth({
	baseURL: baseUrl.toString(),
	database: drizzleAdapter(database, {
		provider: 'pg',
		schema: {
			user: authUsers,
			session: authSessions,
		},
	}),
})

export type Auth = typeof auth
