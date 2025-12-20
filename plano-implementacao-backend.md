# 🗺️ Plano de Implementação do Backend
## One Piece Knowledge Graph Explorer

Este documento define a ordem de implementação do backend, do mais fundamental ao mais avançado, seguindo os princípios de DDD e as regras de negócio especificadas.

---

## 📋 Visão Geral da Arquitetura

### Stack Base
- **Runtime:** Bun
- **Framework API:** Hono (ou similar leve)
- **Database Grafo:** Neo4j
- **Database Relacional:** PostgreSQL (Drizzle ORM)
- **Cache:** Redis
- **Message Queue:** BullMQ (para eventos assíncronos)
- **Vector DB:** Qdrant (para RAG)
- **Search:** Typesense

### Estrutura de Módulos (Bounded Contexts)
```
packages/
├── core/              # Shared kernel (entidades base, value objects)
├── characters/        # Contexto de personagens
├── organizations/     # Contexto de organizações
├── battles/          # Contexto de batalhas e power system
├── graph/            # Contexto de grafo e análises
├── chat/             # Contexto de IA conversacional
├── users/            # Contexto de usuários
└── api-gateway/      # Gateway unificado
```

---

## 🎯 FASE 1: Fundação (Core Infrastructure)
**Duração Estimada:** 2-3 semanas
**Objetivo:** Estabelecer a base técnica e arquitetural

### 1.1 Setup Inicial do Projeto ⭐⭐⭐⭐⭐
**Prioridade:** Crítica | **Complexidade:** Baixa

**Tarefas:**
- [x] Configurar monorepo com Turborepo
- [ ] Setup do package `@repo/core` com estrutura DDD
  - [ ] Base classes: `AggregateRoot`, `Entity`, `ValueObject`
  - [ ] `DomainEvent` base class
  - [ ] Strongly Typed IDs (ex: `CharacterId`, `OrganizationId`)
  - [ ] Business Rules infrastructure (`IBusinessRule`, `CheckRule`)
  - [ ] Result pattern (erro handling funcional)
- [ ] Setup de logging estruturado (Winston ou Pino)
  - [ ] Integrar logger criado em `packages/core/src/logging/logger.ts`
  - [ ] Configurar níveis e rotação
- [ ] Setup de testes (Vitest)
  - [ ] Configurar coverage
  - [ ] Helpers de teste para agregados
- [ ] CI/CD básico (GitHub Actions)
  - [ ] Lint, format, type-check
  - [ ] Testes unitários

**Deliverable:** Estrutura base funcional com testes passando

---

### 1.2 Database Infrastructure ⭐⭐⭐⭐⭐
**Prioridade:** Crítica | **Complexidade:** Média

**Tarefas:**
- [ ] **PostgreSQL Setup**
  - [ ] Schema inicial com Drizzle
  - [ ] Migrations setup
  - [ ] Connection pool configuration
  - [ ] Health check endpoint

- [ ] **Neo4j Setup**
  - [ ] Docker compose para desenvolvimento
  - [ ] Driver configuration (neo4j-driver)
  - [ ] Cypher query builders helpers
  - [ ] Índices e constraints iniciais

- [ ] **Redis Setup**
  - [ ] Docker compose
  - [ ] Connection management
  - [ ] Cache abstraction layer
  - [ ] Pub/Sub para eventos (opcional nesta fase)

**Deliverable:** Bancos configurados e acessíveis com testes de integração

---

### 1.3 Shared Kernel (Value Objects Base) ⭐⭐⭐⭐⭐
**Prioridade:** Crítica | **Complexidade:** Baixa

**Implementar Value Objects em `@repo/core`:**
- [ ] `Bounty` (validação, formatação, comparação)
  - [ ] Business Rule: `BountyMustNotBeNegative`
- [ ] `CharacterRank` (enum com hierarquia)
- [ ] `DevilFruitType` (Paramecia/Zoan/Logia)
- [ ] `ConnectionType` (tipos de relação)
- [ ] `Email` (validação)
- [ ] `ArcId`, `EpisodeNumber`, `ChapterNumber`
- [ ] `PowerScore` (com confidence e breakdown)

**Testes:**
- [ ] Testes para cada Value Object
- [ ] Validação de regras de negócio

**Deliverable:** Value Objects reutilizáveis e testados

---

## 🎯 FASE 2: Contexto de Personagens (Core Domain)
**Duração Estimada:** 3-4 semanas
**Objetivo:** Implementar o coração do domínio

### 2.1 Character Aggregate ⭐⭐⭐⭐⭐
**Prioridade:** Crítica | **Complexidade:** Alta

**Estrutura:**
```typescript
packages/characters/
├── domain/
│   ├── aggregates/
│   │   └── Character.ts           # Aggregate Root
│   ├── entities/
│   │   └── Battle.ts               # Entity (filha de Character)
│   ├── value-objects/
│   │   ├── FirstAppearance.ts
│   │   └── CharacterStatus.ts     # vivo/morto/desconhecido
│   ├── events/
│   │   ├── CharacterCreatedEvent.ts
│   │   ├── BountyUpdatedEvent.ts
│   │   └── BattleAddedEvent.ts
│   └── rules/
│       ├── CharacterMustHaveNameRule.ts
│       └── BountyCannotDecreaseRule.ts
├── application/
│   ├── commands/
│   │   ├── CreateCharacterCommand.ts
│   │   └── UpdateBountyCommand.ts
│   ├── queries/
│   │   ├── GetCharacterQuery.ts
│   │   └── ListCharactersQuery.ts
│   └── services/
│       └── PowerLevelCalculator.ts   # Domain Service
├── infrastructure/
│   ├── repositories/
│   │   └── CharacterRepository.ts
│   └── mappers/
│       └── CharacterMapper.ts
└── api/
    └── CharacterController.ts
```

**Tarefas:**
- [ ] **Domain Layer**
  - [ ] Criar `Character` Aggregate Root
    - [ ] Propriedades: id, name, age, origin, bounty, rank, affiliation, status, firstAppearance
    - [ ] Métodos: `addBattle()`, `updateBounty()`, `updateRank()`, `calculatePowerLevel()`
    - [ ] Domain Events internos
  - [ ] Criar `Battle` Entity (filha de Character)
    - [ ] Propriedades: id, opponentId, result, difficulty, chapter, arc
  - [ ] Business Rules
    - [ ] Nome obrigatório
    - [ ] Bounty não pode diminuir (exceto casos especiais)
    - [ ] Status deve ser válido

- [ ] **Application Layer (CQRS)**
  - [ ] Commands:
    - [ ] `CreateCharacterCommandHandler`
    - [ ] `UpdateBountyCommandHandler`
    - [ ] `AddBattleCommandHandler`
  - [ ] Queries (otimizadas, direto no DB):
    - [ ] `GetCharacterByIdQueryHandler`
    - [ ] `ListCharactersByAffiliationQueryHandler`
    - [ ] `SearchCharactersQueryHandler`
  - [ ] DTOs de input/output

- [ ] **Infrastructure Layer**
  - [ ] `CharacterRepository` (interface + implementação PostgreSQL)
    - [ ] `findById(id): Promise<Character | null>`
    - [ ] `save(character): Promise<void>`
    - [ ] `delete(id): Promise<void>`
  - [ ] `CharacterMapper` (toDomain, toPersistence)
  - [ ] Migrations para tabelas `characters` e `battles`

- [ ] **API Layer**
  - [ ] `POST /characters` - Criar personagem
  - [ ] `GET /characters/:id` - Buscar por ID
  - [ ] `PUT /characters/:id/bounty` - Atualizar bounty
  - [ ] `GET /characters` - Listar com filtros
  - [ ] `POST /characters/:id/battles` - Adicionar batalha

**Deliverable:** CRUD completo de Characters com DDD puro

---

### 2.2 Power Level System ⭐⭐⭐⭐
**Prioridade:** Alta | **Complexidade:** Alta

**Implementar em `packages/characters/application/services/`:**

**Tarefas:**
- [ ] **PowerLevelCalculator (Domain Service)**
  ```typescript
  class PowerLevelCalculator {
    calculate(character: Character): PowerScore {
      // Algoritmo definido em regras-de-negocio.md seção 1
      const bountyScore = this.normalizeBounty(character.bounty)
      const rankScore = this.rankToValue(character.rank)
      const battleScore = this.calculateBattleScore(character.battles)
      const transitiveScore = this.calculateTransitiveScore(character)

      return PowerScore.create({
        total: bountyScore * 0.3 + rankScore * 0.25 + battleScore * 0.35 + transitiveScore * 0.1,
        confidence: this.calculateConfidence(character),
        breakdown: { bountyScore, rankScore, battleScore, transitiveScore }
      })
    }
  }
  ```

- [ ] Implementar normalização de bounty
- [ ] Tabela de conversão de Ranks
- [ ] Cálculo de score de batalhas (vitórias/derrotas/dificuldade)
- [ ] Transitividade (via grafo - integração futura)
- [ ] Cálculo de confiança (baseado em dados disponíveis)
- [ ] Testes unitários extensivos
  - [ ] Casos de borda (sem bounty, sem batalhas, etc)
  - [ ] Exemplos da documentação (Luffy, personagem novo)

**Deliverable:** Power Level calculado e retornado em GET /characters/:id

---

### 2.3 Anti-Spoiler System ⭐⭐⭐⭐
**Prioridade:** Alta | **Complexidade:** Média

**Implementar em `packages/users/` e `packages/characters/`:**

**Tarefas:**
- [ ] **UserProgress Entity (em `users` context)**
  ```typescript
  class UserProgress extends Entity {
    userId: UserId
    type: 'anime' | 'manga'
    currentEpisode?: number
    currentChapter?: number
    currentArc?: ArcId

    shouldBlockContent(contentFirstAppearance: FirstAppearance): boolean {
      // Regra de negócio seção 3
    }
  }
  ```

- [ ] **SpoilerBlocker (Domain Service)**
  - [ ] Método `shouldBlock(character, userProgress): boolean`
  - [ ] Níveis de bloqueio: total, parcial, nenhum
  - [ ] Motivo do bloqueio (mensagem)

- [ ] Tabela de mapeamento Episódio/Capítulo → Arco
- [ ] Decorador para queries que aplica filtro anti-spoiler
- [ ] Testes com cenários da documentação

**Deliverable:** Queries retornam apenas conteúdo não-bloqueado

---

## 🎯 FASE 3: Contexto de Organizações e Locais
**Duração Estimada:** 2 semanas
**Objetivo:** Expandir o modelo de domínio

### 3.1 Organization Aggregate ⭐⭐⭐⭐
**Prioridade:** Alta | **Complexidade:** Média

**Estrutura Similar a Characters:**
```
packages/organizations/
├── domain/
│   ├── Organization.ts          # Aggregate Root
│   ├── events/
│   └── rules/
├── application/
│   ├── commands/
│   └── queries/
├── infrastructure/
└── api/
```

**Tarefas:**
- [ ] Criar `Organization` Aggregate
  - [ ] Propriedades: id, name, type, leaders[], members[], hierarchy, territories[]
  - [ ] Métodos: `addMember()`, `removeMember()`, `calculateTotalBounty()`, `getMembersByRank()`
- [ ] Commands e Queries
- [ ] Repository + Mapper
- [ ] API endpoints

**Deliverable:** CRUD de organizações

---

### 3.2 Location Aggregate ⭐⭐⭐
**Prioridade:** Média | **Complexidade:** Baixa

**Tarefas:**
- [ ] Criar `Location` Aggregate
  - [ ] Propriedades: id, name, region, ruler, nativeCharacters[]
- [ ] Commands e Queries
- [ ] Repository
- [ ] API endpoints

**Deliverable:** CRUD de locais

---

### 3.3 DevilFruit Aggregate ⭐⭐⭐
**Prioridade:** Média | **Complexidade:** Baixa

**Tarefas:**
- [ ] Criar `DevilFruit` Aggregate
  - [ ] Propriedades: id, name, type, powers[], currentUser, previousUsers[]
  - [ ] Métodos: `isAwakened()`, `transferToUser()`
- [ ] Repository
- [ ] API endpoints

**Deliverable:** CRUD de frutas do diabo

---

## 🎯 FASE 4: Contexto de Grafo (Neo4j Integration)
**Duração Estimada:** 3-4 semanas
**Objetivo:** Implementar funcionalidades de grafo

### 4.1 Graph Infrastructure ⭐⭐⭐⭐⭐
**Prioridade:** Crítica | **Complexidade:** Alta

**Estrutura:**
```
packages/graph/
├── domain/
│   ├── Connection.ts            # Aggregate Root
│   ├── Path.ts                  # Value Object ou Aggregate?
│   └── CentralityAnalysis.ts    # Aggregate Root
├── application/
│   ├── services/
│   │   ├── PathfindingService.ts
│   │   ├── CentralityService.ts
│   │   └── GraphSyncService.ts
│   └── queries/
├── infrastructure/
│   ├── Neo4jGraphRepository.ts
│   └── GraphMapper.ts
└── api/
```

**Tarefas:**
- [ ] **Connection Aggregate**
  - [ ] Propriedades: id, sourceId, targetId, type, bidirectional, firstAppearance
  - [ ] Métodos: `isBidirectional()`, `shouldBeBlocked(userProgress)`

- [ ] **GraphSyncService**
  - [ ] Sincronizar mudanças do PostgreSQL → Neo4j
  - [ ] Listener de Domain Events:
    - [ ] `CharacterCreatedEvent` → Criar nó no Neo4j
    - [ ] `ConnectionCreatedEvent` → Criar relação
  - [ ] Usar Outbox Pattern para garantir consistência

- [ ] **Neo4jGraphRepository**
  - [ ] `createNode(character)`: Criar nó de personagem
  - [ ] `createRelationship(connection)`: Criar relação
  - [ ] `findPath(from, to, strategy, filters)`: Pathfinding
  - [ ] `getConnections(characterId, depth)`: Buscar conexões N-níveis

- [ ] Implementar Outbox + Background Worker
  - [ ] Tabela `outbox_events`
  - [ ] Worker que processa eventos e sincroniza com Neo4j

**Deliverable:** Sincronização PostgreSQL ↔ Neo4j funcional

---

### 4.2 Pathfinding System ⭐⭐⭐⭐
**Prioridade:** Alta | **Complexidade:** Alta

**Tarefas:**
- [ ] **PathfindingService**
  - [ ] Estratégia: Shortest Path (BFS)
  - [ ] Estratégia: Strongest Path (Dijkstra modificado)
  - [ ] Estratégia: Most Common (PageRank local)
  - [ ] Estratégia: All Paths (DFS limitado)
  - [ ] Aplicar filtros de conexão e personagem
  - [ ] Cálculo de score do caminho

- [ ] Queries Cypher otimizadas
- [ ] Cache de caminhos frequentes (Redis)
- [ ] Testes com casos da documentação

**API:**
- [ ] `POST /graph/pathfinding`
  - Body: `{ from, to, strategy, filters, maxDepth, limit }`
  - Response: `{ paths: Path[], stats }`

**Deliverable:** Pathfinding funcional com múltiplas estratégias

---

### 4.3 Centrality Analysis ⭐⭐⭐
**Prioridade:** Média | **Complexidade:** Alta

**Tarefas:**
- [ ] **CentralityService**
  - [ ] Degree Centrality
  - [ ] Betweenness Centrality
  - [ ] Closeness Centrality
  - [ ] PageRank
  - [ ] Eigenvector Centrality (opcional)

- [ ] Cache de resultados (recalcular apenas quando grafo muda)
- [ ] Background job para recalcular métricas periodicamente

**API:**
- [ ] `GET /graph/centrality?metric=pagerank&limit=10`

**Deliverable:** Análises de centralidade disponíveis

---

## 🎯 FASE 5: Contexto de Batalhas e Simulações
**Duração Estimada:** 2-3 semanas
**Objetivo:** Sistema de batalhas e comparações

### 5.1 Battle Simulation System ⭐⭐⭐
**Prioridade:** Média | **Complexidade:** Alta

**Estrutura:**
```
packages/battles/
├── domain/
│   ├── BattleSimulation.ts      # Aggregate Root
│   └── SimulationResult.ts      # Value Object
├── application/
│   └── services/
│       └── BattleSimulator.ts   # Domain Service
└── api/
```

**Tarefas:**
- [ ] **BattleSimulator (Domain Service)**
  - [ ] Algoritmo da seção 6 (regras-de-negocio.md)
  - [ ] Cálculo de power base
  - [ ] Fatores de ajuste:
    - [ ] Vantagens de tipo (matchups)
    - [ ] Sinergia entre aliados
    - [ ] Ambiente
    - [ ] Condições especiais
  - [ ] Simulação Monte Carlo (1000+ iterações)
  - [ ] Cálculo de confiança

- [ ] Modos: 1v1, equipe, tripulação, torneio

**API:**
- [ ] `POST /battles/simulate`
  - Body: `{ sideA: CharacterId[], sideB: CharacterId[], mode, params }`
  - Response: `{ probabilities, results, analysis, confidence }`

**Deliverable:** Simulador de batalhas funcional

---

### 5.2 Ranking System ⭐⭐⭐
**Prioridade:** Baixa | **Complexidade:** Média

**Tarefas:**
- [ ] **RankingService**
  - [ ] Ranking por força (power score)
  - [ ] Ranking por bounty
  - [ ] Ranking por conexões
  - [ ] Ranking por centralidade
  - [ ] Filtros (vivos/mortos, organização, período)

- [ ] Cache agressivo (atualizar ao criar/editar personagens)

**API:**
- [ ] `GET /rankings?type=power&filter=alive&limit=100`

**Deliverable:** Rankings disponíveis

---

## 🎯 FASE 6: Contexto de Usuários e Social
**Duração Estimada:** 2-3 semanas
**Objetivo:** Sistema de usuários e features sociais

### 6.1 User Management ⭐⭐⭐⭐
**Prioridade:** Alta | **Complexidade:** Média

**Estrutura:**
```
packages/users/
├── domain/
│   ├── User.ts                  # Aggregate Root
│   ├── UserProgress.ts          # Entity (filha de User)
│   ├── UserStats.ts             # Entity
│   └── UserAchievement.ts       # Entity
├── application/
│   ├── commands/
│   └── queries/
├── infrastructure/
└── api/
```

**Tarefas:**
- [ ] **User Aggregate**
  - [ ] Propriedades: id, email, passwordHash, profile, favoriteCharacter
  - [ ] Métodos: `register()`, `updateProfile()`

- [ ] **UserProgress Entity**
  - [ ] Já implementado na Fase 2.3

- [ ] **UserStats Entity**
  - [ ] Propriedades: xp, level, exploredCharacters[], completedChallenges[]
  - [ ] Métodos: `addXP()`, `calculateLevel()`, `checkAchievements()`

- [ ] Autenticação JWT
- [ ] Refresh tokens
- [ ] Email verification (opcional)

**API:**
- [ ] `POST /auth/register`
- [ ] `POST /auth/login`
- [ ] `GET /users/:id`
- [ ] `PUT /users/:id/progress`

**Deliverable:** Sistema de usuários funcional

---

### 6.2 Gamification System ⭐⭐⭐
**Prioridade:** Média | **Complexidade:** Média

**Tarefas:**
- [ ] **Achievement System**
  - [ ] Definir conquistas (badges) - seção 9
  - [ ] Event listeners para desbloquear
  - [ ] Notificações ao usuário

- [ ] **XP System**
  - [ ] Tabela de pontos por ação
  - [ ] Fórmula de níveis (100 * nivel^1.5)
  - [ ] Prevenção de farming (cooldowns, uniqueness)

- [ ] **Challenge System**
  - [ ] Aggregate `Challenge`
  - [ ] Verificação de conclusão
  - [ ] Recompensas

**Deliverable:** Gamificação funcional

---

### 6.3 Collections and Favorites ⭐⭐
**Prioridade:** Baixa | **Complexidade:** Baixa

**Tarefas:**
- [ ] **Collection Aggregate**
  - [ ] Propriedades: id, userId, name, description, characters[], tags[], isPublic
  - [ ] Métodos: `addCharacter()`, `removeCharacter()`, `isPublic()`

- [ ] Repository + API

**Deliverable:** Usuários podem criar coleções

---

## 🎯 FASE 7: Contexto de Chat e IA
**Duração Estimada:** 4-5 semanas
**Objetivo:** Assistente de IA conversacional

### 7.1 RAG Infrastructure ⭐⭐⭐⭐⭐
**Prioridade:** Crítica | **Complexidade:** Alta

**Estrutura:**
```
packages/chat/
├── domain/
│   ├── ChatConversation.ts      # Aggregate Root
│   └── ChatMessage.ts           # Entity
├── application/
│   ├── services/
│   │   ├── RAGService.ts
│   │   ├── EntityExtractor.ts
│   │   └── QuestionClassifier.ts
│   └── commands/
├── infrastructure/
│   ├── QdrantVectorStore.ts
│   ├── OpenAIEmbeddings.ts
│   └── LLMProvider.ts
└── api/
```

**Tarefas:**
- [ ] **Setup de Embeddings (Qdrant + OpenAI)**
  - [ ] Ingerir textos da wiki do One Piece
  - [ ] Criar embeddings com text-embedding-3
  - [ ] Armazenar em Qdrant com metadados

- [ ] **RAGService (seção 10)**
  - [ ] Extrair entidades da pergunta (NER)
  - [ ] Buscar no grafo de conhecimento
  - [ ] Buscar na wiki (embeddings)
  - [ ] Buscar em conversas anteriores
  - [ ] Combinar e priorizar fontes
  - [ ] Construir contexto para LLM
  - [ ] Gerar resposta
  - [ ] Extrair citações

- [ ] **QuestionClassifier**
  - [ ] Classificar tipo: caminho, agregação, comparação, análise, descoberta
  - [ ] Prompt engineering para classificação

- [ ] **EntityExtractor**
  - [ ] Identificar personagens, locais, eventos mencionados
  - [ ] Fuzzy matching com entidades do grafo

- [ ] LLM Provider abstraction (OpenAI/Anthropic)

**Deliverable:** Sistema RAG funcional

---

### 7.2 Chat Conversation Management ⭐⭐⭐⭐
**Prioridade:** Alta | **Complexidade:** Média

**Tarefas:**
- [ ] **ChatConversation Aggregate**
  - [ ] Propriedades: id, userId, messages[], graphContext
  - [ ] Métodos: `addMessage()`, `getContext()`

- [ ] **ChatMessage Entity**
  - [ ] Propriedades: id, type (user/assistant), content, timestamp, entities[], suggestedActions[]

- [ ] Persistência de conversas
- [ ] Contexto mantido entre mensagens (sliding window)
- [ ] Sugestões de perguntas

**API:**
- [ ] `POST /chat/conversations` - Criar conversa
- [ ] `POST /chat/conversations/:id/messages` - Enviar mensagem
- [ ] `GET /chat/conversations/:id` - Buscar conversa

**Deliverable:** Chat funcional com histórico

---

### 7.3 Graph ↔ Chat Sync ⭐⭐⭐⭐
**Prioridade:** Alta | **Complexidade:** Média

**Tarefas:**
- [ ] **GraphActionService**
  - [ ] Mapear tipo de pergunta → ações no grafo
  - [ ] Destacar nós/arestas
  - [ ] Aplicar filtros temporários
  - [ ] Calcular zoom/pan

- [ ] Integration Events entre contextos
  - [ ] `UserClickedNodeEvent` (do frontend) → contexto ao chat
  - [ ] `ChatAnsweredEvent` → ações no grafo

- [ ] WebSocket para comunicação real-time (opcional)

**Deliverable:** Chat sincronizado com grafo

---

## 🎯 FASE 8: Geração e Criatividade
**Duração Estimada:** 2 semanas
**Objetivo:** Features criativas

### 8.1 Crew Generator ⭐⭐
**Prioridade:** Baixa | **Complexidade:** Média

**Tarefas:**
- [ ] **CrewGenerator (Domain Service)**
  - [ ] Algoritmo da seção 8
  - [ ] Filtrar candidatos
  - [ ] Selecionar capitão
  - [ ] Balancear membros
  - [ ] Calcular métricas (balanceamento, versatilidade, sinergia)
  - [ ] Determinar quem pode derrotar

**API:**
- [ ] `POST /generators/crew`

**Deliverable:** Gerador de tripulações

---

### 8.2 "What If" Generator ⭐⭐
**Prioridade:** Baixa | **Complexidade:** Média

**Tarefas:**
- [ ] Cenários de troca de frutas
- [ ] Alianças alternativas
- [ ] Matchups impossíveis
- [ ] Usar LLM para gerar narrativas

**Deliverable:** Gerador de cenários hipotéticos

---

## 🎯 FASE 9: Administração e Curadoria
**Duração Estimada:** 2 semanas
**Objetivo:** Sistema de contribuição e moderação

### 9.1 Contribution System ⭐⭐⭐
**Prioridade:** Média | **Complexidade:** Média

**Tarefas:**
- [ ] **Contribution Aggregate**
  - [ ] Propriedades: id, userId, type, entityId, suggestedData, status
  - [ ] Métodos: `approve()`, `reject(reason)`

- [ ] Workflow de aprovação
- [ ] Notificações ao usuário
- [ ] Sistema de pontos para contribuições aprovadas

**Deliverable:** Usuários podem contribuir

---

### 9.2 Admin Dashboard (Backend) ⭐⭐
**Prioridade:** Baixa | **Complexidade:** Baixa

**Tarefas:**
- [ ] Endpoints administrativos
- [ ] Autenticação de admin (roles)
- [ ] Logs de atividade
- [ ] Estatísticas gerais

**Deliverable:** Backend para dashboard admin

---

## 🎯 FASE 10: API Pública e Integrações
**Duração Estimada:** 1-2 semanas
**Objetivo:** Expor dados para terceiros

### 10.1 Public API ⭐⭐
**Prioridade:** Baixa | **Complexidade:** Baixa

**Tarefas:**
- [ ] API Gateway separado
- [ ] Rate limiting (por tier)
- [ ] API Keys management
- [ ] Documentação OpenAPI/Swagger
- [ ] SDK clients (opcional)

**Deliverable:** API pública documentada

---

### 10.2 Webhooks ⭐
**Prioridade:** Baixa | **Complexidade:** Baixa

**Tarefas:**
- [ ] Sistema de registro de webhooks
- [ ] Eventos disponíveis
- [ ] Delivery garantido (retry logic)

**Deliverable:** Webhooks funcionais

---

## 📊 Resumo de Prioridades

### Críticas (Fazer Primeiro)
1. Setup Inicial (1.1)
2. Database Infrastructure (1.2)
3. Shared Kernel (1.3)
4. Character Aggregate (2.1)
5. Graph Infrastructure (4.1)
6. RAG Infrastructure (7.1)

### Altas (Fazer em Seguida)
7. Power Level System (2.2)
8. Anti-Spoiler (2.3)
9. Organization Aggregate (3.1)
10. Pathfinding (4.2)
11. User Management (6.1)
12. Chat Conversation (7.2)
13. Graph ↔ Chat Sync (7.3)
14. Battle Simulation (5.1)

### Médias e Baixas (Fazer Depois)
- Locations, DevilFruits, Centrality, Rankings
- Gamification, Collections
- Crew Generator, What If Generator
- Contribution System, Admin Dashboard
- Public API, Webhooks

---

## 🏗️ Padrões Arquiteturais a Seguir

### 1. DDD Patterns
- **Aggregate Roots:** Apenas raízes têm repositórios
- **Entities vs Value Objects:** Identidade vs Valor
- **Domain Events:** Para side effects
- **Bounded Contexts:** Módulos isolados

### 2. CQRS
- **Commands:** Modificam estado (Write Model)
- **Queries:** Leem dados otimizados (Read Model)
- Queries podem acessar DB diretamente (não passam por agregados)

### 3. Event-Driven
- **Domain Events:** Dentro do contexto
- **Integration Events:** Entre contextos (via Outbox)
- **Inbox Pattern:** Para receber eventos de outros módulos

### 4. Consistency Patterns
- **Transações:** Apenas 1 agregado por transação
- **Eventual Consistency:** Entre contextos
- **Outbox Pattern:** Garantir entrega de eventos

### 5. Clean Architecture
- **Domain** → independente
- **Application** → depende de Domain
- **Infrastructure** → depende de Application
- **API** → depende de Application

---

## 🧪 Estratégia de Testes

### Por Camada
1. **Domain:** Testes unitários puros (90%+ coverage)
2. **Application:** Testes de integração com mocks de infra
3. **Infrastructure:** Testes com bancos reais (Docker)
4. **API:** Testes E2E

### Tipos de Testes
- **Unit:** Domain logic, Value Objects, Business Rules
- **Integration:** Commands, Queries, Repositories
- **E2E:** Fluxos completos via API

---

## 📦 Dependências Principais

```json
{
  "dependencies": {
    "@hono/hono": "^4.0.0",
    "drizzle-orm": "^0.30.0",
    "neo4j-driver": "^5.0.0",
    "redis": "^4.0.0",
    "bullmq": "^5.0.0",
    "qdrant-client": "^1.0.0",
    "openai": "^4.0.0",
    "zod": "^3.0.0",
    "dayjs": "^1.11.0"
  },
  "devDependencies": {
    "vitest": "^4.0.0",
    "drizzle-kit": "^0.20.0",
    "typescript": "^5.9.0"
  }
}
```

---

## 🚀 Critérios de Conclusão de Cada Fase

### Fase Completa Quando:
- [ ] Todos os testes passando (>80% coverage)
- [ ] API endpoints funcionais e documentados
- [ ] Migrations rodando sem erros
- [ ] Logs estruturados implementados
- [ ] Code review aprovado
- [ ] Documentação atualizada

---

## 📝 Notas Importantes

1. **Não pular fases:** Cada fase depende da anterior
2. **Testar continuamente:** TDD quando possível
3. **Refatorar quando necessário:** Mas não antes de funcionar
4. **Documentar decisões:** ADRs (Architecture Decision Records)
5. **Manter DDD puro:** Sem vazamentos entre camadas
6. **Pensar em performance:** Mas só otimizar quando necessário
7. **Eventos são chave:** Para desacoplamento entre contextos

---

## 🎯 Meta Final

Ao final deste plano, teremos:
- Backend completo e funcional
- Arquitetura DDD bem estruturada
- Sistema de grafo integrado
- IA conversacional com RAG
- APIs documentadas e testadas
- Sistema escalável e manutenível

**Duração Total Estimada:** 20-25 semanas (~5-6 meses)
