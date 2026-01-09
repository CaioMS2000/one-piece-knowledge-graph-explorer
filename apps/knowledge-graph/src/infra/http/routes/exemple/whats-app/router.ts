import type { FastifyInstance } from 'fastify'
import fastifyPlugin from 'fastify-plugin'
import { ExtractResources } from '../@types'
import { receiveMessage } from './receive-message'
import { verifyWebhook } from './verify-webhook'

const routes = [verifyWebhook, receiveMessage] as const

type Resources = ExtractResources<typeof routes>

export const router = fastifyPlugin(
	async (app: FastifyInstance, resources: Resources) => {
		for (const registerRoute of routes) {
			await registerRoute(app, resources)
		}
	}
)
