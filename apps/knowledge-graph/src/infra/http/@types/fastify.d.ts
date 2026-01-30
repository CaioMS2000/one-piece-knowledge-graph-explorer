import 'fastify'
import type { Auth } from 'better-auth'

declare module 'fastify' {
	interface FastifyInstance {
		auth: Auth
	}

	interface FastifyRequest {
		auth: Auth
		currentSession: unknown | null
		currentUser: unknown | null
	}
}
