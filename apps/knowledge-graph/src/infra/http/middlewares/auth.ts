import { fromNodeHeaders } from 'better-auth/node'
import type { FastifyInstance } from 'fastify'
import fastifyPlugin from 'fastify-plugin'

export const auth = fastifyPlugin(async (app: FastifyInstance) => {
	app.decorateRequest('currentSession', null)
	app.decorateRequest('currentUser', null)

	app.addHook('preHandler', async req => {
		const headers = fromNodeHeaders(req.headers)
		try {
			const sessionResult = await req.auth.api.getSession({
				headers,
			})

			req.currentSession = sessionResult?.session ?? null
			req.currentUser = sessionResult?.user ?? null
		} catch (error) {
			req.log.debug({ err: error }, 'Failed to resolve session via Better Auth')
			req.currentSession = null
			req.currentUser = null
		}
	})
})
