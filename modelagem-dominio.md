# 🎯 Modelagem de Domínio - DDD
## One Piece Knowledge Graph Explorer

---

## 📐 Arquitetura: Monolito Modular

O sistema será implementado como **monolito modular**, com módulos bem definidos que poderiam ser extraídos como microserviços no futuro, se necessário.

### Princípios
- Cada módulo tem seu próprio domínio isolado
- Comunicação entre módulos via interfaces bem definidas
- Baixo acoplamento, alta coesão
- Possibilidade de deploy independente (futuro)

---

## 🎭 Bounded Contexts

### 1. **Character Context** (Contexto de Personagens)
**Responsabilidade:** Gerenciar tudo relacionado a personagens de One Piece

**Entidades:**
- Character (raiz do agregado)
- DevilFruit
- Haki
- Bounty (histórico de recompensas)

**Value Objects:**
- CharacterId
- CharacterName
- Age
- BountyAmount
- Affiliation
- Origin (mar de origem)
- Status (vivo/morto/desconhecido)
- Race (humano, gigante, fishman, etc.)
- Gender

**Serviços de Domínio:**
- CharacterEvolutionService (evolução do personagem ao longo dos arcos)

---

### 2. **Relationship Context** (Contexto de Relacionamentos)
**Responsabilidade:** Gerenciar conexões entre personagens no grafo

**Entidades:**
- Relationship (raiz do agregado)

**Value Objects:**
- RelationshipId
- RelationshipType
- RelationshipStrength (forte/médio/fraco)
- RelationshipStatus (ativo/inativo/histórico)
- RelationshipMetadata (informações extras como quando começou)

**Tipos de Relacionamentos (enum):**
```typescript
enum RelationshipType {
  // Afiliação/Grupo
  CREW_MEMBER = 'CREW_MEMBER',              // Membro da mesma tripulação
  CREW_CAPTAIN = 'CREW_CAPTAIN',            // Capitão de tripulação
  ORGANIZATION_MEMBER = 'ORGANIZATION_MEMBER', // Membro da mesma organização
  ORGANIZATION_LEADER = 'ORGANIZATION_LEADER', // Líder de organização

  // Família
  PARENT = 'PARENT',                        // Pai/Mãe
  CHILD = 'CHILD',                          // Filho/Filha
  SIBLING = 'SIBLING',                      // Irmão/Irmã
  SPOUSE = 'SPOUSE',                        // Cônjuge
  RELATIVE = 'RELATIVE',                    // Outro parente

  // Alianças
  ALLY = 'ALLY',                            // Aliado
  TEMPORARY_ALLY = 'TEMPORARY_ALLY',        // Aliado temporário
  GRAND_FLEET = 'GRAND_FLEET',              // Membro da grande frota

  // Conflito
  ENEMY = 'ENEMY',                          // Inimigo
  RIVAL = 'RIVAL',                          // Rival
  DEFEATED_BY = 'DEFEATED_BY',              // Foi derrotado por
  DEFEATED = 'DEFEATED',                    // Derrotou

  // Mentoria
  MENTOR = 'MENTOR',                        // Mentor de
  STUDENT = 'STUDENT',                      // Estudante de
  MASTER = 'MASTER',                        // Mestre de
  APPRENTICE = 'APPRENTICE',                // Aprendiz de

  // Social
  FRIEND = 'FRIEND',                        // Amigo
  ACQUAINTANCE = 'ACQUAINTANCE',            // Conhecido
  ROMANCE = 'ROMANCE',                      // Interesse romântico
  ADMIRES = 'ADMIRES',                      // Admira
  IDOLIZES = 'IDOLIZES',                    // Idolatra

  // Profissional
  SUPERIOR = 'SUPERIOR',                    // Superior hierárquico
  SUBORDINATE = 'SUBORDINATE',              // Subordinado
  COLLEAGUE = 'COLLEAGUE',                  // Colega de trabalho

  // Especiais
  SAVED_BY = 'SAVED_BY',                    // Foi salvo por
  SAVED = 'SAVED',                          // Salvou
  KILLED_BY = 'KILLED_BY',                  // Foi morto por
  KILLED = 'KILLED',                        // Matou
  BETRAYED_BY = 'BETRAYED_BY',              // Foi traído por
  BETRAYED = 'BETRAYED',                    // Traiu
}
```

**Serviços de Domínio:**
- PathfindingService (encontrar caminhos entre personagens)
- RelationshipStrengthCalculator (calcular força de relacionamento)

---

### 3. **Organization Context** (Contexto de Organizações)
**Responsabilidade:** Gerenciar grupos, tripulações, facções

**Entidades:**
- Organization (raiz do agregado)
- OrganizationHierarchy (hierarquia interna)

**Value Objects:**
- OrganizationId
- OrganizationName
- OrganizationType
- OrganizationStatus
- Territory
- TotalBounty

**Tipos de Organização (enum):**
```typescript
enum OrganizationType {
  PIRATE_CREW = 'PIRATE_CREW',              // Tripulação pirata
  MARINE = 'MARINE',                        // Marinha
  REVOLUTIONARY_ARMY = 'REVOLUTIONARY_ARMY', // Exército Revolucionário
  CIPHER_POL = 'CIPHER_POL',                // Cipher Pol
  WORLD_GOVERNMENT = 'WORLD_GOVERNMENT',    // Governo Mundial
  YONKO_CREW = 'YONKO_CREW',                // Tripulação de Yonko
  WORST_GENERATION = 'WORST_GENERATION',    // Pior Geração
  SHICHIBUKAI = 'SHICHIBUKAI',              // Shichibukai
  NOBLE_FAMILY = 'NOBLE_FAMILY',            // Família nobre
  KINGDOM = 'KINGDOM',                      // Reino
  CRIMINAL_ORGANIZATION = 'CRIMINAL_ORGANIZATION', // Organização criminosa
  OTHER = 'OTHER',                          // Outro
}
```

---

### 4. **Location Context** (Contexto de Locais)
**Responsabilidade:** Gerenciar locais e geografia de One Piece

**Entidades:**
- Location (raiz do agregado)

**Value Objects:**
- LocationId
- LocationName
- Coordinates
- Climate
- Population
- LocationType

**Tipos de Local (enum):**
```typescript
enum LocationType {
  ISLAND = 'ISLAND',                        // Ilha
  KINGDOM = 'KINGDOM',                      // Reino
  CITY = 'CITY',                            // Cidade
  VILLAGE = 'VILLAGE',                      // Vila
  SEA = 'SEA',                              // Mar (East Blue, etc.)
  UNDERWATER = 'UNDERWATER',                // Submarina (Fishman Island)
  SKY = 'SKY',                              // Céu (Skypiea)
  MARINE_BASE = 'MARINE_BASE',              // Base da Marinha
  PRISON = 'PRISON',                        // Prisão
  LANDMARK = 'LANDMARK',                    // Marco importante
  SHIP = 'SHIP',                            // Navio
  OTHER = 'OTHER',
}
```

---

### 5. **Battle Context** (Contexto de Batalhas)
**Responsabilidade:** Gerenciar batalhas e sistema de poder

**Entidades:**
- Battle (raiz do agregado)
- PowerScore (pontuação de poder calculada)

**Value Objects:**
- BattleId
- BattleOutcome
- BattleDifficulty
- BattleLocation
- BattleArc
- PowerScoreValue
- ConfidenceLevel

**Enums:**
```typescript
enum BattleOutcome {
  WIN = 'WIN',
  LOSS = 'LOSS',
  DRAW = 'DRAW',
  INTERRUPTED = 'INTERRUPTED',
  UNKNOWN = 'UNKNOWN',
}

enum BattleDifficulty {
  EASY = 'EASY',                // Vitória fácil
  MEDIUM = 'MEDIUM',            // Batalha equilibrada
  HARD = 'HARD',                // Vitória difícil
  EXTREME = 'EXTREME',          // Vitória extremamente difícil
  UNKNOWN = 'UNKNOWN',
}

enum ConfidenceLevel {
  VERY_HIGH = 5,    // ⭐⭐⭐⭐⭐
  HIGH = 4,         // ⭐⭐⭐⭐☆
  MEDIUM = 3,       // ⭐⭐⭐☆☆
  LOW = 2,          // ⭐⭐☆☆☆
  SPECULATION = 1,  // ⭐☆☆☆☆
}
```

**Serviços de Domínio:**
- PowerScoreCalculator (calcular poder baseado em múltiplos fatores)
- BattleSimulator (simular batalhas hipotéticas)

---

### 6. **Devil Fruit Context** (Contexto de Frutas do Diabo)
**Responsabilidade:** Gerenciar frutas do diabo e habilidades

**Entidades:**
- DevilFruit (raiz do agregado)
- DevilFruitAbility

**Value Objects:**
- DevilFruitId
- DevilFruitName (japonês e português)
- DevilFruitType
- AwakeningStatus

**Enums:**
```typescript
enum DevilFruitType {
  PARAMECIA = 'PARAMECIA',
  ZOAN = 'ZOAN',
  ZOAN_ANCIENT = 'ZOAN_ANCIENT',
  ZOAN_MYTHICAL = 'ZOAN_MYTHICAL',
  LOGIA = 'LOGIA',
  SPECIAL = 'SPECIAL',            // Casos especiais
}

enum AwakeningStatus {
  AWAKENED = 'AWAKENED',
  NOT_AWAKENED = 'NOT_AWAKENED',
  UNKNOWN = 'UNKNOWN',
}
```

---

### 7. **Timeline Context** (Contexto de Linha do Tempo)
**Responsabilidade:** Gerenciar arcos, eventos e cronologia

**Entidades:**
- Arc (raiz do agregado)
- Event

**Value Objects:**
- ArcId
- ArcName
- ArcPeriod
- EventId
- EventName
- EventType
- Timestamp

**Enums:**
```typescript
enum ArcName {
  ROMANCE_DAWN = 'ROMANCE_DAWN',
  ORANGE_TOWN = 'ORANGE_TOWN',
  SYRUP_VILLAGE = 'SYRUP_VILLAGE',
  BARATIE = 'BARATIE',
  ARLONG_PARK = 'ARLONG_PARK',
  LOGUETOWN = 'LOGUETOWN',
  REVERSE_MOUNTAIN = 'REVERSE_MOUNTAIN',
  WHISKY_PEAK = 'WHISKY_PEAK',
  LITTLE_GARDEN = 'LITTLE_GARDEN',
  DRUM_ISLAND = 'DRUM_ISLAND',
  ALABASTA = 'ALABASTA',
  JAYA = 'JAYA',
  SKYPIEA = 'SKYPIEA',
  LONG_RING_LONG_LAND = 'LONG_RING_LONG_LAND',
  WATER_7 = 'WATER_7',
  ENIES_LOBBY = 'ENIES_LOBBY',
  POST_ENIES_LOBBY = 'POST_ENIES_LOBBY',
  THRILLER_BARK = 'THRILLER_BARK',
  SABAODY_ARCHIPELAGO = 'SABAODY_ARCHIPELAGO',
  AMAZON_LILY = 'AMAZON_LILY',
  IMPEL_DOWN = 'IMPEL_DOWN',
  MARINEFORD = 'MARINEFORD',
  POST_WAR = 'POST_WAR',
  RETURN_TO_SABAODY = 'RETURN_TO_SABAODY',
  FISHMAN_ISLAND = 'FISHMAN_ISLAND',
  PUNK_HAZARD = 'PUNK_HAZARD',
  DRESSROSA = 'DRESSROSA',
  ZOU = 'ZOU',
  WHOLE_CAKE_ISLAND = 'WHOLE_CAKE_ISLAND',
  REVERIE = 'REVERIE',
  WANO = 'WANO',
  EGGHEAD = 'EGGHEAD',
  // Futuros arcos...
}

enum EventType {
  BATTLE = 'BATTLE',
  ALLIANCE_FORMED = 'ALLIANCE_FORMED',
  CHARACTER_DEATH = 'CHARACTER_DEATH',
  CHARACTER_INTRODUCTION = 'CHARACTER_INTRODUCTION',
  DEVIL_FRUIT_CONSUMPTION = 'DEVIL_FRUIT_CONSUMPTION',
  BOUNTY_UPDATE = 'BOUNTY_UPDATE',
  MAJOR_REVELATION = 'MAJOR_REVELATION',
  POWER_UP = 'POWER_UP',
  OTHER = 'OTHER',
}
```

---

### 8. **User Context** (Contexto de Usuários)
**Responsabilidade:** Gerenciar usuários e autenticação

**Entidades:**
- User (raiz do agregado)
- UserProfile
- UserActivity

**Value Objects:**
- UserId
- Email
- Username
- Password (hash)
- Role
- UserLevel
- Points

**Enums:**
```typescript
enum UserRole {
  GUEST = 'GUEST',
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

enum UserLevel {
  EAST_BLUE_ROOKIE = 'EAST_BLUE_ROOKIE',       // 1-10
  PIRATE_ROOKIE = 'PIRATE_ROOKIE',             // 11-25
  SUPERNOVA = 'SUPERNOVA',                     // 26-50
  SHICHIBUKAI = 'SHICHIBUKAI',                 // 51-75
  YONKO = 'YONKO',                             // 76-99
  PIRATE_KING = 'PIRATE_KING',                 // 100
}
```

---

### 9. **Social Context** (Contexto Social)
**Responsabilidade:** Gerenciar interações sociais (favoritos, coleções, comentários)

**Entidades:**
- Collection (raiz do agregado)
- Comment (raiz do agregado)
- Favorite

**Value Objects:**
- CollectionId
- CollectionName
- CommentId
- CommentContent
- Votes

**Serviços de Domínio:**
- ModerationService (moderação de comentários)

---

### 10. **Analytics Context** (Contexto de Análises)
**Responsabilidade:** Análises avançadas e métricas de grafo

**Entidades:**
- GraphMetrics (raiz do agregado)
- CommunityDetection
- CentralityAnalysis

**Value Objects:**
- MetricValue
- CentralityScore
- CommunityId

**Serviços de Domínio:**
- CentralityCalculator
- CommunityDetectionService
- GraphEvolutionAnalyzer

---

### 11. **AI Context** (Contexto de IA)
**Responsabilidade:** Interações com IA e RAG

**Entidades:**
- Conversation (raiz do agregado)
- Message
- EmbeddedDocument

**Value Objects:**
- ConversationId
- MessageId
- MessageContent
- EmbeddingVector
- AIResponse

**Serviços de Domínio:**
- RAGService (Retrieval Augmented Generation)
- EmbeddingService
- PromptBuilder

---

## 📦 Value Objects Detalhados

### Character Context

```typescript
// CharacterId
class CharacterId {
  constructor(private readonly value: string) {
    // UUID v4
  }
}

// CharacterName
class CharacterName {
  constructor(
    private readonly fullName: string,
    private readonly aliases: string[] = [],
    private readonly epithet?: string // Ex: "Luffy do Chapéu de Palha"
  ) {
    this.validate();
  }
}

// Age
class Age {
  constructor(private readonly value: number) {
    if (value < 0 || value > 200) throw new Error('Invalid age');
  }
}

// BountyAmount
class BountyAmount {
  constructor(private readonly value: number) {
    if (value < 0) throw new Error('Bounty cannot be negative');
  }

  format(): string {
    return `฿${this.value.toLocaleString()}`;
  }
}

// Affiliation
class Affiliation {
  constructor(
    private readonly type: AffiliationType,
    private readonly organizationId?: OrganizationId,
    private readonly rank?: string
  ) {}
}

enum AffiliationType {
  PIRATE = 'PIRATE',
  MARINE = 'MARINE',
  REVOLUTIONARY = 'REVOLUTIONARY',
  CIPHER_POL = 'CIPHER_POL',
  CIVILIAN = 'CIVILIAN',
  NOBILITY = 'NOBILITY',
  OTHER = 'OTHER',
}

// Origin
class Origin {
  constructor(
    private readonly sea: Sea,
    private readonly locationId?: LocationId
  ) {}
}

enum Sea {
  EAST_BLUE = 'EAST_BLUE',
  WEST_BLUE = 'WEST_BLUE',
  NORTH_BLUE = 'NORTH_BLUE',
  SOUTH_BLUE = 'SOUTH_BLUE',
  GRAND_LINE = 'GRAND_LINE',
  NEW_WORLD = 'NEW_WORLD',
  CALM_BELT = 'CALM_BELT',
  RED_LINE = 'RED_LINE',
  UNKNOWN = 'UNKNOWN',
}

// Status
class Status {
  constructor(
    private readonly alive: boolean,
    private readonly lastKnownArc?: ArcId,
    private readonly deathArc?: ArcId
  ) {}
}

// Race
class Race {
  constructor(private readonly value: RaceType) {}
}

enum RaceType {
  HUMAN = 'HUMAN',
  FISHMAN = 'FISHMAN',
  MERMAN = 'MERMAN',
  MINK = 'MINK',
  GIANT = 'GIANT',
  DWARF = 'DWARF',
  LONGARM = 'LONGARM',
  LONGLEG = 'LONGLEG',
  SNAKENECK = 'SNAKENECK',
  THREE_EYE = 'THREE_EYE',
  LUNARIAN = 'LUNARIAN',
  CYBORG = 'CYBORG',
  ZOMBIE = 'ZOMBIE',
  SKELETON = 'SKELETON',
  HYBRID = 'HYBRID',
  UNKNOWN = 'UNKNOWN',
}

// Gender
enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  NON_BINARY = 'NON_BINARY',
  UNKNOWN = 'UNKNOWN',
}
```

### Haki Value Objects

```typescript
class HakiAbility {
  constructor(
    private readonly types: HakiType[],
    private readonly advancedForms: AdvancedHaki[] = []
  ) {}
}

enum HakiType {
  OBSERVATION = 'OBSERVATION',      // Kenbunshoku
  ARMAMENT = 'ARMAMENT',            // Busoshoku
  CONQUEROR = 'CONQUEROR',          // Haoshoku
}

enum AdvancedHaki {
  FUTURE_SIGHT = 'FUTURE_SIGHT',                    // Observation avançado
  INTERNAL_DESTRUCTION = 'INTERNAL_DESTRUCTION',    // Armament avançado
  EMISSION = 'EMISSION',                            // Armament - emissão
  CONQUEROR_COATING = 'CONQUEROR_COATING',          // Conqueror coating
}
```

---

## 🔗 Comunicação Entre Bounded Contexts

### Regras
1. **Nunca acessar diretamente entidades de outro contexto**
2. **Usar Application Services como interface**
3. **Eventos de domínio para comunicação assíncrona**
4. **DTOs para transferência de dados**

### Eventos de Domínio

```typescript
// Character Context
class CharacterCreated {
  constructor(
    public readonly characterId: CharacterId,
    public readonly occurredAt: Date
  ) {}
}

class BountyUpdated {
  constructor(
    public readonly characterId: CharacterId,
    public readonly oldBounty: BountyAmount,
    public readonly newBounty: BountyAmount,
    public readonly occurredAt: Date
  ) {}
}

// Battle Context
class BattleRegistered {
  constructor(
    public readonly battleId: BattleId,
    public readonly winnerId: CharacterId,
    public readonly loserId: CharacterId,
    public readonly occurredAt: Date
  ) {}
}

// Relationship Context
class RelationshipCreated {
  constructor(
    public readonly relationshipId: RelationshipId,
    public readonly fromCharacterId: CharacterId,
    public readonly toCharacterId: CharacterId,
    public readonly type: RelationshipType,
    public readonly occurredAt: Date
  ) {}
}

// Power Score recalculation (assíncrono)
// Quando BattleRegistered é disparado, PowerScoreCalculator escuta
// e recalcula os scores dos personagens envolvidos
```

---

## 📊 Agregados Principais

### Character Aggregate

```typescript
class Character {
  private readonly id: CharacterId;
  private name: CharacterName;
  private age?: Age;
  private bountyHistory: Bounty[] = [];
  private affiliation: Affiliation;
  private origin: Origin;
  private status: Status;
  private race: Race;
  private gender: Gender;
  private devilFruit?: DevilFruit;
  private hakiAbility?: HakiAbility;
  private appearances: ArcId[] = [];

  // Regras de negócio
  updateBounty(newBounty: BountyAmount, arc: ArcId): void {
    const oldBounty = this.currentBounty();
    this.bountyHistory.push(new Bounty(newBounty, arc));

    // Dispara evento
    this.addDomainEvent(
      new BountyUpdated(this.id, oldBounty, newBounty, new Date())
    );
  }

  consumeDevilFruit(fruit: DevilFruit, arc: ArcId): void {
    if (this.devilFruit) {
      throw new Error('Character already has a Devil Fruit');
    }
    this.devilFruit = fruit;

    // Dispara evento
    this.addDomainEvent(
      new DevilFruitConsumed(this.id, fruit.id, arc, new Date())
    );
  }

  currentBounty(): BountyAmount {
    if (this.bountyHistory.length === 0) {
      return new BountyAmount(0);
    }
    return this.bountyHistory[this.bountyHistory.length - 1].amount;
  }

  markAsDead(arc: ArcId): void {
    this.status = new Status(false, arc, arc);
    this.addDomainEvent(new CharacterDied(this.id, arc, new Date()));
  }
}
```

### Organization Aggregate

```typescript
class Organization {
  private readonly id: OrganizationId;
  private name: OrganizationName;
  private type: OrganizationType;
  private leaderId?: CharacterId;
  private memberIds: CharacterId[] = [];
  private hierarchy: Map<CharacterId, string> = new Map(); // rank/position
  private territories: LocationId[] = [];

  addMember(characterId: CharacterId, rank?: string): void {
    if (this.memberIds.includes(characterId)) {
      throw new Error('Character is already a member');
    }
    this.memberIds.push(characterId);
    if (rank) {
      this.hierarchy.set(characterId, rank);
    }

    this.addDomainEvent(
      new MemberAddedToOrganization(this.id, characterId, rank, new Date())
    );
  }

  totalBounty(): BountyAmount {
    // Calculado via query agregada - não armazenado
    // Chamaria um repositório ou serviço
  }
}
```

### Battle Aggregate

```typescript
class Battle {
  private readonly id: BattleId;
  private participants: CharacterId[] = [];
  private outcome: Map<CharacterId, BattleOutcome> = new Map();
  private difficulty: BattleDifficulty;
  private location?: LocationId;
  private arc: ArcId;
  private chapter?: number;
  private episode?: number;

  constructor(
    id: BattleId,
    participants: CharacterId[],
    arc: ArcId
  ) {
    if (participants.length < 2) {
      throw new Error('Battle must have at least 2 participants');
    }
    this.id = id;
    this.participants = participants;
    this.arc = arc;
  }

  setOutcome(characterId: CharacterId, outcome: BattleOutcome): void {
    if (!this.participants.includes(characterId)) {
      throw new Error('Character is not a participant');
    }
    this.outcome.set(characterId, outcome);
  }

  getWinner(): CharacterId | null {
    for (const [charId, outcome] of this.outcome.entries()) {
      if (outcome === BattleOutcome.WIN) {
        return charId;
      }
    }
    return null;
  }
}
```

---

## 🗂️ Estrutura de Pastas do Monolito Modular

```
src/
├── modules/
│   ├── character/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── character.entity.ts
│   │   │   │   └── haki.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── character-id.vo.ts
│   │   │   │   ├── character-name.vo.ts
│   │   │   │   ├── bounty-amount.vo.ts
│   │   │   │   └── affiliation.vo.ts
│   │   │   ├── repositories/
│   │   │   │   └── character.repository.interface.ts
│   │   │   └── events/
│   │   │       ├── character-created.event.ts
│   │   │       └── bounty-updated.event.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── create-character.use-case.ts
│   │   │   │   ├── update-bounty.use-case.ts
│   │   │   │   └── get-character.use-case.ts
│   │   │   └── dtos/
│   │   │       ├── create-character.dto.ts
│   │   │       └── character-response.dto.ts
│   │   ├── infrastructure/
│   │   │   ├── persistence/
│   │   │   │   ├── postgres/
│   │   │   │   │   ├── character.repository.ts
│   │   │   │   │   └── character.schema.ts
│   │   │   │   └── neo4j/
│   │   │   │       └── character-node.repository.ts
│   │   │   └── http/
│   │   │       ├── character.controller.ts
│   │   │       └── character.routes.ts
│   │   └── character.module.ts
│   │
│   ├── relationship/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── relationship.module.ts
│   │
│   ├── organization/
│   ├── location/
│   ├── battle/
│   ├── devil-fruit/
│   ├── timeline/
│   ├── user/
│   ├── social/
│   ├── analytics/
│   └── ai/
│
├── shared/
│   ├── domain/
│   │   ├── entity.base.ts
│   │   ├── value-object.base.ts
│   │   ├── aggregate-root.base.ts
│   │   └── domain-event.base.ts
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── cache/
│   │   └── event-bus/
│   └── utils/
│
└── app.module.ts
```

---

## 📝 Resumo dos Value Objects por Contexto

### Character Context
- CharacterId, CharacterName, Age, BountyAmount, Affiliation, Origin, Status, Race, Gender, HakiAbility

### Relationship Context
- RelationshipId, RelationshipType, RelationshipStrength, RelationshipStatus, RelationshipMetadata

### Organization Context
- OrganizationId, OrganizationName, OrganizationType, OrganizationStatus, Territory, TotalBounty

### Location Context
- LocationId, LocationName, Coordinates, Climate, Population, LocationType

### Battle Context
- BattleId, BattleOutcome, BattleDifficulty, BattleLocation, BattleArc, PowerScoreValue, ConfidenceLevel

### Devil Fruit Context
- DevilFruitId, DevilFruitName, DevilFruitType, AwakeningStatus

### Timeline Context
- ArcId, ArcName, ArcPeriod, EventId, EventName, EventType, Timestamp

### User Context
- UserId, Email, Username, Password, Role, UserLevel, Points

### Social Context
- CollectionId, CollectionName, CommentId, CommentContent, Votes

### Analytics Context
- MetricValue, CentralityScore, CommunityId

### AI Context
- ConversationId, MessageId, MessageContent, EmbeddingVector, AIResponse

---

**Última atualização:** 2026-01-07
