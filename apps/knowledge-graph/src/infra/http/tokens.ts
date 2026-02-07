import type { Auth } from 'better-auth'
import { SystemConfigService } from '@repo/system-settings-manager'
// import type { PgBoss } from 'pg-boss'
// import type { ConfigManager, ConfigRepository } from './config-manager'
// import type { MessageReceiver } from './messaging/receiver/message-receiver'
// import type { WebhookParser } from './infra/http/routes/whats-app/parsers/webhook-parser'
// import type { MessageQueue } from './queue/mensage-queue'
// import type { MessageProcessor } from './messaging/processor/message-processor'
// import { MessageSender } from './domain/whatsapp/message-sender'

export const TOKENS = {
	Auth: Symbol('Auth') as InjectionToken<Auth>,
	SystemConfigService: Symbol(
		'SystemConfigService'
	) as InjectionToken<SystemConfigService>,
	// ConfigRepository: Symbol(
	// 	'ConfigRepository'
	// ) as InjectionToken<ConfigRepository>,
	// ConfigManager: Symbol('ConfigManager') as InjectionToken<ConfigManager>,
	// PgBoss: Symbol('PgBoss') as InjectionToken<PgBoss>,
	// MessageReceiver: Symbol('MessageReceiver') as InjectionToken<MessageReceiver>,
	// WebhookParser: Symbol('WebhookParser') as InjectionToken<WebhookParser>,
	// MessageQueue: Symbol('MessageQueue') as InjectionToken<MessageQueue>,
	// MessageProcessor: Symbol(
	// 	'MessageProcessor'
	// ) as InjectionToken<MessageProcessor>,
	// MessageSender: Symbol('MessageSender') as InjectionToken<MessageSender>,
} as const
