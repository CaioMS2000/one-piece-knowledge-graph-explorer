import type { Event } from './event'

/**
 * Type for event handler functions.
 * Handlers can be sync or async.
 */
export type EventHandler<T extends Event> = (event: T) => void | Promise<void>

/**
 * Type-safe Event Bus for pub/sub communication.
 *
 * Features:
 * - Full TypeScript type safety using generics
 * - Support for async handlers
 * - Multiple handlers per event type
 * - Error handling without breaking other handlers
 * - Easy testing and mocking
 *
 * @example
 * ```typescript
 * const eventBus = new EventBus()
 *
 * // Register handler with full type safety
 * eventBus.on(UserCreatedEvent, async (event) => {
 *   // event is typed as UserCreatedEvent
 *   await sendEmail(event.email)
 * })
 *
 * // Emit event
 * await eventBus.emit(new UserCreatedEvent('123', 'luffy@onepiece.com'))
 * ```
 */
export class EventBus {
	private handlers = new Map<string, Set<EventHandler<any>>>()

	/**
	 * Register a handler for a specific event type.
	 *
	 * @param eventClass - The event class constructor
	 * @param handler - Function to handle the event (can be async)
	 *
	 * @example
	 * ```typescript
	 * eventBus.on(UserCreatedEvent, async (event) => {
	 *   console.log(`User ${event.userId} created`)
	 *   await sendWelcomeEmail(event.email)
	 * })
	 * ```
	 */
	on<T extends Event>(
		eventClass: new (...args: any[]) => T,
		handler: EventHandler<T>
	): void {
		const eventType = eventClass.name

		if (!this.handlers.has(eventType)) {
			this.handlers.set(eventType, new Set())
		}

		this.handlers.get(eventType)!.add(handler)
	}

	/**
	 * Unregister a specific handler for an event type.
	 *
	 * @param eventClass - The event class constructor
	 * @param handler - The handler function to remove
	 *
	 * @example
	 * ```typescript
	 * const handler = (event: UserCreatedEvent) => console.log(event.userId)
	 *
	 * eventBus.on(UserCreatedEvent, handler)
	 * eventBus.off(UserCreatedEvent, handler)  // Remove this specific handler
	 * ```
	 */
	off<T extends Event>(
		eventClass: new (...args: any[]) => T,
		handler: EventHandler<T>
	): void {
		const eventType = eventClass.name
		this.handlers.get(eventType)?.delete(handler)
	}

	/**
	 * Emit an event to all registered handlers.
	 * All handlers are executed in parallel.
	 * If a handler fails, it logs the error but doesn't stop other handlers.
	 *
	 * @param event - The event to emit
	 * @returns Promise that resolves when all handlers complete
	 *
	 * @example
	 * ```typescript
	 * await eventBus.emit(new UserCreatedEvent('123', 'luffy@onepiece.com'))
	 * ```
	 */
	async emit<T extends Event>(event: T): Promise<void> {
		const eventType = event.constructor.name
		const handlers = this.handlers.get(eventType)

		if (!handlers || handlers.size === 0) {
			return
		}

		// Execute all handlers in parallel
		const results = await Promise.allSettled(
			[...handlers].map(handler => Promise.resolve(handler(event)))
		)

		// Log errors but don't throw (other handlers should continue)
		results.forEach((result, index) => {
			if (result.status === 'rejected') {
				console.error(
					`[EventBus] Handler failed for event ${eventType}:`,
					result.reason
				)
			}
		})
	}

	/**
	 * Remove all handlers for a specific event type.
	 *
	 * @param eventClass - The event class constructor
	 *
	 * @example
	 * ```typescript
	 * eventBus.clearHandlers(UserCreatedEvent)
	 * ```
	 */
	clearHandlers<T extends Event>(eventClass: new (...args: any[]) => T): void {
		this.handlers.delete(eventClass.name)
	}

	/**
	 * Remove ALL handlers for ALL event types.
	 * Useful for testing or cleanup.
	 *
	 * @example
	 * ```typescript
	 * afterEach(() => {
	 *   eventBus.clear()
	 * })
	 * ```
	 */
	clear(): void {
		this.handlers.clear()
	}

	/**
	 * Check if there are any handlers registered for an event type.
	 * Useful for debugging or conditional logic.
	 *
	 * @param eventClass - The event class constructor
	 * @returns True if at least one handler is registered
	 *
	 * @example
	 * ```typescript
	 * if (eventBus.hasHandlers(UserCreatedEvent)) {
	 *   console.log('UserCreatedEvent has handlers')
	 * }
	 * ```
	 */
	hasHandlers<T extends Event>(eventClass: new (...args: any[]) => T): boolean {
		const handlers = this.handlers.get(eventClass.name)
		return handlers !== undefined && handlers.size > 0
	}

	/**
	 * Get the count of handlers for a specific event type.
	 * Useful for debugging.
	 *
	 * @param eventClass - The event class constructor
	 * @returns Number of registered handlers
	 *
	 * @example
	 * ```typescript
	 * console.log(`Handlers: ${eventBus.countHandlers(UserCreatedEvent)}`)
	 * ```
	 */
	countHandlers<T extends Event>(
		eventClass: new (...args: any[]) => T
	): number {
		const handlers = this.handlers.get(eventClass.name)
		return handlers?.size ?? 0
	}
}
