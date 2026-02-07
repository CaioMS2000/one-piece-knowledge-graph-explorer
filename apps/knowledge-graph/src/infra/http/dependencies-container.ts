import { auth } from '@/lib/auth'
import { SystemConfigService } from '@repo/system-settings-manager'

container.registerSingleton(TOKENS.SystemConfigService, SystemConfigService)
container.registerInstance(TOKENS.Auth, auth)
