# EventBus - Exemplos de Uso

Este documento mostra exemplos práticos de como usar o EventBus type-safe.

## Conceitos Básicos

### 1. Criando Eventos

Eventos são classes que implementam a interface `Event`. Você pode estender `BaseEvent` por conveniência ou implementar `Event` diretamente.

```typescript
import { BaseEvent } from './event'

// Option 1: Extend BaseEvent (recommended - auto-handles occurredAt)
class UserCreatedEvent extends BaseEvent {
    constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly name: string
    ) {
        super() // BaseEvent sets occurredAt automatically
    }
}

// Option 2: Implement Event interface directly
class CustomEvent implements Event {
    public readonly occurredAt = new Date()

    constructor(
        public readonly customData: string,
        public readonly correlationId?: string
    ) {}
}
```

### 2. Registrando Handlers

Handlers são funções type-safe que recebem o tipo específico do evento.

```typescript
import { EventBus } from './event-bus'

const eventBus = new EventBus()

// Handler with full type safety
eventBus.on(UserCreatedEvent, async (event) => {
    // TypeScript knows event is UserCreatedEvent
    // You get autocomplete for: event.userId, event.email, event.name
    console.log(`User ${event.name} created with email: ${event.email}`)

    // Can be async
    await sendWelcomeEmail(event.email)
})
```

### 3. Emitindo Eventos

```typescript
// Create and emit event
const event = new UserCreatedEvent('123', 'luffy@onepiece.com', 'Monkey D. Luffy')
await eventBus.emit(event)
```

---

## Exemplos Práticos

### Exemplo 1: Módulo User (Publisher)

```typescript
// apps/user-service/src/services/user-service.ts

import { EventBus, BaseEvent } from '@core/events'

// Define event
export class UserCreatedEvent extends BaseEvent {
    constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly name: string,
        public readonly createdAt: Date
    ) {
        super()
    }
}

export class UserService {
    constructor(
        private userRepo: UserRepository,
        private eventBus: EventBus
    ) {}

    async createUser(data: CreateUserDTO): Promise<User> {
        // Create user
        const user = await this.userRepo.save({
            email: data.email,
            name: data.name
        })

        // Emit event for other modules
        await this.eventBus.emit(
            new UserCreatedEvent(
                user.id,
                user.email,
                user.name,
                user.createdAt
            )
        )

        return user
    }
}
```

### Exemplo 2: Módulo Email (Subscriber)

```typescript
// apps/email-service/src/handlers/user-created-handler.ts

import { EventBus } from '@core/events'
import { UserCreatedEvent } from '@user-service/events'

export class UserCreatedHandler {
    constructor(
        private emailService: EmailService,
        private eventBus: EventBus
    ) {
        this.setupSubscriptions()
    }

    private setupSubscriptions(): void {
        // Type-safe handler - event is typed as UserCreatedEvent
        this.eventBus.on(UserCreatedEvent, async (event) => {
            await this.handleUserCreated(event)
        })
    }

    private async handleUserCreated(event: UserCreatedEvent): Promise<void> {
        console.log(`Sending welcome email to ${event.email}`)

        await this.emailService.send({
            to: event.email,
            subject: 'Welcome!',
            body: `Hello ${event.name}, welcome to our platform!`
        })
    }
}
```

### Exemplo 3: Múltiplos Eventos com Propriedades Diferentes

```typescript
// Character module events
export class CharacterCreatedEvent extends BaseEvent {
    constructor(
        public readonly characterId: string,
        public readonly name: string,
        public readonly bounty: number
    ) {
        super()
    }
}

export class BountyUpdatedEvent extends BaseEvent {
    constructor(
        public readonly characterId: string,
        public readonly oldBounty: number,
        public readonly newBounty: number,
        public readonly reason: string
    ) {
        super()
    }
}

export class CharacterDefeatedEvent extends BaseEvent {
    constructor(
        public readonly victimId: string,
        public readonly defeatedById: string,
        public readonly location: string
    ) {
        super()
    }
}

// Different handlers for different events
eventBus.on(CharacterCreatedEvent, async (event) => {
    // event has: characterId, name, bounty
    console.log(`New character: ${event.name} with bounty ${event.bounty}`)
})

eventBus.on(BountyUpdatedEvent, async (event) => {
    // event has: characterId, oldBounty, newBounty, reason
    console.log(`Bounty updated from ${event.oldBounty} to ${event.newBounty}`)
})

eventBus.on(CharacterDefeatedEvent, async (event) => {
    // event has: victimId, defeatedById, location
    console.log(`Character ${event.victimId} defeated at ${event.location}`)
})
```

### Exemplo 4: Comunicação Cross-Module (Seguindo Clean Architecture)

```typescript
// ========== MEETINGS MODULE ==========
// apps/meetings/src/events/meeting-events.ts

export class MeetingCreatedEvent extends BaseEvent {
    constructor(
        public readonly meetingId: string,
        public readonly creatorId: string,
        public readonly title: string,
        public readonly date: Date
    ) {
        super()
    }
}

// apps/meetings/src/services/meeting-service.ts
export class MeetingService {
    constructor(
        private meetingRepo: MeetingRepository,
        private eventBus: EventBus
    ) {}

    async createMeeting(data: CreateMeetingDTO): Promise<Meeting> {
        const meeting = await this.meetingRepo.save(data)

        // Notify other modules
        await this.eventBus.emit(
            new MeetingCreatedEvent(
                meeting.id,
                meeting.creatorId,
                meeting.title,
                meeting.date
            )
        )

        return meeting
    }
}

// ========== PAYMENTS MODULE ==========
// apps/payments/src/handlers/meeting-created-handler.ts

export class MeetingCreatedHandler {
    constructor(
        private paymentRepo: PaymentRepository,
        private eventBus: EventBus
    ) {
        this.setupSubscriptions()
    }

    private setupSubscriptions(): void {
        // Listen to events from Meetings module
        this.eventBus.on(MeetingCreatedEvent, async (event) => {
            // Create payment structure for this meeting
            await this.paymentRepo.save({
                meetingId: event.meetingId,
                creatorId: event.creatorId,
                status: 'pending',
                amount: 0
            })

            console.log(`Payment structure created for meeting ${event.meetingId}`)
        })
    }
}
```

### Exemplo 5: Tratamento de Erros

```typescript
// Handlers that might fail don't break other handlers
eventBus.on(UserCreatedEvent, async (event) => {
    // This handler might fail
    await sendWelcomeEmail(event.email) // Might throw
})

eventBus.on(UserCreatedEvent, async (event) => {
    // This handler will still execute even if the above fails
    await createUserProfile(event.userId)
})

eventBus.on(UserCreatedEvent, async (event) => {
    // This one too
    await notifyAdmins(event)
})

// All handlers run in parallel
// If one fails, others continue
await eventBus.emit(new UserCreatedEvent('123', 'luffy@onepiece.com', 'Luffy'))
```

### Exemplo 6: Testes

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventBus } from '@core/events'
import { UserService } from './user-service'
import { UserCreatedEvent } from './events'

describe('UserService', () => {
    let eventBus: EventBus
    let userService: UserService

    beforeEach(() => {
        eventBus = new EventBus()
        userService = new UserService(mockRepo, eventBus)
    })

    it('should emit UserCreatedEvent when user is created', async () => {
        const handler = vi.fn()

        // Register mock handler
        eventBus.on(UserCreatedEvent, handler)

        // Create user
        await userService.createUser({
            email: 'luffy@onepiece.com',
            name: 'Luffy'
        })

        // Assert event was emitted
        expect(handler).toHaveBeenCalledTimes(1)
        expect(handler).toHaveBeenCalledWith(
            expect.objectContaining({
                email: 'luffy@onepiece.com',
                name: 'Luffy'
            })
        )
    })

    it('should handle event with correct data', async () => {
        eventBus.on(UserCreatedEvent, async (event) => {
            // Type-safe access to event properties
            expect(event.userId).toBeDefined()
            expect(event.email).toBe('luffy@onepiece.com')
            expect(event.name).toBe('Luffy')
            expect(event.occurredAt).toBeInstanceOf(Date)
        })

        await userService.createUser({
            email: 'luffy@onepiece.com',
            name: 'Luffy'
        })
    })
})
```

### Exemplo 7: Setup de Dependency Injection

```typescript
// apps/composition-root.ts

import { EventBus } from '@core/events'
import { UserService } from '@user-service/services'
import { EmailService } from '@email-service/services'
import { UserCreatedHandler } from '@email-service/handlers'

export class CompositionRoot {
    private static eventBus: EventBus

    static setup() {
        // 1. Create EventBus singleton
        this.eventBus = new EventBus()

        // 2. Setup all modules
        const userService = this.setupUserModule()
        const emailService = this.setupEmailModule()

        // 3. Setup all handlers (subscribers)
        new UserCreatedHandler(emailService, this.eventBus)

        return {
            userService,
            emailService,
            eventBus: this.eventBus
        }
    }

    private static setupUserModule(): UserService {
        const userRepo = new UserRepository(database)
        return new UserService(userRepo, this.eventBus)
    }

    private static setupEmailModule(): EmailService {
        return new EmailService(emailConfig)
    }
}

// In main.ts
const { userService } = CompositionRoot.setup()
```

### Exemplo 8: Correlation ID para Distributed Tracing

```typescript
// Use correlationId to track events across modules
class OrderCreatedEvent extends BaseEvent {
    constructor(
        public readonly orderId: string,
        public readonly userId: string,
        public readonly total: number,
        correlationId?: string  // Pass from request
    ) {
        super(correlationId)
    }
}

// In your HTTP handler
app.post('/orders', async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] || uuidv4()

    const order = await orderService.createOrder(req.body)

    // Emit with correlation ID
    await eventBus.emit(
        new OrderCreatedEvent(
            order.id,
            order.userId,
            order.total,
            correlationId  // Same ID propagates through all handlers
        )
    )

    res.json({ orderId: order.id, correlationId })
})

// All handlers can log with same correlation ID
eventBus.on(OrderCreatedEvent, async (event) => {
    logger.info(`Processing order`, {
        correlationId: event.correlationId,
        orderId: event.orderId
    })
})
```

---

## Melhores Práticas

### 1. Convenção de Nomenclatura de Eventos
```typescript
// Use tempo passado - eventos representam algo que ACONTECEU
✅ UserCreatedEvent
✅ PaymentProcessedEvent
✅ OrderShippedEvent

❌ CreateUserEvent
❌ ProcessPaymentEvent
❌ ShipOrderEvent
```

### 2. Propriedades de Evento - Seja Explícito
```typescript
// ✅ Include all data subscribers might need
class OrderCreatedEvent extends BaseEvent {
    constructor(
        public readonly orderId: string,
        public readonly userId: string,
        public readonly items: OrderItem[],
        public readonly total: number,
        public readonly currency: string
    ) {
        super()
    }
}

// ❌ Too minimal - forces subscribers to fetch more data
class OrderCreatedEvent extends BaseEvent {
    constructor(public readonly orderId: string) {
        super()
    }
}
```

### 3. Uma Instância de EventBus
```typescript
// Create singleton in composition root
const eventBus = new EventBus()

// Inject same instance everywhere
const userService = new UserService(userRepo, eventBus)
const emailService = new EmailService(config, eventBus)
```

### 4. Configure Handlers no Startup
```typescript
// Setup all handlers when app starts
class AppBootstrap {
    static initialize(eventBus: EventBus) {
        // Register all handlers
        new UserCreatedHandler(emailService, eventBus)
        new OrderCreatedHandler(inventoryService, eventBus)
        new PaymentProcessedHandler(notificationService, eventBus)
    }
}
```

---

## Migração dos Antigos DomainEvents

Se você está migrando do antigo estilo DDD `DomainEvents`:

```typescript
// OLD (DDD style)
class User extends AggregateRoot {
    static create(data) {
        const user = new User(data)
        user.addDomainEvent(new UserCreatedEvent(...))
        return user
    }
}

// Repository
DomainEvents.markAggregateForDispatch(user)
await repo.save(user)
DomainEvents.dispatchEventsForAggregate(user.id)

// NEW (Clean Architecture style)
class UserService {
    async createUser(data) {
        const user = await this.repo.save(data)

        // Emit directly
        await this.eventBus.emit(new UserCreatedEvent(...))

        return user
    }
}
```

Benefícios da nova abordagem:
- ✅ Sem acoplamento com AggregateRoot
- ✅ Funciona com qualquer arquitetura (não apenas DDD)
- ✅ Modelo mental mais simples
- ✅ Type safety completo
- ✅ Mais fácil de testar
