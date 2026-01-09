import 'fastify'
import type { AppDependencies } from '../dependencies-container'
import type { Auth } from 'better-auth'

declare module 'fastify' {
	interface FastifyInstance {
		resources: AppDependencies
		auth: Auth
	}

	interface FastifyRequest {
		resources: AppDependencies
		auth: Auth
		currentSession: unknown | null
		currentUser: unknown | null
	}
}
