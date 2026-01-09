# 🧪 Estratégia de Testes
## One Piece Knowledge Graph Explorer

---

## ❓ Por Que Testar um Sistema de "Complexidade Técnica"?

### A Dúvida Válida:
> "Como você disse 'Complexidade é técnica, não de negócio', logo eu imagino que não tenha o que testar"

### A Resposta:
**Complexidade técnica PRECISA ser testada, talvez até MAIS que complexidade de negócio!**

A diferença é que não testamos "regras de negócio mutáveis", mas sim:
- ✅ **Algoritmos complexos** (pathfinding, power score, centralidade)
- ✅ **Integrações críticas** (dual-write Postgres+Neo4j, cache, RAG)
- ✅ **Lógica matemática** (normalização, cálculos, pesos)
- ✅ **Performance** (queries otimizadas, índices)
- ✅ **Custo** (cache de LLM, evitar chamadas duplicadas)

---

## 🎯 O Que Testar vs O Que NÃO Testar

### ❌ O Que NÃO Precisa de Testes Unitários

#### 1. CRUD Simples (Passthrough)
```typescript
// ❌ NÃO TESTAR - Só repassa para repository
async getById(id: string): Promise<Character | null> {
  return this.characterRepo.findById(id);
}

async create(data: CreateCharacterDto): Promise<Character> {
  return this.characterRepo.create(data);
}
```

**Por quê?** Não há lógica, só passthrough. Se o repository funciona, isso funciona.

#### 2. Getters/Setters Triviais
```typescript
// ❌ NÃO TESTAR
class Character {
  getName(): string {
    return this.name;
  }

  setName(name: string): void {
    this.name = name;
  }
}
```

#### 3. Configurações/Constants
```typescript
// ❌ NÃO TESTAR
export const DATABASE_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
};
```

---

### ✅ O Que PRECISA de Testes

#### 1. Algoritmos Complexos (Unit Tests)

##### Power Score Calculator
```typescript
// ✅ TESTAR - Lógica matemática complexa

describe('PowerScoreService', () => {
  describe('normalizeBounty', () => {
    it('should normalize bounty to 0-100 range', () => {
      const service = new PowerScoreService(mockRepo, mockBattleRepo);

      expect(service.normalizeBounty(0, { min: 0, max: 5_000_000_000 }))
        .toBe(0);

      expect(service.normalizeBounty(2_500_000_000, { min: 0, max: 5_000_000_000 }))
        .toBe(50);

      expect(service.normalizeBounty(5_000_000_000, { min: 0, max: 5_000_000_000 }))
        .toBe(100);
    });

    it('should handle edge case: same min and max', () => {
      const result = service.normalizeBounty(100, { min: 100, max: 100 });
      expect(result).toBe(50); // Retorna valor neutro
    });

    it('should handle edge case: zero bounty', () => {
      const result = service.normalizeBounty(0, { min: 0, max: 1_000_000 });
      expect(result).toBe(0);
    });
  });

  describe('calculatePowerScore', () => {
    it('should apply correct weights (30%, 25%, 35%, 10%)', async () => {
      // Mock: todos os componentes = 100
      mockRepo.findById.mockResolvedValue({ bounty: maxBounty, rank: 'YONKO' });
      mockBattleRepo.findByCharacter.mockResolvedValue([/* all wins */]);

      const result = await service.calculatePowerScore('test-id');

      // bounty(100)*0.3 + rank(100)*0.25 + battles(100)*0.35 + transitive(100)*0.1 = 100
      expect(result.score).toBe(100);
      expect(result.breakdown.bounty).toBe(100);
      expect(result.breakdown.rank).toBe(100);
    });

    it('should handle character with no data (default to neutral score)', async () => {
      mockRepo.findById.mockResolvedValue({
        id: 'fodder',
        bounty: 0,
        rank: 'UNKNOWN',
      });
      mockBattleRepo.findByCharacter.mockResolvedValue([]);

      const result = await service.calculatePowerScore('fodder');

      expect(result.score).toBeGreaterThanOrEqual(20);
      expect(result.score).toBeLessThanOrEqual(40);
      expect(result.confidence).toBeLessThanOrEqual(2); // Baixa confiança
    });

    it('should calculate confidence level correctly', async () => {
      mockRepo.findById.mockResolvedValue({
        bounty: 3_000_000_000,      // +1
        rank: 'YONKO',               // +1
        devilFruitId: 'gomu-gomu',   // +1
      });
      mockBattleRepo.findByCharacter.mockResolvedValue([
        { /* batalha 1 */ },
        { /* batalha 2 */ }           // +1
      ]);

      const result = await service.calculatePowerScore('luffy');

      expect(result.confidence).toBeGreaterThanOrEqual(4); // 4-5 estrelas
    });
  });

  describe('calculateBattleScore', () => {
    it('should give higher score for wins against strong opponents', async () => {
      const battles = [
        { outcome: 'WIN', opponent: { powerScore: 950 } }, // Venceu Kaido
        { outcome: 'WIN', opponent: { powerScore: 200 } }, // Venceu fodder
      ];

      const score = await service.calculateBattleScore('luffy', battles);

      // Vitória vs Kaido deve pesar mais
      expect(score).toBeGreaterThan(85);
    });

    it('should give lower score for losses', async () => {
      const battles = [
        { outcome: 'LOSS', opponent: { powerScore: 800 } },
      ];

      const score = await service.calculateBattleScore('luffy', battles);

      expect(score).toBeLessThan(30);
    });

    it('should give neutral score for draws', async () => {
      const battles = [
        { outcome: 'DRAW', opponent: { powerScore: 700 } },
      ];

      const score = await service.calculateBattleScore('luffy', battles);

      expect(score).toBeGreaterThanOrEqual(40);
      expect(score).toBeLessThanOrEqual(60);
    });
  });
});
```

##### Pathfinding (Algoritmo de Grafo)
```typescript
// ✅ TESTAR - Algoritmo crítico

describe('PathfindingService', () => {
  let service: PathfindingService;
  let mockNeo4j: jest.Mocked<Neo4jClient>;

  beforeEach(() => {
    mockNeo4j = createMockNeo4jClient();
    service = new PathfindingService(mockNeo4j);
  });

  describe('findShortestPath', () => {
    it('should find shortest path between two connected characters', async () => {
      // Mock: grafo Luffy -> Ace -> Whitebeard -> Shanks
      mockNeo4j.run.mockResolvedValue({
        records: [
          {
            path: ['luffy', 'ace', 'shanks'],
            relationships: [
              { type: 'BROTHER' },
              { type: 'FRIEND' }
            ]
          }
        ]
      });

      const paths = await service.findShortestPath('luffy', 'shanks');

      expect(paths).toHaveLength(1);
      expect(paths[0].nodes).toEqual(['luffy', 'ace', 'shanks']);
      expect(paths[0].length).toBe(2); // 2 edges
    });

    it('should return empty array when no path exists', async () => {
      mockNeo4j.run.mockResolvedValue({ records: [] });

      const paths = await service.findShortestPath('luffy', 'isolated-char');

      expect(paths).toEqual([]);
    });

    it('should respect maxDepth parameter', async () => {
      await service.findShortestPath('luffy', 'shanks', { maxDepth: 3 });

      expect(mockNeo4j.run).toHaveBeenCalledWith(
        expect.stringContaining('[*..3]'), // Cypher query com maxDepth
        expect.any(Object)
      );
    });

    it('should filter by relationship types', async () => {
      await service.findShortestPath('luffy', 'kaido', {
        allowedRelationships: ['ALLY', 'CREW_MEMBER']
      });

      const query = mockNeo4j.run.mock.calls[0][0];
      expect(query).toContain(':ALLY|CREW_MEMBER');
      expect(query).not.toContain(':ENEMY');
    });

    it('should exclude specified relationship types', async () => {
      await service.findShortestPath('luffy', 'garp', {
        excludeRelationships: ['ENEMY', 'RIVAL']
      });

      const query = mockNeo4j.run.mock.calls[0][0];
      expect(query).toContain('WHERE NOT type(r) IN [\'ENEMY\', \'RIVAL\']');
    });
  });

  describe('findAllPaths', () => {
    it('should find multiple paths and sort by length', async () => {
      mockNeo4j.run.mockResolvedValue({
        records: [
          { path: ['a', 'b', 'c'] },      // length 2
          { path: ['a', 'd', 'e', 'c'] }, // length 3
          { path: ['a', 'c'] },           // length 1
        ]
      });

      const paths = await service.findAllPaths('a', 'c', 3);

      expect(paths).toHaveLength(3);
      expect(paths[0].length).toBe(1); // Mais curto primeiro
      expect(paths[2].length).toBe(3); // Mais longo por último
    });

    it('should limit results to avoid performance issues', async () => {
      const manyPaths = Array(100).fill({ path: ['a', 'b'] });
      mockNeo4j.run.mockResolvedValue({ records: manyPaths });

      const paths = await service.findAllPaths('a', 'b', 5);

      expect(paths.length).toBeLessThanOrEqual(20); // Limite definido
    });
  });
});
```

---

#### 2. Lógica de RAG/IA (Unit + Integration)

```typescript
// ✅ TESTAR - Lógica crítica e custosa

describe('RAGService', () => {
  let service: RAGService;
  let mockLLM: jest.Mocked<LLMService>;
  let mockCache: jest.Mocked<CacheService>;
  let mockPinecone: jest.Mocked<PineconeClient>;

  describe('extractEntities', () => {
    it('should extract character names from question', async () => {
      const question = 'Qual a conexão entre Luffy e Doflamingo?';

      mockLLM.complete.mockResolvedValue(JSON.stringify({
        characters: ['Luffy', 'Doflamingo'],
        organizations: [],
        locations: []
      }));

      const entities = await service.extractEntities(question);

      expect(entities.characters).toContain('Luffy');
      expect(entities.characters).toContain('Doflamingo');
    });

    it('should extract organizations and locations', async () => {
      const question = 'Quem lidera a Marinha em Marineford?';

      mockLLM.complete.mockResolvedValue(JSON.stringify({
        characters: [],
        organizations: ['Marinha'],
        locations: ['Marineford']
      }));

      const entities = await service.extractEntities(question);

      expect(entities.organizations).toContain('Marinha');
      expect(entities.locations).toContain('Marineford');
    });
  });

  describe('buildPrompt', () => {
    it('should include character data in context', () => {
      const context = {
        characters: [
          { name: 'Luffy', bounty: 3_000_000_000, affiliation: 'PIRATE' }
        ],
        wikidocs: [],
        graphPaths: []
      };

      const prompt = service.buildPrompt('Quem é Luffy?', context);

      expect(prompt).toContain('Luffy');
      expect(prompt).toContain('3,000,000,000');
      expect(prompt).toContain('PIRATE');
    });

    it('should include graph paths when available', () => {
      const context = {
        characters: [],
        wikidocs: [],
        graphPaths: [
          { nodes: ['Luffy', 'Ace', 'Whitebeard'], edges: [...] }
        ]
      };

      const prompt = service.buildPrompt('Como Luffy conhece Whitebeard?', context);

      expect(prompt).toContain('Luffy');
      expect(prompt).toContain('Ace');
      expect(prompt).toContain('Whitebeard');
    });

    it('should limit conversation history to last 3 messages', () => {
      const conversationContext = {
        history: [
          { role: 'user', content: 'msg1' },
          { role: 'assistant', content: 'msg2' },
          { role: 'user', content: 'msg3' },
          { role: 'assistant', content: 'msg4' },
          { role: 'user', content: 'msg5' },
        ]
      };

      const prompt = service.buildPrompt('nova pergunta', {}, conversationContext);

      expect(prompt).toContain('msg3');
      expect(prompt).toContain('msg4');
      expect(prompt).toContain('msg5');
      expect(prompt).not.toContain('msg1'); // Mais antiga, não deve incluir
      expect(prompt).not.toContain('msg2');
    });
  });

  describe('caching (CRÍTICO para custo!)', () => {
    it('should cache AI responses to avoid duplicate API calls', async () => {
      const question = 'Quem é Luffy?';
      const expectedResponse = { text: 'Luffy é o protagonista...', sources: [] };

      mockCache.get.mockResolvedValueOnce(null); // Primeira chamada: cache miss
      mockLLM.complete.mockResolvedValue('Luffy é o protagonista...');

      // Primeira chamada
      await service.ask(question);

      // Segunda chamada - deve pegar do cache
      mockCache.get.mockResolvedValueOnce(expectedResponse); // Cache hit

      const result = await service.ask(question);

      // LLM deve ter sido chamado apenas 1 vez
      expect(mockLLM.complete).toHaveBeenCalledTimes(1);
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining(question),
        expect.any(Object),
        86400 // TTL de 24h
      );
    });

    it('should use different cache keys for different questions', async () => {
      await service.ask('Pergunta 1');
      await service.ask('Pergunta 2');

      const cacheKeys = mockCache.set.mock.calls.map(call => call[0]);

      expect(cacheKeys[0]).not.toBe(cacheKeys[1]);
    });

    it('should invalidate cache after TTL expires', async () => {
      // Mock de cache expirado
      mockCache.get.mockResolvedValue(null);

      await service.ask('Pergunta antiga');

      // Deve chamar LLM novamente
      expect(mockLLM.complete).toHaveBeenCalled();
    });
  });

  describe('retrieveContext', () => {
    it('should fetch character data for mentioned characters', async () => {
      const entities = {
        characters: ['Luffy', 'Zoro'],
        organizations: [],
        locations: []
      };

      mockCharacterRepo.findByNames.mockResolvedValue([
        { id: '1', name: 'Luffy', bounty: 3_000_000_000 },
        { id: '2', name: 'Zoro', bounty: 1_111_000_000 }
      ]);

      const context = await service.retrieveContext('pergunta', entities);

      expect(context.characters).toHaveLength(2);
      expect(mockCharacterRepo.findByNames).toHaveBeenCalledWith(['Luffy', 'Zoro']);
    });

    it('should search similar documents via embeddings', async () => {
      mockEmbeddingService.embed.mockResolvedValue([0.1, 0.2, 0.3, /* ... */]);
      mockPinecone.query.mockResolvedValue([
        { text: 'Doc sobre Luffy...', score: 0.95 },
        { text: 'Doc sobre Gear 5...', score: 0.87 }
      ]);

      const context = await service.retrieveContext('O que é Gear 5?', {});

      expect(mockEmbeddingService.embed).toHaveBeenCalledWith('O que é Gear 5?');
      expect(mockPinecone.query).toHaveBeenCalled();
      expect(context.wikidocs).toHaveLength(2);
    });

    it('should find graph paths when multiple characters mentioned', async () => {
      const entities = {
        characters: ['Luffy', 'Shanks'],
        organizations: [],
        locations: []
      };

      mockNeo4j.findPaths.mockResolvedValue([
        { nodes: ['Luffy', 'Ace', 'Shanks'] }
      ]);

      const context = await service.retrieveContext('pergunta', entities);

      expect(mockNeo4j.findPaths).toHaveBeenCalledWith('Luffy', 'Shanks');
      expect(context.graphPaths).toHaveLength(1);
    });
  });
});
```

---

#### 3. Queries Complexas de Banco (Integration Tests)

```typescript
// ✅ TESTAR - Queries críticas e complexas

describe('CharacterRepository (Integration)', () => {
  let repo: CharacterRepository;
  let pg: PostgresClient;
  let neo4j: Neo4jClient;

  beforeAll(async () => {
    // Setup de bancos de teste
    pg = await setupTestPostgres();
    neo4j = await setupTestNeo4j();
    repo = new CharacterRepository(pg, neo4j);
  });

  afterAll(async () => {
    await pg.disconnect();
    await neo4j.disconnect();
  });

  beforeEach(async () => {
    // Limpar dados antes de cada teste
    await pg.query('TRUNCATE characters CASCADE');
    await neo4j.run('MATCH (n) DETACH DELETE n');
  });

  describe('create (dual-write)', () => {
    it('should write to both PostgreSQL and Neo4j', async () => {
      const character = await repo.create({
        name: 'Test Character',
        bounty: 1_000_000,
        affiliation: 'PIRATE'
      });

      // Verificar PostgreSQL
      const pgResult = await pg.query(
        'SELECT * FROM characters WHERE id = $1',
        [character.id]
      );
      expect(pgResult.rows).toHaveLength(1);
      expect(pgResult.rows[0].name).toBe('Test Character');

      // Verificar Neo4j
      const neo4jResult = await neo4j.run(
        'MATCH (c:Character {id: $id}) RETURN c',
        { id: character.id }
      );
      expect(neo4jResult.records).toHaveLength(1);
      expect(neo4jResult.records[0].get('c').properties.name).toBe('Test Character');
    });

    it('should rollback if Neo4j write fails', async () => {
      // Mock de falha no Neo4j
      jest.spyOn(neo4j, 'run').mockRejectedValueOnce(new Error('Neo4j error'));

      await expect(
        repo.create({ name: 'Test', bounty: 1000, affiliation: 'PIRATE' })
      ).rejects.toThrow();

      // Verificar que PostgreSQL também não foi commitado
      const pgResult = await pg.query('SELECT COUNT(*) FROM characters');
      expect(pgResult.rows[0].count).toBe('0');
    });
  });

  describe('getEgoNetwork', () => {
    beforeEach(async () => {
      // Popular grafo de teste
      await seedTestGraph(neo4j, {
        // Luffy -> Zoro, Nami, Sanji (depth 1)
        // Zoro -> Mihawk (depth 2)
        // Sanji -> Zeff (depth 2)
      });
    });

    it('should return direct connections (depth 1)', async () => {
      const network = await repo.getEgoNetwork('luffy', 1);

      expect(network.nodes).toHaveLength(4); // Luffy + 3 tripulantes
      expect(network.edges).toHaveLength(3);
      expect(network.nodes.map(n => n.id)).toContain('zoro');
      expect(network.nodes.map(n => n.id)).toContain('nami');
      expect(network.nodes.map(n => n.id)).toContain('sanji');
    });

    it('should return extended network (depth 2)', async () => {
      const network = await repo.getEgoNetwork('luffy', 2);

      expect(network.nodes).toHaveLength(6); // + Mihawk, Zeff
      expect(network.nodes.map(n => n.id)).toContain('mihawk');
      expect(network.nodes.map(n => n.id)).toContain('zeff');
    });

    it('should filter by relationship types', async () => {
      const network = await repo.getEgoNetwork('luffy', 2, ['CREW_MEMBER']);

      // Deve incluir apenas conexões de tripulação
      expect(network.edges.every(e => e.type === 'CREW_MEMBER')).toBe(true);
    });

    it('should handle character with no connections', async () => {
      await neo4j.run('CREATE (c:Character {id: "isolated", name: "Isolated"})');

      const network = await repo.getEgoNetwork('isolated', 2);

      expect(network.nodes).toHaveLength(1); // Só ele mesmo
      expect(network.edges).toHaveLength(0);
    });
  });

  describe('getBountyRange', () => {
    it('should return correct min and max bounties', async () => {
      await repo.create({ name: 'Char1', bounty: 1_000_000, affiliation: 'PIRATE' });
      await repo.create({ name: 'Char2', bounty: 5_000_000_000, affiliation: 'PIRATE' });
      await repo.create({ name: 'Char3', bounty: 500_000, affiliation: 'PIRATE' });

      const range = await repo.getBountyRange();

      expect(range.min).toBe(500_000);
      expect(range.max).toBe(5_000_000_000);
    });

    it('should ignore characters with zero bounty', async () => {
      await repo.create({ name: 'Marine', bounty: 0, affiliation: 'MARINE' });
      await repo.create({ name: 'Pirate', bounty: 1_000_000, affiliation: 'PIRATE' });

      const range = await repo.getBountyRange();

      expect(range.min).toBe(1_000_000);
    });
  });
});
```

---

#### 4. Validações e Input Sanitization

```typescript
// ✅ TESTAR - Segurança é crítica

describe('Character Validation (Zod)', () => {
  describe('CreateCharacterSchema', () => {
    it('should accept valid character data', () => {
      const validData = {
        name: 'Monkey D. Luffy',
        age: 19,
        gender: 'MALE',
        race: 'HUMAN',
        affiliation: 'PIRATE',
        sea: 'EAST_BLUE',
        currentBounty: 3_000_000_000
      };

      const result = CreateCharacterSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        gender: 'MALE',
        race: 'HUMAN',
        affiliation: 'PIRATE',
        sea: 'EAST_BLUE'
      };

      const result = CreateCharacterSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      expect(result.error?.issues[0].path).toContain('name');
    });

    it('should reject invalid gender', () => {
      const invalidData = {
        name: 'Test',
        gender: 'INVALID_GENDER',
        race: 'HUMAN',
        affiliation: 'PIRATE',
        sea: 'EAST_BLUE'
      };

      const result = CreateCharacterSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject negative bounty', () => {
      const invalidData = {
        name: 'Test',
        gender: 'MALE',
        race: 'HUMAN',
        affiliation: 'PIRATE',
        sea: 'EAST_BLUE',
        currentBounty: -1000
      };

      const result = CreateCharacterSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should accept optional fields as undefined', () => {
      const minimalData = {
        name: 'Test',
        gender: 'MALE',
        race: 'HUMAN',
        affiliation: 'PIRATE',
        sea: 'EAST_BLUE'
        // age, bounty, etc são opcionais
      };

      const result = CreateCharacterSchema.safeParse(minimalData);

      expect(result.success).toBe(true);
    });
  });
});
```

---

## 📊 Pirâmide de Testes

```
        /\
       /  \      E2E (10%)
      /────\     - 5-10 testes de fluxos críticos
     /      \    - Ex: "Criar char → Buscar → Pathfinding → IA"
    /────────\
   /          \  Integration (30%)
  /────────────\ - Repositories com DB real
 /              \- RAG com mock de LLM
/────────────────\ - Cache, dual-write, queries complexas

                  Unit (60%)
                  - Algoritmos (power score, pathfinding)
                  - Utilities (normalize, validators)
                  - Business logic pura
```

### Distribuição Sugerida:

| Tipo | Quantidade | % | Exemplos |
|------|-----------|---|----------|
| **Unit** | ~150 testes | 60% | Algoritmos, utils, lógica pura |
| **Integration** | ~75 testes | 30% | Repositories, queries, cache |
| **E2E** | ~25 testes | 10% | Fluxos completos API → DB |
| **Total** | ~250 testes | 100% | |

---

## 🎯 Cobertura de Testes por Camada

### Alvo de Cobertura:

```
Cobertura Total: 70-80%

Por tipo de código:
┌──────────────────────────────────┬──────────┬────────────┐
│ Tipo                             │ Alvo     │ Prioridade │
├──────────────────────────────────┼──────────┼────────────┤
│ Algoritmos (power, pathfinding)  │ 95%+     │ 🔴 ALTA    │
│ Utilities (validators, parsers)  │ 90%+     │ 🔴 ALTA    │
│ RAG/IA Services                  │ 85%+     │ 🔴 ALTA    │
│ Business Services                │ 80%+     │ 🟡 MÉDIA   │
│ Repositories                     │ 70%+     │ 🟡 MÉDIA   │
│ Controllers                      │ 60%+     │ 🟢 BAIXA   │
│ CRUD simples                     │ 0-30%    │ ⚪ Skip    │
└──────────────────────────────────┴──────────┴────────────┘
```

---

## 🔧 Setup de Testes

### Jest Configuration

```typescript
// jest.config.ts

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/types/**',
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // Thresholds específicos para código crítico
    './src/services/power/*.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
    },
    './src/services/graph/*.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
    },
  },
};
```

### Test Database Setup

```typescript
// tests/setup/database.setup.ts

export async function setupTestDatabase() {
  // PostgreSQL de teste
  const pg = new Pool({
    host: 'localhost',
    port: 5433, // Porta diferente da produção
    database: 'opkg_test',
    user: 'test',
    password: 'test',
  });

  // Rodar migrations
  await runMigrations(pg);

  return pg;
}

export async function setupTestNeo4j() {
  const neo4j = neo4j.driver(
    'bolt://localhost:7688', // Porta de teste
    neo4j.auth.basic('neo4j', 'test')
  );

  // Limpar banco
  await neo4j.session().run('MATCH (n) DETACH DELETE n');

  return neo4j;
}

export async function seedTestGraph(neo4j: Driver, data: GraphSeed) {
  // Popular com dados de teste conhecidos
  const session = neo4j.session();

  for (const node of data.nodes) {
    await session.run(
      'CREATE (c:Character {id: $id, name: $name})',
      node
    );
  }

  for (const edge of data.edges) {
    await session.run(
      `MATCH (a:Character {id: $from})
       MATCH (b:Character {id: $to})
       CREATE (a)-[:${edge.type}]->(b)`,
      edge
    );
  }

  await session.close();
}
```

---

## 📋 Checklist: O Que Testar

### Services

- [ ] **PowerScoreService**
  - [ ] Normalização de bounty
  - [ ] Cálculo de score com pesos corretos
  - [ ] Cálculo de confiança
  - [ ] Edge cases (dados faltando, zeros)

- [ ] **PathfindingService**
  - [ ] Shortest path
  - [ ] All paths
  - [ ] Filtros de tipo de relacionamento
  - [ ] MaxDepth
  - [ ] Casos sem caminho

- [ ] **RAGService**
  - [ ] Extração de entidades
  - [ ] Construção de prompt
  - [ ] Cache de respostas (CRÍTICO!)
  - [ ] Retrieval de contexto

- [ ] **SearchService**
  - [ ] Busca fuzzy
  - [ ] Autocomplete
  - [ ] Filtros combinados

### Repositories

- [ ] **CharacterRepository**
  - [ ] Dual-write (Postgres + Neo4j)
  - [ ] Rollback em caso de falha
  - [ ] Ego network (depth 1, 2, 3)
  - [ ] Filtros de relacionamento
  - [ ] Bounty range

- [ ] **RelationshipRepository**
  - [ ] Criar relacionamento
  - [ ] Buscar por personagem
  - [ ] Deletar relacionamento
  - [ ] Filtros de tipo

### Utils

- [ ] **Validators**
  - [ ] Schemas Zod
  - [ ] Sanitização de input
  - [ ] Edge cases

- [ ] **Normalizers**
  - [ ] Normalização 0-100
  - [ ] Edge cases (min=max, zeros)

### Integration

- [ ] **Cache**
  - [ ] Set/get
  - [ ] TTL
  - [ ] Invalidação

- [ ] **Dual-Write**
  - [ ] Sucesso em ambos
  - [ ] Rollback em falha

### E2E

- [ ] Criar personagem → Buscar → Retornar
- [ ] Criar 2 personagens → Criar relacionamento → Pathfinding
- [ ] Pergunta à IA → Cache → Segunda pergunta (cache hit)

---

## 🚫 O Que NÃO Testar

### Evite Testar:

1. **Framework/Library code**
   ```typescript
   // ❌ NÃO TESTAR - É código do Express
   app.use(express.json());
   ```

2. **Configuração simples**
   ```typescript
   // ❌ NÃO TESTAR
   const PORT = process.env.PORT || 3000;
   ```

3. **Passthrough sem lógica**
   ```typescript
   // ❌ NÃO TESTAR
   async get(id: string) {
     return this.repo.findById(id);
   }
   ```

4. **Getters/Setters triviais**
   ```typescript
   // ❌ NÃO TESTAR
   getName() { return this.name; }
   ```

5. **Mocks excessivos que não testam nada**
   ```typescript
   // ❌ TESTE INÚTIL - Está testando o mock, não o código
   it('should return mocked data', () => {
     mockService.getData.mockReturnValue({ data: 'test' });
     const result = mockService.getData();
     expect(result.data).toBe('test'); // Claro que vai ser!
   });
   ```

---

## 🎖️ Boas Práticas

### 1. AAA Pattern (Arrange, Act, Assert)

```typescript
it('should calculate power score correctly', async () => {
  // Arrange (preparar)
  const mockData = { bounty: 1_000_000, rank: 'PIRATE' };
  mockRepo.findById.mockResolvedValue(mockData);

  // Act (executar)
  const result = await service.calculatePowerScore('test-id');

  // Assert (verificar)
  expect(result.score).toBeGreaterThan(0);
});
```

### 2. Nomes Descritivos

```typescript
// ❌ Ruim
it('should work', () => { ... });

// ✅ Bom
it('should normalize bounty to 0-100 range', () => { ... });
it('should return empty array when no path exists', () => { ... });
```

### 3. Teste Um Conceito por Vez

```typescript
// ❌ Ruim - testa múltiplas coisas
it('should create, update and delete character', () => {
  // cria
  // atualiza
  // deleta
});

// ✅ Bom - separa em testes
it('should create character', () => { ... });
it('should update character', () => { ... });
it('should delete character', () => { ... });
```

### 4. Dados de Teste Claros

```typescript
// ❌ Ruim - "magic numbers"
expect(result.score).toBe(73.5);

// ✅ Bom - valores com significado
const MAX_BOUNTY = 5_000_000_000;
const HALF_MAX = MAX_BOUNTY / 2;
expect(normalize(HALF_MAX, 0, MAX_BOUNTY)).toBe(50);
```

### 5. Mock Apenas Dependências Externas

```typescript
// ✅ Bom - mock de API externa (LLM)
mockLLM.complete.mockResolvedValue('resposta');

// ✅ Bom - mock de banco de dados
mockRepo.findById.mockResolvedValue(character);

// ❌ Evitar - mock de código próprio que deveria ser testado
mockService.calculateScore.mockReturnValue(100);
```

---

## 🏃 Como Rodar os Testes

```bash
# Todos os testes
npm test

# Com coverage
npm run test:coverage

# Watch mode (desenvolvimento)
npm run test:watch

# Apenas unit tests
npm run test:unit

# Apenas integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Teste específico
npm test -- power-score.service.test.ts
```

---

## 📈 CI/CD - Testes Automatizados

```yaml
# .github/workflows/test.yml

name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: opkg_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5433:5432

      neo4j:
        image: neo4j:5
        env:
          NEO4J_AUTH: neo4j/test
        ports:
          - 7688:7687

      redis:
        image: redis:7
        ports:
          - 6380:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:coverage

      - name: Check coverage thresholds
        run: npm run test:coverage -- --coverageThreshold='{"global":{"lines":70}}'

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 💡 Resumo Final

| Aspecto | Testar? | Tipo de Teste | Prioridade |
|---------|---------|---------------|------------|
| **Algoritmos** (power score, pathfinding) | ✅ Sim | Unit | 🔴 ALTA |
| **Lógica de RAG/IA** | ✅ Sim | Unit + Integration | 🔴 ALTA |
| **Cache Strategy** | ✅ Sim | Integration | 🔴 ALTA (custo!) |
| **Queries Complexas** (ego network) | ✅ Sim | Integration | 🟡 MÉDIA |
| **Validações** (Zod schemas) | ✅ Sim | Unit | 🟡 MÉDIA |
| **Dual-write** (Postgres+Neo4j) | ✅ Sim | Integration | 🟡 MÉDIA |
| **CRUD Simples** | ❌ Não | - | - |
| **Passthrough Services** | ❌ Não | - | - |
| **Getters/Setters** | ❌ Não | - | - |

---

**Mantra:** *"Teste o que pode quebrar, não o que não pode."*

**Foco:** Algoritmos, integrações críticas, e lógica que afeta **custo** (cache de LLM) ou **corretude** (power score, pathfinding).

---

**Última atualização:** 2026-01-09
