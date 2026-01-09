export type AppErrorCode =
	| 'UNAUTHENTICATED'
	| 'AUTH_INVALID_CREDENTIALS'
	| 'FORBIDDEN'
	| 'NOT_FOUND'
	| 'CONFLICT'
	| 'BAD_REQUEST'
	| 'VALIDATION_ERROR'
	| 'RATE_LIMITED'
	| 'INTERNAL_ERROR'
	| 'EMAIL_ALREADY_REGISTERED'
	| 'UNSUPPORTED_MEDIA_TYPE'

export class AppError extends Error {
	readonly code: AppErrorCode
	readonly statusCode: number
	readonly hint?: string
	readonly details?: unknown

	private constructor(
		code: AppErrorCode,
		message: string,
		statusCode: number,
		hint?: string,
		details?: unknown
	) {
		super(message)
		this.code = code
		this.statusCode = statusCode
		this.hint = hint
		this.details = details
	}

	static unauthenticated(
		message = 'Sessão expirada ou ausente.',
		hint?: string
	) {
		return new AppError('UNAUTHENTICATED', message, 401, hint)
	}

	static authInvalidCredentials(message = 'Credenciais inválidas.') {
		return new AppError('AUTH_INVALID_CREDENTIALS', message, 401)
	}

	static forbidden(message = 'Você não tem permissão.', hint?: string) {
		return new AppError('FORBIDDEN', message, 403, hint)
	}

	static notFound(
		code = 'NOT_FOUND' as AppErrorCode,
		message = 'Recurso não encontrado.'
	) {
		return new AppError(code, message, 404)
	}

	static conflict(code = 'CONFLICT' as AppErrorCode, message = 'Conflito.') {
		return new AppError(code, message, 409)
	}

	static badRequest(
		code = 'BAD_REQUEST' as AppErrorCode,
		message = 'Requisição inválida.',
		details?: unknown
	) {
		return new AppError(code, message, 400, undefined, details)
	}

	static validation(details?: unknown, message = 'Erro de validação.') {
		return new AppError('VALIDATION_ERROR', message, 422, undefined, details)
	}

	static rateLimited(
		message = 'Muitas requisições. Tente novamente mais tarde.'
	) {
		return new AppError('RATE_LIMITED', message, 429)
	}

	static unsupportedMediaType(
		message = 'Tipo de mídia não suportado.',
		hint?: string,
		details?: unknown
	) {
		return new AppError('UNSUPPORTED_MEDIA_TYPE', message, 415, hint, details)
	}

	static internal(message = 'Erro interno.') {
		return new AppError('INTERNAL_ERROR', message, 500)
	}
}

export function toErrorEnvelope(e: AppError) {
	return {
		error: {
			code: e.code,
			message: e.message,
			hint: e.hint,
			details: e.details,
		},
	}
}
