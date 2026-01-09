import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventBus } from './event-bus'
import { BaseEvent, type Event } from './event'

// Example events with different properties (showcasing generics)
class UserCreatedEvent extends BaseEvent {
	constructor(
		public readonly userId: string,
		public readonly email: string,
		public readonly name: string
	) {
		super()
	}
}

class PaymentProcessedEvent extends BaseEvent {
	constructor(
		public readonly paymentId: string,
		public readonly amount: number,
		public readonly currency: string,
		public readonly userId: string
	) {
		super()
	}
}

class ProductViewedEvent extends BaseEvent {
	constructor(
		public readonly productId: string,
		public readonly viewerId?: string
	) {
		super()
	}
}

// Event without extending BaseEvent (using interface directly)
class CustomEvent implements Event {
	public readonly occurredAt = new Date()

	constructor(
		public readonly customField: string,
		public readonly correlationId?: string
	) {}
}

describe('EventBus', () => {
	let eventBus: EventBus

	beforeEach(() => {
		eventBus = new EventBus()
	})

	describe('Type Safety with Generics', () => {
		it('should provide type-safe event handlers for UserCreatedEvent', async () => {
			const handler = vi.fn((event: UserCreatedEvent) => {
				// TypeScript ensures we have access to UserCreatedEvent properties
				expect(event.userId).toBe('123')
				expect(event.email).toBe('luffy@onepiece.com')
				expect(event.name).toBe('Monkey D. Luffy')
			})

			eventBus.on(UserCreatedEvent, handler)

			await eventBus.emit(
				new UserCreatedEvent('123', 'luffy@onepiece.com', 'Monkey D. Luffy')
			)

			expect(handler).toHaveBeenCalledTimes(1)
		})

		it('should provide type-safe event handlers for PaymentProcessedEvent', async () => {
			const handler = vi.fn((event: PaymentProcessedEvent) => {
				// Different properties for different event
				expect(event.paymentId).toBe('pay-456')
				expect(event.amount).toBe(100.5)
				expect(event.currency).toBe('USD')
				expect(event.userId).toBe('123')
			})

			eventBus.on(PaymentProcessedEvent, handler)

			await eventBus.emit(
				new PaymentProcessedEvent('pay-456', 100.5, 'USD', '123')
			)

			expect(handler).toHaveBeenCalledTimes(1)
		})

		it('should handle events with optional properties', async () => {
			const handler = vi.fn((event: ProductViewedEvent) => {
				expect(event.productId).toBe('product-789')
				expect(event.viewerId).toBeUndefined()
			})

			eventBus.on(ProductViewedEvent, handler)

			await eventBus.emit(new ProductViewedEvent('product-789'))

			expect(handler).toHaveBeenCalledTimes(1)
		})

		it('should handle custom events that implement Event interface', async () => {
			const handler = vi.fn((event: CustomEvent) => {
				expect(event.customField).toBe('test')
				expect(event.occurredAt).toBeInstanceOf(Date)
			})

			eventBus.on(CustomEvent, handler)

			await eventBus.emit(new CustomEvent('test'))

			expect(handler).toHaveBeenCalledTimes(1)
		})
	})

	describe('Multiple Handlers', () => {
		it('should call multiple handlers for the same event', async () => {
			const handler1 = vi.fn()
			const handler2 = vi.fn()
			const handler3 = vi.fn()

			eventBus.on(UserCreatedEvent, handler1)
			eventBus.on(UserCreatedEvent, handler2)
			eventBus.on(UserCreatedEvent, handler3)

			await eventBus.emit(
				new UserCreatedEvent('123', 'luffy@onepiece.com', 'Luffy')
			)

			expect(handler1).toHaveBeenCalledTimes(1)
			expect(handler2).toHaveBeenCalledTimes(1)
			expect(handler3).toHaveBeenCalledTimes(1)
		})

		it('should not call handlers of other event types', async () => {
			const userHandler = vi.fn()
			const paymentHandler = vi.fn()

			eventBus.on(UserCreatedEvent, userHandler)
			eventBus.on(PaymentProcessedEvent, paymentHandler)

			await eventBus.emit(
				new UserCreatedEvent('123', 'luffy@onepiece.com', 'Luffy')
			)

			expect(userHandler).toHaveBeenCalledTimes(1)
			expect(paymentHandler).not.toHaveBeenCalled()
		})
	})

	describe('Async Handlers', () => {
		it('should handle async handlers', async () => {
			const handler = vi.fn(async () => {
				await new Promise(resolve => setTimeout(resolve, 10))
				// Handlers should return void, not a value
			})

			eventBus.on(UserCreatedEvent, handler)

			await eventBus.emit(
				new UserCreatedEvent('123', 'luffy@onepiece.com', 'Luffy')
			)

			expect(handler).toHaveBeenCalledTimes(1)
		})

		it('should execute all handlers in parallel', async () => {
			const executionOrder: number[] = []

			const handler1 = vi.fn(async () => {
				await new Promise(resolve => setTimeout(resolve, 30))
				executionOrder.push(1)
			})

			const handler2 = vi.fn(async () => {
				await new Promise(resolve => setTimeout(resolve, 10))
				executionOrder.push(2)
			})

			const handler3 = vi.fn(async () => {
				await new Promise(resolve => setTimeout(resolve, 20))
				executionOrder.push(3)
			})

			eventBus.on(UserCreatedEvent, handler1)
			eventBus.on(UserCreatedEvent, handler2)
			eventBus.on(UserCreatedEvent, handler3)

			await eventBus.emit(
				new UserCreatedEvent('123', 'luffy@onepiece.com', 'Luffy')
			)

			// Handler 2 finishes first (10ms), then 3 (20ms), then 1 (30ms)
			expect(executionOrder).toEqual([2, 3, 1])
		})
	})

	describe('Error Handling', () => {
		it('should not throw if handler fails', async () => {
			const errorHandler = vi.fn(() => {
				throw new Error('Handler error')
			})

			const successHandler = vi.fn()

			eventBus.on(UserCreatedEvent, errorHandler)
			eventBus.on(UserCreatedEvent, successHandler)

			// Should not throw
			await expect(
				eventBus.emit(
					new UserCreatedEvent('123', 'luffy@onepiece.com', 'Luffy')
				)
			).resolves.toBeUndefined()

			// Both handlers should be called
			expect(errorHandler).toHaveBeenCalledTimes(1)
			expect(successHandler).toHaveBeenCalledTimes(1)
		})

		it('should log error when handler fails', async () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {})

			const errorHandler = vi.fn(() => {
				throw new Error('Test error')
			})

			eventBus.on(UserCreatedEvent, errorHandler)

			await eventBus.emit(
				new UserCreatedEvent('123', 'luffy@onepiece.com', 'Luffy')
			)

			expect(consoleErrorSpy).toHaveBeenCalled()
			expect(consoleErrorSpy.mock.calls[0][0]).toContain('Handler failed')
			expect(consoleErrorSpy.mock.calls[0][0]).toContain('UserCreatedEvent')

			consoleErrorSpy.mockRestore()
		})
	})

	describe('Handler Management', () => {
		it('should remove specific handler with off()', async () => {
			const handler1 = vi.fn()
			const handler2 = vi.fn()

			eventBus.on(UserCreatedEvent, handler1)
			eventBus.on(UserCreatedEvent, handler2)

			// Remove handler1
			eventBus.off(UserCreatedEvent, handler1)

			await eventBus.emit(
				new UserCreatedEvent('123', 'luffy@onepiece.com', 'Luffy')
			)

			expect(handler1).not.toHaveBeenCalled()
			expect(handler2).toHaveBeenCalledTimes(1)
		})

		it('should remove all handlers for event type with clearHandlers()', async () => {
			const handler1 = vi.fn()
			const handler2 = vi.fn()

			eventBus.on(UserCreatedEvent, handler1)
			eventBus.on(UserCreatedEvent, handler2)

			eventBus.clearHandlers(UserCreatedEvent)

			await eventBus.emit(
				new UserCreatedEvent('123', 'luffy@onepiece.com', 'Luffy')
			)

			expect(handler1).not.toHaveBeenCalled()
			expect(handler2).not.toHaveBeenCalled()
		})

		it('should remove all handlers with clear()', async () => {
			const userHandler = vi.fn()
			const paymentHandler = vi.fn()

			eventBus.on(UserCreatedEvent, userHandler)
			eventBus.on(PaymentProcessedEvent, paymentHandler)

			eventBus.clear()

			await eventBus.emit(
				new UserCreatedEvent('123', 'luffy@onepiece.com', 'Luffy')
			)
			await eventBus.emit(
				new PaymentProcessedEvent('pay-456', 100, 'USD', '123')
			)

			expect(userHandler).not.toHaveBeenCalled()
			expect(paymentHandler).not.toHaveBeenCalled()
		})
	})

	describe('Utility Methods', () => {
		it('should check if handlers exist with hasHandlers()', () => {
			expect(eventBus.hasHandlers(UserCreatedEvent)).toBe(false)

			eventBus.on(UserCreatedEvent, vi.fn())

			expect(eventBus.hasHandlers(UserCreatedEvent)).toBe(true)
		})

		it('should count handlers with countHandlers()', () => {
			expect(eventBus.countHandlers(UserCreatedEvent)).toBe(0)

			eventBus.on(UserCreatedEvent, vi.fn())
			expect(eventBus.countHandlers(UserCreatedEvent)).toBe(1)

			eventBus.on(UserCreatedEvent, vi.fn())
			expect(eventBus.countHandlers(UserCreatedEvent)).toBe(2)

			eventBus.on(UserCreatedEvent, vi.fn())
			expect(eventBus.countHandlers(UserCreatedEvent)).toBe(3)
		})
	})

	describe('No Handlers', () => {
		it('should do nothing if no handlers registered', async () => {
			// Should not throw
			await expect(
				eventBus.emit(
					new UserCreatedEvent('123', 'luffy@onepiece.com', 'Luffy')
				)
			).resolves.toBeUndefined()
		})
	})

	describe('Event Base Properties', () => {
		it('should automatically set occurredAt timestamp', async () => {
			const handler = vi.fn((event: UserCreatedEvent) => {
				expect(event.occurredAt).toBeInstanceOf(Date)
				expect(event.occurredAt.getTime()).toBeLessThanOrEqual(Date.now())
			})

			eventBus.on(UserCreatedEvent, handler)

			await eventBus.emit(
				new UserCreatedEvent('123', 'luffy@onepiece.com', 'Luffy')
			)

			expect(handler).toHaveBeenCalledTimes(1)
		})

		it('should support optional correlationId', async () => {
			class EventWithCorrelation extends BaseEvent {
				constructor(
					public readonly data: string,
					correlationId?: string
				) {
					super(correlationId)
				}
			}

			const handler = vi.fn((event: EventWithCorrelation) => {
				expect(event.correlationId).toBe('corr-123')
			})

			eventBus.on(EventWithCorrelation, handler)

			await eventBus.emit(new EventWithCorrelation('test', 'corr-123'))

			expect(handler).toHaveBeenCalledTimes(1)
		})
	})
})
