# 🏗️ Arquitetura Backend
## One Piece Knowledge Graph Explorer

---

## 📌 Filosofia da Arquitetura

Este sistema **NÃO usa DDD** porque:
- Não há domain experts para colaborar
- A complexidade é **técnica** (algoritmos, performance, integração), não de negócio
- Não há regras de negócio complexas ou mutáveis
- É essencialmente um **sistema de dados** com operações avançadas

### O que realmente importa aqui:
- ✅ **Algoritmos de grafo** eficientes
- ✅ **Performance** com grandes datasets
- ✅ **Integração** com sistemas externos (Neo4j, LLM, wiki)
- ✅ **Arquitetura limpa** sem over-engineering

---

## 🎯 Arquitetura: Service Layer Pattern

```
┌─────────────────────────────────────────────────┐
│              API Layer (HTTP)                   │
│  Controllers + Routes + Validation              │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│            Service Layer                        │
│  Business Logic + Algorithms + Orchestration    │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│          Repository Layer                       │
│  Data Access Abstraction                        │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│        Infrastructure Layer                     │
│  PostgreSQL | Neo4j | Redis | Elasticsearch     │
└─────────────────────────────────────────────────┘
```

**Princípios:**
- **KISS** (Keep It Simple, Stupid)
- **YAGNI** (You Aren't Gonna Need It)
- **Separation of Concerns**
- **Dependency Injection**
- **Repository Pattern** (para testar e trocar DBs)

---

## 📂 Estrutura de Pastas

```
src/
├── api/                          # HTTP Layer
│   ├── routes/
│   │   ├── characters.routes.ts
│   │   ├── relationships.routes.ts
│   │   ├── ai.routes.ts
│   │   └── analytics.routes.ts
│   ├── controllers/
│   │   ├── character.controller.ts
│   │   ├── relationship.controller.ts
│   │   └── ai.controller.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts
│   │   ├── error-handler.middleware.ts
│   │   └── validation.middleware.ts
│   └── validators/
│       ├── character.schema.ts
│       └── relationship.schema.ts
│
├── services/                     # Business Logic
│   ├── character.service.ts
│   ├── relationship.service.ts
│   ├── graph/
│   │   ├── pathfinding.service.ts
│   │   ├── centrality.service.ts
│   │   └── community-detection.service.ts
│   ├── ai/
│   │   ├── rag.service.ts
│   │   ├── llm.service.ts
│   │   └── embedding.service.ts
│   ├── power/
│   │   ├── power-score.service.ts
│   │   └── battle.service.ts
│   └── search/
│       └── search.service.ts
│
├── repositories/                 # Data Access
│   ├── character.repository.ts
│   ├── relationship.repository.ts
│   ├── organization.repository.ts
│   └── battle.repository.ts
│
├── models/                       # Data Models (DTOs + Entities)
│   ├── entities/
│   │   ├── character.entity.ts
│   │   ├── relationship.entity.ts
│   │   └── battle.entity.ts
│   ├── dtos/
│   │   ├── create-character.dto.ts
│   │   ├── character-response.dto.ts
│   │   └── graph-query.dto.ts
│   └── types/
│       ├── relationship-types.ts
│       ├── enums.ts
│       └── interfaces.ts
│
├── infrastructure/               # External Services Integration
│   ├── database/
│   │   ├── postgres.client.ts
│   │   ├── neo4j.client.ts
│   │   └── redis.client.ts
│   ├── search/
│   │   └── elasticsearch.client.ts
│   ├── ai/
│   │   ├── openai.client.ts
│   │   └── pinecone.client.ts
│   └── cache/
│       └── cache.service.ts
│
├── lib/                          # Utilities & Helpers
│   ├── algorithms/
│   │   ├── dijkstra.ts
│   │   ├── pagerank.ts
│   │   └── louvain.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── validators.ts
│   │   └── helpers.ts
│   └── config/
│       ├── database.config.ts
│       └── app.config.ts
│
├── jobs/                         # Background Jobs
│   ├── recalculate-power-scores.job.ts
│   ├── sync-elasticsearch.job.ts
│   └── backup.job.ts
│
└── app.ts                        # Application Entry Point
```

---

## 🗃️ Modelos de Dados

### Character Entity

```typescript
// models/entities/character.entity.ts

export interface Character {
  id: string;
  name: string;
  aliases?: string[];
  epithet?: string;

  // Basic Info
  age?: number;
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'UNKNOWN';
  race: RaceType;
  birthdate?: string;

  // Affiliation
  affiliation: AffiliationType;
  organizationIds: string[];
  crew?: string;
  rank?: string;

  // Origin
  sea: SeaType;
  birthplace?: string;

  // Status
  alive: boolean;
  firstAppearanceArc?: string;
  deathArc?: string;

  // Powers
  devilFruitId?: string;
  hakiTypes: HakiType[];
  advancedHaki: AdvancedHakiType[];

  // Bounty History
  bountyHistory: Bounty[];
  currentBounty: number;

  // Metadata
  description?: string;
  imageUrl?: string;
  wikiUrl?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface Bounty {
  amount: number;
  arc: string;
  chapter?: number;
  episode?: number;
}
```

### Relationship Entity

```typescript
// models/entities/relationship.entity.ts

export interface Relationship {
  id: string;
  fromCharacterId: string;
  toCharacterId: string;

  type: RelationshipType;
  strength: 'STRONG' | 'MEDIUM' | 'WEAK';
  status: 'ACTIVE' | 'INACTIVE' | 'HISTORICAL';

  // Contexto
  startedInArc?: string;
  endedInArc?: string;
  description?: string;

  // Metadata
  bidirectional: boolean; // true para amizade, false para mentor→student

  createdAt: Date;
  updatedAt: Date;
}

export enum RelationshipType {
  // Crew/Organization
  CREW_MEMBER = 'CREW_MEMBER',
  CREW_CAPTAIN = 'CREW_CAPTAIN',
  ORGANIZATION_MEMBER = 'ORGANIZATION_MEMBER',

  // Family
  PARENT = 'PARENT',
  CHILD = 'CHILD',
  SIBLING = 'SIBLING',

  // Alliance
  ALLY = 'ALLY',
  TEMPORARY_ALLY = 'TEMPORARY_ALLY',

  // Conflict
  ENEMY = 'ENEMY',
  RIVAL = 'RIVAL',
  DEFEATED_BY = 'DEFEATED_BY',

  // Mentorship
  MENTOR = 'MENTOR',
  STUDENT = 'STUDENT',

  // Social
  FRIEND = 'FRIEND',
  ROMANCE = 'ROMANCE',

  // Professional
  SUPERIOR = 'SUPERIOR',
  SUBORDINATE = 'SUBORDINATE',
}
```

### Battle Entity

```typescript
// models/entities/battle.entity.ts

export interface Battle {
  id: string;

  participants: BattleParticipant[];

  location?: string;
  arc: string;
  chapter?: number;
  episode?: number;

  outcome: Map<string, BattleOutcome>; // characterId → outcome
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';

  description?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface BattleParticipant {
  characterId: string;
  side: 'A' | 'B'; // Para batalhas de equipes
}

export enum BattleOutcome {
  WIN = 'WIN',
  LOSS = 'LOSS',
  DRAW = 'DRAW',
  INTERRUPTED = 'INTERRUPTED',
}
```

---

## 🔧 Camada de Serviços

### Character Service

```typescript
// services/character.service.ts

export class CharacterService {
  constructor(
    private characterRepo: CharacterRepository,
    private cacheService: CacheService,
    private searchService: SearchService
  ) {}

  async create(data: CreateCharacterDto): Promise<Character> {
    // 1. Validar dados
    // 2. Salvar no PostgreSQL
    const character = await this.characterRepo.create(data);

    // 3. Criar nó no Neo4j
    await this.characterRepo.createNode(character.id);

    // 4. Indexar no Elasticsearch
    await this.searchService.indexCharacter(character);

    // 5. Invalidar cache
    await this.cacheService.invalidate(`characters:*`);

    return character;
  }

  async getById(id: string): Promise<Character | null> {
    // Cache first
    const cached = await this.cacheService.get<Character>(`character:${id}`);
    if (cached) return cached;

    const character = await this.characterRepo.findById(id);

    if (character) {
      await this.cacheService.set(`character:${id}`, character, 3600);
    }

    return character;
  }

  async search(query: string, filters?: SearchFilters): Promise<Character[]> {
    return this.searchService.searchCharacters(query, filters);
  }

  async getConnections(
    characterId: string,
    depth: number = 1,
    types?: RelationshipType[]
  ): Promise<GraphData> {
    return this.characterRepo.getEgoNetwork(characterId, depth, types);
  }
}
```

### Pathfinding Service

```typescript
// services/graph/pathfinding.service.ts

export class PathfindingService {
  constructor(private neo4jClient: Neo4jClient) {}

  /**
   * Encontra o caminho mais curto entre dois personagens
   */
  async findShortestPath(
    fromId: string,
    toId: string,
    options?: PathfindingOptions
  ): Promise<Path[]> {
    const {
      maxDepth = 6,
      allowedRelationships,
      excludeRelationships
    } = options || {};

    // Query Cypher para shortest path
    const query = `
      MATCH (start:Character {id: $fromId}),
            (end:Character {id: $toId}),
            path = shortestPath((start)-[*..${maxDepth}]-(end))
      ${this.buildRelationshipFilter(allowedRelationships, excludeRelationships)}
      RETURN path
      LIMIT 5
    `;

    const result = await this.neo4jClient.run(query, { fromId, toId });

    return this.parsePaths(result);
  }

  /**
   * Encontra todos os caminhos até certa profundidade
   */
  async findAllPaths(
    fromId: string,
    toId: string,
    maxDepth: number = 4
  ): Promise<Path[]> {
    const query = `
      MATCH (start:Character {id: $fromId}),
            (end:Character {id: $toId}),
            path = (start)-[*..${maxDepth}]-(end)
      RETURN path
      LIMIT 20
    `;

    const result = await this.neo4jClient.run(query, { fromId, toId });
    return this.parsePaths(result);
  }

  private buildRelationshipFilter(
    allowed?: RelationshipType[],
    excluded?: RelationshipType[]
  ): string {
    // Constrói parte do WHERE para filtrar tipos de relacionamento
    if (!allowed && !excluded) return '';

    // ... implementação
  }
}
```

### Power Score Service

```typescript
// services/power/power-score.service.ts

export class PowerScoreService {
  constructor(
    private characterRepo: CharacterRepository,
    private battleRepo: BattleRepository
  ) {}

  /**
   * Calcula power score de um personagem
   */
  async calculatePowerScore(characterId: string): Promise<PowerScore> {
    const character = await this.characterRepo.findById(characterId);
    if (!character) throw new Error('Character not found');

    // 1. Componente: Bounty (30%)
    const bountyScore = await this.normalizeBounty(character.currentBounty);

    // 2. Componente: Cargo/Posição (25%)
    const rankScore = this.calculateRankScore(character);

    // 3. Componente: Batalhas (35%)
    const battleScore = await this.calculateBattleScore(characterId);

    // 4. Componente: Transitividade (10%)
    const transitiveScore = await this.calculateTransitiveScore(characterId);

    // Score final (0-100)
    const finalScore =
      (bountyScore * 0.3) +
      (rankScore * 0.25) +
      (battleScore * 0.35) +
      (transitiveScore * 0.1);

    // Nível de confiança
    const confidence = this.calculateConfidence(character);

    return {
      score: Math.round(finalScore),
      confidence,
      breakdown: {
        bounty: bountyScore,
        rank: rankScore,
        battles: battleScore,
        transitive: transitiveScore,
      }
    };
  }

  /**
   * Normaliza bounty para escala 0-100
   */
  private async normalizeBounty(bounty: number): Promise<number> {
    // Buscar min e max do banco
    const { min, max } = await this.characterRepo.getBountyRange();

    if (bounty === 0) return 0;
    if (max === min) return 50;

    return ((bounty - min) / (max - min)) * 100;
  }

  /**
   * Score baseado em cargo/posição
   */
  private calculateRankScore(character: Character): number {
    const rankMap: Record<string, number> = {
      // Piratas
      'YONKO': 100,
      'YONKO_COMMANDER': 90,
      'SUPERNOVA': 75,
      'SHICHIBUKAI': 85,
      'WORST_GENERATION': 70,
      'PIRATE_CAPTAIN': 60,

      // Marinha
      'FLEET_ADMIRAL': 100,
      'ADMIRAL': 95,
      'VICE_ADMIRAL': 80,
      'REAR_ADMIRAL': 65,

      // Outros
      'REVOLUTIONARY_COMMANDER': 85,
      'CIPHER_POL_AGENT': 70,

      // Default
      'UNKNOWN': 30,
    };

    return rankMap[character.rank || 'UNKNOWN'] || 30;
  }

  /**
   * Score baseado no histórico de batalhas
   */
  private async calculateBattleScore(characterId: string): Promise<number> {
    const battles = await this.battleRepo.findByCharacter(characterId);

    if (battles.length === 0) return 30; // Score neutro sem dados

    let totalScore = 0;
    let count = 0;

    for (const battle of battles) {
      const outcome = battle.outcome.get(characterId);

      if (outcome === BattleOutcome.WIN) {
        // Vitória vale mais se foi contra oponente forte
        const opponentStrength = await this.getOpponentStrength(battle, characterId);
        totalScore += 80 + (opponentStrength * 0.2);
      } else if (outcome === BattleOutcome.LOSS) {
        totalScore += 20;
      } else if (outcome === BattleOutcome.DRAW) {
        totalScore += 50;
      }

      count++;
    }

    return totalScore / count;
  }

  /**
   * Score herdado de conexões (força transitiva)
   */
  private async calculateTransitiveScore(characterId: string): Promise<number> {
    // Buscar personagens conectados (derrotados, mentores, etc)
    const connections = await this.characterRepo.getConnections(characterId, 1);

    if (connections.length === 0) return 30;

    let inheritedScore = 0;
    let count = 0;

    for (const conn of connections) {
      const connectedChar = await this.characterRepo.findById(conn.targetId);
      if (!connectedChar) continue;

      // Peso baseado no tipo de conexão
      const weight = this.getConnectionWeight(conn.type);

      // Score do personagem conectado (recursão limitada)
      const connScore = await this.getBountyBasedScore(connectedChar);

      inheritedScore += connScore * weight;
      count++;
    }

    return count > 0 ? inheritedScore / count : 30;
  }

  /**
   * Calcula nível de confiança do score
   */
  private calculateConfidence(character: Character): number {
    let confidence = 0;

    // +1 se tem bounty
    if (character.currentBounty > 0) confidence++;

    // +1 se tem cargo conhecido
    if (character.rank && character.rank !== 'UNKNOWN') confidence++;

    // +1 se tem batalhas registradas
    // ... checkar

    // +1 se tem fruta do diabo conhecida
    if (character.devilFruitId) confidence++;

    // +1 se apareceu em múltiplos arcos
    // ... checkar

    return confidence; // 0-5 (estrelas)
  }
}

export interface PowerScore {
  score: number;           // 0-100
  confidence: number;      // 1-5 estrelas
  breakdown: {
    bounty: number;
    rank: number;
    battles: number;
    transitive: number;
  };
}
```

### RAG Service (AI)

```typescript
// services/ai/rag.service.ts

export class RAGService {
  constructor(
    private llmService: LLMService,
    private embeddingService: EmbeddingService,
    private characterRepo: CharacterRepository,
    private pineconeClient: PineconeClient,
    private neo4jClient: Neo4jClient
  ) {}

  /**
   * Responde pergunta usando RAG
   */
  async ask(question: string, context?: ConversationContext): Promise<AIResponse> {
    // 1. Extrair entidades mencionadas
    const entities = await this.extractEntities(question);

    // 2. Buscar contexto relevante
    const relevantContext = await this.retrieveContext(question, entities);

    // 3. Montar prompt com contexto
    const prompt = this.buildPrompt(question, relevantContext, context);

    // 4. Gerar resposta com LLM
    const response = await this.llmService.complete(prompt);

    // 5. Parsear resposta e extrair fontes
    return this.parseResponse(response, relevantContext);
  }

  /**
   * Extrai entidades (personagens, locais, etc) da pergunta
   */
  private async extractEntities(question: string): Promise<Entity[]> {
    // Usar LLM para extrair nomes mencionados
    const extractionPrompt = `
      Extraia os nomes de personagens, organizações e locais de One Piece
      mencionados na seguinte pergunta:

      "${question}"

      Retorne JSON: { "characters": [], "organizations": [], "locations": [] }
    `;

    const result = await this.llmService.complete(extractionPrompt);
    return JSON.parse(result);
  }

  /**
   * Busca contexto relevante de múltiplas fontes
   */
  private async retrieveContext(
    question: string,
    entities: Entity[]
  ): Promise<RetrievedContext> {
    const context: RetrievedContext = {
      characters: [],
      relationships: [],
      wikidocs: [],
      graphPaths: [],
    };

    // 1. Buscar dados estruturados dos personagens mencionados
    if (entities.characters.length > 0) {
      context.characters = await this.characterRepo.findByNames(entities.characters);
    }

    // 2. Buscar relações entre entidades mencionadas
    if (entities.characters.length >= 2) {
      const [char1, char2] = entities.characters;
      context.graphPaths = await this.neo4jClient.findPaths(char1, char2);
    }

    // 3. Buscar documentos da wiki via embedding similarity
    const embedding = await this.embeddingService.embed(question);
    const similarDocs = await this.pineconeClient.query(embedding, 5);
    context.wikidocs = similarDocs;

    return context;
  }

  /**
   * Monta prompt final com contexto
   */
  private buildPrompt(
    question: string,
    context: RetrievedContext,
    conversationContext?: ConversationContext
  ): string {
    let prompt = `Você é um assistente especialista em One Piece.

CONTEXTO RECUPERADO:

`;

    // Adicionar personagens
    if (context.characters.length > 0) {
      prompt += `## Personagens:\n`;
      for (const char of context.characters) {
        prompt += `- ${char.name}: ${char.description || 'N/A'}\n`;
        prompt += `  Bounty: ${char.currentBounty}\n`;
        prompt += `  Afiliação: ${char.affiliation}\n\n`;
      }
    }

    // Adicionar caminhos do grafo
    if (context.graphPaths.length > 0) {
      prompt += `## Conexões no grafo:\n`;
      for (const path of context.graphPaths) {
        prompt += `- ${path.toString()}\n`;
      }
      prompt += `\n`;
    }

    // Adicionar documentos da wiki
    if (context.wikidocs.length > 0) {
      prompt += `## Informações da Wiki:\n`;
      for (const doc of context.wikidocs) {
        prompt += `- ${doc.text}\n`;
      }
      prompt += `\n`;
    }

    // Adicionar histórico da conversa
    if (conversationContext?.history) {
      prompt += `## Conversa anterior:\n`;
      for (const msg of conversationContext.history.slice(-3)) {
        prompt += `${msg.role}: ${msg.content}\n`;
      }
      prompt += `\n`;
    }

    prompt += `---

PERGUNTA DO USUÁRIO:
${question}

INSTRUÇÕES:
- Responda baseando-se APENAS no contexto fornecido
- Se não souber, diga "Não tenho essa informação"
- Cite fontes quando possível (ex: "Segundo a wiki...")
- Seja conciso mas completo

RESPOSTA:`;

    return prompt;
  }

  /**
   * Parseia resposta e adiciona metadados
   */
  private parseResponse(
    llmResponse: string,
    context: RetrievedContext
  ): AIResponse {
    return {
      text: llmResponse,
      sources: this.extractSources(context),
      relatedCharacters: context.characters.map(c => c.id),
      confidence: this.estimateConfidence(llmResponse, context),
    };
  }
}
```

---

## 🗄️ Camada de Repositórios

### Character Repository

```typescript
// repositories/character.repository.ts

export class CharacterRepository {
  constructor(
    private pg: PostgresClient,
    private neo4j: Neo4jClient
  ) {}

  /**
   * Criar personagem (dual-write: Postgres + Neo4j)
   */
  async create(data: CreateCharacterDto): Promise<Character> {
    // 1. PostgreSQL (dados estruturados)
    const character = await this.pg.query<Character>(
      `INSERT INTO characters (id, name, bounty, ...)
       VALUES ($1, $2, $3, ...)
       RETURNING *`,
      [data.id, data.name, data.bounty, ...]
    );

    // 2. Neo4j (nó do grafo)
    await this.neo4j.run(
      `CREATE (c:Character {
        id: $id,
        name: $name
      })`,
      { id: character.id, name: character.name }
    );

    return character;
  }

  /**
   * Buscar por ID
   */
  async findById(id: string): Promise<Character | null> {
    const result = await this.pg.query<Character>(
      `SELECT * FROM characters WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Buscar ego network (rede de N graus)
   */
  async getEgoNetwork(
    characterId: string,
    depth: number,
    relationshipTypes?: RelationshipType[]
  ): Promise<GraphData> {
    const typeFilter = relationshipTypes
      ? `[r:${relationshipTypes.join('|')}]`
      : '[r]';

    const query = `
      MATCH (center:Character {id: $id})
      CALL apoc.path.subgraphNodes(center, {
        relationshipFilter: "${typeFilter}",
        maxLevel: ${depth}
      })
      YIELD node
      WITH collect(node) AS nodes

      MATCH (n1)-[r]-(n2)
      WHERE n1 IN nodes AND n2 IN nodes

      RETURN nodes, collect(r) AS relationships
    `;

    const result = await this.neo4j.run(query, { id: characterId });

    return this.parseGraphData(result);
  }

  /**
   * Buscar range de bounties (para normalização)
   */
  async getBountyRange(): Promise<{ min: number; max: number }> {
    const result = await this.pg.query(
      `SELECT MIN(current_bounty) as min, MAX(current_bounty) as max
       FROM characters
       WHERE current_bounty > 0`
    );

    return result.rows[0];
  }

  /**
   * Buscar por múltiplos nomes (fuzzy)
   */
  async findByNames(names: string[]): Promise<Character[]> {
    const placeholders = names.map((_, i) => `$${i + 1}`).join(', ');

    const result = await this.pg.query<Character>(
      `SELECT * FROM characters
       WHERE name = ANY($1)
       OR $1 && aliases`,
      [names]
    );

    return result.rows;
  }
}
```

### Relationship Repository

```typescript
// repositories/relationship.repository.ts

export class RelationshipRepository {
  constructor(private neo4j: Neo4jClient) {}

  /**
   * Criar relacionamento no grafo
   */
  async create(data: CreateRelationshipDto): Promise<Relationship> {
    const query = `
      MATCH (a:Character {id: $fromId})
      MATCH (b:Character {id: $toId})
      CREATE (a)-[r:${data.type} {
        id: $id,
        strength: $strength,
        startedInArc: $arc
      }]->(b)
      RETURN r
    `;

    const result = await this.neo4j.run(query, {
      id: uuidv4(),
      fromId: data.fromId,
      toId: data.toId,
      strength: data.strength,
      arc: data.arc,
    });

    return this.parseRelationship(result);
  }

  /**
   * Buscar todas as conexões de um personagem
   */
  async findByCharacter(
    characterId: string,
    types?: RelationshipType[]
  ): Promise<Relationship[]> {
    const typeFilter = types ? `:${types.join('|')}` : '';

    const query = `
      MATCH (c:Character {id: $id})-[r${typeFilter}]-(other)
      RETURN r, other
    `;

    const result = await this.neo4j.run(query, { id: characterId });
    return this.parseRelationships(result);
  }

  /**
   * Deletar relacionamento
   */
  async delete(relationshipId: string): Promise<void> {
    await this.neo4j.run(
      `MATCH ()-[r {id: $id}]-() DELETE r`,
      { id: relationshipId }
    );
  }
}
```

---

## 🚀 Controllers (API Layer)

### Character Controller

```typescript
// api/controllers/character.controller.ts

export class CharacterController {
  constructor(private characterService: CharacterService) {}

  /**
   * POST /api/characters
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as CreateCharacterDto;
      const character = await this.characterService.create(data);

      res.status(201).json({
        success: true,
        data: character,
      });
    } catch (error) {
      throw new BadRequestError('Failed to create character');
    }
  }

  /**
   * GET /api/characters/:id
   */
  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const character = await this.characterService.getById(id);

    if (!character) {
      throw new NotFoundError('Character not found');
    }

    res.json({
      success: true,
      data: character,
    });
  }

  /**
   * GET /api/characters/:id/network
   */
  async getNetwork(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const depth = parseInt(req.query.depth as string) || 1;
    const types = req.query.types
      ? (req.query.types as string).split(',') as RelationshipType[]
      : undefined;

    const network = await this.characterService.getConnections(id, depth, types);

    res.json({
      success: true,
      data: network,
    });
  }

  /**
   * GET /api/characters/search
   */
  async search(req: Request, res: Response): Promise<void> {
    const query = req.query.q as string;
    const filters = req.query; // affiliation, sea, etc

    const results = await this.characterService.search(query, filters);

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  }
}
```

---

## 🔄 Background Jobs

### Recalculate Power Scores Job

```typescript
// jobs/recalculate-power-scores.job.ts

export class RecalculatePowerScoresJob {
  constructor(
    private characterRepo: CharacterRepository,
    private powerScoreService: PowerScoreService
  ) {}

  /**
   * Executa diariamente às 3h da manhã
   */
  async execute(): Promise<void> {
    logger.info('Starting power score recalculation job');

    // Buscar todos os personagens
    const characters = await this.characterRepo.findAll();

    let updated = 0;
    let failed = 0;

    for (const character of characters) {
      try {
        const powerScore = await this.powerScoreService.calculatePowerScore(
          character.id
        );

        // Salvar score calculado
        await this.characterRepo.updatePowerScore(character.id, powerScore);

        updated++;
      } catch (error) {
        logger.error(`Failed to update power score for ${character.name}`, error);
        failed++;
      }
    }

    logger.info(
      `Power score recalculation finished: ${updated} updated, ${failed} failed`
    );
  }
}
```

---

## 🧪 Testes

### Service Test Example

```typescript
// services/__tests__/power-score.service.test.ts

describe('PowerScoreService', () => {
  let service: PowerScoreService;
  let mockCharacterRepo: jest.Mocked<CharacterRepository>;
  let mockBattleRepo: jest.Mocked<BattleRepository>;

  beforeEach(() => {
    mockCharacterRepo = createMockCharacterRepo();
    mockBattleRepo = createMockBattleRepo();

    service = new PowerScoreService(mockCharacterRepo, mockBattleRepo);
  });

  describe('calculatePowerScore', () => {
    it('should calculate correct score for Luffy', async () => {
      // Arrange
      mockCharacterRepo.findById.mockResolvedValue({
        id: 'luffy',
        name: 'Monkey D. Luffy',
        currentBounty: 3_000_000_000,
        rank: 'YONKO',
        // ...
      });

      mockCharacterRepo.getBountyRange.mockResolvedValue({
        min: 0,
        max: 5_000_000_000,
      });

      mockBattleRepo.findByCharacter.mockResolvedValue([
        { /* vitória vs Kaido */ },
        { /* vitória vs Katakuri */ },
      ]);

      // Act
      const result = await service.calculatePowerScore('luffy');

      // Assert
      expect(result.score).toBeGreaterThan(90); // Luffy deve ter score alto
      expect(result.confidence).toBeGreaterThanOrEqual(4); // Alta confiança
    });

    it('should return low confidence for character with missing data', async () => {
      mockCharacterRepo.findById.mockResolvedValue({
        id: 'fodder',
        name: 'Random Marine',
        currentBounty: 0,
        rank: 'UNKNOWN',
      });

      const result = await service.calculatePowerScore('fodder');

      expect(result.confidence).toBeLessThanOrEqual(2);
    });
  });
});
```

---

## 📊 Banco de Dados

### PostgreSQL Schema

```sql
-- characters table
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  aliases TEXT[],
  epithet VARCHAR(255),

  age INTEGER,
  gender VARCHAR(20),
  race VARCHAR(50),
  birthdate DATE,

  affiliation VARCHAR(50) NOT NULL,
  crew VARCHAR(255),
  rank VARCHAR(100),

  sea VARCHAR(50),
  birthplace VARCHAR(255),

  alive BOOLEAN DEFAULT true,
  first_appearance_arc VARCHAR(100),
  death_arc VARCHAR(100),

  devil_fruit_id UUID REFERENCES devil_fruits(id),
  haki_types VARCHAR(50)[],
  advanced_haki VARCHAR(50)[],

  current_bounty BIGINT DEFAULT 0,
  bounty_history JSONB DEFAULT '[]',

  description TEXT,
  image_url TEXT,
  wiki_url TEXT,

  -- Cached power score (recalculado periodicamente)
  power_score INTEGER,
  power_score_confidence INTEGER,
  power_score_updated_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_characters_name ON characters(name);
CREATE INDEX idx_characters_affiliation ON characters(affiliation);
CREATE INDEX idx_characters_bounty ON characters(current_bounty DESC);
CREATE INDEX idx_characters_power_score ON characters(power_score DESC);

-- organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  leader_id UUID REFERENCES characters(id),
  total_bounty BIGINT DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- battles table
CREATE TABLE battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location VARCHAR(255),
  arc VARCHAR(100) NOT NULL,
  chapter INTEGER,
  episode INTEGER,
  difficulty VARCHAR(20),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- battle_participants (many-to-many)
CREATE TABLE battle_participants (
  battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  side CHAR(1) CHECK (side IN ('A', 'B')),
  outcome VARCHAR(20) NOT NULL,
  PRIMARY KEY (battle_id, character_id)
);

-- devil_fruits table
CREATE TABLE devil_fruits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_japanese VARCHAR(255) NOT NULL,
  name_english VARCHAR(255),
  type VARCHAR(50) NOT NULL,
  awakening_status VARCHAR(50),
  description TEXT,
  current_user_id UUID REFERENCES characters(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Neo4j Schema

```cypher
// Constraints
CREATE CONSTRAINT character_id IF NOT EXISTS
FOR (c:Character) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT organization_id IF NOT EXISTS
FOR (o:Organization) REQUIRE o.id IS UNIQUE;

// Indexes
CREATE INDEX character_name IF NOT EXISTS
FOR (c:Character) ON (c.name);

// Sample node
CREATE (c:Character {
  id: 'luffy-123',
  name: 'Monkey D. Luffy'
});

// Sample relationship
MATCH (luffy:Character {name: 'Monkey D. Luffy'})
MATCH (zoro:Character {name: 'Roronoa Zoro'})
CREATE (luffy)-[:CREW_MEMBER {
  strength: 'STRONG',
  startedInArc: 'Romance Dawn'
}]->(zoro);
```

---

## ⚡ Performance & Otimizações

### Caching Strategy

```typescript
// infrastructure/cache/cache.service.ts

export class CacheService {
  constructor(private redis: RedisClient) {}

  /**
   * Cache de personagens (1 hora)
   */
  async getCharacter(id: string): Promise<Character | null> {
    const cached = await this.redis.get(`character:${id}`);
    return cached ? JSON.parse(cached) : null;
  }

  async setCharacter(character: Character): Promise<void> {
    await this.redis.setex(
      `character:${character.id}`,
      3600, // 1 hora
      JSON.stringify(character)
    );
  }

  /**
   * Cache de respostas da IA (24 horas)
   */
  async getAIResponse(questionHash: string): Promise<string | null> {
    return this.redis.get(`ai:${questionHash}`);
  }

  async setAIResponse(questionHash: string, response: string): Promise<void> {
    await this.redis.setex(`ai:${questionHash}`, 86400, response);
  }

  /**
   * Cache de power scores (recalculado diariamente)
   */
  async getPowerScore(characterId: string): Promise<PowerScore | null> {
    const cached = await this.redis.get(`power:${characterId}`);
    return cached ? JSON.parse(cached) : null;
  }
}
```

### Database Query Optimization

```typescript
// Exemplo: Pagination + Index usage
async function listCharacters(
  page: number = 1,
  limit: number = 50,
  orderBy: 'name' | 'bounty' | 'power_score' = 'name'
): Promise<PaginatedResult<Character>> {
  const offset = (page - 1) * limit;

  // Query otimizada com índices
  const query = `
    SELECT * FROM characters
    WHERE alive = true
    ORDER BY ${orderBy} DESC
    LIMIT $1 OFFSET $2
  `;

  const countQuery = `
    SELECT COUNT(*) FROM characters WHERE alive = true
  `;

  const [characters, countResult] = await Promise.all([
    pg.query(query, [limit, offset]),
    pg.query(countQuery),
  ]);

  return {
    data: characters.rows,
    total: countResult.rows[0].count,
    page,
    limit,
    totalPages: Math.ceil(countResult.rows[0].count / limit),
  };
}
```

---

## 🔐 Segurança

### Input Validation (Zod)

```typescript
// api/validators/character.schema.ts

import { z } from 'zod';

export const CreateCharacterSchema = z.object({
  name: z.string().min(1).max(255),
  aliases: z.array(z.string()).optional(),
  epithet: z.string().max(255).optional(),

  age: z.number().int().min(0).max(200).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY', 'UNKNOWN']),
  race: z.string().max(50),

  affiliation: z.enum(['PIRATE', 'MARINE', 'REVOLUTIONARY', ...]),
  sea: z.enum(['EAST_BLUE', 'WEST_BLUE', ...]),

  currentBounty: z.number().int().min(0).optional(),
});

export type CreateCharacterDto = z.infer<typeof CreateCharacterSchema>;
```

### Rate Limiting

```typescript
// api/middlewares/rate-limit.middleware.ts

import rateLimit from 'express-rate-limit';

// Rate limit geral: 100 req/15min
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

// Rate limit para IA: 10 req/hora (custoso)
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'AI request limit reached. Please upgrade your plan.',
});
```

---

## 📦 Dependências Principais

```json
{
  "dependencies": {
    // Web Framework
    "express": "^4.18.2",
    "cors": "^2.8.5",

    // Database
    "pg": "^8.11.3",
    "neo4j-driver": "^5.14.0",
    "redis": "^4.6.11",

    // Search
    "@elastic/elasticsearch": "^8.11.0",

    // AI/ML
    "openai": "^4.20.1",
    "@pinecone-database/pinecone": "^1.1.2",
    "langchain": "^0.0.197",

    // Validation
    "zod": "^3.22.4",

    // Utils
    "uuid": "^9.0.1",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",

    // Jobs
    "bull": "^4.12.0",

    // Logging
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.4",
    "@types/express": "^4.17.21",
    "typescript": "^5.3.3",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.10",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.2",
    "eslint": "^8.55.0",
    "prettier": "^3.1.1"
  }
}
```

---

## 🗺️ Roadmap de Implementação

### Fase 1: Fundação (Semanas 1-2)
- [ ] Setup do projeto (TypeScript, ESLint, etc)
- [ ] Configurar PostgreSQL + Neo4j + Redis
- [ ] Estrutura de pastas
- [ ] API básica (Express + middlewares)
- [ ] Sistema de logging

### Fase 2: Core - Personagens (Semanas 3-4)
- [ ] Character Repository (Postgres + Neo4j)
- [ ] Character Service
- [ ] Character Controller
- [ ] CRUD completo de personagens
- [ ] Testes unitários

### Fase 3: Grafo de Relacionamentos (Semanas 5-6)
- [ ] Relationship Repository
- [ ] Pathfinding Service
- [ ] Ego Network queries
- [ ] API de relacionamentos

### Fase 4: Busca (Semana 7)
- [ ] Setup Elasticsearch
- [ ] Search Service
- [ ] Sync Postgres → Elasticsearch
- [ ] API de busca

### Fase 5: Power System (Semanas 8-9)
- [ ] Battle Repository
- [ ] Power Score Service
- [ ] Algoritmo de cálculo
- [ ] Job de recálculo periódico
- [ ] API de power scores

### Fase 6: IA/RAG (Semanas 10-12)
- [ ] Setup Pinecone
- [ ] Embedding Service
- [ ] RAG Service
- [ ] LLM Service
- [ ] Cache de respostas
- [ ] API de chat

### Fase 7: Analytics (Semana 13)
- [ ] Centrality Calculator
- [ ] Community Detection
- [ ] Timeline queries
- [ ] API de analytics

### Fase 8: Features Sociais (Semana 14)
- [ ] User authentication
- [ ] Favoritos
- [ ] Coleções
- [ ] Comentários

### Fase 9: Performance & Deploy (Semana 15-16)
- [ ] Otimização de queries
- [ ] Caching strategy
- [ ] Rate limiting
- [ ] Monitoramento
- [ ] Deploy em produção

---

## 📝 Notas Finais

### O que EVITAR:
- ❌ Over-engineering com DDD desnecessário
- ❌ Abstrações prematuras
- ❌ Múltiplas camadas sem justificativa
- ❌ Patterns complexos quando simples basta

### O que FOCAR:
- ✅ Código limpo e legível
- ✅ Testes automatizados
- ✅ Performance (cache, índices, queries otimizadas)
- ✅ Documentação clara
- ✅ Monitoramento e observabilidade

**Mantra:** *"Make it work, make it right, make it fast"* - nessa ordem!

---

**Última atualização:** 2026-01-09
