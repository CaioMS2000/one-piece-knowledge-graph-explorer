import winston from 'winston'

/**
 * Configuração do logger Winston
 *
 * Níveis de log (do mais crítico ao menos):
 * - error: Erros que precisam atenção imediata
 * - warn: Situações potencialmente problemáticas
 * - info: Informações gerais sobre o fluxo da aplicação
 * - debug: Informações detalhadas para debugging
 */

// Formato customizado para desenvolvimento
const devFormat = winston.format.combine(
	winston.format.colorize(),
	winston.format.timestamp({ format: 'HH:mm:ss' }),
	winston.format.printf(({ timestamp, level, message, ...meta }) => {
		const metaStr = Object.keys(meta).length
			? `\n${JSON.stringify(meta, null, 2)}`
			: ''
		return `[${timestamp}] ${level}: ${message}${metaStr}`
	})
)

// Formato para produção (JSON)
const prodFormat = winston.format.combine(
	winston.format.timestamp(),
	winston.format.errors({ stack: true }),
	winston.format.json()
)

// Determinar formato baseado no ambiente
const logFormat = process.env.NODE_ENV === 'production' ? prodFormat : devFormat

// Determinar nível de log baseado no ambiente
const logLevel =
	process.env.LOG_LEVEL ||
	(process.env.NODE_ENV === 'production' ? 'info' : 'debug')

/**
 * Instância singleton do logger
 *
 * @example
 * import { logger } from '@opkg/core/logging/logger';
 *
 * logger.info('Server started', { port: 3000 });
 * logger.error('Failed to connect', { error: err.message });
 */
export const logger = winston.createLogger({
	level: logLevel,
	format: logFormat,
	transports: [
		// Console output
		new winston.transports.Console(),

		// Arquivo de erros (apenas em produção)
		...(process.env.NODE_ENV === 'production'
			? [
					new winston.transports.File({
						filename: 'logs/error.log',
						level: 'error',
					}),
					new winston.transports.File({
						filename: 'logs/combined.log',
					}),
				]
			: []),
	],
})

/**
 * Helper para criar um logger com contexto específico
 *
 * @example
 * const log = createLogger('CharacterService');
 * log.info('Creating character', { name: 'Luffy' });
 * // Output: [10:30:45] info: [CharacterService] Creating character { name: 'Luffy' }
 */
export function createLogger(context: string) {
	return {
		error: (message: string, meta?: Record<string, unknown>) =>
			logger.error(`[${context}] ${message}`, meta),
		warn: (message: string, meta?: Record<string, unknown>) =>
			logger.warn(`[${context}] ${message}`, meta),
		info: (message: string, meta?: Record<string, unknown>) =>
			logger.info(`[${context}] ${message}`, meta),
		debug: (message: string, meta?: Record<string, unknown>) =>
			logger.debug(`[${context}] ${message}`, meta),
	}
}
