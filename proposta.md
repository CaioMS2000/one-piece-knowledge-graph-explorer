# 📋 One Piece Knowledge Graph Explorer
## Documento de Requisitos Funcionais (PRD)

---

## 1. VISÃO GERAL DO PRODUTO

### 1.1 Propósito
Plataforma interativa que combina visualização de grafo de relacionamentos de One Piece com uma IA conversacional, permitindo exploração, análise e descoberta de conexões no universo da série de forma visual e intuitiva.

### 1.2 Público-Alvo
- Fãs casuais de One Piece buscando entender conexões
- Fãs hardcore querendo análises profundas
- Criadores de conteúdo pesquisando para vídeos/artigos
- Escritores de fanfiction buscando inspiração
- Novos fãs querendo explorar sem spoilers
- Comunidade de debate querendo dados objetivos

### 1.3 Diferencial Competitivo
Primeira plataforma que une grafo de conhecimento interativo + IA conversacional contextual + dados estruturados de One Piece em uma única experiência integrada.

---

## 2. REQUISITOS FUNCIONAIS PRINCIPAIS

### 2.1 MÓDULO: Visualização do Grafo

#### RF001: Renderização do Grafo Base
**Prioridade:** Alta | **Complexidade:** Alta

**Descrição:** Sistema deve renderizar grafo interativo com todos os personagens e suas conexões

**Critérios de Aceitação:**
- [ ] Renderizar 1000+ nós (personagens) simultaneamente
- [ ] Performance: 60fps em navegadores modernos
- [ ] Zoom: 0.1x até 10x sem perda de qualidade
- [ ] Pan: navegação fluida em qualquer direção
- [ ] Diferentes layouts: força-dirigido, hierárquico, circular, radial
- [ ] Renderização progressiva para grandes datasets

**Tipos de Nós:**
- Personagens (cores por afiliação)
- Locais (formato hexagonal)
- Organizações (formato diamante)
- Frutas do Diabo (formato estrela)
- Eventos importantes (formato triângulo)

**Tipos de Conexões (Arestas):**
| Tipo | Cor | Estilo | Bidirecional |
|------|-----|--------|--------------|
| Tripulação | Azul | Sólido | Sim |
| Família | Verde | Sólido | Sim |
| Aliado | Ciano | Tracejado | Sim |
| Inimigo | Vermelho | Sólido | Sim |
| Mentor/Discípulo | Roxo | Seta | Não |
| Rival | Laranja | Dupla linha | Sim |
| Derrotou | Vermelho escuro | Seta grossa | Não |
| Romance | Rosa | Pontilhado | Sim |
| Conhece | Cinza | Fino | Sim |

#### RF002: Interação com Nós
**Prioridade:** Alta | **Complexidade:** Média

**Ações disponíveis:**
- **Hover:** Mostrar tooltip com info básica (nome, afiliação, bounty)
- **Click simples:** Abrir painel lateral com detalhes
- **Click duplo:** Centralizar e destacar conexões diretas
- **Click direito:** Menu contextual com ações
- **Shift+Click:** Selecionar múltiplos nós
- **Drag:** Reposicionar nó (pin/unpin)
- **Ctrl+Click:** Adicionar à comparação

**Menu Contextual:**
```
┌──────────────────────────────┐
│ Ver detalhes completos       │
│ Perguntar à IA sobre isso    │
│ ─────────────────────────    │
│ Mostrar conexões de:         │
│   ├─ Nível 1 (diretas)       │
│   ├─ Nível 2                 │
│   └─ Todas                   │
│ ─────────────────────────    │
│ Esconder este nó             │
│ Fixar posição                │
│ Adicionar à coleção          │
│ Compartilhar                 │
└──────────────────────────────┘
```

#### RF003: Filtros e Visualizações
**Prioridade:** Alta | **Complexidade:** Alta

**Filtros Básicos:**
- [ ] Por afiliação (Piratas, Marinha, Revolucionários, etc.)
- [ ] Por tipo de fruta do diabo (Paramecia, Zoan, Logia)
- [ ] Por mar de origem (East Blue, North Blue, etc.)
- [ ] Por status (vivo, morto, desconhecido)
- [ ] Por período de aparição (arcos específicos)
- [ ] Por nível de recompensa (ranges personalizáveis)

**Modos de Visualização:**

**1. Modo Timeline**
- Slider temporal mostrando evolução do grafo
- Animação de aparição de personagens ao longo dos arcos
- "Play" automático mostrando crescimento da história
- Comparação side-by-side de diferentes momentos

**2. Modo Ego Network**
- Centraliza em um personagem específico
- Mostra conexões em níveis radiais (1°, 2°, 3° grau)
- Útil para "universo de influência"

**3. Modo Comparação**
- Split screen: dois subgrafos lado a lado
- Ex: Tripulação Luffy vs Tripulação Law
- Métricas comparativas visíveis

**4. Modo Hierárquico**
- Organização top-down por poder/hierarquia
- Yonkou no topo → Comandantes → Subordinados
- Útil para estruturas organizacionais

**5. Modo Heatmap**
- Cores representam métricas (força, centralidade, conexões)
- Gradiente visual de "importância"

**6. Modo 3D** (Opcional/Futuro)
- Grafo em três dimensões
- Navegação orbital com mouse/touch
- Imersivo para exploração livre

#### RF004: Busca e Navegação
**Prioridade:** Alta | **Complexidade:** Média

**Barra de Busca:**
- [ ] Autocompletar inteligente
- [ ] Sugestões baseadas em contexto
- [ ] Busca fuzzy (tolera erros de digitação)
- [ ] Busca por múltiplos termos (AND/OR)
- [ ] Histórico de buscas

**Exemplos de buscas:**
- "Luffy" → personagem
- "Yonko" → todos os yonkou
- "Logia" → todos usuários de logia
- "East Blue + Pirata" → piratas do East Blue
- "derrotou Luffy" → quem derrotou Luffy

**Navegação por Breadcrumbs:**
```
Home > Personagens > Piratas > Chapéus de Palha > Monkey D. Luffy
```

#### RF005: Pathfinding (Caminhos entre Nós)
**Prioridade:** Média | **Complexidade:** Alta

**Descrição:** Encontrar e visualizar caminhos entre dois personagens

**Funcionalidades:**
- [ ] Shortest path (caminho mais curto)
- [ ] All paths até profundidade N
- [ ] Path mais "forte" (através de personagens poderosos)
- [ ] Path mais "comum" (através de conexões frequentes)
- [ ] Evitar certos tipos de conexão (ex: só aliados, sem inimigos)

**Interface:**
```
Encontrar caminho de [Luffy ▼] até [Shanks ▼]

Filtros:
☑ Usar conexões: Aliado, Tripulação, Família
☐ Incluir: Inimigos
☑ Preferir: Caminhos mais curtos
☐ Evitar: Personagens mortos

[Buscar Caminhos]

Resultado: 2 caminhos encontrados
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Luffy → Ace → Barba Branca → Shanks (3 passos)
2. Luffy → Rayleigh → Shanks (2 passos) ⭐ Mais curto
```

---

### 2.2 MÓDULO: Inteligência Artificial Conversacional

#### RF006: Chat Interface
**Prioridade:** Alta | **Complexidade:** Alta

**Descrição:** Interface de chat integrada que permite conversação natural sobre o universo One Piece

**Características:**
- [ ] Input de texto com suporte a mensagens longas
- [ ] Input de voz (Speech-to-Text)
- [ ] Histórico de conversação persistente
- [ ] Contexto mantido entre mensagens
- [ ] Sugestões de perguntas ("Você também pode perguntar...")
- [ ] Typing indicators durante processamento
- [ ] Markdown/formatação rica nas respostas

**Localização:**
- Painel lateral retrátil (preferencial)
- Overlay fullscreen (mobile)
- Quick chat flutuante (minimizado)

#### RF007: Perguntas Contextuais ao Grafo
**Prioridade:** Alta | **Complexidade:** Alta

**Categorias de Perguntas:**

**1. Perguntas de Caminho:**
- "Qual a conexão entre Luffy e Doflamingo?"
- "Como o Zoro conhece o Mihawk?"
- "Quantos graus de separação entre X e Y?"

**Comportamento esperado:**
- IA identifica os nós mencionados
- Calcula caminhos no grafo
- Ilumina visualmente o caminho no grafo
- Explica cada conexão em linguagem natural

**2. Perguntas de Agregação:**
- "Quantos personagens são usuários de Logia?"
- "Qual organização tem mais membros?"
- "Quem tem mais inimigos?"

**Comportamento esperado:**
- IA consulta dados estruturados
- Aplica filtros/agregações
- Retorna estatísticas
- Oferece visualizar no grafo

**3. Perguntas de Comparação:**
- "Quem é mais forte: Zoro ou Sanji?"
- "Compare a Tripulação do Luffy com a do Law"
- "Qual Yonko tem a tripulação maior?"

**Comportamento esperado:**
- IA busca métricas relevantes
- Calcula comparações
- Apresenta pros/contras
- Visualiza lado a lado se possível

**4. Perguntas de Análise:**
- "Por que o Crocodile quis Pluton?"
- "Qual o objetivo do Barba Negra?"
- "Explica a relação entre Ace e Luffy"

**Comportamento esperado:**
- IA busca informações narrativas da wiki
- Sintetiza contexto
- Fornece explicação clara
- Cita fontes (capítulos/episódios)

**5. Perguntas Hipotéticas:**
- "E se o Zoro tivesse comido uma Logia?"
- "Quem ganharia: Gear 5 Luffy vs Akainu?"
- "Qual seria o bounty do Garp se fosse pirata?"

**Comportamento esperado:**
- IA analisa padrões similares
- Faz inferências baseadas em dados
- Apresenta como especulação
- Explica raciocínio

**6. Perguntas de Descoberta:**
- "Me sugere algo interessante sobre o Buggy"
- "Qual conexão mais surpreendente no grafo?"
- "Me mostra um personagem obscuro mas importante"

**Comportamento esperado:**
- IA usa algoritmos de grafo (centralidade, etc)
- Identifica anomalias/curiosidades
- Apresenta descobertas
- Oferece explorar mais

#### RF008: Sincronização Chat ↔ Grafo
**Prioridade:** Alta | **Complexidade:** Alta

**Descrição:** Chat e grafo devem estar perfeitamente sincronizados

**Comportamentos:**

**Quando usuário pergunta algo:**
- Grafo automaticamente destaca nós/conexões relevantes
- Zoom/pan para região mencionada
- Temporariamente oculta elementos não relacionados (opcional)
- Adiciona anotações visuais

**Quando usuário interage com grafo:**
- IA oferece contexto sobre o que foi clicado
- Histórico de chat mostra item relacionado
- Quick actions: "Perguntar sobre isso"

**Exemplo de fluxo:**
```
👤 Usuário: "Me mostra inimigos do Luffy"

🤖 IA: 
Encontrei 23 personagens que foram inimigos 
do Luffy em algum momento. Os principais são:

[Grafo destaca 23 nós em vermelho]
[Zoom para mostrar cluster]

• Crocodile (derrotado em Alabasta)
• Enel (derrotado em Skypiea)  
• Rob Lucci (derrotado em Enies Lobby)
• Gecko Moria (derrotado em Thriller Bark)
• Magellan (Luffy foi derrotado)
• Doflamingo (derrotado em Dressrosa)
• Katakuri (vitória difícil em WCI)
• Kaido (derrotado em Wano)

[Ver todos os 23] [Filtrar por ainda vivos]

Quer explorar algum confronto específico?
```

#### RF009: Assistente de Exploração Guiada
**Prioridade:** Média | **Complexidade:** Média

**Descrição:** IA sugere caminhos de exploração interessantes

**Modos de Sugestão:**

**1. Tour Guiado:**
```
🤖 "Parece que você é novo! Quer que eu te mostre 
    os principais grupos de One Piece?"

[Sim, por favor] [Não, vou explorar sozinho]

→ Se sim:
"Ótimo! Vamos começar pelos Chapéus de Palha..."
[Ilumina região, explica, oferece next step]
```

**2. Descobertas Automáticas:**
```
🤖 "Você sabia? Enquanto você explorava os Yonko,
    notei que Big Mom e Kaido foram tripulantes 
    juntos no passado! Quer ver essa conexão?"

[Mostrar] [Depois] [Não me interessa]
```

**3. Desafios:**
```
🤖 "Desafio para você! 
    Encontre uma conexão entre Nami e Kaido 
    usando apenas 4 personagens.
    
    Tempo: 2 minutos
    Dificuldade: ⭐⭐⭐☆☆"

[Aceitar] [Muito difícil] [Outro desafio]
```

#### RF010: RAG (Retrieval Augmented Generation)
**Prioridade:** Alta | **Complexidade:** Alta

**Descrição:** IA deve buscar informações relevantes antes de responder

**Pipeline:**
1. Usuário faz pergunta
2. Sistema identifica entidades mencionadas
3. Busca informações no:
   - Grafo de conhecimento
   - Base de dados estruturados
   - Textos da wiki (embeddings)
   - Conversas anteriores do usuário
4. LLM gera resposta usando contexto recuperado
5. Resposta inclui citações/fontes

**Exemplo:**
```
👤 "Por que o Ace foi executado?"

[Sistema busca:]
- Nó "Portgas D. Ace"
- Evento "Marineford"
- Relações: Ace ↔ Barba Branca, Ace ↔ Luffy
- Textos da wiki sobre a guerra

🤖 "Ace foi capturado pela Marinha após perder para
    Barba Negra, que o entregou ao Governo Mundial.
    
    Ele seria executado por ser:
    1. Filho do Rei dos Piratas, Gol D. Roger
    2. Comandante do Barba Branca (Yonko)
    
    Isso levou à Guerra de Marineford, onde Ace 
    acabou morrendo ao proteger Luffy do Akainu.
    
    📖 Fonte: Capítulos 551-574 | Episódios 460-483"

[Ver no grafo] [Me conta mais sobre a guerra]
```

---

### 2.3 MÓDULO: Power Level System

#### RF011: Cálculo de Força Estimada
**Prioridade:** Média | **Complexidade:** Alta

**Descrição:** Sistema calcula "power level" estimado para cada personagem

**Fontes de Dados:**
1. **Bounties (Recompensas):** Peso 30%
2. **Posições/Cargos:** Peso 25%
   - Yonko, Almirante, Comandante, etc.
3. **Batalhas Registradas:** Peso 35%
   - Vitórias, derrotas, empates
   - Dificuldade da batalha (se disponível)
4. **Transitividade:** Peso 10%
   - Força herdada de conexões

**Algoritmo Base:**
```javascript
score = (bounty/1M * 0.3) + 
        (cargo_rank * 0.25) + 
        (batalhas_score * 0.35) + 
        (transitive_score * 0.1)
```

**Transitividade:**
```
Zoro derrotou King (difícil) → +80
King era comandante de Kaido → +50 herdado
Kaido é Yonko → +30 herdado
Total via esse caminho: 160

[Calcular múltiplos caminhos e fazer média ponderada]
```

**Níveis de Confiança:**
- ⭐⭐⭐⭐⭐ Alta (múltiplas fontes convergem)
- ⭐⭐⭐⭐☆ Boa (dados suficientes)
- ⭐⭐⭐☆☆ Média (alguns dados faltando)
- ⭐⭐☆☆☆ Baixa (poucos dados)
- ⭐☆☆☆☆ Especulação (muito incerto)

#### RF012: Comparador de Força
**Prioridade:** Média | **Complexidade:** Média

**Descrição:** Interface para comparar força entre personagens

**Interface:**
```
╔════════════════════════════════════════════╗
║     COMPARADOR DE PERSONAGENS              ║
╠════════════════════════════════════════════╣
║                                            ║
║  👤 Roronoa Zoro        VS    Sanji 👤     ║
║                                            ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║                                            ║
║  Power Score:                              ║
║  ████████████░ 850      820 ████████████░  ║
║                                            ║
║  Bounty:                                   ║
║  1,111,000,000          1,032,000,000      ║
║                                            ║
║  Vitórias Notáveis:                        ║
║  • King (Yonko cmd.)    • Queen (Yonko cmd║
║  • Pica (Shichibukai)   • Jabra (CP9)     ║
║  • Mr. 1 (Baroque)      • Absalom (Moriah)║
║                                            ║
║  Habilidades Únicas:                       ║
║  • Conquerers Haki      • Sky Walk        ║
║  • Advanced Armament    • Observation     ║
║  • Enma (sword)         • Diable Jambe    ║
║                                            ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
║                                            ║
║  🤖 Análise da IA:                         ║
║  "Ambos são extremamente fortes. Zoro tem ║
║  vantagem em ataque bruto e resistência.  ║
║  Sanji tem vantagem em velocidade e chute.║
║  Em batalha real: Zoro 52% - Sanji 48%    ║
║  (margem muito pequena para decisão)"     ║
║                                            ║
║  Confiança: ⭐⭐⭐⭐☆                        ║
║                                            ║
║  [Ver no Grafo] [Simular Batalha]         ║
╚════════════════════════════════════════════╝
```

#### RF013: Ranking Global
**Prioridade:** Baixa | **Complexidade:** Média

**Descrição:** Rankings de personagens por diferentes métricas

**Tipos de Ranking:**
- **Por Força Geral:** Top 100 mais fortes
- **Por Bounty:** Maiores recompensas
- **Por Conexões:** Mais conectados no grafo
- **Por Influência:** Centralidade no grafo (PageRank)
- **Por Vitórias:** Mais batalhas vencidas
- **Por Evolução:** Maior crescimento de poder

**Filtros:**
- Vivos / Mortos / Todos
- Por organização
- Por período (ex: "Força em Alabasta")

**Interface:**
```
╔═══════════════════════════════════════════╗
║ 🏆 TOP 10 PERSONAGENS POR FORÇA           ║
╠═══════════════════════════════════════════╣
║                                           ║
║ 1. ⚓ Monkey D. Luffy         Score: 980 ║
║    └─ Yonko | Gear 5 | 3B bounty         ║
║                                           ║
║ 2. 🗡️ Dracule Mihawk          Score: 950 ║
║    └─ Shichibukai | World's Strongest    ║
║                                           ║
║ 3. ⚔️ Shanks                  Score: 945 ║
║    └─ Yonko | Haki Master                ║
║                                           ║
║ 4. 🐉 Kaido                   Score: 940 ║
║    └─ Ex-Yonko | Strongest Creature      ║
║                                           ║
║ 5. ⛰️ Sakazuki (Akainu)       Score: 920 ║
║    └─ Fleet Admiral | Logia              ║
║                                           ║
║ [Ver completo] [Filtrar] [Histórico]     ║
╚═══════════════════════════════════════════╝
```

---

### 2.4 MÓDULO: Dados e Perfis

#### RF014: Perfil Detalhado de Personagem
**Prioridade:** Alta | **Complexidade:** Média

**Painel Lateral com Abas:**

**Aba 1: Informações Básicas**
```
┌────────────────────────────────────┐
│ [FOTO]   Monkey D. Luffy           │
│          Capitão dos Piratas do    │
│          Chapéu de Palha           │
├────────────────────────────────────┤
│ 🏴‍☠️ Afiliação: Piratas            │
│ 💰 Bounty: 3,000,000,000          │
│ 🎂 Idade: 19 anos                 │
│ 📍 Origem: East Blue, Foosha      │
│ 🍓 Fruta: Gomu Gomu no Mi         │
│ ⚔️ Haki: Todos os 3 tipos        │
│ 🎯 Sonho: Ser o Rei dos Piratas   │
├────────────────────────────────────┤
│ [Ver na Wiki] [Editar] [↗️ Share]  │
└────────────────────────────────────┘
```

**Aba 2: Relações (Grafo Local)**
- Mini-grafo mostrando conexões diretas
- Agrupado por tipo (tripulação, família, rivais)
- Click expande para nível 2

**Aba 3: Timeline**
- Aparições cronológicas
- Arcos participados
- Eventos importantes
- Evoluções de poder

**Aba 4: Batalhas**
```
╔════════════════════════════════════╗
║ ⚔️ REGISTRO DE BATALHAS            ║
╠════════════════════════════════════╣
║ Vitórias: 34 | Derrotas: 8         ║
║ Taxa de Vitória: 81%               ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                    ║
║ ✅ vs Kaido (Wano) - Vitória       ║
║    Dificuldade: ⭐⭐⭐⭐⭐          ║
║    Cap. 1049 | Ep. 1071            ║
║                                    ║
║ ✅ vs Katakuri (WCI) - Vitória     ║
║    Dificuldade: ⭐⭐⭐⭐⭐          ║
║    Cap. 896 | Ep. 870              ║
║                                    ║
║ ❌ vs Magellan (Impel) - Derrota   ║
║    Quase morreu envenenado         ║
║    Cap. 543 | Ep. 446              ║
║                                    ║
║ [Ver todas] [Estatísticas]         ║
╚════════════════════════════════════╝
```

**Aba 5: Galeria**
- Imagens do personagem
- Filtros: Mangá, Anime, Fanart
- Evolução visual ao longo dos arcos

**Aba 6: Citações**
- Frases icônicas
- Pode votar em favoritas
- Contexto (episódio/capítulo)

**Aba 7: Curiosidades**
- Trivia da wiki
- Easter eggs
- Referências culturais

#### RF015: Fichas de Organizações
**Prioridade:** Média | **Complexidade:** Média

**Descrição:** Perfis para organizações (tripulações, marinha, etc)

**Conteúdo:**
- Nome e bandeira/símbolo
- Líder(es)
- Membros (lista com mini-cards)
- Hierarquia visual
- Bounty total acumulado
- Territórios controlados
- Filosofia/Objetivo
- História
- Relações com outras organizações

**Exemplo: Piratas do Chapéu de Palha**
```
╔═══════════════════════════════════════╗
║ ⛵ PIRATAS DO CHAPÉU DE PALHA         ║
╠═══════════════════════════════════════╣
║ 👑 Capitão: Monkey D. Luffy           ║
║ 🏴‍☠️ Membros: 10                      ║
║ 💰 Bounty Total: 8,816,001,000        ║
║ 🚢 Navio: Thousand Sunny              ║
║ 🌊 Mar Atual: Grand Line - Novo Mundo ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                       ║
║ MEMBROS (ordem de entrada):           ║
║ 1. [img] Luffy - Capitão              ║
║ 2. [img] Zoro - Espadachim            ║
║ 3. [img] Nami - Navegadora            ║
║ 4. [img] Usopp - Atirador             ║
║ 5. [img] Sanji - Cozinheiro           ║
║ ... [Ver todos 10]                    ║
║                                       ║
║ ALIADOS:                              ║
║ • Grande Frota (7 tripulações)        ║
║ • Revolucionários                     ║
║ • Minks de Zou                        ║
║ ... [Ver 23 aliados]                  ║
║                                       ║
║ [Ver Hierarquia] [Timeline] [Grafo]  ║
╚═══════════════════════════════════════╝
```

#### RF016: Fichas de Locais
**Prioridade:** Baixa | **Complexidade:** Baixa

**Conteúdo:**
- Nome e imagem
- Mar/Região
- Governante/Líder
- População estimada
- Personagens nativos
- Eventos importantes ocorridos
- Curiosidades geográficas

#### RF017: Fichas de Frutas do Diabo
**Prioridade:** Baixa | **Complexidade:** Baixa

**Conteúdo:**
- Nome (japonês e português)
- Tipo (Paramecia/Zoan/Logia)
- Poderes/Habilidades
- Usuário atual
- Usuários anteriores
- Fraquezas conhecidas
- Despertar (se aplicável)
- Primeira aparição

---

### 2.5 MÓDULO: Geração e Criatividade

#### RF018: Gerador de Tripulação
**Prioridade:** Baixa | **Complexidade:** Média

**Descrição:** Cria tripulações balanceadas aleatoriamente

**Parâmetros:**
- Número de membros (3-20)
- Nível de poder desejado
- Tipo de tripulação (pirata, marinha, mista)
- Incluir usuários de fruta? (sim/não/aleatório)
- Balancear habilidades? (sim/não)

**Output:**
```
╔════════════════════════════════════════╗
║ 🎲 SUA TRIPULAÇÃO ALEATÓRIA            ║
╠════════════════════════════════════════╣
║ Nome sugerido: "Piratas do Dragão Azul║
║ Power Score Total: 3,450               ║
║ Bounty Total Estimado: 2.1B            ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                        ║
║ 👑 CAPITÃO                             ║
║ Trafalgar Law - Usuário de Ope Ope    ║
║                                        ║
║ ⚔️ COMBATENTES                         ║
║ Killer - Especialista em lâminas      ║
║ Boa Hancock - Usuária de Mero Mero    ║
║                                        ║
║ 🔧 SUPORTE                             ║
║ Franky - Carpinteiro/Ciborgue         ║
║ Chopper - Médico                       ║
║                                        ║
║ 🎯 ESPECIALISTAS                       ║
║ Nami - Navegadora                      ║
║ Robin - Arqueóloga                     ║
║                                        ║
║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                        ║
║ 📊 ANÁLISE:                            ║
║ Balanceamento: ████████░░ 80%          ║
║ Versatilidade: ██████████ 95%          ║
║ Sinergia: ████████░░ 75%               ║
║                                        ║
║ 💪 Esta tripulação poderia derrotar:   ║
║ ✅ CP9                                 ║
║ ✅ Donquixote Pirates                  ║
║ ⚠️ Big Mom Pirates (50/50)            ║
║ ❌ Beast Pirates                       ║
║                                        ║
║ [↻ Gerar Nova] [💾 Salvar] [⚔️ Simular║
╚════════════════════════════════════════╝
```

**Opções Avançadas:**
- Temas (ex: "só zoan", "só espadachins")
- Era específica (ex: "pré-timeskip")
- Restrições (ex: "sem Yonko")

#### RF019: Simulador de Batalhas
**Prioridade:** Baixa | **Complexidade:** Alta

**Descrição:** Simula batalhas entre personagens/tripulações

**Modos:**
1. **1v1:** Personagem vs Personagem
2. **Equipe vs Equipe:** 3v3, 5v5, etc
3. **Tripulação vs Tripulação:** Combates múltiplos
4. **Torneio:** Bracket elimination

**Mecânica Base:**
```javascript
// Fatores considerados
- Power scores de cada lado
- Vantagens de tipo (ex: borracha vs elétrico)
- Sinergia entre aliados
- Ambiente de batalha
- Condições especiais
- Aleatoriedade (10-20%)

// Output
Probabilidade de vitória: 65% Luffy - 35% Crocodile
Simulação: 1000 batalhas
Vitórias Luffy: 654 | Vitórias Crocodile: 346

[Detalhes da Simulação] [Rodar Novamente]
```

**Animação (Opcional):**
- Visualização simplificada da "batalha"
- Barra de HP diminuindo
- Efeitos visuais básicos
- Narração da IA explicando eventos chave

#### RF020: Gerador de "E Se?"
**Prioridade:** Baixa | **Complexidade:** Alta

**Descrição:** Cria cenários hipotéticos interessantes

**Tipos:**

**1. Troca de Frutas:**
```
"E se Zoro tivesse comido a Gomu Gomu no Mi?"

🤖 IA analisa:
- Estilo de luta do Zoro (três espadas)
- Poderes da Gomu Gomu
- Sinergia potencial

Resultado:
"Zoro com Gomu Gomu seria interessante!
Poderia esticar as espadas para ataques à distância.
'Gomu Gomu no Santoryu' seria devastador.
Power Score Estimado: 920 (vs 850 atual)

Porém, perderia a capacidade de nadar e
sua filosofia de força bruta poderia conflitar
com as técnicas criativas da Gomu Gomu."

[Ver Mais Cenários] [Gerar Imagem] [Compartilhar]
```

**2. Alianças Alternativas:**
```
"E se Law tivesse se aliado com Doflamingo?"

🤖 IA cria narrativa baseada em:
- Personalidades
- Motivações
- Histórico
- Consequências em cadeia

[Gera história de 3-4 parágrafos]
```

**3. Matchups Impossíveis:**
```
"E se Roger enfrentasse Luffy Gear 5?"

[Análise comparativa entre eras]
```

#### RF021: Meme/Poster Generator
**Prioridade:** Baixa | **Complexidade:** Baixa

**Funcionalidades:**
- Wanted Poster customizado (seu nome, foto, bounty)
- Comparações tipo "Virgin vs Chad"
- Power scaling tier lists
- Memes templates populares
- Compartilhar nas redes sociais

---

### 2.6 MÓDULO: Social e Comunidade

#### RF022: Sistema de Usuários
**Prioridade:** Média | **Complexidade:** Média

**Registro/Login:**
- Email + senha
- OAuth (Google, Discord, Twitter)
- Guest mode (limitado)

**Perfil de Usuário:**
- Avatar
- Bio curta
- Personagem favorito
- Conquistas/Badges
- Estatísticas (explorações, descobertas)
- Histórico de atividades

#### RF023: Coleções e Favoritos
**Prioridade:** Média | **Complexidade:** Baixa

**Funcionalidades:**
- Marcar personagens favoritos
- Criar listas/coleções personalizadas
- Tags customizadas
- Notas privadas sobre personagens
- Compartilhar coleções publicamente

**Exemplos de Coleções:**
- "Meus Top 10 Personagens"
- "Usuários de Logia"
- "Personagens Subestimados"
- "Minha Tripulação dos Sonhos"

#### RF024: Comentários e Discussões
**Prioridade:** Baixa | **Complexidade:** Média

**Onde:**
- Em perfis de personagens
- Em descobertas/análises
- Em simulações de batalha

**Recursos:**
- Upvote/Downvote
- Respostas aninhadas
- Menções (@usuário)
- Markdown support
- Report abuso

#### RF025: Ranking e Gamificação
**Prioridade:** Baixa | **Complexidade:** Média

**Sistema de Pontos:**
- Explorar novos personagens: +10
- Completar desafios: +50-500
- Descobrir conexões raras: +100
- Contribuir dados: +200
- Daily login: +5

**Níveis:**
```
🌊 Nível 1-10: Novato do East Blue
⛵ Nível 11-25: Pirata Rookie
🏴‍☠️ Nível 26-50: Supernova
👑 Nível 51-75: Shichibukai
⚓ Nível 76-99: Yonko
🌟 Nível 100: Rei dos Piratas
```

**Conquistas (Badges):**
- 🔍 "Explorador": Viu 100+ personagens
- 🧠 "Enciclopédia": Leu 50+ perfis completos
- ⚔️ "Estrategista": Simulou 100 batalhas
- 🎯 "Desafiante": Completou 20 desafios
- 💎 "Descobridor": Achou 10 conexões raras
- 🌐 "Social": 50 contribuições na comunidade

#### RF026: Modo Anti-Spoiler
**Prioridade:** Alta | **Complexidade:** Média

**Descrição:** Permite usuários explorarem sem spoilers

**Configuração:**
```
┌────────────────────────────────────────┐
│ 🔒 CONFIGURAÇÃO ANTI-SPOILER           │
├────────────────────────────────────────┤
│                                        │
│ Onde você está na história?            │
│                                        │
│ 📺 Anime: [Episódio ▼] [1088 ▼]       │
│ 📖 Mangá: [Capítulo ▼] [1095 ▼]       │
│                                        │
│ ou escolha por arco:                   │
│ [Arco ▼] [País de Wano - Completo]    │
│                                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                        │
│ O que será bloqueado:                  │
│ ☑ Personagens que ainda não apareceram │
│ ☑ Eventos futuros                      │
│ ☑ Revelações importantes               │
│ ☑ Frutas do diabo reveladas depois    │
│                                        │
│ [Salvar] [Resetar]                     │
└────────────────────────────────────────┘
```

**Comportamento:**
- Personagens futuros ficam "bloqueados" (blurred)
- Hover mostra "Bloqueado - Aparece em Ep. XXX"
- Grafo só mostra conexões até o ponto atual
- IA evita mencionar spoilers nas respostas
- Alertas se usuário tentar acessar conteúdo futuro

**Modo Progressivo:**
- Usuário pode "marcar como assistido" cada episódio
- Sistema automaticamente desbloqueia conteúdo novo
- Notificações: "3 novos personagens desbloqueados!"

---

### 2.7 MÓDULO: Análises Avançadas

#### RF027: Análise de Centralidade
**Prioridade:** Baixa | **Complexidade:** Alta

**Métricas de Grafo:**

**1. Degree Centrality:**
- Quem tem mais conexões diretas?
- "Personagem mais social"

**2. Betweenness Centrality:**
- Quem conecta mais clusters?
- "Personagem ponte"

**3. Closeness Centrality:**
- Quem está mais "próximo" de todos?
- "Centro do universo One Piece"

**4. PageRank:**
- Quem é mais "importante" considerando importância dos vizinhos?
- "Personagem mais influente"

**5. Clustering Coefficient:**
- Quão conectados são os amigos de X?
- "Coesão de grupo"

**Interface:**
```
╔═══════════════════════════════════════════╗
║ 📊 ANÁLISE DE CENTRALIDADE                ║
╠═══════════════════════════════════════════╣
║                                           ║
║ Métrica: [PageRank ▼]                     ║
║                                           ║
║ TOP 5 MAIS INFLUENTES:                    ║
║                                           ║
║ 1. Monkey D. Luffy         Score: 0.0234 ║
║    └─ Conecta 12 clusters principais      ║
║                                           ║
║ 2. Trafalgar Law           Score: 0.0189 ║
║    └─ Ponte entre múltiplas organizações  ║
║                                           ║
║ 3. Shanks                  Score: 0.0176 ║
║    └─ Ligado a todas as gerações          ║
║                                           ║
║ 4. Monkey D. Garp          Score: 0.0165 ║
║    └─ Conecta Marinha e Piratas           ║
║                                           ║
║ 5. Nico Robin              Score: 0.0158 ║
║    └─ Conhecimento universal              ║
║                                           ║
║ [Visualizar no Grafo] [Comparar Métricas]║
╚═══════════════════════════════════════════╝
```

#### RF028: Detecção de Comunidades
**Prioridade:** Baixa | **Complexidade:** Alta

**Descrição:** Identifica clusters naturais no grafo

**Algoritmos:**
- Louvain Method
- Label Propagation
- Modularity Optimization

**Output:**
```
🔍 Detectadas 24 comunidades principais:

1. Chapéus de Palha & Aliados (47 membros)
2. Marinha - Topo (38 membros)
3. Big Mom Pirates (63 membros)
4. Beast Pirates (71 membros)
5. Barba Negra Pirates (22 membros)
...

[Visualizar separado] [Comparar comunidades]
```

**Visualização:**
- Cada comunidade com cor diferente
- Tamanho do cluster proporcional ao número
- Conexões entre clusters destacadas

#### RF029: Evolução Temporal
**Prioridade:** Média | **Complexidade:** Alta

**Descrição:** Análise de como o grafo evolui ao longo do tempo

**Gráficos:**
1. **Crescimento de Nós:** Personagens ao longo dos arcos
2. **Densidade de Conexões:** Como aumenta com o tempo
3. **Evolução de Poder:** Bounties ao longo do tempo
4. **Taxa de Mortalidade:** Personagens que morrem por arco
5. **Novos Tipos:** Quando frutas/habilidades aparecem

**Interface Interativa:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[▶] 1997 ═══●══════════════════════ 2024

Arco Atual: Alabasta (2001)

Personagens: 156
Conexões: 342
Bounty Média: 45M
Mortes até agora: 8

[Gráfico de linha mostrando crescimento]

[Play Timeline] [Comparar Arcos]
```

#### RF030: Predições e Padrões
**Prioridade:** Baixa | **Complexidade:** Alta

**Tipos de Predição:**

**1. Próxima Recompensa:**
```
Baseado no padrão de crescimento:
Luffy: 3B (atual) → ~4.5B (próximo)

[Gráfico mostrando crescimento exponencial]
Confiança: 68%
```

**2. Próximas Alianças:**
```
Probabilidade de futura aliança:

Luffy ↔ Hancock: 85% (já amigos, interesses alinhados)
Law ↔ Kid: 45% (rivais mas objetivos similares)
Smoker ↔ Luffy: 62% (padrão de inimigo → aliado)
```

**3. Personagens Subestimados:**
```
IA identificou personagens com baixa exposição
mas alta centralidade no grafo:

• Scopper Gaban (Roger Pirates)
• Marco the Phoenix (crescimento recente)
• Jewelry Bonney (conexões surpreendentes)

"Esses podem ser mais importantes futuramente"
```

---

### 2.8 MÓDULO: Ferramentas de Criador

#### RF031: API Pública
**Prioridade:** Baixa | **Complexidade:** Média

**Descrição:** API REST para desenvolvedores externos

**Endpoints:**
```
GET /api/characters
GET /api/characters/{id}
GET /api/characters/{id}/connections
GET /api/organizations
GET /api/locations
GET /api/devil-fruits
GET /api/search?q={query}
GET /api/battles/{characterId}
POST /api/compare (body: {char1, char2})
```

**Rate Limits:**
- Free tier: 100 requests/hour
- Basic: 1000 requests/hour
- Pro: 10000 requests/hour

**Documentação:**
- Swagger/OpenAPI spec
- Exemplos em múltiplas linguagens
- SDK para JavaScript, Python

#### RF032: Exportações
**Prioridade:** Baixa | **Complexidade:** Baixa

**Formatos:**
- **JSON:** Dados estruturados completos
- **CSV:** Planilhas para análise externa
- **GraphML:** Formato de grafo para Gephi/Cytoscape
- **PNG/SVG:** Imagem do grafo atual
- **PDF:** Relatório formatado

**Tipos de Export:**
- Grafo completo
- Subgrafo filtrado
- Perfis de personagens selecionados
- Análises geradas
- Timeline/evolução

#### RF033: Widgets Embeddable
**Prioridade:** Baixa | **Complexidade:** Baixa

**Descrição:** Widgets para incorporar em outros sites

**Tipos:**
```html
<!-- Mini-perfil -->
<iframe src="opkg.com/embed/character/luffy" 
        width="300" height="400"></iframe>

<!-- Comparador -->
<iframe src="opkg.com/embed/compare/zoro/sanji"
        width="600" height="400"></iframe>

<!-- Mini-grafo -->
<iframe src="opkg.com/embed/graph?center=luffy&depth=2"
        width="800" height="600"></iframe>
```

#### RF034: Webhook para Updates
**Prioridade:** Baixa | **Complexidade:** Baixa

**Descrição:** Notificar aplicações externas de mudanças

**Eventos:**
- Novo personagem adicionado
- Bounty atualizado
- Nova batalha registrada
- Dados corrigidos
- Novo arco iniciado

---

### 2.9 MÓDULO: Administração e Curadoria

#### RF035: Dashboard Admin
**Prioridade:** Média | **Complexidade:** Média

**Funcionalidades:**
- Visualizar estatísticas gerais
- Moderar conteúdo reportado
- Gerenciar usuários
- Editar dados de personagens
- Aprovar contribuições da comunidade
- Ver logs de atividade

#### RF036: Sistema de Contribuição
**Prioridade:** Baixa | **Complexidade:** Média

**Descrição:** Usuários podem sugerir edições

**Fluxo:**
1. Usuário clica "Sugerir Edição"
2. Formulário com campos editáveis
3. Submissão entra em fila de moderação
4. Admin aprova/rejeita com feedback
5. Se aprovado, usuário ganha pontos

**Dados Editáveis por Usuários:**
- Batalhas (adicionar, corrigir resultado)
- Relações (adicionar conexões)
- Informações básicas (correções)
- Imagens (uploads)
- Citações

#### RF037: Sistema de Verificação
**Prioridade:** Baixa | **Complexidade:** Baixa

**Descrição:** Marcar informações como verificadas

**Níveis:**
- ✅ **Canônico:** Confirmado em mangá/anime oficial
- ⚠️ **Databook:** Vem de databooks oficiais
- 🤔 **Inferido:** Dedução lógica mas não confirmado
- 📺 **Anime Only:** Só no anime (pode ser filler)
- ❓ **Especulação:** Teoria da comunidade

---

## 3. REQUISITOS NÃO-FUNCIONAIS

### 3.1 Performance
- **RNF001:** Renderização do grafo completo em <3s
- **RNF002:** Resposta da IA em <5s (95% dos casos)
- **RNF003:** FPS mínimo de 30 durante interações
- **RNF004:** Tempo de busca <500ms

### 3.2 Escalabilidade
- **RNF005:** Suportar 10,000+ nós no grafo
- **RNF006:** Suportar 1000 usuários simultâneos (inicialmente)
- **RNF007:** Arquitetura preparada para 100k+ usuários

### 3.3 Disponibilidade
- **RNF008:** Uptime de 99.5%
- **RNF009:** Degradação graceful (se IA cair, grafo continua)
- **RNF010:** Backup diário dos dados

### 3.4 Segurança
- **RNF011:** HTTPS obrigatório
- **RNF012:** Autenticação JWT
- **RNF013:** Rate limiting em APIs
- **RNF014:** Sanitização de inputs
- **RNF015:** Proteção contra XSS/CSRF

### 3.5 Usabilidade
- **RNF016:** Interface responsiva (desktop, tablet, mobile)
- **RNF017:** Suporte a teclado (acessibilidade)
- **RNF018:** Suporte a leitores de tela
- **RNF019:** Tema claro/escuro
- **RNF020:** Internacionalização (PT-BR, EN, ES, JP)

### 3.6 Compatibilidade
- **RNF021:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **RNF022:** Android 8+, iOS 13+
- **RNF023:** Resolução mínima: 1024x768

---

## 4. STACK TECNOLÓGICA SUGERIDA

### 4.1 Frontend
- **Framework:** React 18+ ou Vue 3+
- **Grafo:** D3.js ou Cytoscape.js ou Vis.js
- **3D (opcional):** Three.js + React Three Fiber
- **UI:** Tailwind CSS + shadcn/ui
- **State:** Zustand ou Redux Toolkit
- **Routing:** React Router
- **Build:** Vite

### 4.2 Backend
- **API:** FastAPI (Python) ou NestJS (TypeScript)
- **Database Grafo:** Neo4j ou Amazon Neptune
- **Database Relacional:** PostgreSQL
- **Cache:** Redis
- **Search:** Elasticsearch ou Typesense
- **Storage:** AWS S3 (imagens)

### 4.3 IA/ML
- **LLM:** OpenAI GPT-4 ou Anthropic Claude
- **Embeddings:** OpenAI text-embedding-3
- **Vector DB:** Pinecone ou Qdrant
- **Orchestration:** LangChain

### 4.4 Infraestrutura
- **Hosting:** Vercel (frontend) + AWS/GCP (backend)
- **CDN:** Cloudflare
- **Monitoring:** Sentry + DataDog
- **Analytics:** PostHog ou Mixpanel

---

## 5. ROADMAP SUGERIDO

### Fase 1: MVP (3-4 meses)
- ✅ Grafo básico (principais personagens)
- ✅ Chat com IA básica
- ✅ Perfis de personagens
- ✅ Busca e filtros simples
- ✅ Perguntas de caminho

### Fase 2: Core Features (2-3 meses)
- ✅ Grafo completo (1000+ personagens)
- ✅ Sincronização chat ↔ grafo
- ✅ Power level system
- ✅ Timeline/filtros temporais
- ✅ Sistema de usuários

### Fase 3: Social (2 meses)
- ✅ Modo anti-spoiler
- ✅ Coleções e favoritos
- ✅ Comentários
- ✅ Gamificação

### Fase 4: Advanced (3 meses)
- ✅ Análises avançadas de grafo
- ✅ Geradores (tripulação, batalha)
- ✅ Comunidade e moderação
- ✅ API pública

### Fase 5: Polish (1-2 meses)
- ✅ Mobile app nativo
- ✅ Performance otimizations
- ✅ Internacionalização
- ✅ Modo 3D (opcional)

---

## 6. MÉTRICAS DE SUCESSO

### 6.1 Engajamento
- **Tempo médio de sessão:** >15 minutos
- **Páginas por sessão:** >8
- **Taxa de retorno:** >40% (7 dias)
- **Daily Active Users:** 5k+ (após 6 meses)

### 6.2 Produto
- **Personagens explorados por usuário:** >50
- **Perguntas à IA por sessão:** >5
- **Compartilhamentos sociais:** 100+ por dia
- **NPS Score:** >50

### 6.3 Técnicas
- **Core Web Vitals:** Green em todos
- **API Uptime:** >99.5%
- **Error Rate:** <1%
- **IA Response Rate:** >95% <5s

---

## 7. RISCOS E MITIGAÇÕES

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Custo de LLM muito alto | Alto | Média | Cache agressivo, rate limiting, tier gratuito limitado |
| Performance do grafo ruim | Alto | Média | Renderização progressiva, web workers, otimizações |
| Dados da wiki incompletos | Médio | Alta | Sistema de contribuição, curadoria manual inicial |
| Violação de copyright | Alto | Baixa | Usar apenas dados públicos, atribuir fontes |
| Baixa adoção | Alto | Média | Marketing na comunidade OP, features únicas |
| Complexidade demais | Médio | Alta | MVP focado, iteração baseada em feedback |

---
