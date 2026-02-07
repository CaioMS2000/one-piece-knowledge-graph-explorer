/*
Stub values so TS do not complain and old code commented just for reference
*/
export enum SystemSettingKey {
	SOMETHING = 'something',
	// CORS = 'cors',
	// FEATURES = 'features',
	// MEDIA = 'media',
	// RENDER_API_KEY = 'RENDER_API_KEY',
	// APP_SERVICE_ID = 'APP_SERVICE_ID',
	// WEBHOOK_FORWARD = 'webhook_forward',
	// OBSERVABILITY = 'observability',
}

export interface SystemSettingValues {
	something: string
	// [SystemSettingKey.CORS]: {
	// 	origins: string[]
	// 	credentials: boolean
	// }
	// [SystemSettingKey.FEATURES]: {
	// 	testMode: boolean
	// 	maintenanceMode: boolean
	// 	aiEnabled: boolean
	// }
	// [SystemSettingKey.MEDIA]: {
	// 	maxFileSizeMb: number
	// 	maxFiles: number
	// 	allowedMimeTypes: string[]
	// }
	// [SystemSettingKey.RENDER_API_KEY]: string
	// [SystemSettingKey.APP_SERVICE_ID]: string
	// [SystemSettingKey.WEBHOOK_FORWARD]: {
	// 	url: string
	// 	secret: string
	// 	testNumbers: string[]
	// }
	// [SystemSettingKey.OBSERVABILITY]: {
	// 	otel: {
	// 		serviceName?: string
	// 		tracesExporter?: string
	// 		metricsExporter?: string
	// 		exporterEndpoint?: string
	// 		exporterTracesEndpoint?: string
	// 		exporterHeaders?: string
	// 		resourceAttributes?: string
	// 	}
	// 	loki: {
	// 		url?: string
	// 		username?: string
	// 		password?: string
	// 	}
	// 	logLevel?: 'debug' | 'info' | 'warn' | 'error'
	// }
}

export const systemSettingDefaults: Partial<SystemSettingValues> = {
	// [SystemSettingKey.CORS]: {
	// 	origins: [
	// 		'http://localhost:5173',
	// 		'https://wpp-bot-api-frontend-new.vercel.app',
	// 	],
	// 	credentials: true,
	// },
	// [SystemSettingKey.FEATURES]: {
	// 	testMode: false,
	// 	maintenanceMode: false,
	// 	aiEnabled: true,
	// },
	// [SystemSettingKey.MEDIA]: {
	// 	maxFiles: 10,
	// 	maxFileSizeMb: 10,
	// 	allowedMimeTypes: [
	// 		'image/jpeg',
	// 		'image/png',
	// 		'image/webp',
	// 		'application/pdf',
	// 		'audio/ogg',
	// 		'video/mp4',
	// 	],
	// },
	// [SystemSettingKey.OBSERVABILITY]: {
	// 	otel: {},
	// 	loki: {},
	// 	logLevel: 'debug',
	// },
}

export type SystemSettingValue<K extends SystemSettingKey> =
	SystemSettingValues[K]
