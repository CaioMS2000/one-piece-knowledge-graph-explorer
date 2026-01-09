import { type Auth } from 'better-auth'
import { auth } from '@/lib/auth'
import { SystemConfigService } from './system-config-service'

export type AppDependencies = {
	auth: Auth
	configManager: SystemConfigService
	services: {}
}

export class DependenciesContainer {
	private resources: AppDependencies
	constructor() {
		this.resources = {
			configManager: new SystemConfigService(),
			services: {},
			auth,
		}
	}

	async init() {}

	getResources(): AppDependencies {
		return this.resources
	}
}
