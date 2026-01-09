# 🎯 Plano MVP
## One Piece Knowledge Graph Explorer

---

## 💡 Definição de MVP

**MVP (Minimum Viable Product):** A menor versão do produto que entrega valor real aos usuários e permite validar a ideia principal.

### Para este projeto, o MVP deve responder:

1. ✅ "É útil consultar informações de One Piece em formato de grafo?"
2. ✅ "A IA consegue responder perguntas de forma satisfatória?"
3. ✅ "O sistema de pathfinding entre personagens é interessante?"

---

## 🎯 Escopo do MVP

### ✅ O Que ENTRA no MVP

#### 1. **Backend - API Básica**
- [x] CRUD de Characters
- [x] Busca simples (por nome)
- [x] Pathfinding básico (shortest path entre 2 personagens)
- [x] Ego network (conexões diretas de 1 personagem)

#### 2. **Dados Mínimos**
- [x] ~100 personagens principais (manual/semi-automático)
- [x] Relacionamentos básicos (crew, family, rival, defeated)
- [x] Bounties atuais (não histórico completo)
- [x] Informações essenciais (name, affiliation, description)

#### 3. **Grafo (Neo4j)**
- [x] Nós de Character
- [x] 4 tipos de relacionamento principais:
  - CREW_MEMBER
  - SIBLING_OF
  - DEFEATED
  - ALLIED_WITH

#### 4. **IA/Chat (Básico)**
- [x] Perguntas simples sobre personagens
- [x] Pathfinding via chat ("Como Luffy conhece Shanks?")
- [x] Cache de respostas
- [ ] ~~RAG completo~~ (Fase 2)
- [ ] ~~Vector DB~~ (Fase 2)

#### 5. **Infraestrutura**
- [x] Docker Compose (Postgres + Neo4j + Redis)
- [x] Migrations básicas
- [x] Logs simples (Winston)
- [ ] ~~Monitoramento~~ (Fase 2)

---

### ❌ O Que FICA DE FORA do MVP

#### Features Complexas (Fase 2+)
- ❌ Sistema de Builds completo (ingestão automática)
- ❌ Power Score System (cálculo de força)
- ❌ Battle System (registro de batalhas)
- ❌ Organizations completas
- ❌ Locations/Arcs
- ❌ Devil Fruits completos
- ❌ Análises avançadas (centralidade, comunidades)
- ❌ Sistema de usuários/autenticação
- ❌ Favoritos, coleções
- ❌ Gamificação

#### Dados Completos (Fase 2+)
- ❌ 2000+ personagens (apenas ~100 no MVP)
- ❌ Histórico de bounties
- ❌ Haki detalhado
- ❌ Batalhas registradas

#### Infraestrutura Avançada (Fase 2+)
- ❌ Elasticsearch/Typesense
- ❌ Vector DB (Pinecone/Qdrant)
- ❌ RAG completo
- ❌ Embeddings
- ❌ Grafana
- ❌ CI/CD

---

## 📊 Escopo Técnico Detalhado

### 1. Database (Postgres)

**Tabelas no MVP:**

```sql
-- Apenas o essencial
✅ builds (simples)
✅ characters (campos básicos)
❌ bounty_history (só current_bounty)
❌ devil_fruits (opcional, pode adicionar depois)
❌ organizations (apenas nome no character.crew)
❌ locations
❌ battles
❌ users (Fase 2)
❌ ai_conversations (Fase 2)
```

**Schema Simplificado para MVP:**

```sql
-- Builds (simples)
CREATE TABLE builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Characters (campos essenciais)
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID REFERENCES builds(id),

  -- Essencial
  name VARCHAR(255) NOT NULL,
  aliases TEXT[],
  epithet VARCHAR(255),

  -- Básico
  affiliation VARCHAR(50),
  crew VARCHAR(255),
  current_bounty BIGINT DEFAULT 0,

  -- Descrição
  description TEXT,
  image_url TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_characters_name ON characters(name);
CREATE INDEX idx_characters_build ON characters(build_id);
CREATE INDEX idx_characters_bounty ON characters(current_bounty DESC);
```

### 2. Neo4j (Grafo Simples)

**Modelo Básico:**

```cypher
// Apenas Character nodes
(:Character {
  id: UUID,
  name: String
})

// 4 tipos de relacionamento
(:Character)-[:CREW_MEMBER]->(:Character)
(:Character)-[:SIBLING_OF]->(:Character)
(:Character)-[:DEFEATED]->(:Character)
(:Character)-[:ALLIED_WITH]->(:Character)
```

### 3. API Endpoints (Mínimos)

```
GET  /api/characters              # Lista (paginated)
GET  /api/characters/:id          # Detalhes
GET  /api/characters/search?q=    # Busca por nome

GET  /api/graph/path              # Shortest path entre 2
  ?from=luffy-id&to=shanks-id

GET  /api/graph/network/:id       # Ego network (depth 1)
  ?depth=1

POST /api/ai/ask                  # Pergunta à IA
  body: { question: "..." }
```

### 4. IA/Chat (Simplificado)

**Sem RAG completo:**

```typescript
// Abordagem simples para MVP
async ask(question: string): Promise<AIResponse> {
  // 1. Extrair nomes mencionados (regex simples)
  const names = this.extractNames(question);

  // 2. Buscar personagens do banco
  const characters = await this.characterRepo.findByNames(names);

  // 3. Se pergunta sobre path, usar Neo4j
  if (question.includes('conexão') || question.includes('conhece')) {
    const path = await this.neo4j.findPath(names[0], names[1]);
    return this.formatPathResponse(path);
  }

  // 4. Montar contexto simples
  const context = characters.map(c =>
    `${c.name}: ${c.description}`
  ).join('\n');

  // 5. LLM com contexto
  const prompt = `
    Contexto:
    ${context}

    Pergunta: ${question}

    Responda de forma concisa.
  `;

  const response = await this.llm.complete(prompt);

  return { text: response, characters };
}
```

**Sem:**
- ❌ Vector DB
- ❌ Embeddings
- ❌ RAG complexo
- ❌ Reranking

**Com:**
- ✅ Contexto simples do Postgres
- ✅ Pathfinding do Neo4j
- ✅ Cache Redis
- ✅ LLM (DeepSeek/OpenAI)

---

## 🗓️ Cronograma do MVP

### Fase 1: Setup (Semana 1)
**Objetivo:** Ambiente funcionando

- [x] Inicializar projeto Bun + TypeScript
- [x] Docker Compose (Postgres + Neo4j + Redis)
- [x] Estrutura de pastas
- [x] Setup de testes (Jest)
- [x] Migrations básicas

**Entregável:** `docker-compose up` funciona

---

### Fase 2: Fundação (Semana 2)
**Objetivo:** CRUD básico funcionando

- [x] Character Repository (Postgres + Neo4j dual-write)
- [x] Character Service
- [x] Character Controller
- [x] Testes unitários

**Entregável:**
```bash
POST /api/characters   # Criar
GET  /api/characters   # Listar
GET  /api/characters/1 # Ver detalhes
```

---

### Fase 3: Grafo Básico (Semana 3)
**Objetivo:** Pathfinding e Ego Network

- [x] Pathfinding Service
- [x] Neo4j queries (shortest path)
- [x] Ego network queries
- [x] API de grafo

**Entregável:**
```bash
GET /api/graph/path?from=luffy&to=shanks
# Retorna: [Luffy, Ace, Whitebeard, Shanks]

GET /api/graph/network/luffy?depth=1
# Retorna: Nós e edges conectados
```

---

### Fase 4: Dados Iniciais (Semana 4)
**Objetivo:** Popula banco com ~100 personagens

- [x] Script de seed manual
- [x] 100 personagens principais
- [x] Relacionamentos básicos (crew, family, defeated)
- [x] Validação de dados

**Entregável:** Banco populado com dados reais

**Personagens Prioritários:**
```
Chapéus de Palha (10):
- Luffy, Zoro, Nami, Usopp, Sanji, Chopper, Robin, Franky, Brook, Jinbe

Yonkou + Comandantes (~20):
- Shanks, Big Mom, Kaido, Barba Negra
- Marco, Katakuri, King, etc

Marinha (~15):
- Garp, Sengoku, Akainu, Kizaru, Aokiji, Smoker, Koby

Revolucionários (~5):
- Dragon, Sabo, Ivankov

Outros Importantes (~50):
- Ace, Law, Kid, Mihawk, Doflamingo, Crocodile, etc
```

---

### Fase 5: IA/Chat Básico (Semana 5)
**Objetivo:** IA responde perguntas simples

- [x] LLM Client (DeepSeek/OpenAI)
- [x] AI Service (contexto simples)
- [x] Cache de respostas (Redis)
- [x] API de chat

**Entregável:**
```bash
POST /api/ai/ask
{
  "question": "Quem é Luffy?"
}

# Resposta:
{
  "text": "Luffy é o capitão dos...",
  "characters": ["luffy-id"]
}
```

---

### Fase 6: Polish e Testes (Semana 6)
**Objetivo:** MVP estável e testado

- [x] Testes de integração
- [x] Documentação básica (README)
- [x] Error handling
- [x] Logs estruturados
- [x] Docker images otimizadas

**Entregável:** MVP pronto para demo!

---

## 🧪 Critérios de Sucesso do MVP

### Funcional
- [ ] Listar 100 personagens
- [ ] Buscar por nome funciona
- [ ] Shortest path entre qualquer par de personagens
- [ ] Ego network mostra conexões diretas
- [ ] IA responde perguntas básicas
- [ ] IA usa pathfinding quando relevante

### Técnico
- [ ] API responde em <500ms (queries simples)
- [ ] Pathfinding em <2s
- [ ] IA responde em <5s
- [ ] 70%+ cobertura de testes
- [ ] Zero crashes em 1h de uso

### Qualidade
- [ ] Código limpo e documentado
- [ ] Logs úteis
- [ ] Erros tratados gracefully
- [ ] README com instruções de setup

---

## 📊 Dados do MVP

### Estrutura Mínima

```
100 personagens
├─ 10 Chapéus de Palha
├─ 25 Yonkou + comandantes
├─ 15 Marinha
├─ 5 Revolucionários
└─ 45 Outros importantes

~300 relacionamentos
├─ ~50 CREW_MEMBER
├─ ~30 SIBLING_OF / PARENT_OF
├─ ~120 DEFEATED
└─ ~100 ALLIED_WITH
```

### Exemplo de Dados

```typescript
// characters-seed.ts

const characters = [
  {
    name: 'Monkey D. Luffy',
    aliases: ['Mugiwara', 'Straw Hat'],
    epithet: 'Straw Hat',
    affiliation: 'PIRATE',
    crew: 'Straw Hat Pirates',
    currentBounty: 3_000_000_000,
    description: 'Capitão dos Piratas do Chapéu de Palha...',
    imageUrl: 'https://...',
  },
  {
    name: 'Roronoa Zoro',
    aliases: ['Pirate Hunter'],
    epithet: 'Pirate Hunter',
    affiliation: 'PIRATE',
    crew: 'Straw Hat Pirates',
    currentBounty: 1_111_000_000,
    description: 'Espadachim dos Chapéus de Palha...',
    imageUrl: 'https://...',
  },
  // ... 98 mais
];

const relationships = [
  { from: 'luffy', to: 'zoro', type: 'CREW_MEMBER' },
  { from: 'luffy', to: 'ace', type: 'SIBLING_OF' },
  { from: 'luffy', to: 'kaido', type: 'DEFEATED' },
  { from: 'luffy', to: 'law', type: 'ALLIED_WITH' },
  // ... 296 mais
];
```

---

## 🚀 Como Rodar o MVP

### Setup

```bash
# 1. Clone
git clone https://github.com/seu-usuario/one-piece-kg.git
cd one-piece-kg

# 2. Install
bun install

# 3. Docker
docker-compose up -d

# 4. Migrations
bun run migrate

# 5. Seed
bun run seed

# 6. Dev
bun run dev
```

### Testar

```bash
# Health check
curl http://localhost:3000/health

# Listar personagens
curl http://localhost:3000/api/characters

# Buscar
curl http://localhost:3000/api/characters/search?q=luffy

# Pathfinding
curl "http://localhost:3000/api/graph/path?from=luffy-id&to=shanks-id"

# IA
curl -X POST http://localhost:3000/api/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Como Luffy conhece Shanks?"}'
```

---

## 🎨 Frontend (Opcional no MVP)

**Decisão:** Backend-first MVP

Se sobrar tempo, frontend minimalista:
- [ ] Lista de personagens (tabela simples)
- [ ] Busca
- [ ] Visualização de path (texto, não grafo visual)
- [ ] Chat box básico

**OU:**

Usar Postman/Insomnia para demo do MVP. Frontend completo vem depois.

---

## 📈 Métricas de Demo

Para apresentar o MVP, prepare:

1. **Query de exemplo:**
   ```
   "Qual a conexão entre Luffy e Doflamingo?"

   Resposta esperada:
   Luffy → Law (aliado) → Doflamingo (derrotado por Luffy)
   ```

2. **Estatísticas:**
   - 100 personagens cadastrados
   - 300 relacionamentos
   - 5 tipos de queries suportadas
   - Tempo médio de resposta: X ms

3. **Demo ao vivo:**
   - Buscar personagem
   - Ver conexões
   - Pathfinding
   - Perguntar à IA

---

## 🔄 Pós-MVP: Roadmap

### Fase 2 (Semanas 7-10)
- [ ] Power Score System
- [ ] Sistema de Builds automático
- [ ] Mais 500 personagens
- [ ] Organizations completas
- [ ] Elasticsearch

### Fase 3 (Semanas 11-14)
- [ ] RAG completo (Vector DB)
- [ ] Battle System
- [ ] Análises de grafo (centralidade)
- [ ] API pública

### Fase 4 (Semanas 15-18)
- [ ] Sistema de usuários
- [ ] Frontend completo
- [ ] Favoritos, coleções
- [ ] Gamificação

---

## ⚠️ Riscos do MVP

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Dados manuais (~100 chars) levam muito tempo | Média | Médio | Começar com 50, adicionar 50 depois |
| LLM muito caro | Baixa | Alto | Cache agressivo, usar DeepSeek free tier |
| Pathfinding lento | Baixa | Médio | Limitar depth máximo, cache |
| Neo4j complexo de configurar | Baixa | Baixo | Docker torna trivial |
| Scope creep (adicionar features) | Alta | Alto | **Seguir o plano!** Não adicionar nada fora do escopo |

---

## ✅ Definition of Done (MVP)

MVP está pronto quando:

- [x] Todos os endpoints da API funcionam
- [x] Banco tem 100 personagens + 300 relacionamentos
- [x] IA responde 3 tipos de perguntas:
  - Sobre personagem ("Quem é X?")
  - Sobre conexão ("Como X conhece Y?")
  - Busca ("Me mostre piratas")
- [x] Testes passando (70%+ coverage)
- [x] README com instruções de setup
- [x] Demo de 5 minutos funciona sem travar

---

## 🎯 Foco do MVP

**Lembrar sempre:**

> "O MVP não precisa ser perfeito. Precisa funcionar e validar a ideia."

### Perguntas para guiar decisões:

Antes de adicionar algo, pergunte:

1. "Isso é essencial para validar a ideia principal?"
2. "Usuários conseguem testar o sistema sem isso?"
3. "Posso adicionar isso na Fase 2?"

Se a resposta for "não" para 1 e "sim" para 2 e 3, **NÃO adicione no MVP!**

---

## 📝 Checklist Final

Antes de considerar MVP completo:

### Código
- [ ] Estrutura de pastas organizada
- [ ] Testes passando
- [ ] Logs úteis
- [ ] Error handling

### Dados
- [ ] 100 personagens
- [ ] 300 relacionamentos
- [ ] Dados validados (sem bounty negativo, etc)

### Features
- [ ] CRUD characters
- [ ] Busca
- [ ] Pathfinding
- [ ] Ego network
- [ ] IA básica

### Deploy
- [ ] Docker Compose funciona
- [ ] Migrations rodando
- [ ] Seed populando dados
- [ ] Health check endpoint

### Documentação
- [ ] README atualizado
- [ ] API endpoints documentados
- [ ] Como rodar localmente
- [ ] Exemplos de uso

---

**Última atualização:** 2026-01-09

---

## 💬 Próximos Passos

Após concluir este documento:

1. **Revisar escopo** - Está realista para 6 semanas?
2. **Começar Fase 1** - Setup do projeto
3. **Manter foco** - Não adicionar nada fora do MVP
4. **Iterar rápido** - MVP em 6 semanas!

**Let's build! 🚀**
