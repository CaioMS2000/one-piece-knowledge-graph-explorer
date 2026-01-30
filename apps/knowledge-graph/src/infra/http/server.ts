import fastifyCors from '@fastify/cors'
import { toNodeHandler } from 'better-auth/node'
import { FastifyListenOptions } from 'fastify'
import { env } from '@/config/env'
import { app } from './app'
import { createLogger } from '@repo/core'

const logger = createLogger('Server')

app.get('/health', async () => ({ status: 'ok' }))

async function bootstrap() {
	const systemConfigService = container.resolve(TOKENS.SystemConfigService)
	const auth = container.resolve(TOKENS.Auth)

	try {
		await systemConfigService.loadAll()
	} catch (error) {
		app.log.error({ err: error }, 'Failed to initialize dependencies')
		process.exit(1)
	}

	const corsOrigins = systemConfigService.getArray<string>('cors.origins', [
		'*',
	])
	const corsCredentials = systemConfigService.getBoolean(
		'cors.credentials',
		true
	)

	app.decorate('auth', auth)
	app.decorateRequest('auth', {
		getter() {
			return auth
		},
	})

	await app.register(fastifyCors, {
		origin: corsOrigins,
		credentials: corsCredentials,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
	})

	const authHandler = toNodeHandler(auth)

	app.all('/auth/*', async (req, reply) => {
		reply.hijack()
		await authHandler(req.raw, reply.raw)
	})

	app.all('/auth', async (req, reply) => {
		reply.hijack()
		await authHandler(req.raw, reply.raw)
	})

	const config: FastifyListenOptions = {
		port: env.PORT,
	}

	if (env.NODE_ENV === 'production') {
		config.host = '0.0.0.0'
	}

	try {
		const address = await app.listen({ ...config })
		let str = ''
		str += address
		str += `\nsystem mode: ${env.NODE_ENV}`
		const nodeEnv = String(env.NODE_ENV).toLowerCase()
		str += `\nlog level: ${nodeEnv === 'development' || nodeEnv === 'test' ? 'debug' : 'info'}`
		str += '\n'
		logger.debug(str)
	} catch (error) {
		app.log.error(error)
		process.exit(1)
	}
}

void bootstrap()
