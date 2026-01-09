## 🕸️ **Neo4j**

**O que é:** Banco de dados de grafos nativo (graph database).

**Por que usar:**
- **Otimizado para relacionamentos:** Queries de grafo são MUITO mais rápidas que SQL com JOINs
- **Cypher Query Language:** Linguagem declarativa para grafos (intuitiva)
- **Visualização nativa:** Interface gráfica para explorar dados
- **Escalável:** Usado por Walmart, eBay, NASA

**Conceitos:**
- **Nós (Nodes):** Entidades (ex: Personagens, Organizações)
- **Relacionamentos (Edges):** Conexões tipadas (ex: "MEMBRO_DE", "DERROTOU")
- **Propriedades:** Dados nos nós e relacionamentos

**Exemplo de modelo:**
```
(Luffy:Character {name: "Monkey D. Luffy", bounty: 3000000000})
  -[:MEMBER_OF]->
(StrawHats:Organization {name: "Straw Hat Pirates"})

(Luffy)-[:DEFEATED {difficulty: 5}]->(Kaido:Character)
```

**Exemplo de Query (Cypher):**
```cypher
// Encontrar caminho mais curto entre Luffy e Shanks
MATCH path = shortestPath(
  (luffy:Character {name: "Luffy"})-[*]-(shanks:Character {name: "Shanks"})
)
RETURN path

// Quem derrotou mais de 5 personagens?
MATCH (c:Character)-[d:DEFEATED]->()
WITH c, count(d) as victories
WHERE victories > 5
RETURN c.name, victories
ORDER BY victories DESC
```

**Por que é diferente de SQL:**

```sql
-- PostgreSQL (JOINs ficam lentos com muitos níveis)
SELECT c1.name, c2.name, c3.name
FROM characters c1
JOIN relationships r1 ON r1.from = c1.id
JOIN characters c2 ON r2.to = c2.id
JOIN relationships r2 ON r2.from = c2.id
JOIN characters c3 ON r3.to = c3.id
-- Imagine 6+ níveis... 💀
```

```cypher
-- Neo4j (natural e RÁPIDO para grafos)
MATCH path = (luffy:Character {name: "Luffy"})-[*..6]-(shanks:Character {name: "Shanks"})
RETURN path
LIMIT 1
```

**Quando usar:**
- ✅ Dados altamente conectados (redes sociais, grafos de conhecimento)
- ✅ Queries de caminho (pathfinding, recomendações)
- ✅ Análises de centralidade, clusters
- ❌ CRUD simples sem relacionamentos (use PostgreSQL)

**Para o projeto:** **ESSENCIAL** - Pathfinding seria lento demais em SQL, análises de centralidade impossíveis em SQL tradicional.

**Alternativas:**
- **Amazon Neptune:** Gerenciado AWS (mais caro)
- **ArangoDB:** Multi-modelo (documento + grafo)
- **PostgreSQL com extensão AGE:** Grafo sobre SQL (menos performático, não recomendado)

**Status no MVP:** ✅ **NECESSÁRIO** - Neo4j é essencial para o core do projeto.

---

## 🐂 **BullMQ**

**O que é:** Sistema de filas (queue) baseado em Redis para processar jobs em background.

**Por que usar:**
- **Reliable:** Garante que jobs não sejam perdidos
- **Retry logic:** Reprocessa automaticamente em caso de falha
- **Delayed jobs:** Agendar para futuro
- **Concurrency:** Processa múltiplos jobs em paralelo
- **Monitoring:** Dashboard para acompanhar filas

**Casos de uso no projeto:**
1. **Outbox Pattern:** Processar eventos do banco e sincronizar com Neo4j (dual-write Postgres + Neo4j)
2. **Jobs agendados:** Sync da wiki diário
3. **Tarefas pesadas:** Recalcular power scores em batch
4. **Notificações:** Enviar emails quando usuário desbloqueia conquistas

**Exemplo prático do problema que resolve:**

```typescript
// Sem BullMQ (problema!)
async createCharacter(data) {
  await postgres.insert(data);  // ✅ Sucesso
  await neo4j.create(data);     // ❌ Falha! Dados inconsistentes!
}

// Com BullMQ (solução!)
async createCharacter(data) {
  await postgres.transaction(async tx => {
    await tx.insert(data);
    await tx.outbox.add({ event: 'character.created', data }); // ✅
  });
  // Worker BullMQ processa outbox e sincroniza com Neo4j
}
```

**Exemplo de implementação:**
```typescript
import { Queue, Worker } from 'bullmq'

// Producer: Adiciona job na fila
const queue = new Queue('sync-to-neo4j', { connection: redisConfig })

await queue.add('sync-character', { 
  characterId: 'luffy-123',
  action: 'create' 
})

// Consumer: Processa jobs em background
const worker = new Worker('sync-to-neo4j', async (job) => {
  console.log(`Processing job ${job.id}`)
  const { characterId, action } = job.data
  
  // Sincronizar com Neo4j
  await neo4j.run(`CREATE (c:Character {id: $id})`, { id: characterId })
}, { connection: redisConfig })

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed!`)
})

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err)
})
```

**Fluxo típico:**
```
[API recebe request] 
  → Salva no PostgreSQL
  → Adiciona evento no Outbox
  → Worker BullMQ processa Outbox
  → Sincroniza com Neo4j
  → Marca evento como processado
```

**Alternativas mais simples:**
- **Cron jobs:** OK para MVP, mas não garante processamento
- **Callbacks diretos:** Risco de inconsistência

**Para o projeto:** 
- 🤔 **OPCIONAL no início** - Você pode fazer dual-write direto inicialmente
- ✅ **IMPORTANTE depois** - Quando tiver mais usuários, BullMQ garante confiabilidade

**Status no MVP:** ⏸️ **Fase 2** - Adicionar quando implementar sistema de builds automático.

---

## 🔍 **Qdrant vs PostgreSQL pgvector**

**O que é Qdrant:** Banco de dados vetorial (vector database) otimizado para embeddings de IA.

**O que é pgvector:** Extensão do PostgreSQL para armazenar e buscar vetores.

### Comparação

| Aspecto | pgvector | Qdrant |
|---------|----------|--------|
| **Performance** | 🐢 Lento com >100k vetores | ⚡ Rápido até milhões |
| **Índices** | IVFFlat (aproximado, perde qualidade) | HNSW (melhor qualidade + performance) |
| **Filtros** | ⚠️ Lento (WHERE + vector search) | ✅ Otimizado (filtros antes da busca) |
| **Memória** | ❌ Come muita RAM | ✅ Otimizado |
| **Setup** | 🔧 Requer tuning | ✅ Funciona out-of-box |
| **Vantagem** | ✅ Um banco a menos (tudo no Postgres) | ✅ Performance 10-20x melhor |

### Exemplo prático da diferença:

```typescript
// Cenário: Buscar "textos sobre Luffy" APENAS do arco Wano

// pgvector (LENTO - busca TODOS os vetores, depois filtra)
SELECT * FROM embeddings
WHERE arc = 'Wano'  -- Filter DEPOIS da vector search
ORDER BY embedding <=> $queryEmbedding
LIMIT 5;
// Tempo: ~500ms com 100k vetores

// Qdrant (RÁPIDO - filtra ANTES da vector search)
await qdrant.search('wiki', {
  vector: queryEmbedding,
  filter: { must: [{ key: 'arc', match: { value: 'Wano' } }] },
  limit: 5
});
// Tempo: ~50ms com 1M vetores
```

**Como funciona (RAG - Retrieval Augmented Generation):**

1. **Indexação (uma vez):**
```typescript
import { QdrantClient } from '@qdrant/js-client-rest'
import OpenAI from 'openai'

const qdrant = new QdrantClient({ url: 'http://localhost:6333' })
const openai = new OpenAI()

// 1. Pegar texto da wiki
const wikiText = `
Monkey D. Luffy é o capitão dos Piratas do Chapéu de Palha.
Ele comeu a Gomu Gomu no Mi e se tornou um homem-borracha.
Seu sonho é ser o Rei dos Piratas.
`

// 2. Gerar embedding (vetor de 1536 dimensões)
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: wikiText
})

// 3. Armazenar no Qdrant
await qdrant.upsert('one-piece-wiki', {
  points: [{
    id: 'luffy-bio',
    vector: embedding.data[0].embedding, // [0.123, -0.456, 0.789, ...]
    payload: { 
      text: wikiText,
      character: 'Luffy',
      source: 'wiki',
      chapter: 1
    }
  }]
})
```

2. **Busca (em cada pergunta do usuário):**
```typescript
// Usuário pergunta: "Quem é o capitão dos chapéus de palha?"
const questionEmbedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: 'Quem é o capitão dos chapéus de palha?'
})

// Buscar textos similares
const results = await qdrant.search('one-piece-wiki', {
  vector: questionEmbedding.data[0].embedding,
  limit: 5,
  with_payload: true
})

// Usar esses textos como contexto para a LLM
const context = results.map(r => r.payload.text).join('\n\n')
const answer = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: `Use este contexto:\n${context}` },
    { role: 'user', content: 'Quem é o capitão dos chapéus de palha?' }
  ]
})
```

**Usando pgvector (alternativa):**

```sql
-- Habilitar extensão
CREATE EXTENSION vector;

-- Criar tabela com embeddings
CREATE TABLE embeddings (
  id UUID PRIMARY KEY,
  text TEXT,
  arc TEXT,
  embedding vector(1536)  -- OpenAI embeddings são 1536 dimensões
);

-- Criar índice
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops);

-- Buscar similaridade
SELECT text, 
       1 - (embedding <=> '[0.1, 0.2, ...]') AS similarity
FROM embeddings
WHERE arc = 'Wano'  -- Filtro (lento!)
ORDER BY embedding <=> '[0.1, 0.2, ...]'
LIMIT 5;
```

**Benchmarks Reais:**

### Vector Search (100k embeddings):
```
pgvector:    ~300ms  ⚠️
Qdrant:      ~30ms   ⚡ (10x mais rápido!)
```

### Vector Search com filtros (100k embeddings):
```
pgvector:    ~800ms  ❌ (filtra depois)
Qdrant:      ~40ms   ⚡ (filtra antes, 20x mais rápido!)
```

**Para o projeto:**
- ❌ **NÃO NECESSÁRIO no MVP** - Seu plano MVP usa "contexto simples" (buscar chars no Postgres e passar descrição como contexto)
- ✅ **Fase 2+** - Quando quiser RAG completo com conhecimento da wiki

**Alternativa no MVP:** Buscar personagens no Postgres e passar descrição como contexto (já funciona bem!)

**Decisão:**
- **MVP:** Não precisa de vector DB ainda
- **Fase 2 RAG:** Começar com **pgvector** (ver se performa bem, até ~50k documentos)
- **Fase 3:** Se pgvector ficar lento, migrar para **Qdrant** (melhor para >100k documentos + filtros complexos)

**Status no MVP:** ⏸️ **Fase 3+** - Não precisa no MVP. Adicionar quando quiser RAG avançado com wiki.

---

## 🔎 **Typesense vs PostgreSQL pg_trgm**

**O que é Typesense:** Motor de busca full-text ultrarrápido (alternativa ao Elasticsearch).

**O que é pg_trgm:** Extensão do PostgreSQL para busca fuzzy (tolerante a typos).

### Comparação

**PostgreSQL com pg_trgm:**
```sql
CREATE EXTENSION pg_trgm;

-- Busca fuzzy (tolera typos)
SELECT * FROM characters 
WHERE name % 'lufy'  -- Encontra "Luffy"
ORDER BY similarity(name, 'lufy') DESC;
```

**O que pg_trgm faz:**
- ✅ Busca com typos (fuzzy matching)
- ✅ Ranking por similaridade
- ✅ Performance OK até ~100k registros
- ✅ Suficiente para MVP com 100-1000 personagens

**Onde Typesense é melhor:**
- ⚡ **Performance** - 10-100x mais rápido em datasets grandes
- 🎯 **Faceted search** - Filtros complexos (ex: "piratas do East Blue com bounty > 1M")
- 📊 **Ranking avançado** - Algoritmos de relevância mais sofisticados
- 🔧 **Configuração zero** - Já vem otimizado, no Postgres você precisa tunar

**Exemplo com Typesense:**
```typescript
import Typesense from 'typesense'

const client = new Typesense.Client({
  nodes: [{ host: 'localhost', port: '8108', protocol: 'http' }],
  apiKey: 'xyz'
})

// Buscar (com typo!)
const results = await client.collections('characters')
  .documents()
  .search({
    q: 'Monky Lufy',  // Typo!
    query_by: 'name',
    filter_by: 'bounty:>1000000000',
    facet_by: 'affiliation'
  })
```

**Implementação com pg_trgm no MVP:**

```sql
-- Migration
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_characters_name_trgm 
ON characters USING gin(name gin_trgm_ops);
```

```typescript
// repository
async searchByName(query: string): Promise<Character[]> {
  const result = await this.pg.query(
    `SELECT * FROM characters
     WHERE name % $1  -- Similarity search
     OR name ILIKE $2 -- Fallback
     ORDER BY similarity(name, $1) DESC
     LIMIT 20`,
    [query, `%${query}%`]
  );
  
  return result.rows;
}

// Funciona com typos!
await repo.searchByName('lufy');    // ✅ Encontra "Luffy"
await repo.searchByName('zoro');    // ✅ Encontra "Roronoa Zoro"
await repo.searchByName('dofla');   // ✅ Encontra "Doflamingo"
```

**Benchmarks Reais:**

### Busca Fuzzy (1000 chars):
```
pg_trgm:     ~20ms  ✅
Typesense:   ~5ms   ⚡ (4x mais rápido, mas não faz diferença para usuário)
```

**Para o projeto:**
- ❌ **NÃO NECESSÁRIO no MVP** - Postgres com extensão `pg_trgm` já faz fuzzy search
- ✅ **Futuro** - Quando tiver 2000+ personagens e precisar de performance

**Alternativa no MVP:** PostgreSQL com `pg_trgm` (suficiente para MVP)

**Decisão:**
- **MVP:** Usar **pg_trgm** (suficiente para 100-1000 chars)
- **Fase 3+:** Se tiver >10k chars E pg_trgm ficar lento, adicionar **Typesense**

**Status no MVP:** ⏸️ **Fase 3+** - Use Postgres fuzzy search no MVP. Adicionar Typesense/Elasticsearch na Fase 3 se precisar.

---

## 🎯 Resumo Comparativo

| Tecnologia | Propósito | Status MVP | Quando Adicionar | Alternativa no MVP |
|------------|-----------|------------|------------------|-------------------|
| **Neo4j** | Graph database | ✅ **NECESSÁRIO** | Agora | PostgreSQL AGE (não recomendado) |
| **BullMQ** | Job queue | ⏸️ **Fase 2** | Sistema de builds automático | Dual-write direto (menos confiável) |
| **Qdrant** | Vector database | ⏸️ **Fase 3+** | RAG avançado com wiki | pgvector (até ~50k docs) |
| **Typesense** | Search engine | ⏸️ **Fase 3+** | >10k chars + performance | pg_trgm (suficiente para MVP) |

---

## 📦 Stack Recomendada para MVP

### ✅ O que usar AGORA:

```yaml
# docker-compose.yml
✅ PostgreSQL 16     # Dados estruturados + pg_trgm (fuzzy search)
✅ Neo4j 5          # Grafo de relacionamentos
✅ Redis 7          # Cache de IA

# Framework
✅ Fastify          # Web framework (já decidido)

# Busca
✅ PostgreSQL pg_trgm  # Fuzzy search (suficiente para MVP)

# IA
✅ DeepSeek/OpenAI  # LLM direto (sem RAG complexo)
```

### ⏸️ Adicionar DEPOIS (Fase 2+):

```yaml
⏸️ BullMQ          # Quando tiver sistema de builds automático
⏸️ pgvector        # Quando quiser RAG simples (até ~50k docs)
⏸️ Qdrant          # Quando quiser RAG avançado (>100k docs ou filtros complexos)
⏸️ Typesense       # Quando tiver 1000+ chars e precisar de mais performance
```

---

## 📚 Para Aprender Mais

**Neo4j:**
- Sandbox gratuito: https://sandbox.neo4j.com
- Aprenda Cypher: https://neo4j.com/graphacademy/online-training/introduction-to-neo4j/
- Visualize exemplos: https://neo4j.com/developer/example-data/

**BullMQ:**
- Docs: https://docs.bullmq.io
- Tutorial: https://blog.logrocket.com/bullmq-task-queue-node/

**Qdrant:**
- Quickstart: https://qdrant.tech/documentation/quick-start/
- RAG tutorial: https://qdrant.tech/articles/rag-is-dead/

**PostgreSQL pgvector:**
- Docs: https://github.com/pgvector/pgvector
- Tutorial: https://supabase.com/docs/guides/ai/vector-columns

**PostgreSQL pg_trgm:**
- Docs: https://www.postgresql.org/docs/current/pgtrgm.html
- Tutorial: https://www.postgresql.org/docs/current/pgtrgm.html#PGTRGM-OP-TABLE

**Typesense:**
- Guide: https://typesense.org/docs/guide/
- Demo: https://songs-search.typesense.org (busque músicas)

---
