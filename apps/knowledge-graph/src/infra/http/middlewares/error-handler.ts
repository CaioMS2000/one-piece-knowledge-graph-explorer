import { env } from '@/config/env'
import { AppError, toErrorEnvelope } from '@/infra/http/errors'
import { createLogger } from '@repo/core'
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

const logger = createLogger('ErrorHandler')

function serializeError(err: any): Record<string, unknown> {
	if (!err || typeof err !== 'object') return { message: String(err) }
	const base: Record<string, unknown> = {
		name: (err as any).name,
		message: (err as any).message,
		stack: (err as any).stack,
	}
	const code = (err as any).code
	const statusCode = (err as any).statusCode
	if (code) base.code = code
	if (statusCode) base.statusCode = statusCode
	const cause = (err as any).cause
	if (cause) base.cause = serializeError(cause)
	return base
}

export function errorHandler(
	error: FastifyError,
	request: FastifyRequest,
	reply: FastifyReply
): void {
	const rid = (request as any)._reqId as string | undefined
	const hdrs = { ...request.headers }
	if ((hdrs as any).authorization) (hdrs as any).authorization = '***'
	if ((hdrs as any).cookie) (hdrs as any).cookie = '***'
	logger.error('http_error', {
		component: 'http',
		requestId: rid,
		method: request.method,
		url: request.url,
		headers: hdrs,
		params: request.params as any,
		query: request.query as any,
		err: serializeError(error),
	})

	// AppError: envelope padronizado
	if (error instanceof AppError) {
		if (error.statusCode === 401) {
			reply.clearCookie(env.HTTP_COOKIE_NAME, { path: '/' })
		}
		reply.status(error.statusCode).send(toErrorEnvelope(error))
		return
	}

	// ZodError -> 422
	if (error instanceof ZodError) {
		const appErr = AppError.validation(error.issues)
		reply.status(appErr.statusCode).send(toErrorEnvelope(appErr))
		return
	}

	// Mapeamento mínimo por statusCode quando não for AppError
	const sc = (error as any)?.statusCode as number | undefined
	if (sc === 401) {
		const appErr = AppError.unauthenticated('Sessão expirada ou ausente.')
		reply.clearCookie(env.HTTP_COOKIE_NAME, { path: '/' })
		reply.status(appErr.statusCode).send(toErrorEnvelope(appErr))
		return
	}
	if (sc === 403) {
		const appErr = AppError.forbidden()
		reply.status(appErr.statusCode).send(toErrorEnvelope(appErr))
		return
	}
	if (sc === 404) {
		const appErr = AppError.notFound()
		reply.status(appErr.statusCode).send(toErrorEnvelope(appErr))
		return
	}
	if (sc === 409) {
		const appErr = AppError.conflict()
		reply.status(appErr.statusCode).send(toErrorEnvelope(appErr))
		return
	}
	if (sc === 422) {
		const appErr = AppError.validation()
		reply.status(appErr.statusCode).send(toErrorEnvelope(appErr))
		return
	}
	if (sc === 429) {
		const appErr = AppError.rateLimited()
		reply.status(appErr.statusCode).send(toErrorEnvelope(appErr))
		return
	}

	// Fallback 500
	const appErr = AppError.internal()
	reply.status(appErr.statusCode).send(toErrorEnvelope(appErr))
}
