# 🗄️ Modelagem de Dados
## One Piece Knowledge Graph Explorer

---

## 🎯 Estratégia: Arquitetura Híbrida

### Por que Híbrido (Postgres + Neo4j)?

```
┌─────────────────────────────────────────────────────────┐
│  POSTGRES                                               │
│  • Dados estruturados (bounty, age, description)       │
│  • CRUD tradicional                                     │
│  • Queries de agregação (SUM, COUNT, AVG)              │
│  • Fonte da verdade para atributos                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  NEO4J                                                  │
│  • Relacionamentos (grafo)                              │
│  • Pathfinding (caminho entre personagens)             │
│  • Ego networks (conexões de N graus)                  │
│  • Análises de centralidade                            │
└─────────────────────────────────────────────────────────┘
```

**Dual-Write:** Toda operação escreve nos dois bancos.

---

## 📊 PostgreSQL - Schemas

### 1. Characters (Personagens)

```sql
CREATE TABLE characters (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  aliases TEXT[], -- ['Mugiwara', 'Luffy']
  epithet VARCHAR(255), -- 'Straw Hat'

  -- Informações Básicas
  age INTEGER CHECK (age >= 0 AND age <= 200),
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'NON_BINARY', 'UNKNOWN')),
  race VARCHAR(50) NOT NULL CHECK (race IN (
    'HUMAN', 'FISHMAN', 'MERMAN', 'MINK', 'GIANT', 'DWARF',
    'LONGARM', 'LONGLEG', 'SNAKENECK', 'THREE_EYE', 'LUNARIAN',
    'CYBORG', 'ZOMBIE', 'SKELETON', 'HYBRID', 'UNKNOWN'
  )),
  birthdate DATE,

  -- Afiliação
  affiliation VARCHAR(50) NOT NULL CHECK (affiliation IN (
    'PIRATE', 'MARINE', 'REVOLUTIONARY', 'CIPHER_POL',
    'CIVILIAN', 'NOBILITY', 'OTHER', 'UNKNOWN'
  )),
  crew VARCHAR(255), -- Nome da tripulação
  rank VARCHAR(100), -- 'Yonko', 'Admiral', 'Captain', etc

  -- Origem
  sea VARCHAR(50) CHECK (sea IN (
    'EAST_BLUE', 'WEST_BLUE', 'NORTH_BLUE', 'SOUTH_BLUE',
    'GRAND_LINE', 'NEW_WORLD', 'CALM_BELT', 'RED_LINE', 'UNKNOWN'
  )),
  birthplace VARCHAR(255),

  -- Status
  alive BOOLEAN DEFAULT TRUE,
  first_appearance_arc VARCHAR(100),
  death_arc VARCHAR(100),

  -- Bounty (recompensa atual)
  current_bounty BIGINT DEFAULT 0 CHECK (current_bounty >= 0),

  -- Haki
  haki_types TEXT[], -- ['OBSERVATION', 'ARMAMENT', 'CONQUEROR']
  advanced_haki TEXT[], -- ['FUTURE_SIGHT', 'INTERNAL_DESTRUCTION', ...]

  -- Power Score (calculado periodicamente por job)
  power_score INTEGER CHECK (power_score >= 0 AND power_score <= 100),
  power_score_confidence INTEGER CHECK (power_score_confidence >= 1 AND power_score_confidence <= 5),
  power_score_updated_at TIMESTAMP,

  -- Conteúdo
  description TEXT,
  image_url TEXT,
  wiki_url TEXT,

  -- Foreign Keys
  devil_fruit_id UUID REFERENCES devil_fruits(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes para performance
CREATE INDEX idx_characters_name ON characters(name);
CREATE INDEX idx_characters_name_trgm ON characters USING gin(name gin_trgm_ops); -- Fuzzy search
CREATE INDEX idx_characters_aliases ON characters USING gin(aliases); -- Array search
CREATE INDEX idx_characters_affiliation ON characters(affiliation);
CREATE INDEX idx_characters_bounty ON characters(current_bounty DESC);
CREATE INDEX idx_characters_power_score ON characters(power_score DESC NULLS LAST);
CREATE INDEX idx_characters_sea ON characters(sea);
CREATE INDEX idx_characters_alive ON characters(alive);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER characters_updated_at
BEFORE UPDATE ON characters
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### 2. Bounty History (Histórico de Recompensas)

```sql
CREATE TABLE bounty_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  amount BIGINT NOT NULL CHECK (amount >= 0),
  arc VARCHAR(100) NOT NULL, -- 'Alabasta', 'Dressrosa', etc
  chapter INTEGER,
  episode INTEGER,

  -- Contexto
  reason TEXT, -- Por que aumentou? "Derrotou Kaido"

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bounty_history_character ON bounty_history(character_id);
CREATE INDEX idx_bounty_history_arc ON bounty_history(arc);
CREATE INDEX idx_bounty_history_amount ON bounty_history(amount DESC);

-- Garantir que current_bounty é sempre o mais recente
CREATE OR REPLACE FUNCTION update_current_bounty()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE characters
  SET current_bounty = NEW.amount
  WHERE id = NEW.character_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bounty_history_update_current
AFTER INSERT ON bounty_history
FOR EACH ROW
EXECUTE FUNCTION update_current_bounty();
```

### 3. Devil Fruits (Frutas do Diabo)

```sql
CREATE TABLE devil_fruits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Nomes
  name_japanese VARCHAR(255) NOT NULL, -- 'Gomu Gomu no Mi'
  name_english VARCHAR(255), -- 'Gum-Gum Fruit'
  name_meaning VARCHAR(255), -- 'Rubber'

  -- Tipo
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'PARAMECIA', 'ZOAN', 'ZOAN_ANCIENT', 'ZOAN_MYTHICAL', 'LOGIA', 'SPECIAL'
  )),

  -- Despertar
  awakening_status VARCHAR(50) CHECK (awakening_status IN (
    'AWAKENED', 'NOT_AWAKENED', 'UNKNOWN'
  )),

  -- Descrição
  description TEXT,
  abilities TEXT[], -- ['Stretch body', 'Immune to blunt attacks']
  weaknesses TEXT[], -- ['Seastone', 'Haki']

  -- Usuário atual
  current_user_id UUID REFERENCES characters(id) ON DELETE SET NULL,

  -- Primeira aparição
  first_appearance_arc VARCHAR(100),
  first_appearance_chapter INTEGER,

  -- Metadata
  image_url TEXT,
  wiki_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_devil_fruits_type ON devil_fruits(type);
CREATE INDEX idx_devil_fruits_current_user ON devil_fruits(current_user_id);
CREATE INDEX idx_devil_fruits_name_japanese ON devil_fruits(name_japanese);

CREATE TRIGGER devil_fruits_updated_at
BEFORE UPDATE ON devil_fruits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### 4. Organizations (Organizações/Tripulações)

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'PIRATE_CREW', 'MARINE', 'REVOLUTIONARY_ARMY', 'CIPHER_POL',
    'WORLD_GOVERNMENT', 'YONKO_CREW', 'WORST_GENERATION',
    'SHICHIBUKAI', 'NOBLE_FAMILY', 'KINGDOM',
    'CRIMINAL_ORGANIZATION', 'OTHER'
  )),

  -- Liderança
  leader_id UUID REFERENCES characters(id) ON DELETE SET NULL,

  -- Estatísticas (calculadas)
  total_bounty BIGINT DEFAULT 0,
  member_count INTEGER DEFAULT 0,

  -- Descrição
  description TEXT,
  symbol_url TEXT, -- Bandeira/Logo

  -- Status
  active BOOLEAN DEFAULT TRUE,
  founded_arc VARCHAR(100),
  disbanded_arc VARCHAR(100),

  -- Metadata
  wiki_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_organizations_name ON organizations(name);
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_leader ON organizations(leader_id);
CREATE INDEX idx_organizations_total_bounty ON organizations(total_bounty DESC);

CREATE TRIGGER organizations_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### 5. Organization Members (Many-to-Many)

```sql
CREATE TABLE organization_members (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Posição na organização
  position VARCHAR(100), -- 'Captain', 'Commander', 'Member'

  -- Período
  joined_arc VARCHAR(100),
  left_arc VARCHAR(100),
  still_member BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY (organization_id, character_id)
);

CREATE INDEX idx_org_members_character ON organization_members(character_id);
CREATE INDEX idx_org_members_organization ON organization_members(organization_id);

-- Atualizar member_count automaticamente
CREATE OR REPLACE FUNCTION update_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.still_member THEN
    UPDATE organizations
    SET member_count = member_count + 1
    WHERE id = NEW.organization_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.still_member != OLD.still_member THEN
    UPDATE organizations
    SET member_count = member_count + (CASE WHEN NEW.still_member THEN 1 ELSE -1 END)
    WHERE id = NEW.organization_id;
  ELSIF TG_OP = 'DELETE' AND OLD.still_member THEN
    UPDATE organizations
    SET member_count = member_count - 1
    WHERE id = OLD.organization_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER org_members_update_count
AFTER INSERT OR UPDATE OR DELETE ON organization_members
FOR EACH ROW
EXECUTE FUNCTION update_member_count();
```

### 6. Locations (Locais)

```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'ISLAND', 'KINGDOM', 'CITY', 'VILLAGE', 'SEA',
    'UNDERWATER', 'SKY', 'MARINE_BASE', 'PRISON',
    'LANDMARK', 'SHIP', 'OTHER'
  )),

  -- Geografia
  sea VARCHAR(50), -- East Blue, Grand Line, etc
  parent_location_id UUID REFERENCES locations(id), -- Ex: Dressrosa -> Grand Line

  -- Informações
  population INTEGER,
  climate VARCHAR(100),
  description TEXT,

  -- Governança
  ruler_id UUID REFERENCES characters(id),

  -- Metadata
  image_url TEXT,
  wiki_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_locations_name ON locations(name);
CREATE INDEX idx_locations_type ON locations(type);
CREATE INDEX idx_locations_sea ON locations(sea);
CREATE INDEX idx_locations_parent ON locations(parent_location_id);

CREATE TRIGGER locations_updated_at
BEFORE UPDATE ON locations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### 7. Battles (Batalhas)

```sql
CREATE TABLE battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contexto
  name VARCHAR(255), -- 'Luffy vs Kaido'
  location_id UUID REFERENCES locations(id),
  arc VARCHAR(100) NOT NULL,
  chapter INTEGER,
  episode INTEGER,

  -- Dificuldade/Importância
  difficulty VARCHAR(20) CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD', 'EXTREME', 'UNKNOWN')),
  importance INTEGER CHECK (importance >= 1 AND importance <= 5), -- 1-5 estrelas

  -- Descrição
  description TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_battles_arc ON battles(arc);
CREATE INDEX idx_battles_location ON battles(location_id);
CREATE INDEX idx_battles_importance ON battles(importance DESC);
```

### 8. Battle Participants (Participantes de Batalhas)

```sql
CREATE TABLE battle_participants (
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Lado (para batalhas de equipes)
  side CHAR(1) CHECK (side IN ('A', 'B', 'N')), -- N = Neutral/Solo

  -- Resultado
  outcome VARCHAR(20) NOT NULL CHECK (outcome IN (
    'WIN', 'LOSS', 'DRAW', 'INTERRUPTED', 'UNKNOWN'
  )),

  -- Métricas
  power_level_at_time INTEGER, -- Power score na época
  injuries TEXT[], -- ['Broken arm', 'Lost consciousness']

  PRIMARY KEY (battle_id, character_id)
);

CREATE INDEX idx_battle_participants_character ON battle_participants(character_id);
CREATE INDEX idx_battle_participants_outcome ON battle_participants(outcome);
```

### 9. Arcs (Arcos da História)

```sql
CREATE TABLE arcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR(100) NOT NULL UNIQUE, -- 'Alabasta', 'Marineford', etc
  saga VARCHAR(100), -- 'Alabasta Saga', 'Summit War Saga'

  -- Ordem
  sequence_number INTEGER NOT NULL UNIQUE,

  -- Período
  start_chapter INTEGER,
  end_chapter INTEGER,
  start_episode INTEGER,
  end_episode INTEGER,

  -- Informações
  description TEXT,
  main_location_id UUID REFERENCES locations(id),

  -- Metadata
  image_url TEXT,
  wiki_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_arcs_sequence ON arcs(sequence_number);
CREATE INDEX idx_arcs_name ON arcs(name);
```

### 10. Users (Usuários do Sistema)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Autenticação
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,

  -- Perfil
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  favorite_character_id UUID REFERENCES characters(id),

  -- Gamificação
  level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 100),
  experience_points INTEGER DEFAULT 0 CHECK (experience_points >= 0),

  -- Permissões
  role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('GUEST', 'USER', 'MODERATOR', 'ADMIN')),

  -- Status
  email_verified BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,

  -- Metadata
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_level ON users(level DESC);

CREATE TRIGGER users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### 11. User Favorites (Favoritos)

```sql
CREATE TABLE user_favorites (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  created_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY (user_id, character_id)
);

CREATE INDEX idx_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_favorites_character ON user_favorites(character_id);
```

### 12. Collections (Coleções de Personagens)

```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Visibilidade
  is_public BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_collections_user ON collections(user_id);
CREATE INDEX idx_collections_public ON collections(is_public) WHERE is_public = TRUE;

CREATE TRIGGER collections_updated_at
BEFORE UPDATE ON collections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### 13. Collection Items (Itens da Coleção)

```sql
CREATE TABLE collection_items (
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,

  -- Ordem na coleção
  position INTEGER,

  -- Notas pessoais
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  PRIMARY KEY (collection_id, character_id)
);

CREATE INDEX idx_collection_items_collection ON collection_items(collection_id);
CREATE INDEX idx_collection_items_character ON collection_items(character_id);
```

### 14. AI Conversations (Conversas com IA)

```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Contexto
  title VARCHAR(255), -- Auto-gerado: "Conversa sobre Luffy e Kaido"

  -- Metadata
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON ai_conversations(user_id);
CREATE INDEX idx_conversations_updated ON ai_conversations(updated_at DESC);

CREATE TRIGGER ai_conversations_updated_at
BEFORE UPDATE ON ai_conversations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
```

### 15. AI Messages (Mensagens da Conversa)

```sql
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,

  -- Mensagem
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Metadados da IA
  model VARCHAR(50), -- 'gpt-4', 'claude-3', etc
  tokens_used INTEGER,
  response_time_ms INTEGER,

  -- Contexto usado
  context_character_ids UUID[], -- Personagens mencionados

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON ai_messages(conversation_id);
CREATE INDEX idx_messages_created ON ai_messages(created_at);
```

---

## 🕸️ Neo4j - Modelo de Grafo

### Node Labels

```cypher
// Character Node (principal)
CREATE CONSTRAINT character_id IF NOT EXISTS
FOR (c:Character) REQUIRE c.id IS UNIQUE;

CREATE INDEX character_name IF NOT EXISTS
FOR (c:Character) ON (c.name);

// Propriedades mínimas (o resto vem do Postgres)
(:Character {
  id: UUID,
  name: String,
  power_score: Integer  // Cached para queries de pathfinding ponderadas
})

// Organization Node
CREATE CONSTRAINT organization_id IF NOT EXISTS
FOR (o:Organization) REQUIRE o.id IS UNIQUE;

(:Organization {
  id: UUID,
  name: String,
  type: String
})

// Location Node
CREATE CONSTRAINT location_id IF NOT EXISTS
FOR (l:Location) REQUIRE l.id IS UNIQUE;

(:Location {
  id: UUID,
  name: String,
  type: String
})

// Arc Node (útil para queries temporais)
CREATE CONSTRAINT arc_name IF NOT EXISTS
FOR (a:Arc) REQUIRE a.name IS UNIQUE;

(:Arc {
  name: String,
  sequence: Integer
})
```

### Relationship Types

```cypher
// === CREW/ORGANIZATION ===

(:Character)-[:CREW_MEMBER {
  since_arc: String,
  position: String,      // 'Captain', 'Swordsman', etc
  still_active: Boolean
}]->(:Organization)

(:Character)-[:LEADS]->(:Organization)

// === FAMILY ===

(:Character)-[:PARENT_OF]->(:Character)
(:Character)-[:CHILD_OF]->(:Character)
(:Character)-[:SIBLING_OF]->(:Character)
(:Character)-[:SPOUSE_OF]->(:Character)
(:Character)-[:RELATED_TO { relationship: String }]->(:Character)

// === ALLIANCES ===

(:Character)-[:ALLIED_WITH {
  strength: String,      // 'STRONG', 'MEDIUM', 'WEAK'
  since_arc: String,
  until_arc: String,
  still_active: Boolean
}]->(:Character)

(:Character)-[:TEMPORARY_ALLY {
  arc: String,
  reason: String
}]->(:Character)

(:Organization)-[:ALLIED_WITH]->(:Organization)

// === CONFLICT ===

(:Character)-[:ENEMY_OF {
  intensity: String,     // 'EXTREME', 'HIGH', 'MEDIUM', 'LOW'
  since_arc: String,
  reason: String
}]->(:Character)

(:Character)-[:RIVAL_OF {
  aspect: String         // 'strength', 'navigation', 'swordsmanship'
}]->(:Character)

(:Character)-[:DEFEATED {
  battle_id: UUID,
  arc: String,
  difficulty: String     // 'EASY', 'MEDIUM', 'HARD', 'EXTREME'
}]->(:Character)

// === MENTORSHIP ===

(:Character)-[:MENTORED {
  skill: String,         // 'Haki', 'Swordsmanship', 'Navigation'
  arc: String
}]->(:Character)

(:Character)-[:TRAINED_BY]->(:Character)

// === SOCIAL ===

(:Character)-[:FRIENDS_WITH {
  closeness: Integer     // 1-10
}]->(:Character)

(:Character)-[:RESPECTS]->(:Character)
(:Character)-[:ADMIRES]->(:Character)
(:Character)-[:FEARS]->(:Character)

// === PROFESSIONAL ===

(:Character)-[:SUPERIOR_OF]->(:Character)
(:Character)-[:SUBORDINATE_OF]->(:Character)

// === SPECIAL EVENTS ===

(:Character)-[:SAVED {
  arc: String,
  context: String
}]->(:Character)

(:Character)-[:KILLED {
  arc: String,
  battle_id: UUID
}]->(:Character)

// === LOCATION ===

(:Character)-[:BORN_IN]->(:Location)
(:Character)-[:LIVES_IN]->(:Location)
(:Character)-[:VISITED { arc: String }]->(:Location)

(:Organization)-[:BASED_IN]->(:Location)
(:Organization)-[:CONTROLS]->(:Location)

// === TIMELINE ===

(:Character)-[:APPEARED_IN { role: String }]->(:Arc)
(:Battle)-[:OCCURRED_IN]->(:Arc)
```

### Exemplo de Grafo Populado

```cypher
// Criar personagens
CREATE (luffy:Character {id: 'luffy-uuid', name: 'Monkey D. Luffy', power_score: 98})
CREATE (zoro:Character {id: 'zoro-uuid', name: 'Roronoa Zoro', power_score: 92})
CREATE (nami:Character {id: 'nami-uuid', name: 'Nami', power_score: 45})
CREATE (ace:Character {id: 'ace-uuid', name: 'Portgas D. Ace', power_score: 90})
CREATE (wb:Character {id: 'wb-uuid', name: 'Edward Newgate', power_score: 99})
CREATE (shanks:Character {id: 'shanks-uuid', name: 'Shanks', power_score: 99})

// Criar organização
CREATE (sh:Organization {id: 'sh-uuid', name: 'Straw Hat Pirates', type: 'PIRATE_CREW'})

// Relacionamentos de tripulação
CREATE (luffy)-[:LEADS]->(sh)
CREATE (luffy)-[:CREW_MEMBER {position: 'Captain', since_arc: 'Romance Dawn', still_active: true}]->(sh)
CREATE (zoro)-[:CREW_MEMBER {position: 'Swordsman', since_arc: 'Romance Dawn', still_active: true}]->(sh)
CREATE (nami)-[:CREW_MEMBER {position: 'Navigator', since_arc: 'Arlong Park', still_active: true}]->(sh)

// Relacionamentos familiares
CREATE (ace)-[:SIBLING_OF]->(luffy)
CREATE (luffy)-[:SIBLING_OF]->(ace)

// Relacionamentos de mentoria
CREATE (shanks)-[:MENTORED {skill: 'Haki', arc: 'Romance Dawn'}]->(luffy)
CREATE (ace)-[:MENTORED {skill: 'Combat', arc: 'Romance Dawn'}]->(luffy)

// Relacionamentos de organização
CREATE (ace)-[:CREW_MEMBER]->(wb_pirates:Organization {name: 'Whitebeard Pirates'})
CREATE (wb)-[:LEADS]->(wb_pirates)

// Aliança
CREATE (luffy)-[:ALLIED_WITH {strength: 'STRONG', since_arc: 'Marineford', still_active: true}]->(wb)

// Amizade
CREATE (luffy)-[:FRIENDS_WITH {closeness: 10}]->(shanks)

// Query exemplo: Encontrar caminho entre Luffy e Whitebeard
MATCH path = shortestPath(
  (luffy:Character {name: 'Monkey D. Luffy'})-[*]-(wb:Character {name: 'Edward Newgate'})
)
RETURN path;

// Resultado: Luffy -> SIBLING_OF -> Ace -> CREW_MEMBER -> Whitebeard Pirates <- LEADS <- Whitebeard
```

---

## 🔄 Estratégia de Dual-Write

### Quando Escrever em Cada Banco?

```typescript
// services/character.service.ts

async create(data: CreateCharacterDto): Promise<Character> {
  const tx = await this.pg.transaction(); // Transação Postgres

  try {
    // 1. Escrever no Postgres (dados completos)
    const character = await this.characterRepo.createInPostgres(data, tx);

    // 2. Escrever no Neo4j (apenas ID + nome + power_score)
    await this.characterRepo.createInNeo4j({
      id: character.id,
      name: character.name,
      power_score: character.power_score
    });

    // 3. Commit da transação Postgres
    await tx.commit();

    return character;

  } catch (error) {
    await tx.rollback();

    // Tentar limpar Neo4j se já foi criado
    await this.characterRepo.deleteFromNeo4j(character.id).catch(() => {});

    throw error;
  }
}
```

### Regras de Dual-Write:

| Operação | Postgres | Neo4j | Observação |
|----------|----------|-------|------------|
| **Criar Personagem** | ✅ Todos os campos | ✅ ID + nome + power_score | Postgres = fonte da verdade |
| **Atualizar Personagem** | ✅ Atualizar campos | ✅ Atualizar nome/power_score se mudou | Sincronizar apenas campos relevantes |
| **Deletar Personagem** | ✅ DELETE | ✅ DETACH DELETE | Deletar relacionamentos também |
| **Criar Relacionamento** | ❌ Não armazena | ✅ CREATE relationship | Relacionamentos só no Neo4j |
| **Criar Batalha** | ✅ Armazena battle | ✅ CREATE [:DEFEATED] | Postgres = histórico, Neo4j = grafo |
| **Atualizar Bounty** | ✅ Atualizar current_bounty | ❌ Não precisa | Neo4j não usa bounty em queries |

### Sincronização de Power Score

```typescript
// jobs/sync-power-scores.job.ts

/**
 * Job que roda diariamente:
 * 1. Recalcula power scores (Postgres)
 * 2. Sincroniza com Neo4j
 */
async execute() {
  const characters = await this.characterRepo.findAll();

  for (const char of characters) {
    const newScore = await this.powerScoreService.calculate(char.id);

    // Atualizar Postgres
    await this.pg.query(
      'UPDATE characters SET power_score = $1 WHERE id = $2',
      [newScore.score, char.id]
    );

    // Sincronizar com Neo4j
    await this.neo4j.run(
      'MATCH (c:Character {id: $id}) SET c.power_score = $score',
      { id: char.id, score: newScore.score }
    );
  }
}
```

---

## 📈 Índices e Performance

### Postgres - Índices Críticos

```sql
-- Fuzzy search (requer extensão pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_characters_name_trgm ON characters USING gin(name gin_trgm_ops);

-- Exemplo de busca fuzzy
SELECT * FROM characters
WHERE name % 'Lufi'  -- Busca similar a "Lufi" (typo de Luffy)
ORDER BY similarity(name, 'Lufi') DESC
LIMIT 10;

-- Array search (aliases)
CREATE INDEX idx_characters_aliases ON characters USING gin(aliases);

-- Exemplo
SELECT * FROM characters
WHERE aliases @> ARRAY['Mugiwara']; -- Contém 'Mugiwara'

-- Composite indexes para queries frequentes
CREATE INDEX idx_characters_affiliation_bounty ON characters(affiliation, current_bounty DESC);

-- Exemplo
SELECT * FROM characters
WHERE affiliation = 'PIRATE'
ORDER BY current_bounty DESC
LIMIT 10;
```

### Neo4j - Índices Críticos

```cypher
// Índice em name para busca rápida
CREATE INDEX character_name IF NOT EXISTS
FOR (c:Character) ON (c.name);

// Índice em power_score para pathfinding ponderado
CREATE INDEX character_power IF NOT EXISTS
FOR (c:Character) ON (c.power_score);

// Fulltext index para busca de texto
CREATE FULLTEXT INDEX character_search IF NOT EXISTS
FOR (c:Character)
ON EACH [c.name];

// Exemplo de uso
CALL db.index.fulltext.queryNodes('character_search', 'Luffy~')
YIELD node, score
RETURN node.name, score
ORDER BY score DESC;
```

---

## 🗂️ Migrations Strategy

### Ferramentas Recomendadas:

**Postgres:**
- `node-pg-migrate` - Migrations SQL
- `kysely` - Type-safe query builder + migrations

**Neo4j:**
- Migrations manuais via scripts Cypher
- `neo4j-migrations` (Java tool, opcional)

### Estrutura de Migrations:

```
migrations/
├── postgres/
│   ├── 001_create_characters.sql
│   ├── 002_create_devil_fruits.sql
│   ├── 003_create_organizations.sql
│   └── ...
└── neo4j/
    ├── 001_create_constraints.cypher
    ├── 002_create_indexes.cypher
    └── ...
```

### Exemplo de Migration:

```sql
-- migrations/postgres/001_create_characters.sql

-- Up
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  -- ... resto dos campos
);

-- Down
DROP TABLE IF EXISTS characters CASCADE;
```

```cypher
-- migrations/neo4j/001_create_constraints.cypher

// Up
CREATE CONSTRAINT character_id IF NOT EXISTS
FOR (c:Character) REQUIRE c.id IS UNIQUE;

CREATE INDEX character_name IF NOT EXISTS
FOR (c:Character) ON (c.name);

// Down (manual)
// DROP CONSTRAINT character_id IF EXISTS;
// DROP INDEX character_name IF EXISTS;
```

---

## 🎯 Resumo: Onde Cada Dado Vive

| Dado | Postgres | Neo4j | Motivo |
|------|----------|-------|--------|
| **Character (atributos)** | ✅ Completo | ⚠️ Apenas ID + nome + power_score | Postgres = fonte da verdade |
| **Bounty History** | ✅ Histórico completo | ❌ Não | Não usado em queries de grafo |
| **Relacionamentos** | ❌ Não | ✅ Todas as relações | Neo4j é otimizado pra grafo |
| **Batalhas** | ✅ Detalhes completos | ⚠️ Apenas [:DEFEATED] | Postgres = histórico, Neo4j = resultado |
| **Organizations** | ✅ Dados completos | ⚠️ ID + nome + tipo | Postgres = CRUD, Neo4j = grafo |
| **Locations** | ✅ Dados completos | ⚠️ ID + nome | Neo4j usado pra [:BORN_IN], etc |
| **Users/Favoritos** | ✅ Tudo | ❌ Não | Dados de usuário não vão pro grafo |
| **AI Conversations** | ✅ Tudo | ❌ Não | Histórico de chat não é grafo |

---

## 📊 Estatísticas Estimadas (Sistema Completo)

```
Characters:          ~2,000 personagens
Relationships:       ~50,000 relacionamentos (média 25 por personagem)
Organizations:       ~200 organizações
Battles:             ~5,000 batalhas
Bounty History:      ~10,000 registros
Devil Fruits:        ~200 frutas
Locations:           ~500 locais
Arcs:                ~50 arcos

Total Postgres:      ~500 MB
Total Neo4j:         ~2 GB (grafo com índices)
```

---

**Última atualização:** 2026-01-09
