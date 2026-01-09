/**
 * Base interface for all events in the system.
 * All events must extend this interface to be used with the EventBus.
 */
export interface Event {
	/**
	 * When the event occurred
	 */
	readonly occurredAt: Date

	/**
	 * Optional: Used for correlating events across modules
	 */
	readonly correlationId?: string
}

/**
 * Base class that provides default implementation for Event interface.
 * You can extend this class for convenience, but it's not required.
 */
export abstract class BaseEvent implements Event {
	public readonly occurredAt: Date
	public readonly correlationId?: string

	constructor(correlationId?: string) {
		this.occurredAt = new Date()
		this.correlationId = correlationId
	}
}
