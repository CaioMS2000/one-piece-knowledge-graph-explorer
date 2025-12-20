import { dayjs } from '../config/date-and-time/dayjs'
import { TIMEZONE } from '../config/date-and-time/constants'
import fs from 'node:fs/promises'
import path from 'node:path'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type BaseFields = Record<string, unknown>

const levelPriority: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
}

function stringify(x: any) {
	return JSON.stringify(x, null, 2)
}

// Simple rotating file appender: monthly dir, rotate by size
// Default to write under 'logs/app' (can be overridden via LOG_DIR)
const LOG_BASE_DIR = process.env.LOG_DIR || path.join('logs', 'app')

// Config provider injected by the app (e.g., GlobalSettings via GlobalConfigService)
type LoggerConfigProvider = { getMaxSizeMB?: () => number | Promise<number> }
let configProvider: LoggerConfigProvider | undefined
export function configureLogger(provider: LoggerConfigProvider) {
	configProvider = provider
}

function monthKey(d: Date): string {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	return `${y}-${m}`
}

class RotatingFileAppender {
	private currentMonth: string | null = null
	private currentPath: string | null = null
	private queue: Promise<void> = Promise.resolve()
	private lastWarnAt = 0

	private warnOnce(msg: string) {
		const now = Date.now()
		if (now - this.lastWarnAt > 60_000) {
			this.lastWarnAt = now
			try {
				console.warn(`[LOGGER WARN] ${msg}`)
			} catch {}
		}
	}

	private async ensurePath(now: Date) {
		const key = monthKey(now)
		if (this.currentMonth !== key) {
			this.currentMonth = key
			const baseName = `app-${key}.log`
			this.currentPath = path.resolve(
				process.cwd(),
				LOG_BASE_DIR,
				key,
				baseName
			)
		}
		const dir = path.dirname(this.currentPath!)
		try {
			await fs.mkdir(dir, { recursive: true })
		} catch (e: any) {
			this.warnOnce(`failed to ensure log dir '${dir}': ${e?.message || e}`)
		}
	}

	private async findNextCounterPath(): Promise<string | null> {
		if (!this.currentPath || !this.currentMonth) return null
		const dir = path.dirname(this.currentPath)
		const re = new RegExp(
			`^app-${this.currentMonth.replace('-', '\\-')}(?:\\.(\\d+))?\\.log$`
		)
		try {
			const entries = await fs.readdir(dir).catch(() => [])
			let maxCounter = 0
			for (const name of entries) {
				const m = name.match(re)
				if (!m) continue
				const c = m[1] ? Number(m[1]) : 0
				if (Number.isFinite(c) && c > maxCounter) maxCounter = c
			}
			const next = maxCounter + 1
			const rotated =
				next === 1
					? `app-${this.currentMonth}.1.log`
					: `app-${this.currentMonth}.${next}.log`
			return path.join(dir, rotated)
		} catch (e: any) {
			this.warnOnce(`failed to list log dir for rotation: ${e?.message || e}`)
			return null
		}
	}

	private async rotateIfNeeded(now: Date) {
		if (!this.currentPath) return
		try {
			const st = await fs.stat(this.currentPath).catch(() => null as any)

			// Resolve max size from provider (fallback to 5MB fixed)
			let maxMB = 5
			try {
				const v = await configProvider?.getMaxSizeMB?.()
				if (typeof v === 'number' && Number.isFinite(v) && v > 0) maxMB = v
			} catch {}
			const maxBytes = Math.max(1, Math.floor(maxMB * 1024 * 1024))

			if (st && typeof st.size === 'number' && st.size >= maxBytes) {
				const rotated = await this.findNextCounterPath()
				if (rotated) {
					try {
						await fs.rename(this.currentPath, rotated)
					} catch (e: any) {
						this.warnOnce(`failed to rotate log file: ${e?.message || e}`)
					}
				}
			}
		} catch (e: any) {
			// stat failed — ignore; append will try to create
			this.warnOnce(`failed to stat log file: ${e?.message || e}`)
		}
	}

	append(text: string) {
		const run = async () => {
			const now = new Date()
			await this.ensurePath(now)
			await this.rotateIfNeeded(now)
			if (!this.currentPath) return
			try {
				await fs.appendFile(this.currentPath, text + '\n', 'utf8')
			} catch (e: any) {
				this.warnOnce(`failed to append to log file: ${e?.message || e}`)
			}
		}
		// serialize writes to avoid races
		this.queue = this.queue.then(run, run)
		return this.queue
	}
}

const fileAppender = new RotatingFileAppender()

// Tries to capture the file:line:column where the logger was called
function getCallerLocation():
	| { file?: string; line?: number; column?: number; pretty?: string }
	| undefined {
	// Using V8 stack trace API for reliable parsing
	const original = Error.prepareStackTrace
	try {
		Error.prepareStackTrace = (_, stack) =>
			stack as unknown as NodeJS.CallSite[]
		const err = new Error()
		// Exclude this helper from the stack
		Error.captureStackTrace(err, getCallerLocation)
		const frames = (err.stack as unknown as NodeJS.CallSite[]) || []

		// Current module filename (to skip frames inside the logger itself)
		const loggerFile = __filename

		// Heuristic: first frame outside logger file and node internals/node_modules
		let target: NodeJS.CallSite | undefined
		for (const f of frames) {
			const file = f.getFileName?.() || ''
			if (!file) continue
			if (file === loggerFile) continue
			if (file.includes('/infra/logging/logger')) continue
			if (file.startsWith('node:')) continue
			if (file.includes('/node_modules/')) continue
			// Skip ts helper wrappers sometimes created by bundlers
			if (file.endsWith('/internal/modules/cjs/loader.js')) continue
			target = f
			break
		}

		// Fallback: use the 3rd/4th frame if heuristic fails
		if (!target) target = frames[3] || frames[2]
		if (!target) return undefined

		const file = target.getFileName?.()
		const line = target.getLineNumber?.()
		const column = target.getColumnNumber?.()
		const pretty =
			file && line && column ? `${file}:${line}:${column}` : undefined
		return {
			file: file || undefined,
			line: line || undefined,
			column: column || undefined,
			pretty,
		}
	} catch {
		return undefined
	} finally {
		Error.prepareStackTrace = original
	}
}

function parseLevel(envLevel?: string | null): LogLevel {
	const s = String(envLevel || '').toLowerCase()
	if (s === 'debug' || s === 'info' || s === 'warn' || s === 'error') return s
	// default: dev -> debug, else info
	const nodeEnv = String(process.env.NODE_ENV).toLowerCase()
	return nodeEnv === 'development' || nodeEnv === 'test' ? 'debug' : 'info'
}

const globalMinLevel: LogLevel = parseLevel(null)

export type Logger = {
	child(extra: BaseFields): Logger
	debug(msg: string, extra?: BaseFields): void
	info(msg: string, extra?: BaseFields): void
	warn(msg: string, extra?: BaseFields): void
	error(msg: string, extra?: BaseFields & { err?: unknown }): void
}

function write(
	level: LogLevel,
	msg: string,
	base: BaseFields,
	extra?: BaseFields
) {
	if (levelPriority[level] < levelPriority[globalMinLevel]) return

	const timestamp = dayjs().tz(TIMEZONE).format('YYYY-MM-DDTHH:mm:ss.SSSZ')
	const caller = getCallerLocation()
	const where = caller?.pretty ? `${caller.pretty}` : ''
	// Try to enrich with OpenTelemetry trace context (best-effort)
	let traceId: string | undefined
	let spanId: string | undefined
	try {
		// Dynamically import to avoid hard dependency
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const api = require('@opentelemetry/api')
		const span = api.trace.getActiveSpan?.()
		const sc = span?.spanContext?.()
		traceId = sc?.traceId
		spanId = sc?.spanId
	} catch {}

	// Objeto 'extra' pode conter um erro. Precisamos tratá-lo.
	const processedExtra = { ...(extra || {}) }
	if (processedExtra.err && processedExtra.err instanceof Error) {
		const error = processedExtra.err
		// Substitui o objeto de erro por uma representação serializável
		processedExtra.err = {
			message: error.message,
			stack: error.stack,
			name: error.name,
			// Se for uma ApplicationError, adiciona detalhes extras
			...('code' in error && { code: error.code }),
			...('statusCode' in error && { statusCode: error.statusCode }),
			...('details' in error && { details: error.details }),
		}
	}

	const rec: Record<string, unknown> = {
		...base,
		...processedExtra,
		...(traceId ? { trace_id: traceId } : {}),
		...(spanId ? { span_id: spanId } : {}),
	}

	// Para o console, passamos as partes separadamente para que ele possa formatar o objeto.
	const meta = `[${level.toUpperCase()} - ${timestamp}] 📑 ${where}`
	console.log(meta)
	console.log(msg)
	console.log(rec)

	// Para o arquivo, construímos a string completa como antes.
	const fileContent = `${meta}\n${msg}\n${stringify(rec)}`

	// Best-effort file append (non-blocking, safe on failure)
	fileAppender.append(fileContent)
}

export function createLogger(base: BaseFields = {}): Logger {
	const b = { ...base, component: base['component'] || 'app' }
	return {
		child(extra: BaseFields): Logger {
			return createLogger({ ...b, ...extra })
		},
		debug(msg, extra) {
			write('debug', msg, b, extra)
		},
		info(msg, extra) {
			write('info', msg, b, extra)
		},
		warn(msg, extra) {
			write('warn', msg, b, extra)
		},
		error(msg, extra) {
			write('error', msg, b, extra)
		},
	}
}

export const logger = createLogger({ component: 'app' })
