import type { FastifyInstance } from 'fastify'
import { env } from '@/config/env'

type Resources = {}

export async function verifyWebhook(app: FastifyInstance, _r: Resources) {
	// GET verification (Meta/WhatsApp webhook verification)
	app.get('/', {
		schema: {
			tags: ['Webhook'],
			summary: 'Verify WhatsApp webhook',
		},
		handler: async (req, reply) => {
			const query = req.query as Record<string, string | undefined>
			const mode = query['hub.mode']
			const token = query['hub.verify_token']
			const challenge = query['hub.challenge']

			if (mode === 'subscribe' && token === env.VERIFICATION_TOKEN) {
				return reply.status(200).send(challenge ?? 'OK')
			}
			return reply.status(403).send('Forbidden')
		},
	})
}
