// import multipart from '@fastify/multipart'
import '@fastify/multipart'

declare module '@fastify/multipart' {
	interface MultipartFile {
		value?: unknown
	}
}
