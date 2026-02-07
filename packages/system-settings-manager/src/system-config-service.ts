import { database } from '@/lib/drizzle'
import { eq, isNull } from 'drizzle-orm'
import { createLogger } from '@repo/core'
import { SystemSettingKey, SystemSettingValue } from './system-settings'
import { systemSettings } from './schemas/system-settings'
import { SystemSetting } from './models/settings'

const logger = createLogger('SystemConfigService')

export class SystemConfigService {
	private cache: Map<SystemSettingKey, unknown> = new Map()
	private refreshInterval: NodeJS.Timeout | null = null

	async loadAll() {
		try {
			const rows = await database.select().from(systemSettings)
			for (const r of rows) {
				this.cache.set(r.key as SystemSettingKey, r.value)
			}
		} catch (error) {
			console.error('Failed to load system settings:', error)
			throw error
		}
	}

	/**
	 * Reloads all configs from database into cache.
	 * @returns Number of configs loaded
	 */
	async refreshAll(): Promise<number> {
		const rows = await database.select().from(systemSettings)
		this.cache.clear()
		for (const r of rows) {
			this.cache.set(r.key as SystemSettingKey, r.value)
		}
		return rows.length
	}

	/**
	 * Reloads a single config key from database.
	 */
	async reload<K extends SystemSettingKey>(
		key: K
	): Promise<SystemSettingValue<K> | null> {
		const setting = await this.getByKey(key)
		if (setting) {
			this.cache.set(key, setting.value)
			return setting.value as SystemSettingValue<K>
		}
		this.cache.delete(key)
		return null
	}

	/**
	 * Starts periodic auto-refresh of configs from database.
	 * @param intervalMs Refresh interval in milliseconds (default: 30000)
	 */
	startAutoRefresh(intervalMs: number = 30_000) {
		if (this.refreshInterval) {
			return // Already running
		}
		logger.info(`Config auto-refresh started (${intervalMs / 1000}s interval)`)
		this.refreshInterval = setInterval(() => {
			this.refreshAll()
				.then(() => {
					// logger.debug('Config refreshed', {
					// 	data: Object.fromEntries(this.cache.entries()),
					// })
				})
				.catch(err => logger.error('Config auto-refresh failed:', err))
		}, intervalMs)
	}

	/**
	 * Stops the periodic auto-refresh.
	 */
	stopAutoRefresh() {
		if (this.refreshInterval) {
			clearInterval(this.refreshInterval)
			this.refreshInterval = null
			logger.info('Config auto-refresh stopped')
		}
	}

	getValue<K extends SystemSettingKey>(key: K): SystemSettingValue<K> | null {
		const cached = this.cache.get(key)
		if (cached !== undefined) return cached as SystemSettingValue<K>
		return null
	}

	// Métodos para API admin
	async list(): Promise<SystemSetting[]> {
		const rows = await database
			.select()
			.from(systemSettings)
			.where(isNull(systemSettings.deletedAt))

		return rows.map(r => SystemSetting.create(r))
	}

	async getByKey<K extends SystemSettingKey>(
		key: K
	): Promise<SystemSetting | null> {
		let setting: SystemSetting | null = null
		const rows = await database
			.select()
			.from(systemSettings)
			.where(eq(systemSettings.key, key))
			.limit(1)

		if (rows[0]) {
			setting = SystemSetting.create(rows[0])
		}

		return setting
	}

	async upsert<K extends SystemSettingKey>(
		key: K,
		value: SystemSettingValue<K>,
		updatedBy: string
	): Promise<SystemSetting> {
		const [saved] = await database
			.insert(systemSettings)
			.values({ key, value, updatedBy })
			.onConflictDoUpdate({
				target: systemSettings.key,
				set: { value, updatedBy, updatedAt: new Date() },
			})
			.returning()
		this.cache.set(key, value)

		return SystemSetting.create(saved)
	}

	async remove(key: SystemSettingKey) {
		await database.delete(systemSettings).where(eq(systemSettings.key, key))
		this.cache.delete(key)
	}
}
