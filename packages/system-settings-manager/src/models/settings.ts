import { Class } from '@repo/core'

type SystemSettingProps = {
	createdAt: Date
	updatedAt: Date
	value: unknown
	description: string | null
	key: string
	updatedBy: string | null
	deletedAt: Date | null
}

export class SystemSetting extends Class<SystemSettingProps> {
	constructor(protected resources: SystemSettingProps) {
		super()
	}

	static create(input: SystemSettingProps) {
		return new SystemSetting(input)
	}

	get createdAt() {
		return this.resources.createdAt
	}

	get updatedAt() {
		return this.resources.updatedAt
	}

	get value() {
		return this.resources.value
	}

	get description() {
		return this.resources.description
	}

	get key() {
		return this.resources.key
	}

	get updatedBy() {
		return this.resources.updatedBy
	}

	get deletedAt() {
		return this.resources.deletedAt
	}
}
