## 🔥 **Hono**

**O que é:** Framework web minimalista e ultrarrápido para edge computing (CloudFlare Workers, Deno, Bun, Node.js).

**Por que usar:**
- **Extremamente leve:** ~12KB (vs Express ~200KB)
- **Super rápido:** Otimizado para V8 engine
- **Multi-runtime:** Funciona em Bun, Node, Deno, CloudFlare Workers
- **Syntax moderna:** Similar ao Express mas melhor tipado

**Exemplo:**
```typescript
import { Hono } from 'hono'

const app = new Hono()

app.get('/characters/:id', (c) => {
  const id = c.req.param('id')
  return c.json({ id, name: 'Luffy' })
})

export default app // No Bun: bun run server.ts
```

**Alternativas:**
- **Express:** Mais tradicional, mas pesado
- **Fastify:** Rápido, mas só Node.js
- **tRPC:** Se quiser type-safety end-to-end

**Para o projeto:** Perfeito para APIs REST leves e rápidas no Bun.

---

## 🕸️ **Neo4j**

**O que é:** Banco de dados de grafos nativo (graph database).

**Por que usar:**
- **Otimizado para relacionamentos:** Queries de grafo são MUITO mais rápidas que SQL com JOINs
- **Cypher Query Language:** Linguagem declarativa para grafos (intuitiva)
- **Visualização nativa:** Interface gráfica para explorar dados
- **Escalável:** Usado por Walmart, eBay, NASA

**Conceitos:**
- **Nós (Nodes):** Entidades (ex: Personagens, Organizações)
- **Relacionamentos (Edges):** Conexões tipadas (ex: \"MEMBRO_DE\", \"DERROTOU\")
- **Propriedades:** Dados nos nós e relacionamentos

**Exemplo de modelo:**
```
(Luffy:Character {name: \"Monkey D. Luffy\", bounty: 3000000000})
  -[:MEMBER_OF]->
(StrawHats:Organization {name: \"Straw Hat Pirates\"})

(Luffy)-[:DEFEATED {difficulty: 5}]->(Kaido:Character)
```

**Exemplo de Query (Cypher):**
```cypher
// Encontrar caminho mais curto entre Luffy e Shanks
MATCH path = shortestPath(
  (luffy:Character {name: \"Luffy\"})-[*]-(shanks:Character {name: \"Shanks\"})
)
RETURN path

// Quem derrotou mais de 5 personagens?
MATCH (c:Character)-[d:DEFEATED]->()
WITH c, count(d) as victories
WHERE victories > 5
RETURN c.name, victories
ORDER BY victories DESC
```

**Quando usar:**
- ✅ Dados altamente conectados (redes sociais, grafos de conhecimento)
- ✅ Queries de caminho (pathfinding, recomendações)
- ✅ Análises de centralidade, clusters
- ❌ CRUD simples sem relacionamentos (use PostgreSQL)

**Para o projeto:** **Essencial** para pathfinding, análises de centralidade, exploração de conexões.

**Alternativas:**
- **Amazon Neptune:** Gerenciado AWS (mais caro)
- **ArangoDB:** Multi-modelo (documento + grafo)
- **PostgreSQL com extensão AGE:** Grafo sobre SQL (menos performático)

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
1. **Outbox Pattern:** Processar eventos do banco e sincronizar com Neo4j
2. **Notificações:** Enviar emails quando usuário desbloqueia conquistas
3. **Cálculos pesados:** Recalcular power levels em batch
4. **Scrapers:** Buscar dados da wiki periodicamente

**Exemplo:**
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

**Alternativas:**
- **Kafka:** Para streams massivos (overkill para MVP)
- **RabbitMQ:** Mais complexo
- **AWS SQS:** Gerenciado (vendor lock-in)

**Para o projeto:** Crítico para garantir consistência entre PostgreSQL e Neo4j (Outbox Pattern).

---

## 🔍 **Qdrant**

**O que é:** Banco de dados vetorial (vector database) otimizado para embeddings de IA.

**Por que usar:**
- **Busca por similaridade:** Encontra textos semanticamente similares
- **Rápido:** Otimizado para operações vetoriais
- **Filtros:** Combina busca vetorial com filtros tradicionais
- **Open-source:** Auto-hospedável

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
// Usuário pergunta: \"Quem é o capitão dos chapéus de palha?\"
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

// Resultado:
// [
//   { score: 0.95, payload: { text: \"Luffy é o capitão...\", chapter: 1 } },
//   { score: 0.82, payload: { text: \"Os chapéus de palha...\", chapter: 2 } }
// ]

// Usar esses textos como contexto para a LLM
const context = results.map(r => r.payload.text).join('\
\
')
const answer = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'system', content: `Use este contexto:\
${context}` },
    { role: 'user', content: 'Quem é o capitão dos chapéus de palha?' }
  ]
})
```

**Diagrama do fluxo RAG:**
```
[Usuário pergunta] 
  → Gera embedding da pergunta
  → Busca no Qdrant textos similares
  → Monta contexto
  → Envia para GPT-4
  → GPT responde com base no contexto
```

**Alternativas:**
- **Pinecone:** Gerenciado, mais fácil (mas pago)
- **Weaviate:** Mais features (mas mais complexo)
- **ChromaDB:** Simples, mas menos performático
- **PostgreSQL pgvector:** Se já usa Postgres (menos otimizado)

**Para o projeto:** Permite a IA responder perguntas sobre One Piece usando conhecimento da wiki, não apenas dados estruturados do grafo.

---

## 🔎 **Typesense**

**O que é:** Motor de busca full-text ultrarrápido (alternativa ao Elasticsearch).

**Por que usar:**
- **Mais rápido que Elasticsearch:** Typo-tolerance em <50ms
- **Mais fácil:** Setup em minutos vs horas
- **Menos recursos:** Roda bem com 1GB RAM
- **Typo-tolerant:** \"Monky D. Lufy\" → \"Monkey D. Luffy\"
- **Faceted search:** Filtros por categoria

**Exemplo:**
```typescript
import Typesense from 'typesense'

const client = new Typesense.Client({
  nodes: [{ host: 'localhost', port: '8108', protocol: 'http' }],
  apiKey: 'xyz'
})

// 1. Criar collection
await client.collections().create({
  name: 'characters',
  fields: [
    { name: 'name', type: 'string' },
    { name: 'affiliation', type: 'string', facet: true },
    { name: 'bounty', type: 'int32', facet: true },
    { name: 'devil_fruit', type: 'string', optional: true }
  ]
})

// 2. Indexar personagens
await client.collections('characters').documents().create({
  name: 'Monkey D. Luffy',
  affiliation: 'Straw Hat Pirates',
  bounty: 3000000000,
  devil_fruit: 'Gomu Gomu no Mi'
})

// 3. Buscar (com typo!)
const results = await client.collections('characters')
  .documents()
  .search({
    q: 'Monky Lufy',  // Typo!
    query_by: 'name',
    filter_by: 'bounty:>1000000000',
    facet_by: 'affiliation'
  })

// Resultado:
// {
//   hits: [
//     { document: { name: 'Monkey D. Luffy', bounty: 3000000000 } }
//   ],
//   facet_counts: [
//     { 'Straw Hat Pirates': 10, 'Beast Pirates': 5, ... }
//   ]
// }
```

**Quando usar:**
- ✅ Busca autocomplete rápida
- ✅ Busca com typos
- ✅ Filtros facetados (ex: filtrar por afiliação + bounty)
- ❌ Full-text search complexo (use Elasticsearch)

**Para o projeto:** Barra de busca do frontend, autocompletar personagens, filtros.

**Alternativas:**
- **Elasticsearch:** Mais poderoso, mas muito mais pesado
- **MeiliSearch:** Similar, também bom
- **Algolia:** Gerenciado, muito bom (mas caro)
- **PostgreSQL full-text:** Funciona, mas menos features

---

## 🎯 Resumo Comparativo

| Tecnologia | Propósito | Quando Usar | Alternativa Mais Simples |
|------------|-----------|-------------|-------------------------|
| **Hono** | Web framework | APIs REST leves e rápidas | Express (mais pesado) |
| **Neo4j** | Graph database | Dados altamente conectados, pathfinding | PostgreSQL (menos eficiente para grafos) |
| **BullMQ** | Job queue | Processar tarefas em background, garantir consistência | Cron jobs (menos confiável) |
| **Qdrant** | Vector database | RAG, busca semântica para IA | Pinecone (gerenciado/pago) |
| **Typesense** | Search engine | Busca full-text rápida com typos | PostgreSQL full-text (menos features) |

---

## 📚 Para Aprender Mais

**Hono:**
- Docs: https://hono.dev
- Tutorial: Muito similar ao Express

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

**Typesense:**
- Guide: https://typesense.org/docs/guide/
- Demo: https://songs-search.typesense.org (busque músicas)

---