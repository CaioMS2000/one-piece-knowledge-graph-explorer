import multipart from '@fastify/multipart'

declare module '@fastify/multipart' {
	interface MultipartFile {
		value?: unknown
	}
}
