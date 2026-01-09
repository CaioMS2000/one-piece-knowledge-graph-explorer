import { database } from '@/lib/drizzle'
import { systemSettings } from '@/infra/database/schema'
import { eq } from 'drizzle-orm'

export class SystemConfigService {
	private cache: Map<string, unknown> = new Map()

	async loadAll() {
		const rows = await database.select().from(systemSettings)
		for (const r of rows) {
			this.cache.set(r.key, r.value)
		}
	}

	async reloadKey(key: string) {
		const rows = await database
			.select()
			.from(systemSettings)
			.where(eq(systemSettings.key, key))
			.limit(1)
		if (rows[0]) this.cache.set(rows[0].key, rows[0].value)
	}

	get<T = unknown>(key: string, fallback?: T): T {
		const v = this.cache.get(key)
		return (v as T) ?? (fallback as T)
	}

	getArray<T = unknown>(key: string, fallback: T[] = []): T[] {
		const v = this.cache.get(key)
		if (Array.isArray(v)) return v as T[]
		return fallback
	}

	getBoolean(key: string, fallback = false): boolean {
		const v = this.cache.get(key)
		if (typeof v === 'boolean') return v
		if (typeof v === 'string') {
			const s = v.toLowerCase()
			if (s === 'true') return true
			if (s === 'false') return false
		}
		return fallback
	}
}
