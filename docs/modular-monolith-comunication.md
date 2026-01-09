# Comunicação Cross-Module em Monólitos Modulares

Este guia explica como módulos devem se comunicar em um Monólito Modular seguindo princípios de clean architecture e boas práticas modernas, mantendo baixo acoplamento e alta coesão.

---

## Índice

1. [O Problema: Por Que Não Usar Importação Direta?](#1-o-problema-por-que-não-usar-importação-direta)
2. [As 3 Estratégias de Comunicação](#2-as-3-estratégias-de-comunicação)
3. [Integration Events (Pub/Sub Assíncrono)](#3-integration-events-pubsub-assíncrono)
4. [Facade Pattern (API Pública do Módulo)](#4-facade-pattern-api-pública-do-módulo)
5. [Dados Replicados (Cache Local)](#5-dados-replicados-cache-local)
6. [Quando Usar Cada Estratégia](#6-quando-usar-cada-estratégia)
7. [E Quanto a HTTP Entre Módulos?](#7-e-quanto-a-http-entre-módulos)
8. [Estrutura de Pastas Recomendada](#8-estrutura-de-pastas-recomendada)
9. [Migração para Microserviços](#9-migração-para-microserviços)

---

## 1. O Problema: Por Que Não Usar Importação Direta?

### ❌ O Que NÃO Fazer

**Importação direta de classes internas de outro módulo:**

```typescript
// PAYMENTS MODULE importing internal classes from Meetings module

import { Meeting } from '../../Meetings/Models/Meeting'
import { MeetingRepository } from '../../Meetings/Infrastructure/MeetingRepository'
import { CreateMeetingService } from '../../Meetings/Services/CreateMeetingService'

class ProcessPaymentService {
    constructor(
        private meetingRepo: MeetingRepository  // ❌ TIGHT COUPLING!
    ) {}

    async execute(params: ProcessPaymentParams): Promise<void> {
        // ❌ Accessing internal implementation of another module
        const meeting = await this.meetingRepo.findById(params.meetingId)

        if (!meeting.isOrganizer(params.userId)) {
            throw new Error("Not authorized")
        }

        // ... process payment
    }
}
```

### Por Que Isso é Ruim?

| Problema | Consequência |
|---------|-------------|
| **Alto Acoplamento** | Mudanças no módulo Meetings quebram o módulo Payments |
| **Violação de Limites de Módulo** | Payments conhece detalhes internos de Meetings (entidades, repositórios) |
| **Impossível Migrar** | Não consegue extrair Meetings para microserviço no futuro |
| **Transações Complexas** | Difícil gerenciar transações entre módulos |
| **Testes Difíceis** | Para testar Payments, precisa mockar todo o módulo Meetings |

---

## 2. As 3 Estratégias de Comunicação

Existem **3 estratégias corretas** para comunicação entre módulos em um Monólito Modular:

| Estratégia | Tipo | Quando Usar | Acoplamento |
|------------|------|-------------|-------------|
| **Integration Events** | Assíncrono (Pub/Sub) | Notificar que algo aconteceu | Zero (desacoplado total) |
| **Facade Pattern** | Síncrono (Interface) | Validação/verificação imediata | Baixo (depende de abstração) |
| **Dados Replicados** | Cache Local | Consultas frequentes | Zero (dados locais) |

**Importante:** Essas estratégias **não são rivais** - são **complementares** e frequentemente usadas juntas!

---

## 3. Integration Events (Pub/Sub Assíncrono)

### Quando Usar

- ✅ Notificar outros módulos que algo importante aconteceu
- ✅ Desacoplamento total (módulos não se conhecem)
- ✅ Operações que podem ser **eventuais** (não precisam ser imediatas)
- ✅ Trigger de processos em outros módulos

### Como Funciona

```typescript
// ========== MEETINGS MODULE (Publisher) ==========

// 1. Service/Use Case emits event when something important happens
class CreateMeetingService {
    constructor(
        private meetingRepo: MeetingRepository,
        private eventBus: IEventBus
    ) {}

    async execute(data: CreateMeetingData): Promise<Meeting> {
        const meeting = new Meeting(data)
        await this.meetingRepo.save(meeting)

        // Emit Integration Event
        await this.eventBus.publish(
            new MeetingCreatedIntegrationEvent(
                meeting.id,
                meeting.creatorId,
                meeting.title,
                meeting.date
            )
        )

        return meeting
    }
}

// 2. Integration Event (simple DTO, serializable)
export class MeetingCreatedIntegrationEvent {
    constructor(
        public readonly meetingId: string,
        public readonly creatorId: string,
        public readonly title: string,
        public readonly date: Date
    ) {}
}

// ========== PAYMENTS MODULE (Subscriber) ==========

// 3. Handler listens to the event and reacts
@EventHandler(MeetingCreatedIntegrationEvent)
class MeetingCreatedIntegrationEventHandler {
    constructor(
        private paymentRepo: IPaymentRepository
    ) {}

    async handle(event: MeetingCreatedIntegrationEvent): Promise<void> {
        // Create payment structure for this meeting
        const paymentStructure = new PaymentStructure(
            event.meetingId,
            event.creatorId
        )

        await this.paymentRepo.save(paymentStructure)
    }
}
```

### Vantagens

- ✅ **Desacoplamento Total:** Módulos não se conhecem (só conhecem eventos)
- ✅ **Assíncrono:** Não trava o fluxo principal
- ✅ **Escalável:** Fácil migrar para message broker (RabbitMQ, Kafka) depois
- ✅ **Transacional:** Usa Outbox Pattern (garante entrega mesmo se der crash)
- ✅ **Auditável:** Todos os eventos ficam registrados

### Desvantagens

- ❌ **Consistência Eventual:** Dados podem estar "desatualizados" por alguns ms/segundos
- ❌ **Complexidade de Debug:** Fluxo assíncrono é mais difícil de rastrear
- ❌ **Não serve para validações imediatas:** Se você precisa de resposta agora, use Facade

### Outbox Pattern (Garantia de Entrega)

**Problema:** E se o evento for disparado mas o processo crashar antes de entregar?

**Solução:** Salvar eventos em uma tabela `outbox` na **mesma transação** que salvou a entidade.

```typescript
// Tabela outbox
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(255),
    event_data JSONB,
    occurred_at TIMESTAMP,
    processed_at TIMESTAMP NULL
)

// Processo background despacha eventos da outbox
class OutboxProcessor {
    async processOutbox(): Promise<void> {
        const pendingEvents = await this.db.query(`
            SELECT * FROM outbox_events
            WHERE processed_at IS NULL
            ORDER BY occurred_at
        `)

        for (const event of pendingEvents) {
            // Publica no message broker ou chama handlers
            await this.eventBus.publish(event)

            // Marca como processado
            await this.db.query(`
                UPDATE outbox_events
                SET processed_at = NOW()
                WHERE id = $1
            `, [event.id])
        }
    }
}
```

---

## 4. Facade Pattern (API Pública do Módulo)

### Quando Usar

- ✅ Validação/verificação **imediata** (precisa de resposta síncrona)
- ✅ Consultas que não podem esperar (ex: autorização em tempo real)
- ✅ Operações que precisam retornar dados específicos

### Como Funciona

O Facade Pattern cria uma **interface pública** que representa a API do módulo. Outros módulos dependem dessa **abstração (interface)**, não da implementação concreta.

#### Passo 1: Módulo Define Interface Pública

```typescript
// ========== MEETINGS MODULE (Provider) ==========
// src/Modules/Meetings/Contracts/IMeetingsModule.ts

export interface IMeetingsModule {
    // Methods that OTHER modules can call
    isMeetingOrganizer(meetingId: string, userId: string): Promise<boolean>
    getMeetingDate(meetingId: string): Promise<Date | null>
}
```

#### Passo 2: Módulo Implementa a Interface

```typescript
// src/Modules/Meetings/MeetingsModule.ts

export class MeetingsModule implements IMeetingsModule {
    constructor(
        private meetingRepo: IMeetingRepository,
        private checkOrganizerQuery: CheckIfUserIsOrganizerQuery,
        private getMeetingQuery: GetMeetingQuery
    ) {}

    // Implement public methods
    async isMeetingOrganizer(meetingId: string, userId: string): Promise<boolean> {
        // Delegate to internal query
        return await this.checkOrganizerQuery.execute(meetingId, userId)
    }

    async getMeetingDate(meetingId: string): Promise<Date | null> {
        const meeting = await this.getMeetingQuery.execute(meetingId)
        return meeting?.date ?? null
    }
}
```

**Importante:** O Facade **NÃO** é sobre "quebrar classes". Internamente, você continua com Services/Queries separadas (1 responsabilidade por classe). O Facade apenas **agrupa e expõe** funcionalidades públicas.

#### Passo 3: Outro Módulo Importa APENAS a Interface

```typescript
// ========== PAYMENTS MODULE (Consumer) ==========

// ✅ Import ONLY the interface (abstraction)
import { IMeetingsModule } from '../../Meetings/Contracts/IMeetingsModule'

// ❌ DO NOT import the implementation:
// import { MeetingsModule } from '../../Meetings/MeetingsModule'

// ❌ DO NOT import internal classes:
// import { Meeting } from '../../Meetings/Models/Meeting'

class ProcessPaymentService {
    constructor(
        private meetingsModule: IMeetingsModule  // ✅ Depends on ABSTRACTION
    ) {}

    async execute(params: ProcessPaymentParams): Promise<void> {
        // Synchronous cross-module validation
        const isOrganizer = await this.meetingsModule.isMeetingOrganizer(
            params.meetingId,
            params.userId
        )

        if (!isOrganizer) {
            throw new Error("Only organizer can process payment")
        }

        // ... process payment
    }
}
```

#### Passo 4: Composition Root Injeta Implementação

```typescript
// ========== COMPOSITION ROOT (Application Startup) ==========

import { MeetingsModule } from '../Modules/Meetings/MeetingsModule'
import { ProcessPaymentService } from '../Modules/Payments/Services/ProcessPaymentService'

export class ApplicationCompositionRoot {
    static composePayments(): ProcessPaymentService {
        // 1. Create concrete implementation of Meetings module
        const meetingRepo = new MeetingRepository(database)
        const checkOrganizerQuery = new CheckIfUserIsOrganizerQuery(meetingRepo)
        const getMeetingQuery = new GetMeetingQuery(meetingRepo)

        const meetingsModule = new MeetingsModule(
            meetingRepo,
            checkOrganizerQuery,
            getMeetingQuery
        )

        // 2. Inject into Payments (as IMeetingsModule)
        const paymentRepo = new PaymentRepository(database)
        const processPaymentService = new ProcessPaymentService(
            meetingsModule  // <-- Concrete implementation, but type is IMeetingsModule
        )

        return processPaymentService
    }
}
```

### Regras de Ouro do Facade Pattern

| Regra | Descrição |
|-------|-----------|
| **1. Interface Pública** | Defina interface com apenas métodos que outros módulos precisam |
| **2. Não Retorne Entidades** | Retorne tipos primitivos ou DTOs simples, nunca entidades de domínio |
| **3. Dependency Inversion** | Consumidor depende da interface, não da implementação |
| **4. Mínimo Necessário** | Exponha apenas o mínimo - não torne todo o módulo público |
| **5. Implementação Privada** | A classe concreta pode ficar interna ao módulo |

### Vantagens

- ✅ **Síncrono:** Resposta imediata
- ✅ **Baixo Acoplamento:** Depende de abstração (interface), não de implementação
- ✅ **Fácil Migração:** Troca implementação para HTTP client sem mudar consumidor
- ✅ **Type-Safe:** Compilador garante que a interface está sendo respeitada

### Desvantagens

- ❌ **Acoplamento Maior que Events:** Ainda há dependência direta (mesmo que abstrata)
- ❌ **Síncrono:** Se o módulo for lento, afeta performance do chamador
- ❌ **Não serve para notificações:** Se é "disparar e esquecer", use eventos

### Nuance Importante: Importação da Interface

**Pergunta:** "Então Facade é a única 'exceção' onde importação direta é permitida?"

**Resposta:** Sim, mas com uma nuance crucial:

- ✅ **PERMITIDO:** Importar a **INTERFACE** (contrato abstrato)
- ❌ **PROIBIDO:** Importar a **IMPLEMENTAÇÃO** (classe concreta)
- ❌ **PROIBIDO:** Importar **CLASSES INTERNAS** (entidades, repositórios, services)

```typescript
// ✅ PERMITIDO
import { IMeetingsModule } from '../../Meetings/Contracts/IMeetingsModule'

// ❌ PROIBIDO
import { MeetingsModule } from '../../Meetings/MeetingsModule'
import { Meeting } from '../../Meetings/Models/Meeting'
import { MeetingRepository } from '../../Meetings/Infrastructure/MeetingRepository'
```

**Por que interface pode mas implementação não?**

- **Interface** = contrato estável (raramente muda)
- **Implementação** = detalhes concretos (podem mudar frequentemente)

Se você depende da **interface**, o módulo Meetings pode **refatorar tudo internamente** sem afetar Payments!

---

## 5. Dados Replicados (Cache Local)

### Quando Usar

- ✅ Consultas **frequentes** dos mesmos dados
- ✅ Dados que não precisam estar 100% atualizados em tempo real
- ✅ Performance (evitar chamadas cross-module repetidas)
- ✅ Listagens que combinam dados de múltiplos módulos

### Como Funciona

Cada módulo mantém sua **própria cópia simplificada** dos dados de outros módulos que ele precisa consultar frequentemente.

```typescript
// ========== PAYMENTS MODULE maintains local copy of Meeting data ==========

// Simplified entity (only data that Payments needs)
class PaymentMeetingData {
    meetingId: string      // ID from Meetings module
    title: string          // For display in lists
    organizerId: string    // For validations
    date: Date             // For payment logic

    // NOT the complete Meeting entity from Meetings module!
    // Just a projection with data necessary for Payments
}

// ========== Data arrives via Integration Events ==========

@EventHandler(MeetingCreatedIntegrationEvent)
class MeetingCreatedIntegrationEventHandler {
    constructor(
        private meetingDataRepo: IPaymentMeetingDataRepository,
        private paymentRepo: IPaymentRepository
    ) {}

    async handle(event: MeetingCreatedIntegrationEvent): Promise<void> {
        // 1. Create payment structure
        const paymentStructure = new PaymentStructure(
            event.meetingId,
            event.creatorId
        )
        await this.paymentRepo.save(paymentStructure)

        // 2. Create/update local copy of meeting data
        const meetingData = new PaymentMeetingData(
            event.meetingId,
            event.title,
            event.creatorId,
            event.date
        )
        await this.meetingDataRepo.save(meetingData)
    }
}

// ========== Queries use local data (performance) ==========

class ListPaymentsQuery {
    constructor(
        private paymentRepo: IPaymentRepository
    ) {}

    async execute(): Promise<PaymentDTO[]> {
        const payments = await this.paymentRepo.findAll()

        // ✅ Uses replicated data (no need to call Meetings module!)
        return payments.map(p => ({
            paymentId: p.id,
            meetingTitle: p.meetingData.title,  // <-- Local data
            meetingDate: p.meetingData.date,    // <-- Local data
            amount: p.amount,
            status: p.status
        }))
    }
}
```

### Mantendo Dados Atualizados

```typescript
// Listen to update events
@EventHandler(MeetingTitleChangedIntegrationEvent)
class MeetingTitleChangedHandler {
    async handle(event: MeetingTitleChangedIntegrationEvent): Promise<void> {
        // Update local copy
        const meetingData = await this.repo.findByMeetingId(event.meetingId)
        if (meetingData) {
            meetingData.title = event.newTitle
            await this.repo.save(meetingData)
        }
    }
}

@EventHandler(MeetingDeletedIntegrationEvent)
class MeetingDeletedHandler {
    async handle(event: MeetingDeletedIntegrationEvent): Promise<void> {
        // Remove local copy
        await this.repo.deleteByMeetingId(event.meetingId)
    }
}
```

### Vantagens

- ✅ **Performance Excelente:** Consultas locais (sem chamadas cross-module)
- ✅ **Modelo Simplificado:** Cada módulo tem apenas dados que precisa
- ✅ **Resiliência:** Módulos podem continuar lendo mesmo se outro estiver offline
- ✅ **Evita Joins Complexos:** Dados já estão desnormalizados para a necessidade

### Desvantagens

- ❌ **Consistência Eventual:** Dados podem estar desatualizados por alguns ms/segundos
- ❌ **Duplicação de Dados:** Mesmo dado armazenado em múltiplos lugares
- ❌ **Sincronização:** Precisa manter cópias atualizadas via eventos

### Relação com Integration Events

**Importante:** Dados Replicados **NÃO são rivais** de Integration Events - são **complementares**!

- **Integration Events** = Mecanismo de **entrega** dos dados
- **Dados Replicados** = **Consequência** de receber esses dados

```
Integration Events (entrega)
         ↓
Dados Replicados (armazenamento local)
         ↓
Performance em Consultas
```

Sem Integration Events, você não teria como popular/atualizar os Dados Replicados!

---

## 6. Quando Usar Cada Estratégia

### 🎯 Fluxo de Decisão

```
┌─────────────────────────────────────────┐
│ Módulo X precisa de algo do Módulo Y?  │
└─────────────────┬───────────────────────┘
                  │
                  ↓
    ┌─────────────────────────────┐
    │ É uma NOTIFICAÇÃO?          │
    │ "Avise quando X acontecer"  │
    └──────────┬──────────────────┘
               │ SIM
               ↓
    ┌──────────────────────┐
    │ Integration Events   │
    │ (Pub/Sub Assíncrono) │
    └──────────────────────┘
               │
               │ NÃO
               ↓
    ┌─────────────────────────────┐
    │ Precisa VALIDAR/VERIFICAR?  │
    │ Resposta imediata?          │
    └──────────┬────────────────┬─┘
               │ SIM            │ NÃO
               ↓                ↓
    ┌──────────────────┐   ┌────────────────┐
    │ Facade Pattern   │   │ Dados          │
    │ (API Síncrona)   │   │ Replicados     │
    └──────────────────┘   │ (Cache Local)  │
               │            └────────────────┘
               ↓                     │
    ┌──────────────────────┐        │
    │ Vai consultar isso   │        │
    │ FREQUENTEMENTE?      │◄───────┘
    └──────────┬───────────┘
               │ SIM
               ↓
    ┌──────────────────────┐
    │ Adiciona também:     │
    │ Dados Replicados     │
    │ (para performance)   │
    └──────────────────────┘
```

### 📊 Tabela de Decisão

| Cenário | Estratégia Recomendada | Motivo |
|---------|------------------------|--------|
| Notificar que reunião foi criada | **Integration Events** | Notificação assíncrona, desacoplamento |
| Validar se usuário é organizador (antes de processar pagamento) | **Facade Pattern** | Precisa resposta síncrona para validação |
| Listar pagamentos com título da reunião | **Dados Replicados** | Consulta frequente, performance |
| Trigger de envio de email quando pagamento aprovado | **Integration Events** | Trigger assíncrono, desacoplamento |
| Verificar se reunião existe antes de criar registro | **Facade Pattern** | Validação síncrona |
| Dashboard com dados de múltiplos módulos | **Dados Replicados** | Consultas frequentes, joins complexos |

### 💡 Exemplo Prático Combinando Estratégias

**Cenário:** Módulo Payments precisa trabalhar com dados de Meetings

```typescript
// ========== 1. Integration Events (Notification + Populate Data) ==========

// When meeting is created, Meetings dispatches event
await this.eventBus.publish(new MeetingCreatedIntegrationEvent(...))

// Payments listens and:
// a) Creates payment structure
// b) Replicates data locally for future queries
class MeetingCreatedHandler {
    async handle(event: MeetingCreatedIntegrationEvent) {
        // Create payment structure
        const paymentStructure = new PaymentStructure(event.meetingId)
        await this.paymentRepo.save(paymentStructure)

        // Replicate data for future queries (performance)
        const meetingData = new PaymentMeetingData(
            event.meetingId,
            event.title,
            event.date
        )
        await this.meetingDataRepo.save(meetingData)
    }
}

// ========== 2. Facade Pattern (Sync Validation) ==========

// When processing payment, validate if user is organizer
class ProcessPaymentService {
    constructor(private meetingsModule: IMeetingsModule) {}

    async execute(params: ProcessPaymentParams) {
        // Need answer NOW (cannot wait for event)
        const isOrganizer = await this.meetingsModule.isMeetingOrganizer(
            params.meetingId,
            params.userId
        )

        if (!isOrganizer) throw new Error("Not authorized")

        // ... process payment
    }
}

// ========== 3. Replicated Data (Fast Queries) ==========

// When listing payments, use local data
class ListPaymentsQuery {
    async execute() {
        const payments = await this.paymentRepo.findAll()

        // ✅ Performance: local data, no cross-module call
        return payments.map(p => ({
            id: p.id,
            meetingTitle: p.meetingData.title,  // <-- Replicated data
            meetingDate: p.meetingData.date,    // <-- Replicated data
            amount: p.amount
        }))
    }
}
```

---

## 7. E Quanto a HTTP Entre Módulos?

### ❌ NÃO Faça Isso no Monolito

```typescript
// ❌ WRONG: HTTP localhost to another module in the same process
class ProcessPaymentService {
    async execute(params: ProcessPaymentParams) {
        // Module running in the same process making HTTP to itself
        const response = await fetch(
            'http://localhost:3000/api/meetings/check-organizer',
            {
                method: 'POST',
                body: JSON.stringify({
                    meetingId: params.meetingId,
                    userId: params.userId
                })
            }
        )

        const { isOrganizer } = await response.json()

        if (!isOrganizer) throw new Error("Not authorized")
    }
}
```

### Por Que Evitar HTTP no Monolito?

| Problema | Consequência |
|---------|-------------|
| **Overhead Desnecessário** | Serialização JSON, rede, deserialização - tudo para chamar código no mesmo processo |
| **Latência Artificial** | Adiciona ms de latência à toa (TCP handshake, HTTP parsing) |
| **Complexidade de Deploy** | Precisa garantir portas abertas, configurar CORS, etc |
| **Dificulta Debugging** | Stack traces param na camada HTTP, não mostram o fluxo completo |
| **Transações Quebradas** | HTTP não compartilha transação de banco - consistência comprometida |

### ✅ Use HTTP Apenas Para Microserviços

Quando os módulos estiverem **fisicamente separados** (processos/servidores diferentes):

```typescript
// ✅ CORRECT: HTTP when modules are separate microservices

class MeetingsModuleHttpClient implements IMeetingsModule {
    constructor(private httpClient: HttpClient) {}

    async isMeetingOrganizer(meetingId: string, userId: string): Promise<boolean> {
        const response = await this.httpClient.get(
            `https://meetings-service.com/api/check-organizer`,
            { params: { meetingId, userId } }
        )
        return response.data.isOrganizer
    }
}

// In Composition Root, you choose which implementation to use:
// - Monolith: MeetingsModule (in-process)
// - Microservices: MeetingsModuleHttpClient (HTTP)
```

**A beleza:** O código consumidor (ProcessPaymentService) **não muda nada**! Apenas a implementação de `IMeetingsModule` é trocada.

---

## 8. Estrutura de Pastas Recomendada

### Organização que Facilita Comunicação

```
src/
├── Modules/
│   ├── Meetings/
│   │   ├── Contracts/                       # 📢 PUBLIC (Interfaces)
│   │   │   └── IMeetingsModule.ts           # Interface that other modules import
│   │   ├── IntegrationEvents/               # 📢 PUBLIC (Events)
│   │   │   ├── MeetingCreatedIntegrationEvent.ts
│   │   │   └── MeetingDeletedIntegrationEvent.ts
│   │   ├── MeetingsModule.ts                # 🔒 Can be public or private
│   │   ├── Services/                        # 🔒 PRIVATE
│   │   │   ├── CreateMeetingService.ts
│   │   │   └── CancelMeetingService.ts
│   │   ├── Queries/                         # 🔒 PRIVATE
│   │   │   └── CheckIfUserIsOrganizerQuery.ts
│   │   ├── Models/                          # 🔒 PRIVATE (never import from outside)
│   │   │   ├── Meeting.ts
│   │   │   └── MeetingGroup.ts
│   │   └── Infrastructure/                  # 🔒 PRIVATE
│   │       ├── MeetingRepository.ts
│   │       └── MeetingEntityConfiguration.ts
│   │
│   └── Payments/
│       ├── Contracts/                       # 📢 PUBLIC
│       │   └── IPaymentsModule.ts
│       ├── IntegrationEvents/               # 📢 PUBLIC
│       │   └── PaymentProcessedIntegrationEvent.ts
│       ├── EventHandlers/                   # 🔒 PRIVATE (but listens to public events)
│       │   └── MeetingCreatedIntegrationEventHandler.ts
│       ├── Services/
│       │   └── ProcessPaymentService.ts     # Imports IMeetingsModule
│       ├── Models/                          # 🔒 PRIVATE
│       │   ├── Payment.ts
│       │   └── PaymentMeetingData.ts        # Replicated data from Meetings
│       └── Infrastructure/                  # 🔒 PRIVATE
│           └── PaymentRepository.ts
│
├── Shared/                                  # 📢 PUBLIC (shared)
│   ├── Interfaces/
│   │   ├── IRepository.ts
│   │   └── IEventBus.ts
│   ├── Utils/
│   │   └── DateUtils.ts
│   └── Infrastructure/
│       ├── Outbox/
│       │   └── OutboxProcessor.ts
│       └── EventBus/
│           └── InMemoryEventBus.ts
│
└── Composition/                             # 🔧 Dependency Injection
    ├── ApplicationCompositionRoot.ts
    ├── MeetingsCompositionRoot.ts
    └── PaymentsCompositionRoot.ts
```

### Regras de Importação

| Pasta | Pode Ser Importada? | Por Quem? |
|-------|---------------------|-----------|
| `Contracts/` (Interfaces) | ✅ SIM | Outros módulos |
| `IntegrationEvents/` | ✅ SIM | Outros módulos (handlers) |
| `Models/` | ❌ NÃO | Nunca! (privado ao módulo) |
| `Infrastructure/` | ❌ NÃO | Nunca! (privado ao módulo) |
| `Services/`, `Queries/` | ❌ NÃO | Privado (exposto via Facade) |
| `Shared/` | ✅ SIM | Todos os módulos |

---

## 9. Migração para Microserviços

Uma das maiores vantagens de usar essas estratégias corretamente é a **facilidade de migração para microserviços** no futuro.

### 🎯 Cenário: Extraindo Módulo Meetings para Microserviço

#### Antes (Monolito Modular)

```typescript
// ========== COMPOSITION ROOT (Monolith) ==========

class ApplicationCompositionRoot {
    static composePayments(): ProcessPaymentService {
        // 1. Meetings module (in-process)
        const meetingRepo = new MeetingRepository(database)
        const meetingsModule = new MeetingsModule(meetingRepo)

        // 2. Payments module
        const paymentRepo = new PaymentRepository(database)
        const processPaymentService = new ProcessPaymentService(
            meetingsModule  // In-process call
        )

        return processPaymentService
    }
}
```

#### Depois (Meetings como Microserviço)

**Passo 1:** Criar implementação HTTP da interface

```typescript
// New implementation: HTTP Client
class MeetingsModuleHttpClient implements IMeetingsModule {
    constructor(
        private httpClient: HttpClient,
        private baseUrl: string
    ) {}

    async isMeetingOrganizer(meetingId: string, userId: string): Promise<boolean> {
        const response = await this.httpClient.get(
            `${this.baseUrl}/api/check-organizer`,
            { params: { meetingId, userId } }
        )
        return response.data.isOrganizer
    }

    async getMeetingDate(meetingId: string): Promise<Date | null> {
        const response = await this.httpClient.get(
            `${this.baseUrl}/api/meetings/${meetingId}/date`
        )
        return response.data.date ? new Date(response.data.date) : null
    }
}
```

**Passo 2:** Trocar implementação no Composition Root

```typescript
// ========== COMPOSITION ROOT (Microservices) ==========

class ApplicationCompositionRoot {
    static composePayments(): ProcessPaymentService {
        // 1. Meetings module (now HTTP!)
        const httpClient = new HttpClient()
        const meetingsModule = new MeetingsModuleHttpClient(
            httpClient,
            'https://meetings-service.com'
        )

        // 2. Payments module (CODE DOESN'T CHANGE!)
        const paymentRepo = new PaymentRepository(database)
        const processPaymentService = new ProcessPaymentService(
            meetingsModule  // Now HTTP, but ProcessPaymentService doesn't know!
        )

        return processPaymentService
    }
}
```

**Passo 3:** Trocar Integration Events para Message Broker

```typescript
// Before (Monolith): In-memory event bus
class InMemoryEventBus implements IEventBus {
    publish(event: IntegrationEvent): Promise<void> {
        // Call handlers directly in memory
        const handlers = this.getHandlers(event.constructor.name)
        return Promise.all(handlers.map(h => h.handle(event)))
    }
}

// After (Microservices): RabbitMQ/Kafka
class RabbitMQEventBus implements IEventBus {
    publish(event: IntegrationEvent): Promise<void> {
        // Publish to RabbitMQ
        return this.channel.publish(
            'integration-events',
            event.constructor.name,
            Buffer.from(JSON.stringify(event))
        )
    }
}

// In Composition Root, just swap the implementation:
const eventBus = config.isMicroservices
    ? new RabbitMQEventBus(rabbitConnection)
    : new InMemoryEventBus()
```

### ✅ Resultado: Zero Mudanças no Código de Negócio

- ✅ **ProcessPaymentService:** Não muda nada (depende da interface)
- ✅ **Handlers de Eventos:** Não mudam nada (escutam eventos, não importa a origem)
- ✅ **Models:** Não mudam nada (ignoram infraestrutura)

**Apenas muda:** Composition Root (troca implementações concretas)

---

## Resumo Final

### As 3 Estratégias

| Estratégia | Tipo | Acoplamento | Quando Usar |
|------------|------|-------------|-------------|
| **Integration Events** | Assíncrono (Pub/Sub) | Zero | Notificações, triggers, desacoplamento total |
| **Facade Pattern** | Síncrono (Interface) | Baixo | Validações, verificações imediatas |
| **Dados Replicados** | Cache Local | Zero | Consultas frequentes, performance |

### Regras de Ouro

1. ✅ **NUNCA importe classes internas** de outro módulo (Models, Infrastructure, Services)
2. ✅ **Importe apenas interfaces públicas** (Contracts/) ou Integration Events
3. ✅ **Use Integration Events** para notificações e desacoplamento
4. ✅ **Use Facade Pattern** para validações/consultas síncronas (via interface)
5. ✅ **Replique dados** quando precisar consultar frequentemente
6. ❌ **NÃO use HTTP** no monolito (só em microserviços)
7. ✅ **Dependency Inversion** sempre (dependa de abstrações, não de implementações)

### Benefícios de Fazer Certo

- ✅ **Baixo Acoplamento:** Módulos podem evoluir independentemente
- ✅ **Testabilidade:** Fácil mockar interfaces em testes
- ✅ **Migração Gradual:** Extrair módulos para microserviços sem reescrever código
- ✅ **Manutenibilidade:** Mudanças internas não afetam outros módulos
- ✅ **Limites de Módulo:** Cada módulo tem suas próprias responsabilidades isoladas

---

**Agora você está pronto para construir um Monólito Modular bem arquitetado que pode evoluir para microserviços quando necessário!** 🚀
