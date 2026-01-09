import { env } from '@/config/env'
import fastifyCookie from '@fastify/cookie'
import fastifyMultipart from '@fastify/multipart'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'
import ScalarApiReference from '@scalar/fastify-api-reference'
import { fastify } from 'fastify'
import {
	jsonSchemaTransform,
	serializerCompiler,
	validatorCompiler,
} from 'fastify-type-provider-zod'
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes'
import { requestLogger } from './middlewares/plugins/request-logger'
import { errorHandler } from './middlewares/error-handler'
import { auth as authMiddleware } from './middlewares/auth'

const app = fastify({ trustProxy: true })

// third-party resources
app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

// zod -> JSON Schema transform com fallback para esquemas já em JSON Schema
const safeTransform: typeof jsonSchemaTransform = input => {
	try {
		return jsonSchemaTransform(input)
	} catch {
		return input.schema as any
	}
}

app.register(swagger, {
	openapi: {
		openapi: '3.1.0',
		info: { title: 'One Piece Knowledge Graph API', version: '1.0.0' },
		components: {
			securitySchemes: {
				cookieAuth: {
					type: 'apiKey',
					in: 'cookie',
					name: env.HTTP_COOKIE_NAME,
				},
			},
		},
		security: [{ cookieAuth: [] }],
	},
	transform: safeTransform,
})

const theme = new SwaggerTheme()
const content = theme.getBuffer(SwaggerThemeNameEnum.DARK)

app.register(swaggerUI, {
	routePrefix: '/docs/swagger',
	theme: {
		css: [
			{
				filename: 'theme.css',
				content,
			},
		],
	},
})
app.register(ScalarApiReference, {
	routePrefix: '/docs',
})

app.register(fastifyCookie)
app.register(fastifyMultipart, {
	attachFieldsToBody: true,
	async onFile(part) {
		const buf = await part.toBuffer()

		part.value = {
			buffer: buf,
			filename: part.filename,
			mimetype: part.mimetype,
			encoding: part.encoding,
		}
	},
})

// custom resources
app.register(requestLogger)
app.register(authMiddleware)
app.setErrorHandler(errorHandler)

export { app }
