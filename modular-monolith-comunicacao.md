# Comunicação Entre Módulos em Modular Monolith

Este guia explica como módulos devem se comunicar em um Modular Monolith seguindo princípios de DDD e arquitetura limpa, evitando acoplamento enquanto permite colaboração entre bounded contexts.

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
// MÓDULO PAYMENTS importando classes INTERNAS do módulo Meetings

import { Meeting } from '../../Meetings/Domain/Meeting'
import { MeetingRepository } from '../../Meetings/Infrastructure/MeetingRepository'
import { CreateMeetingUseCase } from '../../Meetings/Application/CreateMeetingUseCase'

class ProcessPaymentUseCase {
    constructor(
        private meetingRepo: MeetingRepository  // ❌ ACOPLAMENTO DIRETO!
    ) {}

    async execute(command: ProcessPaymentCommand): Promise<void> {
        // ❌ Acessando implementação interna de outro módulo
        const meeting = await this.meetingRepo.findById(command.meetingId)

        if (!meeting.isOrganizer(command.userId)) {
            throw new Error("Not authorized")
        }

        // ... processa pagamento
    }
}
```

### Por Que Isso é Ruim?

| Problema | Consequência |
|----------|--------------|
| **Acoplamento Alto** | Mudanças no módulo Meetings quebram o módulo Payments |
| **Violação de Bounded Context** | Payments conhece detalhes internos de Meetings (entidades, repositórios) |
| **Impossível Migrar** | Não consegue extrair Meetings para microserviço no futuro |
| **Transações Complexas** | Difícil gerenciar transações entre módulos |
| **Testes Difíceis** | Para testar Payments, precisa mockar todo o módulo Meetings |

---

## 2. As 3 Estratégias de Comunicação

Existem **3 estratégias corretas** para comunicação entre módulos em um Modular Monolith:

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
// ========== MÓDULO MEETINGS (Publicador) ==========

// 1. Entidade dispara evento quando algo importante acontece
class Meeting extends AggregateRoot {
    static create(data: CreateMeetingData): Meeting {
        const meeting = new Meeting(data)

        // Adiciona Integration Event
        meeting.addIntegrationEvent(
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

// 2. Integration Event (DTO simples, serializable)
export class MeetingCreatedIntegrationEvent {
    constructor(
        public readonly meetingId: string,
        public readonly creatorId: string,
        public readonly title: string,
        public readonly date: Date
    ) {}
}

// 3. Repositório/UnitOfWork despacha eventos após commit
class UnitOfWork {
    async commit(): Promise<void> {
        const events = this.collectDomainEvents()

        await this.db.transaction(async (tx) => {
            // Salva agregados
            await this.saveAggregates(tx)

            // Converte Domain Events → Integration Events
            const integrationEvents = this.convertToIntegrationEvents(events)

            // Salva na Outbox (mesma transação - garante entrega)
            for (const event of integrationEvents) {
                await this.saveToOutbox(event, tx)
            }
        })

        // Despacha Domain Events locais (após commit)
        await this.dispatchDomainEvents(events)
    }
}

// ========== MÓDULO PAYMENTS (Assinante) ==========

// 4. Handler escuta o evento e reage
@EventHandler(MeetingCreatedIntegrationEvent)
class MeetingCreatedIntegrationEventHandler {
    constructor(
        private paymentRepo: IPaymentRepository
    ) {}

    async handle(event: MeetingCreatedIntegrationEvent): Promise<void> {
        // Cria estrutura de pagamento para essa reunião
        const paymentStructure = PaymentStructure.createFor(
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

**Solução:** Salvar eventos em uma tabela `outbox` na **mesma transação** que salvou o agregado.

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
// ========== MÓDULO MEETINGS (Provedor) ==========
// src/Modules/Meetings/Application/Contracts/IMeetingsModule.ts

export interface IMeetingsModule {
    // Métodos que OUTROS módulos podem chamar
    isMeetingOrganizer(meetingId: string, userId: string): Promise<boolean>
    getMeetingDate(meetingId: string): Promise<Date | null>
}
```

#### Passo 2: Módulo Implementa a Interface

```typescript
// src/Modules/Meetings/Application/MeetingsModule.ts

export class MeetingsModule implements IMeetingsModule {
    constructor(
        private meetingRepo: IMeetingRepository,
        private checkOrganizerQuery: CheckIfUserIsOrganizerQuery,
        private getMeetingQuery: GetMeetingQuery
    ) {}

    // Implementa métodos públicos
    async isMeetingOrganizer(meetingId: string, userId: string): Promise<boolean> {
        // Delega para query interna
        return await this.checkOrganizerQuery.execute(meetingId, userId)
    }

    async getMeetingDate(meetingId: string): Promise<Date | null> {
        const meeting = await this.getMeetingQuery.execute(meetingId)
        return meeting?.date ?? null
    }
}
```

**Importante:** O Facade **NÃO** é sobre "quebrar classes". Internamente, você continua com Use Cases/Queries separadas (1 responsabilidade por classe). O Facade apenas **agrupa e expõe** funcionalidades públicas.

#### Passo 3: Outro Módulo Importa APENAS a Interface

```typescript
// ========== MÓDULO PAYMENTS (Consumidor) ==========

// ✅ Importa SÓ a interface (abstração)
import { IMeetingsModule } from '../../Meetings/Application/Contracts/IMeetingsModule'

// ❌ NÃO importa a implementação:
// import { MeetingsModule } from '../../Meetings/Application/MeetingsModule'

// ❌ NÃO importa classes internas:
// import { Meeting } from '../../Meetings/Domain/Meeting'

class ProcessPaymentUseCase {
    constructor(
        private meetingsModule: IMeetingsModule  // ✅ Depende da ABSTRAÇÃO
    ) {}

    async execute(command: ProcessPaymentCommand): Promise<void> {
        // Validação síncrona cross-module
        const isOrganizer = await this.meetingsModule.isMeetingOrganizer(
            command.meetingId,
            command.userId
        )

        if (!isOrganizer) {
            throw new Error("Only organizer can process payment")
        }

        // ... processa pagamento
    }
}
```

#### Passo 4: Composition Root Injeta Implementação

```typescript
// ========== COMPOSITION ROOT (Application Startup) ==========

import { MeetingsModule } from '../Modules/Meetings/Application/MeetingsModule'
import { ProcessPaymentUseCase } from '../Modules/Payments/Application/ProcessPaymentUseCase'

export class ApplicationCompositionRoot {
    static composePayments(): ProcessPaymentUseCase {
        // 1. Cria implementação concreta do módulo Meetings
        const meetingRepo = new MeetingRepository(database)
        const checkOrganizerQuery = new CheckIfUserIsOrganizerQuery(meetingRepo)
        const getMeetingQuery = new GetMeetingQuery(meetingRepo)

        const meetingsModule = new MeetingsModule(
            meetingRepo,
            checkOrganizerQuery,
            getMeetingQuery
        )

        // 2. Injeta no Payments (como IMeetingsModule)
        const paymentRepo = new PaymentRepository(database)
        const processPaymentUseCase = new ProcessPaymentUseCase(
            meetingsModule  // <-- Implementação concreta, mas tipo é IMeetingsModule
        )

        return processPaymentUseCase
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
- ❌ **PROIBIDO:** Importar **CLASSES INTERNAS** (entidades, repositórios, use cases)

```typescript
// ✅ PERMITIDO
import { IMeetingsModule } from '../../Meetings/Application/Contracts/IMeetingsModule'

// ❌ PROIBIDO
import { MeetingsModule } from '../../Meetings/Application/MeetingsModule'
import { Meeting } from '../../Meetings/Domain/Meeting'
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
// ========== MÓDULO PAYMENTS mantém cópia local de dados de Meeting ==========

// Entidade simplificada (só com dados que Payments precisa)
class PaymentMeetingData extends Entity {
    meetingId: MeetingId      // ID do módulo Meetings
    title: string              // Para exibir em listagens
    organizerId: UserId        // Para validações
    date: Date                 // Para lógica de pagamento

    // NÃO é a entidade Meeting completa do módulo Meetings!
    // É apenas uma projeção com dados necessários para Payments
}

// ========== Dados chegam via Integration Events ==========

@EventHandler(MeetingCreatedIntegrationEvent)
class MeetingCreatedIntegrationEventHandler {
    constructor(
        private meetingDataRepo: IPaymentMeetingDataRepository,
        private paymentRepo: IPaymentRepository
    ) {}

    async handle(event: MeetingCreatedIntegrationEvent): Promise<void> {
        // 1. Cria estrutura de pagamento
        const paymentStructure = PaymentStructure.createFor(
            event.meetingId,
            event.creatorId
        )
        await this.paymentRepo.save(paymentStructure)

        // 2. Cria/atualiza cópia local dos dados da reunião
        const meetingData = new PaymentMeetingData(
            event.meetingId,
            event.title,
            event.creatorId,
            event.date
        )
        await this.meetingDataRepo.save(meetingData)
    }
}

// ========== Consultas usam dados locais (performance) ==========

class ListPaymentsQuery {
    constructor(
        private paymentRepo: IPaymentRepository
    ) {}

    async execute(): Promise<PaymentDTO[]> {
        const payments = await this.paymentRepo.findAll()

        // ✅ Usa dados replicados (não precisa chamar módulo Meetings!)
        return payments.map(p => ({
            paymentId: p.id,
            meetingTitle: p.meetingData.title,  // <-- Dado local
            meetingDate: p.meetingData.date,    // <-- Dado local
            amount: p.amount,
            status: p.status
        }))
    }
}
```

### Mantendo Dados Atualizados

```typescript
// Escuta eventos de atualização
@EventHandler(MeetingTitleChangedIntegrationEvent)
class MeetingTitleChangedHandler {
    async handle(event: MeetingTitleChangedIntegrationEvent): Promise<void> {
        // Atualiza cópia local
        const meetingData = await this.repo.findByMeetingId(event.meetingId)
        if (meetingData) {
            meetingData.updateTitle(event.newTitle)
            await this.repo.save(meetingData)
        }
    }
}

@EventHandler(MeetingDeletedIntegrationEvent)
class MeetingDeletedHandler {
    async handle(event: MeetingDeletedIntegrationEvent): Promise<void> {
        // Remove cópia local
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
// ========== 1. Integration Events (Notificação + Popular Dados) ==========

// Quando reunião é criada, Meetings dispara evento
meeting.addIntegrationEvent(new MeetingCreatedIntegrationEvent(...))

// Payments escuta e:
// a) Cria estrutura de pagamento
// b) Replica dados localmente para consultas futuras
class MeetingCreatedHandler {
    async handle(event: MeetingCreatedIntegrationEvent) {
        // Cria estrutura de pagamento
        const paymentStructure = PaymentStructure.create(event.meetingId)
        await this.paymentRepo.save(paymentStructure)

        // Replica dados para consultas futuras (performance)
        const meetingData = new PaymentMeetingData(
            event.meetingId,
            event.title,
            event.date
        )
        await this.meetingDataRepo.save(meetingData)
    }
}

// ========== 2. Facade Pattern (Validação Síncrona) ==========

// Quando processa pagamento, valida se usuário é organizador
class ProcessPaymentUseCase {
    constructor(private meetingsModule: IMeetingsModule) {}

    async execute(command: ProcessPaymentCommand) {
        // Precisa de resposta AGORA (não pode esperar evento)
        const isOrganizer = await this.meetingsModule.isMeetingOrganizer(
            command.meetingId,
            command.userId
        )

        if (!isOrganizer) throw new Error("Not authorized")

        // ... processa pagamento
    }
}

// ========== 3. Dados Replicados (Consultas Rápidas) ==========

// Quando lista pagamentos, usa dados locais
class ListPaymentsQuery {
    async execute() {
        const payments = await this.paymentRepo.findAll()

        // ✅ Performance: dados locais, sem chamada cross-module
        return payments.map(p => ({
            id: p.id,
            meetingTitle: p.meetingData.title,  // <-- Dado replicado
            meetingDate: p.meetingData.date,    // <-- Dado replicado
            amount: p.amount
        }))
    }
}
```

---

## 7. E Quanto a HTTP Entre Módulos?

### ❌ NÃO Faça Isso no Monolito

```typescript
// ❌ ERRADO: HTTP localhost para outro módulo no mesmo processo
class ProcessPaymentUseCase {
    async execute(command: ProcessPaymentCommand) {
        // Módulo rodando no mesmo processo fazendo HTTP pra si mesmo
        const response = await fetch(
            'http://localhost:3000/api/meetings/check-organizer',
            {
                method: 'POST',
                body: JSON.stringify({
                    meetingId: command.meetingId,
                    userId: command.userId
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
|----------|--------------|
| **Overhead Desnecessário** | Serialização JSON, rede, deserialização - tudo para chamar código no mesmo processo |
| **Latência Artificial** | Adiciona ms de latência à toa (TCP handshake, HTTP parsing) |
| **Complexidade de Deploy** | Precisa garantir portas abertas, configurar CORS, etc |
| **Dificulta Debugging** | Stack traces param na camada HTTP, não mostram o fluxo completo |
| **Transações Quebradas** | HTTP não compartilha transação de banco - consistência comprometida |

### ✅ Use HTTP Apenas Para Microserviços

Quando os módulos estiverem **fisicamente separados** (processos/servidores diferentes):

```typescript
// ✅ CERTO: HTTP quando módulos são microserviços separados

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

// No Composition Root, você escolhe qual implementação usar:
// - Monolito: MeetingsModule (in-process)
// - Microserviços: MeetingsModuleHttpClient (HTTP)
```

**A beleza:** O código consumidor (ProcessPaymentUseCase) **não muda nada**! Apenas a implementação de `IMeetingsModule` é trocada.

---

## 8. Estrutura de Pastas Recomendada

### Organização que Facilita Comunicação

```
src/
├── Modules/
│   ├── Meetings/
│   │   ├── Application/
│   │   │   ├── Contracts/                    # 📢 PÚBLICO (Interfaces)
│   │   │   │   └── IMeetingsModule.ts        # Interface que outros módulos importam
│   │   │   ├── IntegrationEvents/            # 📢 PÚBLICO (Eventos)
│   │   │   │   ├── MeetingCreatedIntegrationEvent.ts
│   │   │   │   └── MeetingDeletedIntegrationEvent.ts
│   │   │   ├── MeetingsModule.ts             # 🔒 Pode ser público ou privado
│   │   │   ├── UseCases/                     # 🔒 PRIVADO
│   │   │   │   ├── CreateMeetingUseCase.ts
│   │   │   │   └── CancelMeetingUseCase.ts
│   │   │   └── Queries/                      # 🔒 PRIVADO
│   │   │       └── CheckIfUserIsOrganizerQuery.ts
│   │   ├── Domain/                           # 🔒 PRIVADO (nunca importar de fora)
│   │   │   ├── Meeting.ts
│   │   │   └── MeetingGroup.ts
│   │   └── Infrastructure/                   # 🔒 PRIVADO
│   │       ├── MeetingRepository.ts
│   │       └── MeetingEntityConfiguration.ts
│   │
│   └── Payments/
│       ├── Application/
│       │   ├── Contracts/                    # 📢 PÚBLICO
│       │   │   └── IPaymentsModule.ts
│       │   ├── IntegrationEvents/            # 📢 PÚBLICO
│       │   │   └── PaymentProcessedIntegrationEvent.ts
│       │   ├── EventHandlers/                # 🔒 PRIVADO (mas escuta eventos públicos)
│       │   │   └── MeetingCreatedIntegrationEventHandler.ts
│       │   └── UseCases/
│       │       └── ProcessPaymentUseCase.ts  # Importa IMeetingsModule
│       ├── Domain/                           # 🔒 PRIVADO
│       │   ├── Payment.ts
│       │   └── PaymentMeetingData.ts         # Dados replicados de Meetings
│       └── Infrastructure/                   # 🔒 PRIVADO
│           └── PaymentRepository.ts
│
├── BuildingBlocks/                           # 📢 PÚBLICO (compartilhado)
│   ├── Domain/
│   │   ├── Entity.ts
│   │   ├── ValueObject.ts
│   │   └── IBusinessRule.ts
│   ├── Application/
│   │   └── IEventBus.ts
│   └── Infrastructure/
│       ├── Outbox/
│       │   └── OutboxProcessor.ts
│       └── EventBus/
│           └── InMemoryEventBus.ts
│
└── Composition/                              # 🔧 Dependency Injection
    ├── ApplicationCompositionRoot.ts
    ├── MeetingsCompositionRoot.ts
    └── PaymentsCompositionRoot.ts
```

### Regras de Importação

| Pasta | Pode Ser Importada? | Por Quem? |
|-------|---------------------|-----------|
| `Contracts/` (Interfaces) | ✅ SIM | Outros módulos |
| `IntegrationEvents/` | ✅ SIM | Outros módulos (handlers) |
| `Domain/` | ❌ NÃO | Nunca! (privado ao módulo) |
| `Infrastructure/` | ❌ NÃO | Nunca! (privado ao módulo) |
| `UseCases/`, `Queries/` | ❌ NÃO | Privado (exposto via Facade) |
| `BuildingBlocks/` | ✅ SIM | Todos os módulos |

---

## 9. Migração para Microserviços

Uma das maiores vantagens de usar essas estratégias corretamente é a **facilidade de migração para microserviços** no futuro.

### 🎯 Cenário: Extraindo Módulo Meetings para Microserviço

#### Antes (Monolito Modular)

```typescript
// ========== COMPOSITION ROOT (Monolito) ==========

class ApplicationCompositionRoot {
    static composePayments(): ProcessPaymentUseCase {
        // 1. Meetings module (in-process)
        const meetingRepo = new MeetingRepository(database)
        const meetingsModule = new MeetingsModule(meetingRepo)

        // 2. Payments module
        const paymentRepo = new PaymentRepository(database)
        const processPaymentUseCase = new ProcessPaymentUseCase(
            meetingsModule  // In-process call
        )

        return processPaymentUseCase
    }
}
```

#### Depois (Meetings como Microserviço)

**Passo 1:** Criar implementação HTTP da interface

```typescript
// Nova implementação: HTTP Client
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
// ========== COMPOSITION ROOT (Microserviços) ==========

class ApplicationCompositionRoot {
    static composePayments(): ProcessPaymentUseCase {
        // 1. Meetings module (agora HTTP!)
        const httpClient = new HttpClient()
        const meetingsModule = new MeetingsModuleHttpClient(
            httpClient,
            'https://meetings-service.com'
        )

        // 2. Payments module (CÓDIGO NÃO MUDA!)
        const paymentRepo = new PaymentRepository(database)
        const processPaymentUseCase = new ProcessPaymentUseCase(
            meetingsModule  // Agora HTTP, mas ProcessPaymentUseCase não sabe!
        )

        return processPaymentUseCase
    }
}
```

**Passo 3:** Trocar Integration Events para Message Broker

```typescript
// Antes (Monolito): In-memory event bus
class InMemoryEventBus implements IEventBus {
    publish(event: IntegrationEvent): Promise<void> {
        // Chama handlers diretamente na memória
        const handlers = this.getHandlers(event.constructor.name)
        return Promise.all(handlers.map(h => h.handle(event)))
    }
}

// Depois (Microserviços): RabbitMQ/Kafka
class RabbitMQEventBus implements IEventBus {
    publish(event: IntegrationEvent): Promise<void> {
        // Publica no RabbitMQ
        return this.channel.publish(
            'integration-events',
            event.constructor.name,
            Buffer.from(JSON.stringify(event))
        )
    }
}

// No Composition Root, só troca a implementação:
const eventBus = config.isMicroservices
    ? new RabbitMQEventBus(rabbitConnection)
    : new InMemoryEventBus()
```

### ✅ Resultado: Zero Mudanças no Código de Negócio

- ✅ **ProcessPaymentUseCase:** Não muda nada (depende da interface)
- ✅ **Handlers de Eventos:** Não mudam nada (escutam eventos, não importa a origem)
- ✅ **Entidades de Domínio:** Não mudam nada (ignoram infraestrutura)

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

1. ✅ **NUNCA importe classes internas** de outro módulo (Domain, Infrastructure, UseCases)
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
- ✅ **Bounded Contexts:** Cada módulo tem seu próprio modelo de domínio

---

**Agora você está pronto para construir um Modular Monolith bem arquitetado que pode evoluir para microserviços quando necessário!** 🚀
