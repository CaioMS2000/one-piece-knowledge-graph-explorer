import { config } from 'dotenv'
import { z } from 'zod'

config({
	path: '.env',
	// override: process.env.NODE_ENV !== 'production',
	override: true,
})

export const envSchema = z.object({
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),
	DATABASE_URL: z.string(),
	PORT: z.coerce.number().catch(8000),
})

const env = envSchema.parse(process.env)

export { env }
