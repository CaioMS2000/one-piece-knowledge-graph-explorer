import { auth } from '@/lib/auth'
import { SystemConfigService } from './system-config-service'

container.registerSingleton(TOKENS.SystemConfigService, SystemConfigService)
container.registerInstance(TOKENS.Auth, auth)
