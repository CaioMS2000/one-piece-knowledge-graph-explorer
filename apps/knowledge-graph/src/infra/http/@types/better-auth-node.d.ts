import type { Auth } from 'better-auth'
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http'

declare module 'better-auth/node' {
	export function toNodeHandler(
		auth: { handler: Auth['handler'] } | Auth['handler']
	): (req: IncomingMessage, res: ServerResponse) => Promise<void>

	export function fromNodeHeaders(headers: IncomingHttpHeaders): Headers
}
