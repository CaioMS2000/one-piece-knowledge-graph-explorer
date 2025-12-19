## Entidades do domínio

### 1. Core (Nós do Grafo)

**Character (Personagem)** - Aggregate Root
- ID único
- Nome, idade, origem
- Bounty (Value Object)
- Rank/Cargo (Value Object)
- Afiliação
- Status (vivo/morto)
- Primeira aparição (episódio/capítulo/arco)
- Comportamento:
  - `calculatePowerLevel()`: Calcula power score
  - `shouldBeBlocked(userProgress)`: Verifica se deve bloquear (anti-spoiler)
  - `getTransitivityScore()`: Calcula transitividade

**Organization (Organização)** - Aggregate Root
- ID único
- Nome, tipo (Piratas/Marinha/etc)
- Líder(es) (CharacterId[])
- Membros (CharacterId[])
- Hierarquia
- Bounty total
- Territórios
- Comportamento:
  - `calculateTotalBounty()`
  - `getMembersByRank()`
  - `addMember(characterId)`

**Location (Local)** - Aggregate Root
- ID único
- Nome, mar/região
- Governante (CharacterId)
- Personagens nativos (CharacterId[])
- Eventos ocorridos (EventId[])
- Comportamento:
  - `getCharactersFromLocation()`
  - `getEventsInLocation()`

**DevilFruit (Frutas do Diabo)** - Aggregate Root
- ID único
- Nome (japonês/português)
- Tipo (Paramecia/Zoan/Logia) - Value Object
- Poderes/Habilidades
- Usuário atual (CharacterId)
- Usuários anteriores (CharacterId[])
- Primeira aparição
- Comportamento:
  - `isAwakened()`
  - `getCurrentUser()`

**Event (Evento)** - Aggregate Root
- ID único
- Nome, descrição
- Tipo (Batalha/Revelação/etc)
- Arco (ArcId)
- Episódio/Capítulo
- Personagens envolvidos (CharacterId[])
- Comportamento:
  - `shouldBeBlocked(userProgress)`
  - `getInvolvedCharacters()`

### 2. Relações e Conexões

**Connection (Conexão)** - Entity (filha de Character ou Aggregate Root próprio?)
- ID único
- Origem (CharacterId)
- Destino (CharacterId)
- Tipo (Tripulação/Família/Aliado/etc) - Value Object
- Bidirecional (boolean)
- Primeira aparição (para anti-spoiler)
- Comportamento:
  - `isBidirectional()`
  - `shouldBeBlocked(userProgress)`

**Path (Caminho)** - Aggregate Root (resultado de pathfinding)
- ID único (ou Value Object?)
- Nós do caminho (CharacterId[])
- Estratégia usada
- Score de qualidade
- Comportamento:
  - `getLength()`
  - `getStrength()`
  - `calculateScore()`

### 3. Batalhas e Power Level

**Battle (Batalha)** - Entity (filha de Character ou Aggregate Root?)
- ID único
- Personagem (CharacterId)
- Oponente (CharacterId)
- Resultado (Vitória/Derrota/Empate) - Value Object
- Dificuldade (1-5)
- Capítulo/Episódio
- Arco (ArcId)
- Comportamento:
  - `getBattleScore()`: Calcula contribuição para power level
  - `isVictory()`

**PowerScore (Power Score)** - Value Object
- Total (0-1000)
- Confiança (1-5 estrelas)
- Breakdown (bounty, rank, battles, transitividade)
- Comportamento:
  - `calculate()`: Método estático que calcula
  - `getConfidenceLevel()`

**BattleSimulation (Simulação de Batalha)** - Aggregate Root
- ID único
- Lado A (CharacterId[])
- Lado B (CharacterId[])
- Modo (1v1/equipe/tripulação)
- Ambiente
- Probabilidades calculadas
- Resultados das simulações
- Comportamento:
  - `simulate()`
  - `calculateProbability()`
  - `getConfidence()`

### 4. Usuários e Social

**User (Usuário)** - Aggregate Root
- ID único
- Email, senha (ou OAuth)
- Perfil (bio, avatar)
- Personagem favorito (CharacterId)
- Comportamento:
  - `register()`
  - `updateProfile()`

**UserProgress (Progresso do Usuário)** - Entity (filha de User)
- ID único
- UserId
- Tipo (anime/manga)
- Episódio/Capítulo atual
- Arco atual (ArcId)
- Configurações de bloqueio
- Comportamento:
  - `updateProgress(episode)`
  - `shouldBlockContent(contentId)`
  - `getCurrentArc()`

**Collection (Coleção)** - Aggregate Root
- ID único
- UserId
- Nome, descrição
- Personagens (CharacterId[])
- Tags
- Pública/Privada
- Comportamento:
  - `addCharacter(characterId)`
  - `removeCharacter(characterId)`
  - `isPublic()`

**Achievement (Conquista/Badge)** - Value Object ou Entity?
- ID único
- Nome, descrição, ícone
- Critério de desbloqueio
- Comportamento:
  - `isUnlocked(userStats)`

**UserAchievement (Conquista do Usuário)** - Entity (relacionamento User-Achievement)
- ID único
- UserId
- AchievementId
- Data de desbloqueio
- Comportamento:
  - `unlock()`

**UserStats (Estatísticas do Usuário)** - Entity (filha de User)
- ID único
- UserId
- XP total
- Nível atual
- Personagens explorados (CharacterId[])
- Desafios completos
- Batalhas simuladas
- Comportamento:
  - `addXP(points)`
  - `calculateLevel()`
  - `checkAchievements()`

**Challenge (Desafio)** - Aggregate Root
- ID único
- Título, descrição
- Dificuldade (1-5)
- Critério de conclusão
- Recompensa (pontos)
- Comportamento:
  - `isCompleted(userStats)`
  - `getReward()`

### 5. Chat e IA

**ChatConversation (Conversa)** - Aggregate Root
- ID único
- UserId
- Mensagens (ChatMessage[])
- Contexto do grafo (estado atual)
- Comportamento:
  - `addMessage(message)`
  - `getContext()`

**ChatMessage (Mensagem)** - Entity (filha de ChatConversation)
- ID único
- Tipo (user/assistant)
- Conteúdo
- Timestamp
- Entidades mencionadas (CharacterId[])
- Ações no grafo sugeridas
- Comportamento:
  - `extractEntities()`
  - `getSuggestedActions()`

### 6. Contribuições e Moderação

**Contribution (Contribuição)** - Aggregate Root
- ID único
- UserId
- Tipo (batalha/relação/info/imagem)
- Entidade afetada (CharacterId/OrganizationId/etc)
- Dados sugeridos
- Status (pendente/aprovado/rejeitado)
- Comportamento:
  - `approve()`
  - `reject(reason)`

### 7. Análises e Rankings

**Ranking (Ranking)** - Value Object ou Aggregate Root?
- Tipo (força/bounty/centralidade/etc)
- Personagens ordenados (CharacterId[] com scores)
- Filtros aplicados
- Comportamento:
  - `calculate()`
  - `getTopN(n)`

**CentralityAnalysis (Análise de Centralidade)** - Aggregate Root
- ID único
- Métrica escolhida
- Scores por personagem
- Estatísticas (min/max/média)
- Comportamento:
  - `calculate()`
  - `getTopRanked()`

### 8. Geração e Criatividade

**GeneratedCrew (Tripulação Gerada)** - Aggregate Root
- ID único
- UserId (opcional - se salvo)
- Membros (CharacterId[])
- Estatísticas (balanceamento, versatilidade, sinergia)
- Análise (quem pode derrotar)
- Comportamento:
  - `calculateBalance()`
  - `calculateSynergy()`
  - `canDefeat(organizationId)`

### 9. Timeline e Arcos

**Arc (Arco)** - Aggregate Root
- ID único
- Nome
- Episódio inicial/final
- Capítulo inicial/final
- Ano (início)
- Personagens introduzidos (CharacterId[])
- Eventos principais (EventId[])
- Comportamento:
  - `getCharactersIntroduced()`
  - `getDuration()`

### 10. Visualização e Filtros

**GraphView (Visualização do Grafo)** - Value Object ou Aggregate Root?
- Filtros ativos
- Modo de visualização
- Zoom/Pan
- Nós destacados
- Comportamento:
  - `applyFilters()`
  - `highlightNodes(characterIds)`

**Filter (Filtro)** - Value Object
- Tipo
- Operador
- Valor
- Combinação (AND/OR)
- Comportamento:
  - `matches(character)`

---

## Resumo por categoria

### Aggregate Roots (principais)
1. Character
2. Organization
3. Location
4. DevilFruit
5. Event
6. Path
7. BattleSimulation
8. User
9. Collection
10. Challenge
11. ChatConversation
12. Contribution
13. CentralityAnalysis
14. GeneratedCrew
15. Arc

### Entities (filhas de agregados)
- Battle (pode ser filha de Character ou Aggregate Root próprio)
- Connection (pode ser Aggregate Root próprio)
- ChatMessage (filha de ChatConversation)
- UserProgress (filha de User)
- UserStats (filha de User)
- UserAchievement (relacionamento User-Achievement)

### Value Objects
- Bounty
- CharacterRank
- PowerScore
- BattleResult
- ConnectionType
- DevilFruitType
- Filter
- GraphView (pode ser Value Object)
