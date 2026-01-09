# 📥 Plano de Ingestão de Dados
## One Piece Knowledge Graph Explorer

---

## 🎯 Objetivo

Popular o banco de dados com informações da **One Piece Wiki** de forma:
- ✅ **Consistente** - Dados sempre completos (não pela metade)
- ✅ **Versionada** - Sistema de builds para rollback
- ✅ **Incremental** - Atualiza apenas o que mudou
- ✅ **Resiliente** - Continua mesmo com erros pontuais

---

## 🏗️ Sistema de Builds

### Conceito

```
┌─────────────────────────────────────────────────┐
│  Build #1 (2026-01-08) ✅ ACTIVE                │
│    ├─ 1,234 characters                          │
│    ├─ 5,678 relationships                       │
│    └─ Status: ACTIVE                            │
│                                                 │
│  Build #2 (2026-01-09) 🔄 BUILDING              │
│    ├─ 1,245 characters (+11 novos)             │
│    ├─ 5,710 relationships (+32 novas)          │
│    └─ Status: BUILDING                          │
│                                                 │
│  Frontend sempre lê da build ACTIVE            │
│  Quando Build #2 termina → promove pra ACTIVE │
└─────────────────────────────────────────────────┘
```

### Schema: Tabela Builds

```sql
-- Tabela que representa cada build
CREATE TABLE builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Status da build
  status VARCHAR(20) NOT NULL CHECK (status IN (
    'BUILDING',   -- Em andamento
    'VALIDATING', -- Validando integridade
    'ACTIVE',     -- Build ativa (produção)
    'ARCHIVED',   -- Build antiga (histórico)
    'FAILED'      -- Build que falhou
  )),

  -- Estatísticas
  characters_count INTEGER DEFAULT 0,
  relationships_count INTEGER DEFAULT 0,
  organizations_count INTEGER DEFAULT 0,
  battles_count INTEGER DEFAULT 0,

  -- Metadados
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  promoted_at TIMESTAMP, -- Quando virou ACTIVE

  -- Informações sobre a execução
  source_version VARCHAR(50), -- Versão da wiki na época
  errors JSONB DEFAULT '[]',  -- Erros que ocorreram
  logs TEXT,                  -- Logs da execução

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_builds_status ON builds(status);
CREATE INDEX idx_builds_promoted_at ON builds(promoted_at DESC NULLS LAST);

-- Garantir que só existe UMA build ACTIVE por vez
CREATE UNIQUE INDEX idx_builds_single_active
ON builds(status)
WHERE status = 'ACTIVE';
```

### Adicionar FK em Todas as Tabelas

```sql
-- Characters
ALTER TABLE characters ADD COLUMN build_id UUID REFERENCES builds(id) ON DELETE CASCADE;
CREATE INDEX idx_characters_build ON characters(build_id);

-- Organizations
ALTER TABLE organizations ADD COLUMN build_id UUID REFERENCES builds(id) ON DELETE CASCADE;
CREATE INDEX idx_organizations_build ON organizations(build_id);

-- Battles
ALTER TABLE battles ADD COLUMN build_id UUID REFERENCES builds(id) ON DELETE CASCADE;
CREATE INDEX idx_battles_build ON battles(build_id);

-- Devil Fruits
ALTER TABLE devil_fruits ADD COLUMN build_id UUID REFERENCES builds(id) ON DELETE CASCADE;
CREATE INDEX idx_devil_fruits_build ON devil_fruits(build_id);

-- Locations
ALTER TABLE locations ADD COLUMN build_id UUID REFERENCES builds(id) ON DELETE CASCADE;
CREATE INDEX idx_locations_build ON locations(build_id);

-- Bounty History também precisa
ALTER TABLE bounty_history ADD COLUMN build_id UUID REFERENCES builds(id) ON DELETE CASCADE;
CREATE INDEX idx_bounty_history_build ON bounty_history(build_id);
```

### Helper: Pegar Build Ativa

```sql
-- View para facilitar queries
CREATE VIEW active_build AS
SELECT * FROM builds WHERE status = 'ACTIVE';

-- Function helper
CREATE OR REPLACE FUNCTION get_active_build_id()
RETURNS UUID AS $$
  SELECT id FROM builds WHERE status = 'ACTIVE' LIMIT 1;
$$ LANGUAGE SQL STABLE;
```

---

## 🔄 Fluxo do Job de Ingestão

### Visão Geral

```
┌──────────────────────────────────────────────────────────┐
│ 1. INICIAR                                               │
│    ├─ Criar nova build (status: BUILDING)               │
│    └─ Log: "Build #42 started"                          │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ 2. POPULAR DADOS                                         │
│    ├─ Buscar personagens da wiki                        │
│    ├─ Transformar WikiDTO → Character                   │
│    ├─ Inserir com build_id = nova_build                 │
│    └─ Continue mesmo se houver erros pontuais           │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ 3. VALIDAR                                               │
│    ├─ Build tem dados suficientes?                      │
│    ├─ Integridade referencial OK?                       │
│    ├─ Nenhum dado corrupto?                             │
│    └─ Update status → VALIDATING                        │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ 4. PROMOVER                                              │
│    ├─ Build antiga: ACTIVE → ARCHIVED                   │
│    ├─ Nova build: VALIDATING → ACTIVE                   │
│    ├─ Sincronizar Neo4j                                 │
│    └─ Log: "Build #42 promoted to ACTIVE"               │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│ 5. CLEANUP                                               │
│    ├─ Deletar builds ARCHIVED > 30 dias                 │
│    └─ Frontend agora lê da nova build                   │
└──────────────────────────────────────────────────────────┘
```

---

## 🛠️ Implementação do Job

### 1. Build Service

```typescript
// services/build.service.ts

export class BuildService {
  constructor(
    private pg: Pool,
    private neo4j: Driver,
    private logger: Logger
  ) {}

  /**
   * Cria uma nova build
   */
  async createBuild(): Promise<Build> {
    const result = await this.pg.query(
      `INSERT INTO builds (status, started_at)
       VALUES ('BUILDING', NOW())
       RETURNING *`
    );

    const build = result.rows[0];
    this.logger.info(`📦 Build ${build.id} created`);

    return build;
  }

  /**
   * Valida integridade da build
   */
  async validateBuild(buildId: string): Promise<ValidationResult> {
    this.logger.info(`🔍 Validating build ${buildId}`);

    const errors: string[] = [];

    // 1. Verificar quantidade mínima de dados
    const charCount = await this.pg.query(
      'SELECT COUNT(*) FROM characters WHERE build_id = $1',
      [buildId]
    );

    if (charCount.rows[0].count < 100) {
      errors.push('Too few characters (expected at least 100)');
    }

    // 2. Verificar integridade referencial
    const orphanDevilFruits = await this.pg.query(
      `SELECT COUNT(*) FROM characters c
       WHERE c.build_id = $1
       AND c.devil_fruit_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM devil_fruits df
         WHERE df.id = c.devil_fruit_id
         AND df.build_id = $1
       )`,
      [buildId]
    );

    if (orphanDevilFruits.rows[0].count > 0) {
      errors.push(`${orphanDevilFruits.rows[0].count} characters reference missing devil fruits`);
    }

    // 3. Verificar dados corrompidos
    const negativeBounties = await this.pg.query(
      'SELECT COUNT(*) FROM characters WHERE build_id = $1 AND current_bounty < 0',
      [buildId]
    );

    if (negativeBounties.rows[0].count > 0) {
      errors.push(`${negativeBounties.rows[0].count} characters have negative bounties`);
    }

    // 4. Atualizar status
    await this.pg.query(
      `UPDATE builds
       SET status = 'VALIDATING',
           errors = $2
       WHERE id = $1`,
      [buildId, JSON.stringify(errors)]
    );

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Promove build para ACTIVE
   */
  async promoteBuild(buildId: string): Promise<void> {
    this.logger.info(`🚀 Promoting build ${buildId} to ACTIVE`);

    await this.pg.transaction(async (client) => {
      // 1. Arquivar build atual
      await client.query(
        `UPDATE builds
         SET status = 'ARCHIVED'
         WHERE status = 'ACTIVE'`
      );

      // 2. Promover nova build
      await client.query(
        `UPDATE builds
         SET status = 'ACTIVE',
             completed_at = NOW(),
             promoted_at = NOW()
         WHERE id = $1`,
        [buildId]
      );

      // 3. Atualizar estatísticas
      await this.updateBuildStats(buildId, client);
    });

    // 4. Sincronizar Neo4j
    await this.syncNeo4jWithBuild(buildId);

    this.logger.info(`✅ Build ${buildId} is now ACTIVE`);
  }

  /**
   * Marca build como falha
   */
  async failBuild(buildId: string, error: Error): Promise<void> {
    await this.pg.query(
      `UPDATE builds
       SET status = 'FAILED',
           completed_at = NOW(),
           errors = $2
       WHERE id = $1`,
      [buildId, JSON.stringify([error.message])]
    );

    this.logger.error(`❌ Build ${buildId} FAILED: ${error.message}`);
  }

  /**
   * Deleta build (rollback)
   */
  async deleteBuild(buildId: string): Promise<void> {
    // Cascade delete vai apagar tudo
    await this.pg.query('DELETE FROM builds WHERE id = $1', [buildId]);
    this.logger.warn(`🗑️ Build ${buildId} deleted (rollback)`);
  }

  /**
   * Cleanup de builds antigas
   */
  async cleanupOldBuilds(daysToKeep: number = 30): Promise<number> {
    const result = await this.pg.query(
      `DELETE FROM builds
       WHERE status = 'ARCHIVED'
       AND promoted_at < NOW() - INTERVAL '${daysToKeep} days'
       RETURNING id`
    );

    const deletedCount = result.rowCount || 0;
    this.logger.info(`🧹 Cleaned up ${deletedCount} old builds`);

    return deletedCount;
  }

  /**
   * Atualiza estatísticas da build
   */
  private async updateBuildStats(buildId: string, client: any): Promise<void> {
    await client.query(
      `UPDATE builds
       SET characters_count = (SELECT COUNT(*) FROM characters WHERE build_id = $1),
           relationships_count = (SELECT COUNT(*) FROM neo4j_sync_log WHERE build_id = $1),
           organizations_count = (SELECT COUNT(*) FROM organizations WHERE build_id = $1),
           battles_count = (SELECT COUNT(*) FROM battles WHERE build_id = $1)
       WHERE id = $1`,
      [buildId]
    );
  }

  /**
   * Sincroniza Neo4j com a build ativa
   */
  private async syncNeo4jWithBuild(buildId: string): Promise<void> {
    const session = this.neo4j.session();

    try {
      // 1. Limpar grafo antigo
      await session.run('MATCH (n) DETACH DELETE n');

      // 2. Criar nós da build ativa
      const characters = await this.pg.query(
        'SELECT id, name, power_score FROM characters WHERE build_id = $1',
        [buildId]
      );

      for (const char of characters.rows) {
        await session.run(
          `CREATE (c:Character {
            id: $id,
            name: $name,
            power_score: $powerScore
          })`,
          {
            id: char.id,
            name: char.name,
            powerScore: char.power_score,
          }
        );
      }

      // 3. Criar relacionamentos (da tabela de relacionamentos)
      // ... implementar conforme necessário

      this.logger.info(`✅ Neo4j synced with build ${buildId}`);

    } finally {
      await session.close();
    }
  }
}
```

### 2. Wiki Ingestion Job

```typescript
// jobs/wiki-ingestion.job.ts

export class WikiIngestionJob {
  constructor(
    private wikiClient: WikiClient,
    private buildService: BuildService,
    private characterService: CharacterService,
    private organizationService: OrganizationService,
    private logger: Logger
  ) {}

  /**
   * Executa o job de ingestão
   * Roda diariamente via cron
   */
  async execute(): Promise<void> {
    let build: Build | null = null;

    try {
      // 1. Criar nova build
      build = await this.buildService.createBuild();

      // 2. Popular dados
      await this.ingestCharacters(build.id);
      await this.ingestOrganizations(build.id);
      await this.ingestDevilFruits(build.id);
      await this.ingestBattles(build.id);
      await this.ingestRelationships(build.id);

      // 3. Validar
      const validation = await this.buildService.validateBuild(build.id);

      if (!validation.isValid) {
        throw new Error(`Build validation failed: ${validation.errors.join(', ')}`);
      }

      // 4. Promover
      await this.buildService.promoteBuild(build.id);

      // 5. Cleanup
      await this.buildService.cleanupOldBuilds(30);

      this.logger.info(`🎉 Wiki ingestion completed successfully`);

    } catch (error) {
      this.logger.error('Wiki ingestion failed', error);

      if (build) {
        await this.buildService.failBuild(build.id, error as Error);
        // Opcional: deletar build que falhou
        // await this.buildService.deleteBuild(build.id);
      }

      throw error;
    }
  }

  /**
   * Ingere personagens da wiki
   */
  private async ingestCharacters(buildId: string): Promise<void> {
    this.logger.info('📥 Ingesting characters...');

    const wikiCharacters = await this.wikiClient.fetchAllCharacters();
    let successCount = 0;
    let errorCount = 0;

    for (const wikiChar of wikiCharacters) {
      try {
        // Transformar WikiDTO → Character
        const character: CreateCharacterDto = {
          name: wikiChar.name,
          aliases: wikiChar.aliases || [],
          epithet: wikiChar.epithet,
          age: this.parseAge(wikiChar.age),
          gender: this.parseGender(wikiChar.gender),
          race: this.parseRace(wikiChar.race),
          affiliation: this.parseAffiliation(wikiChar.affiliation),
          sea: this.parseSea(wikiChar.origin),
          currentBounty: this.parseBounty(wikiChar.bounty),
          description: wikiChar.abstract,
          imageUrl: wikiChar.thumbnail?.url,
          wikiUrl: wikiChar.url,
          buildId: buildId, // 🔑 Associar com a build
        };

        await this.characterService.create(character);
        successCount++;

      } catch (error) {
        this.logger.error(`Failed to ingest ${wikiChar.name}`, error);
        errorCount++;
        // Continue mesmo com erro
      }
    }

    this.logger.info(`✅ Characters: ${successCount} success, ${errorCount} errors`);
  }

  /**
   * Ingere organizações da wiki
   */
  private async ingestOrganizations(buildId: string): Promise<void> {
    this.logger.info('📥 Ingesting organizations...');

    // Similar ao ingestCharacters
    // ...
  }

  /**
   * Ingere relacionamentos
   */
  private async ingestRelationships(buildId: string): Promise<void> {
    this.logger.info('📥 Ingesting relationships...');

    // Aqui você vai ter que extrair relacionamentos do texto
    // ou de páginas específicas da wiki
    // Pode ser manual inicialmente e automatizar depois
  }

  // === Parsers ===

  private parseAge(ageStr: string | undefined): number | undefined {
    if (!ageStr) return undefined;
    const match = ageStr.match(/\d+/);
    return match ? parseInt(match[0]) : undefined;
  }

  private parseBounty(bountyStr: string | undefined): number {
    if (!bountyStr) return 0;

    // Remove tudo que não é dígito
    const clean = bountyStr.replace(/[^\d]/g, '');
    return parseInt(clean) || 0;
  }

  private parseGender(genderStr: string | undefined): string {
    const lower = (genderStr || '').toLowerCase();
    if (lower.includes('male') && !lower.includes('female')) return 'MALE';
    if (lower.includes('female')) return 'FEMALE';
    return 'UNKNOWN';
  }

  private parseAffiliation(affStr: string | undefined): string {
    const lower = (affStr || '').toLowerCase();
    if (lower.includes('pirate')) return 'PIRATE';
    if (lower.includes('marine')) return 'MARINE';
    if (lower.includes('revolutionary')) return 'REVOLUTIONARY';
    return 'UNKNOWN';
  }

  private parseRace(raceStr: string | undefined): string {
    const lower = (raceStr || '').toLowerCase();
    if (lower.includes('fishman')) return 'FISHMAN';
    if (lower.includes('mink')) return 'MINK';
    if (lower.includes('giant')) return 'GIANT';
    if (lower.includes('human')) return 'HUMAN';
    return 'UNKNOWN';
  }

  private parseSea(originStr: string | undefined): string {
    const lower = (originStr || '').toLowerCase();
    if (lower.includes('east blue')) return 'EAST_BLUE';
    if (lower.includes('west blue')) return 'WEST_BLUE';
    if (lower.includes('north blue')) return 'NORTH_BLUE';
    if (lower.includes('south blue')) return 'SOUTH_BLUE';
    if (lower.includes('grand line')) return 'GRAND_LINE';
    if (lower.includes('new world')) return 'NEW_WORLD';
    return 'UNKNOWN';
  }
}
```

---

## 🌐 One Piece Wiki API

### Endpoints Disponíveis

A One Piece Wiki (Fandom) tem uma API REST:

```bash
# Base URL
https://onepiece.fandom.com/api/v1/

# Endpoints úteis
GET /Articles/List                # Lista de artigos
GET /Articles/Details?ids={ids}   # Detalhes de artigos
GET /Search/List?query={query}    # Busca
```

### Exemplo: WikiClient

```typescript
// infrastructure/wiki/wiki.client.ts

export class WikiClient {
  private baseURL = 'https://onepiece.fandom.com/api/v1';

  constructor(private httpClient: HttpClient) {}

  /**
   * Busca lista de personagens
   */
  async fetchAllCharacters(): Promise<WikiCharacterDTO[]> {
    // 1. Buscar categoria "Characters"
    const categoryResponse = await this.httpClient.get(
      `${this.baseURL}/Articles/List`,
      {
        params: {
          category: 'Characters',
          limit: 5000, // Max permitido
        },
      }
    );

    const articleIds = categoryResponse.items.map((item: any) => item.id);

    // 2. Buscar detalhes de todos os personagens (batch)
    const characters: WikiCharacterDTO[] = [];

    // API aceita até 100 IDs por vez
    for (let i = 0; i < articleIds.length; i += 100) {
      const batch = articleIds.slice(i, i + 100);
      const details = await this.fetchArticleDetails(batch);
      characters.push(...details);

      // Rate limiting: aguardar 1s entre requests
      await this.sleep(1000);
    }

    return characters;
  }

  /**
   * Busca detalhes de artigos
   */
  private async fetchArticleDetails(ids: number[]): Promise<WikiCharacterDTO[]> {
    const response = await this.httpClient.get(
      `${this.baseURL}/Articles/Details`,
      {
        params: {
          ids: ids.join(','),
        },
      }
    );

    return Object.values(response.items).map((item: any) => ({
      id: item.id,
      name: item.title,
      url: item.url,
      abstract: item.abstract,
      thumbnail: item.thumbnail,
      // Campos adicionais precisam ser extraídos do HTML
    }));
  }

  /**
   * Para campos não fornecidos pela API, scraping manual
   */
  async fetchCharacterDetailsFromPage(url: string): Promise<WikiCharacterExtendedDTO> {
    const html = await this.httpClient.get(url);
    const $ = cheerio.load(html);

    // Extrair do infobox
    const bounty = $('.pi-data-label:contains("Bounty")')
      .next('.pi-data-value')
      .text();

    const age = $('.pi-data-label:contains("Age")')
      .next('.pi-data-value')
      .text();

    const affiliation = $('.pi-data-label:contains("Affiliations")')
      .next('.pi-data-value')
      .text();

    return {
      bounty,
      age,
      affiliation,
      // ... outros campos do infobox
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// DTOs
export interface WikiCharacterDTO {
  id: number;
  name: string;
  url: string;
  abstract?: string;
  thumbnail?: {
    url: string;
  };
}

export interface WikiCharacterExtendedDTO extends WikiCharacterDTO {
  bounty?: string;
  age?: string;
  affiliation?: string;
  race?: string;
  gender?: string;
  origin?: string;
}
```

---

## 📊 Frontend: Sempre Lê da Build Ativa

### Repository Pattern

```typescript
// repositories/character.repository.ts

export class CharacterRepository {
  constructor(private pg: Pool) {}

  /**
   * SEMPRE filtra pela build ativa
   */
  async findAll(filters?: CharacterFilters): Promise<Character[]> {
    const result = await this.pg.query(
      `SELECT c.*
       FROM characters c
       INNER JOIN builds b ON c.build_id = b.id
       WHERE b.status = 'ACTIVE'  -- 🔑 Filtro automático
       AND ($1::text IS NULL OR c.affiliation = $1)
       AND ($2::text IS NULL OR c.sea = $2)
       ORDER BY c.current_bounty DESC
       LIMIT $3`,
      [
        filters?.affiliation || null,
        filters?.sea || null,
        filters?.limit || 50,
      ]
    );

    return result.rows;
  }

  /**
   * Buscar por ID
   */
  async findById(id: string): Promise<Character | null> {
    const result = await this.pg.query(
      `SELECT c.*
       FROM characters c
       INNER JOIN builds b ON c.build_id = b.id
       WHERE c.id = $1
       AND b.status = 'ACTIVE'`,
      [id]
    );

    return result.rows[0] || null;
  }

  /**
   * Buscar por nome (fuzzy)
   */
  async searchByName(query: string): Promise<Character[]> {
    const result = await this.pg.query(
      `SELECT c.*
       FROM characters c
       INNER JOIN builds b ON c.build_id = b.id
       WHERE b.status = 'ACTIVE'
       AND (
         c.name ILIKE $1
         OR c.name % $2  -- Similarity search (pg_trgm)
         OR $3 = ANY(c.aliases)
       )
       ORDER BY similarity(c.name, $2) DESC
       LIMIT 20`,
      [`%${query}%`, query, query]
    );

    return result.rows;
  }
}
```

**Conclusão:** Frontend NUNCA precisa saber sobre builds. Sempre lê da build ativa automaticamente! 🎯

---

## 🔧 Configuração do Job (Cron)

### Usando BullMQ (Queue + Scheduler)

```typescript
// infrastructure/jobs/job-scheduler.ts

import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Queue
const wikiIngestionQueue = new Queue('wiki-ingestion', { connection });

// Schedule: todo dia às 3h da manhã
await wikiIngestionQueue.add(
  'daily-sync',
  {},
  {
    repeat: {
      pattern: '0 3 * * *', // Cron: 3h AM todo dia
    },
  }
);

// Worker
const worker = new Worker(
  'wiki-ingestion',
  async (job) => {
    const ingestionJob = container.resolve(WikiIngestionJob);
    await ingestionJob.execute();
  },
  { connection }
);

worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed`, err);
});
```

---

## 📋 Checklist de Ingestão

### O Que Importar da Wiki

- [ ] **Characters** (prioritário)
  - [ ] Nome, aliases, epithet
  - [ ] Bounty (atual + histórico)
  - [ ] Afiliação, tripulação, cargo
  - [ ] Origem (mar, local de nascimento)
  - [ ] Status (vivo/morto)
  - [ ] Fruta do diabo (se tiver)
  - [ ] Haki (tipos)
  - [ ] Imagem
  - [ ] Descrição

- [ ] **Organizations** (médio)
  - [ ] Nome, tipo
  - [ ] Líder
  - [ ] Membros (relacionamento)

- [ ] **Devil Fruits** (médio)
  - [ ] Nome (japonês + inglês)
  - [ ] Tipo (Paramecia, Zoan, Logia)
  - [ ] Usuário atual
  - [ ] Habilidades

- [ ] **Locations** (baixo)
  - [ ] Nome, tipo
  - [ ] Mar/região

- [ ] **Battles** (manual inicialmente)
  - [ ] Batalhas importantes
  - [ ] Resultado, dificuldade

- [ ] **Relationships** (manual inicialmente)
  - [ ] Pode ser difícil extrair automaticamente
  - [ ] Começar com principais manualmente
  - [ ] Automatizar depois com LLM?

---

## 🚨 Tratamento de Erros

### Estratégias

1. **Erros Pontuais** - Continue
   ```typescript
   for (const char of characters) {
     try {
       await ingestCharacter(char);
     } catch (error) {
       logger.error(`Failed to ingest ${char.name}`, error);
       // NÃO pare o job inteiro, continue
     }
   }
   ```

2. **Erros Críticos** - Pare e rollback
   ```typescript
   if (criticalError) {
     await buildService.failBuild(buildId, error);
     await buildService.deleteBuild(buildId); // Opcional
     throw error;
   }
   ```

3. **Rate Limiting** - Retry com backoff
   ```typescript
   async fetchWithRetry(url: string, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fetch(url);
       } catch (error) {
         if (i === maxRetries - 1) throw error;

         const delay = Math.pow(2, i) * 1000; // Exponential backoff
         await sleep(delay);
       }
     }
   }
   ```

---

## 📈 Monitoramento da Ingestão

### Métricas a Monitorar

```typescript
// Logs estruturados
logger.info('Wiki ingestion started', {
  buildId: build.id,
  timestamp: new Date(),
});

logger.info('Characters ingested', {
  buildId: build.id,
  successCount: 1234,
  errorCount: 5,
  duration: '3m 42s',
});

logger.info('Build promoted', {
  buildId: build.id,
  previousBuildId: previousBuild.id,
  charactersAdded: 11,
  charactersUpdated: 45,
});
```

### Dashboard (Grafana)

Queries úteis:
- Duração do job ao longo do tempo
- Taxa de sucesso/erro
- Quantidade de dados por build
- Tempo entre builds

---

## 🎯 Resumo

### Como Funciona

1. **Job roda diariamente** (3h AM)
2. **Cria nova build** (status: BUILDING)
3. **Popular dados** da wiki com `build_id = nova_build`
4. **Valida** integridade
5. **Promove** para ACTIVE (antiga vira ARCHIVED)
6. **Frontend** continua lendo normalmente (sempre da ACTIVE)

### Vantagens

- ✅ **Dados consistentes** - Ou tudo ou nada
- ✅ **Rollback fácil** - Deletar build que falhou
- ✅ **Histórico** - Builds antigas ficam arquivadas
- ✅ **Zero downtime** - Frontend não vê dados pela metade
- ✅ **Simples** - Só uma FK `build_id` em cada tabela

### Trade-offs

- ⚠️ Duplicação temporária de dados (builds antigas)
- ⚠️ Precisa cleanup periódico
- ⚠️ FK em todas as tabelas

---

**Última atualização:** 2026-01-09
