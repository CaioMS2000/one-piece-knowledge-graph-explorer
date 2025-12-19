# REGRAS DE NEGÓCIO DETALHADAS

Este documento detalha todas as regras de negócio do sistema, especificando algoritmos, validações, casos de borda e exemplos práticos para cada funcionalidade.

---

## 1. Power Level System (RF011)

### Descrição
Calcula um score numérico estimado de força para cada personagem baseado em múltiplas fontes de dados, permitindo comparações objetivas entre personagens.

### Entradas
- **Bounty**: Número (beri) ou `null` se desconhecido
- **Cargo/Rank**: Enum (Yonko, Almirante, Comandante, Shichibukai, Supernova, etc.)
- **Histórico de Batalhas**: Array de objetos com:
  - `oponente`: ID do personagem
  - `resultado`: "vitória" | "derrota" | "empate"
  - `dificuldade`: 1-5 (1=fácil, 5=extremamente difícil)
  - `capitulo`: Número do capítulo (opcional)
- **Conexões no Grafo**: Relações com outros personagens (para transitividade)

### Saídas
- **Power Score**: Número de 0 a 1000
- **Nível de Confiança**: 1-5 estrelas (⭐⭐⭐⭐⭐ = Alta, ⭐☆☆☆☆ = Especulação)
- **Breakdown Detalhado**: Objeto com contribuição de cada fonte:
  ```typescript
  {
    total: 850,
    confidence: 4, // estrelas
    breakdown: {
      bountyScore: 255,    // 30% de 850
      rankScore: 212.5,    // 25% de 850
      battleScore: 297.5,  // 35% de 850
      transitiveScore: 85  // 10% de 850
    }
  }
  ```

### Algoritmo

**Passo 1: Normalizar Bounty**
```
bounty_normalized = (bounty / 1.000.000) * 100
// Se bounty for null, usar 0
// Limitar máximo em 1000 (bounty de 10B+ = 1000)
```

**Passo 2: Converter Cargo para Valor Numérico**
```
Tabela de Ranks:
- Yonko: 1000
- Almirante: 900
- Comandante (Yonko): 800
- Shichibukai: 700
- Supernova: 600
- Vice-Almirante: 500
- Comandante (outros): 400
- Capitão: 300
- Subordinado: 100
- Sem cargo: 0
```

**Passo 3: Calcular Score de Batalhas**
```
battle_score = 0
para cada batalha:
  se resultado == "vitória":
    battle_score += dificuldade * 20
  se resultado == "derrota":
    battle_score -= dificuldade * 10
  se resultado == "empate":
    battle_score += dificuldade * 5

// Normalizar para 0-350 (35% do total)
battle_score_normalized = min(battle_score, 350)
```

**Passo 4: Calcular Transitividade**
```
transitive_score = 0
para cada oponente derrotado:
  oponente_power = calcular_power_level(oponente)
  transitive_score += oponente_power * 0.1  // 10% da força do oponente

// Limitar a 100 (10% do total máximo)
transitive_score = min(transitive_score, 100)
```

**Passo 5: Aplicar Pesos e Calcular Total**
```
total = (bounty_normalized * 0.3) + 
        (rank_value * 0.25) + 
        (battle_score_normalized * 0.35) + 
        (transitive_score * 0.1)

// Arredondar para inteiro
total = round(total)
```

**Passo 6: Calcular Nível de Confiança**
```
fontes_disponiveis = 0
se bounty != null: fontes_disponiveis += 1
se rank != null: fontes_disponiveis += 1
se batalhas.length > 0: fontes_disponiveis += 1
se conexoes.length > 0: fontes_disponiveis += 1

confianca = {
  4 fontes: ⭐⭐⭐⭐⭐ (Alta)
  3 fontes: ⭐⭐⭐⭐☆ (Boa)
  2 fontes: ⭐⭐⭐☆☆ (Média)
  1 fonte:  ⭐⭐☆☆☆ (Baixa)
  0 fontes: ⭐☆☆☆☆ (Especulação)
}
```

### Casos de Borda

1. **Personagem sem bounty conhecido**
   - Usar 0 para componente bounty
   - Reduzir confiança em 1 estrela

2. **Personagem sem batalhas registradas**
   - Usar 0 para componente batalhas
   - Se tiver cargo alto, ainda pode ter score razoável

3. **Personagem isolado (sem conexões)**
   - Transitividade = 0
   - Score baseado apenas em bounty, cargo e batalhas diretas

4. **Dados conflitantes**
   - Ex: Bounty baixo mas cargo alto (ex: Garp)
   - Priorizar cargo se for mais confiável
   - Ajustar pesos dinamicamente se necessário

5. **Personagem novo (poucos dados)**
   - Score inicial baixo
   - Confiança baixa
   - Atualizar conforme mais dados chegam

### Validações

- Bounty deve ser >= 0 (não pode ser negativo)
- Cargo deve ser válido (enum predefinido)
- Batalhas devem ter resultado válido ("vitória" | "derrota" | "empate")
- Dificuldade deve estar entre 1-5
- Score final deve estar entre 0-1000
- Se todas as fontes forem null/zero, retornar score 0 com confiança mínima

### Exemplos

**Exemplo 1: Luffy (dados completos)**
```
Bounty: 3.000.000.000 → 300 (normalizado)
Cargo: Yonko → 1000
Batalhas: 34 vitórias (média dificuldade 4) → ~2720 → 350 (limitado)
Transitividade: Derrotou Kaido (score 940) → 94

Total: (300 * 0.3) + (1000 * 0.25) + (350 * 0.35) + (94 * 0.1)
     = 90 + 250 + 122.5 + 9.4
     = 471.9 → 472

Confiança: ⭐⭐⭐⭐⭐ (4 fontes)
```

**Exemplo 2: Personagem novo sem dados**
```
Bounty: null → 0
Cargo: null → 0
Batalhas: [] → 0
Transitividade: 0

Total: 0
Confiança: ⭐☆☆☆☆ (0 fontes)
```

---

## 2. Pathfinding (RF005)

### Descrição
Encontra e retorna caminhos entre dois personagens no grafo, com diferentes estratégias de busca e filtros configuráveis.

### Entradas
- **Origem**: ID do personagem inicial
- **Destino**: ID do personagem final
- **Estratégia**: "shortest" | "strongest" | "most_common" | "all"
- **Filtros de Conexão**: Array de tipos permitidos (ex: ["Tripulação", "Aliado"])
- **Filtros de Personagem**: Array de condições (ex: ["vivo", "sem mortos"])
- **Profundidade Máxima**: Número (padrão: 5)
- **Limite de Resultados**: Número (padrão: 10)

### Saídas
- **Caminhos Encontrados**: Array de caminhos, cada um com:
  ```typescript
  {
    path: [id1, id2, id3, ...],
    length: 3,
    strength: 850,  // soma dos power levels
    connectionTypes: ["Tripulação", "Aliado"],
    score: 0.95    // score de qualidade do caminho
  }
  ```
- **Estatísticas**: Tempo de busca, nós visitados, caminhos descartados

### Algoritmo

**Estratégia: Shortest Path (BFS)**
```
1. Usar BFS (Breadth-First Search) para encontrar caminho mais curto
2. Parar na primeira solução encontrada
3. Aplicar filtros de conexão durante busca
4. Retornar caminho com menor número de passos
```

**Estratégia: Strongest Path (Dijkstra modificado)**
```
1. Usar Dijkstra com pesos inversos (maior power level = menor peso)
2. Peso da aresta = 1000 - (power_level_medio / 10)
3. Encontrar caminho que passa por personagens mais fortes
4. Retornar caminho com maior soma de power levels
```

**Estratégia: Most Common (PageRank local)**
```
1. Calcular frequência de cada tipo de conexão no grafo
2. Priorizar conexões mais comuns (Tripulação > Aliado > Conhece)
3. Usar BFS com prioridade baseada em frequência
4. Retornar caminho mais "típico" do universo One Piece
```

**Estratégia: All Paths (DFS limitado)**
```
1. Usar DFS (Depth-First Search) até profundidade máxima
2. Coletar todos os caminhos válidos
3. Aplicar filtros
4. Ordenar por score (comprimento + força)
5. Retornar top N caminhos
```

**Aplicação de Filtros:**
```
Durante busca:
- Se tipo de conexão não está em filtros permitidos: pular
- Se personagem não atende filtros (morto, etc): pular
- Se profundidade > máxima: parar recursão
```

**Cálculo de Score do Caminho:**
```
score = (1 / length) * 0.6 +  // mais curto = melhor
        (strength / 1000) * 0.3 +  // mais forte = melhor
        (commonality) * 0.1  // mais comum = melhor

// commonality = média da frequência dos tipos de conexão
```

### Casos de Borda

1. **Origem = Destino**
   - Retornar caminho vazio ou caminho de 0 passos
   - Mensagem: "Você já está no destino"

2. **Sem caminho encontrado**
   - Retornar array vazio
   - Sugerir verificar filtros (talvez muito restritivos)
   - Oferecer buscar sem filtros

3. **Ciclos no grafo**
   - Detectar e evitar loops infinitos
   - Manter lista de nós visitados no caminho atual

4. **Timeout de busca**
   - Limitar tempo de busca (ex: 5 segundos)
   - Se timeout, retornar melhores caminhos encontrados até então
   - Avisar usuário que busca foi limitada

5. **Muitos caminhos encontrados**
   - Limitar a top 10 por padrão
   - Oferecer opção de ver todos (pode ser lento)

6. **Personagem não existe**
   - Validar antes de buscar
   - Retornar erro claro

### Validações

- Origem e destino devem existir no grafo
- Profundidade máxima deve ser entre 1-10 (evitar explosão combinatória)
- Filtros devem ser tipos válidos de conexão
- Limite de resultados deve ser entre 1-50
- Se origem e destino são o mesmo, retornar caminho especial

### Exemplos

**Exemplo 1: Luffy → Shanks (shortest)**
```
Input:
  origem: "luffy"
  destino: "shanks"
  estrategia: "shortest"
  filtros: ["Tripulação", "Aliado", "Família"]

Resultado:
  [
    {
      path: ["luffy", "rayleigh", "shanks"],
      length: 2,
      strength: 1890,
      connectionTypes: ["Mentor/Discípulo", "Tripulação"],
      score: 0.95
    }
  ]
```

**Exemplo 2: Nami → Kaido (strongest, sem filtros)**
```
Input:
  origem: "nami"
  destino: "kaido"
  estrategia: "strongest"

Resultado:
  [
    {
      path: ["nami", "luffy", "kaido"],
      length: 2,
      strength: 2450,  // passa por Luffy (muito forte)
      connectionTypes: ["Tripulação", "Derrotou"],
      score: 0.88
    }
  ]
```

---

## 3. Modo Anti-Spoiler (RF026)

### Descrição
Bloqueia conteúdo que o usuário ainda não viu baseado no progresso dele na história (episódio/capítulo atual).

### Entradas
- **Progresso do Usuário**:
  - `tipo`: "anime" | "manga"
  - `episodio` ou `capitulo`: Número
  - `arco_atual`: ID do arco (opcional)
- **Personagem/Conteúdo**: ID do personagem, evento, ou conexão
- **Configurações de Bloqueio**: Array de tipos a bloquear:
  - "personagens"
  - "eventos"
  - "revelacoes"
  - "frutas_diabo"
  - "conexoes"

### Saídas
- **Deve Bloquear**: Boolean
- **Motivo**: String (ex: "Aparece no Ep. 1088")
- **Nível de Bloqueio**: "total" | "parcial" | "nenhum"
- **Preview Permitido**: Boolean (pode mostrar nome mas não detalhes)

### Algoritmo

**Passo 1: Mapear Episódio/Capítulo para Arco**
```
Tabela de Mapeamento:
Episódio 1-61 → East Blue
Episódio 62-77 → Alabasta
Episódio 78-92 → Skypiea
...
Episódio 1000+ → Wano / Egghead

// Usar tabela predefinida ou calcular baseado em ranges
```

**Passo 2: Determinar Primeira Aparição do Conteúdo**
```
Para cada personagem/evento/conexão:
  primeira_aparicao = {
    episodio: 1088,
    capitulo: 1095,
    arco: "egghead"
  }

// Dados devem estar no banco, mapeados manualmente ou via scraping
```

**Passo 3: Comparar Progresso vs Primeira Aparição**
```
se tipo_usuario == "anime":
  se episodio_usuario < primeira_aparicao.episodio:
    bloquear = true
  senao:
    bloquear = false

se tipo_usuario == "manga":
  se capitulo_usuario < primeira_aparicao.capitulo:
    bloquear = true
  senao:
    bloquear = false
```

**Passo 4: Aplicar Níveis de Bloqueio**
```
se bloquear == true:
  se tipo == "personagem":
    nivel = "total"  // blur completo, sem hover
  se tipo == "evento":
    nivel = "total"  // não mencionar
  se tipo == "revelacao":
    nivel = "parcial"  // pode mencionar mas não detalhar
  se tipo == "fruta_diabo":
    nivel = "parcial"  // pode mostrar nome mas não poder
  se tipo == "conexao":
    nivel = "parcial"  // pode mostrar que existe mas não detalhes
```

**Passo 5: Bloquear Conexões Futuras**
```
Para cada conexão no grafo:
  se personagem_origem foi bloqueado OU personagem_destino foi bloqueado:
    ocultar conexão do grafo
  se evento_da_conexao aconteceu depois do progresso:
    ocultar conexão
```

**Passo 6: Filtrar Respostas da IA**
```
Antes de gerar resposta:
  1. Identificar entidades mencionadas (NER)
  2. Verificar se alguma entidade está bloqueada
  3. Se sim, reescrever resposta sem mencionar
  4. Ou usar placeholder: "[Personagem bloqueado]"
```

### Casos de Borda

1. **Usuário não configurou progresso**
   - Assumir progresso = 0 (nada visto)
   - Bloquear tudo exceto personagens do primeiro arco
   - Mostrar banner pedindo para configurar

2. **Conteúdo aparece em múltiplos pontos**
   - Usar primeira aparição (mais conservador)
   - Ex: Personagem aparece em flashback antes, mas só é relevante depois

3. **Diferença Anime vs Mangá**
   - Anime pode ter fillers
   - Mangá pode ter conteúdo que anime ainda não adaptou
   - Manter mapeamentos separados

4. **Conexões que revelam spoilers**
   - Ex: "Luffy é filho de Dragon" (revelado depois)
   - Bloquear conexão mesmo se ambos personagens são conhecidos
   - Verificar data/episódio da revelação da conexão

5. **Progresso muito avançado**
   - Se usuário está em 100% (último episódio), não bloquear nada
   - Otimizar: pular todas as verificações

6. **Conteúdo sem mapeamento**
   - Se não sabemos quando aparece, assumir que aparece cedo (seguro)
   - Ou pedir para usuário reportar
   - Marcar para curadoria manual

### Validações

- Episódio/capítulo deve ser >= 1
- Tipo deve ser "anime" ou "manga"
- Arco deve ser válido (se fornecido)
- Configurações de bloqueio devem ser tipos válidos
- Se progresso > último episódio conhecido, tratar como 100%

### Exemplos

**Exemplo 1: Usuário no Ep. 500, tenta ver Kaido**
```
Progresso: Ep. 500 (Punk Hazard)
Kaido primeira aparição: Ep. 739 (Wano)

Resultado:
  deve_bloquear: true
  motivo: "Aparece no Ep. 739"
  nivel: "total"
  preview_permitido: false
```

**Exemplo 2: Usuário no Cap. 1000, vê conexão Luffy-Dragon**
```
Progresso: Cap. 1000
Conexão "Luffy é filho de Dragon" revelada em: Cap. 432

Resultado:
  deve_bloquear: false  // já viu a revelação
  nivel: "nenhum"
```

**Exemplo 3: IA pergunta sobre personagem bloqueado**
```
Pergunta: "Quem é Imu?"
Imu primeira aparição: Cap. 906
Usuário está em: Cap. 500

Resposta da IA:
  "Desculpe, não posso falar sobre esse personagem ainda. 
   Ele aparece mais tarde na história. Continue assistindo!"
```

---

## 4. Filtros e Visualizações (RF003)

### Descrição
Aplica filtros combinados ao grafo e alterna entre diferentes modos de visualização, cada um com sua própria lógica de renderização.

### Entradas
- **Filtros Ativos**: Array de objetos de filtro:
  ```typescript
  {
    tipo: "afiliacao" | "fruta" | "mar" | "status" | "periodo" | "bounty",
    operador: "igual" | "diferente" | "contem" | "range" | "maior" | "menor",
    valor: string | number | [min, max],
    combinacao: "AND" | "OR"  // como combinar com outros filtros
  }
  ```
- **Modo de Visualização**: "padrao" | "timeline" | "ego_network" | "comparacao" | "hierarquico" | "heatmap"
- **Parâmetros do Modo**: Objeto específico para cada modo

### Saídas
- **Nós Filtrados**: Array de IDs de personagens que passam nos filtros
- **Arestas Filtradas**: Array de IDs de conexões que devem ser mostradas
- **Estatísticas**: Contadores (total, filtrado, oculto)
- **Configuração de Layout**: Objeto com parâmetros para o algoritmo de layout

### Algoritmo

**Aplicação de Filtros (AND/OR)**
```
1. Iniciar com todos os nós visíveis
2. Para cada filtro:
   se combinacao == "AND":
     manter apenas nós que passam neste filtro E já passavam antes
   se combinacao == "OR":
     adicionar nós que passam neste filtro OU já estavam visíveis

3. Filtrar arestas:
   - Mostrar apenas arestas onde ambos os nós estão visíveis
   - OU arestas onde pelo menos um nó está visível (configurável)
```

**Filtro por Afiliação**
```
se operador == "igual":
  mostrar apenas nós onde afiliacao == valor
se operador == "contem":
  mostrar nós onde afiliacao contém valor (case insensitive)
```

**Filtro por Bounty (Range)**
```
se operador == "range":
  mostrar nós onde bounty >= min E bounty <= max
se operador == "maior":
  mostrar nós onde bounty > valor
se operador == "menor":
  mostrar nós onde bounty < valor
```

**Filtro por Período**
```
1. Mapear período para range de episódios/capítulos
2. Verificar primeira_aparicao do personagem
3. Se primeira_aparicao está dentro do range: mostrar
```

**Modo Timeline**
```
1. Slider temporal controla "momento_atual"
2. Mostrar apenas personagens que apareceram até momento_atual
3. Animar aparição de novos personagens conforme slider avança
4. Opcional: mostrar "fantasma" de personagens futuros (blurred)
```

**Modo Ego Network**
```
1. Centralizar em personagem escolhido
2. Mostrar conexões em níveis:
   - Nível 1: conexões diretas
   - Nível 2: conexões das conexões
   - Nível 3: etc.
3. Layout radial: personagem central, outros em círculos concêntricos
4. Limitar profundidade (padrão: 3 níveis)
```

**Modo Comparação**
```
1. Dividir tela em dois subgrafos
2. Aplicar filtros diferentes para cada lado
3. Mostrar métricas comparativas no meio
4. Destacar diferenças visuais
```

**Modo Hierárquico**
```
1. Ordenar personagens por power level ou cargo
2. Layout top-down:
   - Topo: Yonko, Almirantes
   - Meio: Comandantes, Shichibukai
   - Baixo: Subordinados
3. Arestas sempre apontam para baixo (hierarquia)
```

**Modo Heatmap**
```
1. Calcular métrica escolhida para cada nó (força, centralidade, etc)
2. Mapear valor para cor (gradiente)
3. Tamanho do nó proporcional ao valor
4. Legenda mostrando escala de cores
```

### Casos de Borda

1. **Nenhum filtro ativo**
   - Mostrar todos os nós
   - Performance pode ser problema (1000+ nós)
   - Considerar renderização progressiva

2. **Filtros muito restritivos (0 resultados)**
   - Mostrar mensagem: "Nenhum personagem encontrado"
   - Sugerir relaxar filtros
   - Oferecer resetar filtros

3. **Filtros conflitantes (AND impossível)**
   - Ex: Afiliação = "Piratas" AND Afiliação = "Marinha"
   - Detectar e avisar usuário
   - Sugerir usar OR ao invés de AND

4. **Mudança de modo com filtros ativos**
   - Manter filtros ao mudar de modo
   - Alguns modos podem não fazer sentido com certos filtros
   - Avisar se necessário

5. **Performance com muitos nós filtrados**
   - Se > 500 nós visíveis, considerar otimizações
   - Reduzir detalhes visuais
   - Usar clustering/agrupamento

### Validações

- Filtros devem ter tipo válido
- Operador deve ser compatível com tipo de filtro
- Valores devem estar no formato correto (string, number, range)
- Range deve ter min <= max
- Modo deve ser válido
- Parâmetros do modo devem estar completos

### Exemplos

**Exemplo 1: Filtro combinado**
```
Filtros:
  1. Afiliação = "Piratas" (AND)
  2. Bounty > 100.000.000 (AND)
  3. Status = "Vivo" (AND)

Resultado: 47 personagens encontrados
```

**Exemplo 2: Modo Ego Network**
```
Personagem central: Luffy
Profundidade: 2 níveis

Resultado:
  - Nível 1: 10 nós (tripulação + aliados próximos)
  - Nível 2: 45 nós (conexões das conexões)
  - Total: 55 nós visíveis
```

---

## 5. Sincronização Chat ↔ Grafo (RF008)

### Descrição
Sincroniza interações entre o chat de IA e a visualização do grafo, destacando elementos relevantes e respondendo a ações do usuário.

### Entradas
- **Ação do Usuário**: 
  - Tipo: "pergunta" | "click_no_grafo" | "hover" | "filtro_aplicado"
  - Conteúdo: Texto da pergunta ou ID do elemento clicado
- **Contexto Atual**: Estado do grafo (zoom, pan, nós visíveis, filtros)

### Saídas
- **Ações no Grafo**:
  - Nós a destacar (array de IDs)
  - Arestas a destacar (array de IDs)
  - Zoom/Pan para coordenadas específicas
  - Filtros temporários a aplicar
- **Resposta da IA**: Texto com markdown, possivelmente com ações sugeridas

### Algoritmo

**Quando Usuário Faz Pergunta:**

**Passo 1: Extrair Entidades**
```
1. Usar NER (Named Entity Recognition) para identificar personagens mencionados
2. Buscar no grafo por nome (fuzzy matching)
3. Retornar IDs dos personagens encontrados
```

**Passo 2: Classificar Tipo de Pergunta**
```
Tipos:
- "caminho": "Qual conexão entre X e Y?"
- "agregacao": "Quantos personagens são Yonko?"
- "comparacao": "Quem é mais forte: X ou Y?"
- "analise": "Por que X fez Y?"
- "descoberta": "Me sugira algo sobre X"
```

**Passo 3: Executar Ação no Grafo**
```
se tipo == "caminho":
  1. Calcular caminho entre entidades
  2. Destacar nós do caminho
  3. Destacar arestas do caminho
  4. Zoom para mostrar caminho completo

se tipo == "agregacao":
  1. Aplicar filtro correspondente
  2. Destacar nós que passam no filtro
  3. Zoom para mostrar cluster

se tipo == "comparacao":
  1. Destacar os dois personagens
  2. Mostrar métricas lado a lado
  3. Zoom para incluir ambos

se tipo == "analise":
  1. Destacar personagem/evento mencionado
  2. Mostrar conexões relevantes
  3. Zoom para contexto

se tipo == "descoberta":
  1. Usar algoritmo de centralidade ou anomalia
  2. Destacar descoberta interessante
  3. Zoom para mostrar
```

**Passo 4: Gerar Resposta da IA**
```
1. Buscar informações relevantes (RAG)
2. Gerar resposta contextual
3. Incluir ações sugeridas: [Ver no grafo] [Explorar mais]
```

**Quando Usuário Clica no Grafo:**

**Passo 1: Identificar Elemento**
```
se elemento == nó:
  personagem_id = elemento.id
se elemento == aresta:
  personagem_origem = aresta.origem
  personagem_destino = aresta.destino
```

**Passo 2: Oferecer Contexto da IA**
```
1. Buscar informações sobre personagem(s)
2. Gerar resposta contextual curta
3. Oferecer: "Quer saber mais sobre [personagem]?"
4. Sugerir perguntas relacionadas
```

**Passo 3: Atualizar Histórico do Chat**
```
Adicionar ao histórico:
  "Você clicou em [Personagem]"
  Resposta da IA com contexto
```

**Zoom/Pan Automático:**
```
1. Calcular bounding box dos elementos a destacar
2. Adicionar padding (20% em cada lado)
3. Calcular zoom necessário para caber tudo
4. Animar transição suave (500ms)
5. Se zoom muito próximo (< 0.5x), limitar a 0.5x
6. Se zoom muito distante (> 5x), limitar a 5x
```

**Ocultar Elementos Não Relevantes:**
```
1. Calcular relevância de cada nó (distância do foco)
2. Se relevância < threshold: reduzir opacidade
3. Se relevância muito baixa: ocultar completamente
4. Manter sempre visíveis: nós destacados + seus vizinhos diretos
```

### Casos de Borda

1. **Pergunta ambígua (múltiplos personagens com mesmo nome)**
   - Listar opções: "Você quis dizer Luffy (chapéu de palha) ou outro Luffy?"
   - Usar contexto da conversa para desambiguar

2. **Personagem não encontrado no grafo**
   - IA responde: "Não encontrei esse personagem. Você quis dizer [sugestão]?"
   - Oferecer busca alternativa

3. **Zoom/Pan muito extremo**
   - Limitar zoom mínimo/máximo
   - Se muitos elementos, usar clustering ao invés de zoom out extremo

4. **Pergunta sem entidades mencionadas**
   - Ex: "Quantos personagens existem?"
   - Não destacar nada no grafo, apenas responder
   - Ou destacar todos (se fizer sentido)

5. **Múltiplas perguntas em sequência**
   - Manter contexto das perguntas anteriores
   - Não resetar destaque, adicionar novos
   - Oferecer "Limpar destaques"

6. **Performance com muitos elementos destacados**
   - Se > 100 nós destacados, considerar agrupar
   - Reduzir animações
   - Mostrar apenas top N mais relevantes

### Validações

- Entidades mencionadas devem existir no grafo (ou sugerir alternativas)
- Coordenadas de zoom devem ser válidas
- IDs de nós/arestas devem existir
- Tipo de pergunta deve ser reconhecível
- Resposta da IA não deve exceder limite de tokens

### Exemplos

**Exemplo 1: Pergunta de caminho**
```
Pergunta: "Qual a conexão entre Luffy e Shanks?"

Ações no Grafo:
  - Destacar: [luffy, rayleigh, shanks]
  - Destacar arestas do caminho
  - Zoom para mostrar caminho completo

Resposta IA:
  "Luffy conhece Shanks através de Rayleigh, que foi 
   primeiro imediato do Roger e mentor de Shanks.
   
   Caminho: Luffy → Rayleigh → Shanks (2 passos)
   
   [Ver detalhes] [Explorar mais conexões]"
```

**Exemplo 2: Click no grafo**
```
Usuário clica em: Zoro

Ações no Grafo:
  - Destacar: zoro
  - Mostrar conexões diretas
  - Zoom suave para Zoro

Resposta IA:
  "Você está vendo Roronoa Zoro, espadachim dos 
   Chapéus de Palha. Ele tem 1.111.000.000 de bounty.
   
   Quer saber mais sobre:
   - Suas batalhas mais importantes?
   - Suas conexões no grafo?
   - Comparar com outros espadachins?"
```

---

## 6. Simulador de Batalhas (RF019)

### Descrição
Simula batalhas entre personagens ou grupos, calculando probabilidades de vitória baseado em múltiplos fatores.

### Entradas
- **Lado A**: Array de IDs de personagens
- **Lado B**: Array de IDs de personagens
- **Modo**: "1v1" | "equipe" | "tripulacao" | "torneio"
- **Parâmetros Opcionais**:
  - `ambiente`: "mar" | "terra" | "ceu" | "submarino"
  - `condicoes_especiais`: Array de strings
  - `numero_simulacoes`: Number (padrão: 1000)

### Saídas
- **Probabilidade de Vitória**: 
  ```typescript
  {
    ladoA: 0.65,  // 65%
    ladoB: 0.35   // 35%
  }
  ```
- **Resultados das Simulações**: Array com vitórias de cada lado
- **Análise Detalhada**: Breakdown dos fatores
- **Confiança**: Número 0-1 (baseado em dados disponíveis)

### Algoritmo

**Cálculo de Power Base:**
```
power_lado_A = soma(power_level de cada personagem do lado A)
power_lado_B = soma(power_level de cada personagem do lado B)

power_ratio = power_lado_A / (power_lado_A + power_lado_B)
// power_ratio vai de 0 a 1
```

**Fatores de Ajuste:**

**1. Vantagens de Tipo (Matchups)**
```
Tabela de vantagens:
- Logia vs Paramecia: +0.1 (vantagem logia)
- Haki avançado vs Logia: +0.15 (vantagem haki)
- Tipo específico (ex: borracha vs elétrico): +0.2
- Etc.

ajuste_tipo = calcular_vantagens(lado_A, lado_B)
```

**2. Sinergia entre Aliados**
```
sinergia_A = 0
para cada par de aliados no lado A:
  se tem conexão "Tripulação" ou "Aliado":
    sinergia_A += 0.05  // bônus por sinergia

sinergia_B = calcular_sinergia(lado_B)
```

**3. Ambiente**
```
ajuste_ambiente = 0
se ambiente == "mar" E personagem tem fruta do diabo:
  ajuste_ambiente -= 0.2  // desvantagem no mar

se ambiente == "ceu" E personagem pode voar:
  ajuste_ambiente += 0.1  // vantagem no céu
```

**4. Condições Especiais**
```
ajuste_condicoes = 0
se "ferido" em lado_A:
  ajuste_condicoes -= 0.1
se "preparado" em lado_A:
  ajuste_condicoes += 0.05
```

**Cálculo Final de Probabilidade:**
```
prob_base = power_ratio

prob_ajustada = prob_base + 
                ajuste_tipo + 
                sinergia_A - sinergia_B + 
                ajuste_ambiente + 
                ajuste_condicoes

// Limitar entre 0.05 e 0.95 (sempre há chance)
prob_final = clamp(prob_ajustada, 0.05, 0.95)

probabilidade_A = prob_final
probabilidade_B = 1 - prob_final
```

**Simulação (Monte Carlo):**
```
vitórias_A = 0
vitórias_B = 0

para i = 1 até numero_simulacoes:
  resultado = random() < probabilidade_A ? "A" : "B"
  
  // Aplicar aleatoriedade (10-20%)
  aleatoriedade = random(-0.1, 0.1)
  resultado_final = (probabilidade_A + aleatoriedade) > 0.5 ? "A" : "B"
  
  se resultado_final == "A":
    vitórias_A++
  senao:
    vitórias_B++

probabilidade_final_A = vitórias_A / numero_simulacoes
probabilidade_final_B = vitórias_B / numero_simulacoes
```

**Cálculo de Confiança:**
```
confianca = 0
se todos personagens têm power_level calculado:
  confianca += 0.4
se todos têm histórico de batalhas:
  confianca += 0.3
se matchups conhecidos:
  confianca += 0.2
se sinergias conhecidas:
  confianca += 0.1

// confianca vai de 0 a 1
```

### Casos de Borda

1. **Personagem sem power level**
   - Estimar baseado em cargo/posição
   - Reduzir confiança
   - Avisar usuário

2. **Lados muito desbalanceados**
   - Ex: 1 vs 10 personagens
   - Ajustar probabilidade considerando números
   - Mas manter chance mínima (5%) para lado fraco

3. **Personagens que nunca lutaram**
   - Usar apenas power level e fatores teóricos
   - Reduzir confiança significativamente
   - Avisar: "Baseado em estimativas, não em batalhas reais"

4. **Matchups desconhecidos**
   - Usar apenas power level
   - Não aplicar ajustes de tipo
   - Reduzir confiança

5. **Simulação com poucos dados**
   - Se confiança < 0.5, avisar usuário
   - Oferecer aumentar número de simulações
   - Mostrar breakdown explicando incerteza

### Validações

- Ambos os lados devem ter pelo menos 1 personagem
- Personagens devem existir no grafo
- Número de simulações deve ser entre 100-10000
- Ambiente deve ser válido
- Probabilidades finais devem somar 1.0

### Exemplos

**Exemplo 1: 1v1 Luffy vs Kaido**
```
Lado A: [luffy] (power: 980)
Lado B: [kaido] (power: 940)

Power ratio: 980 / (980 + 940) = 0.51

Ajustes:
- Tipo: 0 (ambos Paramecia, sem vantagem clara)
- Sinergia: 0 (1v1)
- Ambiente: 0 (terra, neutro)
- Condições: 0

Probabilidade base: 51% Luffy, 49% Kaido

Simulação (1000x):
  Luffy: 512 vitórias (51.2%)
  Kaido: 488 vitórias (48.8%)

Confiança: 0.9 (dados completos)
```

**Exemplo 2: Tripulação vs Tripulação**
```
Lado A: [luffy, zoro, sanji, ...] (10 membros, power total: 4500)
Lado B: [law, kid, killer, ...] (3 membros, power total: 2800)

Power ratio: 4500 / (4500 + 2800) = 0.62

Ajustes:
- Sinergia A: +0.3 (tripulação completa, alta sinergia)
- Sinergia B: +0.15 (aliados, sinergia média)
- Números: +0.1 (lado A tem mais membros)

Probabilidade: 72% Lado A, 28% Lado B
```

---

## 7. Análises de Centralidade (RF027)

### Descrição
Calcula métricas de centralidade do grafo para identificar personagens mais importantes/influentes usando diferentes algoritmos.

### Entradas
- **Métrica Escolhida**: 
  - "degree" | "betweenness" | "closeness" | "pagerank" | "eigenvector"
- **Parâmetros**:
  - `damping_factor`: Number (para PageRank, padrão: 0.85)
  - `iterations`: Number (padrão: 100)
  - `normalized`: Boolean (padrão: true)

### Saídas
- **Scores por Personagem**: Array ordenado:
  ```typescript
  [
    { id: "luffy", score: 0.0234, rank: 1 },
    { id: "law", score: 0.0189, rank: 2 },
    ...
  ]
  ```
- **Estatísticas**: Min, max, média, desvio padrão
- **Visualização**: Cores/tamanhos dos nós baseados no score

### Algoritmo

**Degree Centrality:**
```
degree(v) = número de conexões diretas do vértice v

degree_normalized(v) = degree(v) / (n - 1)
// n = número total de vértices
```

**Betweenness Centrality:**
```
betweenness(v) = soma de (caminhos_curtos_passando_por_v / total_caminhos_curtos)
                 para todos os pares de vértices

Algoritmo:
1. Para cada par de vértices (s, t):
   - Calcular todos os caminhos mais curtos entre s e t
   - Contar quantos passam por v
   - betweenness(v) += (caminhos_por_v / total_caminhos)
```

**Closeness Centrality:**
```
closeness(v) = (n - 1) / soma(distancias_de_v_para_todos_outros)

Algoritmo:
1. Calcular distâncias de v para todos os outros (BFS)
2. Somar todas as distâncias
3. closeness = (n - 1) / soma_distancias
```

**PageRank:**
```
PR(v) = (1 - d) / n + d * soma(PR(u) / out_degree(u))
        para todos u que apontam para v

Algoritmo iterativo:
1. Inicializar PR(v) = 1/n para todos v
2. Para cada iteração:
   PR_novo(v) = (1 - d) / n + d * soma(PR_antigo(u) / out_degree(u))
3. Repetir até convergência (diferença < threshold)
```

**Eigenvector Centrality:**
```
EC(v) = (1 / lambda) * soma(EC(u))
        para todos u conectados a v

// lambda = maior autovalor da matriz de adjacência
// Resolver sistema de equações lineares
```

### Casos de Borda

1. **Grafo desconectado (múltiplos componentes)**
   - Closeness não funciona bem (distância infinita)
   - Usar apenas componentes conectados
   - Ou calcular por componente separadamente

2. **Nós isolados (sem conexões)**
   - Degree = 0
   - Betweenness = 0
   - Closeness = 0 (ou undefined)
   - PageRank ainda tem valor mínimo (1-d)/n

3. **Grafo muito grande (performance)**
   - Betweenness é O(n*m) - muito lento
   - Considerar amostragem (calcular para subgrafo)
   - Ou usar aproximação

4. **Ciclos no grafo**
   - PageRank lida bem com ciclos
   - Betweenness pode ter múltiplos caminhos iguais
   - Normalmente não é problema

### Validações

- Métrica deve ser válida
- Damping factor deve estar entre 0-1
- Iterations deve ser > 0
- Grafo deve ter pelo menos 2 nós
- Se grafo vazio, retornar array vazio

### Exemplos

**Exemplo 1: Degree Centrality**
```
Resultado Top 5:
1. Luffy: 45 conexões (score: 0.045)
2. Law: 38 conexões (score: 0.038)
3. Shanks: 32 conexões (score: 0.032)
4. Garp: 30 conexões (score: 0.030)
5. Robin: 28 conexões (score: 0.028)
```

**Exemplo 2: PageRank**
```
Resultado Top 5:
1. Luffy: 0.0234 (muito conectado + conectado a importantes)
2. Law: 0.0189 (ponte entre organizações)
3. Shanks: 0.0176 (conectado a todas as gerações)
4. Garp: 0.0165 (conecta Marinha e Piratas)
5. Robin: 0.0158 (conhecimento universal)
```

---

## 8. Gerador de Tripulação (RF018)

### Descrição
Gera tripulações balanceadas aleatoriamente baseado em critérios de balanceamento, versatilidade e sinergia.

### Entradas
- **Parâmetros**:
  - `numero_membros`: Number (3-20)
  - `nivel_poder_desejado`: Number (opcional)
  - `tipo_tripulacao`: "pirata" | "marinha" | "mista"
  - `incluir_frutas`: Boolean
  - `balancear_habilidades`: Boolean
  - `tema`: String (opcional, ex: "só zoan", "só espadachins")

### Saídas
- **Tripulação Gerada**: Array de personagens
- **Estatísticas**:
  ```typescript
  {
    powerScoreTotal: 3450,
    bountyTotal: 2100000000,
    balanceamento: 0.80,  // 0-1
    versatilidade: 0.95,  // 0-1
    sinergia: 0.75        // 0-1
  }
  ```
- **Análise**: Quem pode derrotar, fraquezas, etc.

### Algoritmo

**Passo 1: Filtrar Candidatos**
```
candidatos = todos_personagens

se tipo_tripulacao == "pirata":
  candidatos = filtrar_por_afiliacao("Piratas")
se tipo_tripulacao == "marinha":
  candidatos = filtrar_por_afiliacao("Marinha")

se incluir_frutas == false:
  candidatos = filtrar_sem_frutas()

se tema != null:
  candidatos = aplicar_tema(tema)  // ex: só zoan
```

**Passo 2: Selecionar Capitão**
```
1. Filtrar candidatos que podem ser capitão (cargo alto)
2. Se nivel_poder_desejado:
   - Escolher capitão com power_level próximo ao desejado / numero_membros
3. Senão:
   - Escolher aleatoriamente entre candidatos qualificados
```

**Passo 3: Selecionar Membros Balanceados**
```
funcoes_necessarias = ["combatente", "navegador", "médico", "cozinheiro", ...]

enquanto tripulacao.length < numero_membros:
  1. Identificar função mais necessária
  2. Filtrar candidatos que preenchem essa função
  3. Se balancear_habilidades:
     - Escolher candidato que complementa tripulação
  4. Senão:
     - Escolher aleatoriamente
  5. Adicionar à tripulação
  6. Remover candidato da lista
```

**Cálculo de Balanceamento:**
```
power_scores = [power_level de cada membro]
media = media(power_scores)
desvio = desvio_padrao(power_scores)

balanceamento = 1 - (desvio / media)
// Quanto menor o desvio, maior o balanceamento (mais próximo de 1)
```

**Cálculo de Versatilidade:**
```
funcoes_cobertas = contar_funcoes_unicas(tripulacao)
funcoes_possiveis = 10  // número total de funções possíveis

versatilidade = funcoes_cobertas / funcoes_possiveis
```

**Cálculo de Sinergia:**
```
sinergia_total = 0
para cada par de membros:
  se tem conexão "Tripulação" ou "Aliado":
    sinergia_total += 0.1
  se tem conexão "Família":
    sinergia_total += 0.15
  se tem conexão "Rival":
    sinergia_total -= 0.1

sinergia = min(sinergia_total / numero_pares_possiveis, 1.0)
```

**Determinar Quem Pode Derrotar:**
```
power_tripulacao = soma(power_levels)

para cada organização conhecida:
  power_organizacao = soma(power_levels da organização)
  
  se power_tripulacao > power_organizacao * 1.2:
    pode_derrotar.push(organizacao)
  se power_tripulacao > power_organizacao * 0.8 E < power_organizacao * 1.2:
    pode_derrotar_50_50.push(organizacao)
  senao:
    nao_pode_derrotar.push(organizacao)
```

### Casos de Borda

1. **Poucos candidatos disponíveis**
   - Se candidatos < numero_membros, reduzir numero_membros
   - Ou relaxar filtros
   - Avisar usuário

2. **Nível de poder impossível**
   - Se nivel_poder_desejado muito alto para numero_membros
   - Ajustar nivel_poder ou aumentar numero_membros
   - Avisar: "Não é possível com esses parâmetros"

3. **Tema muito restritivo**
   - Ex: "só Yonko" com 10 membros (só existem 4 Yonko)
   - Relaxar tema ou reduzir membros
   - Avisar

4. **Sinergia negativa (rivais na mesma tripulação)**
   - Permitir mas avisar
   - Ou evitar automaticamente
   - Mostrar na análise

### Validações

- Número de membros deve estar entre 3-20
- Tipo de tripulação deve ser válido
- Tema deve ser válido (se fornecido)
- Candidatos devem existir após filtros

### Exemplos

**Exemplo 1: Tripulação Balanceada**
```
Parâmetros:
  numero_membros: 7
  tipo: "pirata"
  balancear: true

Resultado:
  Capitão: Law (power: 850)
  Membros: Killer, Boa Hancock, Franky, Chopper, Nami, Robin
  
  Estatísticas:
    Power Total: 3450
    Balanceamento: 0.80
    Versatilidade: 0.95
    Sinergia: 0.75
    
  Pode derrotar: CP9, Donquixote Pirates
  Pode ser 50/50: Big Mom Pirates
  Não pode: Beast Pirates
```

---

## 9. Gamificação (RF025)

### Descrição
Sistema de pontos, níveis e conquistas para engajar usuários e recompensar exploração do sistema.

### Entradas
- **Ação do Usuário**: Tipo de ação realizada
- **Contexto**: Dados sobre a ação (ex: qual personagem explorou)

### Saídas
- **Pontos Ganhos**: Number
- **Nível Atual**: Number
- **XP para Próximo Nível**: Number
- **Conquistas Desbloqueadas**: Array de badges

### Algoritmo

**Sistema de Pontos:**
```
Tabela de Pontos:
- Explorar novo personagem: +10
- Completar perfil de personagem: +5
- Descobrir conexão rara: +100
- Completar desafio fácil: +50
- Completar desafio médio: +150
- Completar desafio difícil: +500
- Contribuir dados (aprovado): +200
- Daily login: +5
- Primeira pergunta à IA: +10
- Primeira simulação de batalha: +20
```

**Cálculo de Níveis:**
```
Fórmula de XP por nível:
XP_necessario(nivel) = 100 * nivel^1.5

Exemplos:
  Nível 1 → 2: 100 * 2^1.5 = 283 XP
  Nível 10 → 11: 100 * 11^1.5 = 3648 XP
  Nível 50 → 51: 100 * 51^1.5 = 36450 XP

Total XP para chegar ao nível N:
  XP_total = soma(XP_necessario(i)) para i = 1 até N-1
```

**Níveis e Títulos:**
```
1-10:   🌊 Novato do East Blue
11-25:  ⛵ Pirata Rookie
26-50:  🏴‍☠️ Supernova
51-75:  👑 Shichibukai
76-99:  ⚓ Yonko
100:    🌟 Rei dos Piratas
```

**Sistema de Conquistas:**
```
Conquistas (Badges):
- 🔍 "Explorador": Explorou 100+ personagens
- 🧠 "Enciclopédia": Leu 50+ perfis completos
- ⚔️ "Estrategista": Simulou 100 batalhas
- 🎯 "Desafiante": Completou 20 desafios
- 💎 "Descobridor": Achou 10 conexões raras
- 🌐 "Social": 50 contribuições aprovadas
- 🔥 "Dedicação": Login diário por 30 dias
- 🏆 "Mestre": Chegou ao nível 100
```

**Prevenção de Farming:**
```
1. Limitar pontos por ação:
   - Explorar mesmo personagem 2x: 0 pontos (já explorado)
   - Daily login: máximo 1x por dia
   - Desafios: não pode repetir para ganhar pontos

2. Cooldown entre ações similares:
   - Explorar personagens: máximo 10/minuto
   - Simular batalhas: máximo 5/minuto

3. Validação de contribuições:
   - Apenas contribuições aprovadas dão pontos
   - Contribuições rejeitadas: 0 pontos
```

**Cálculo de Progresso:**
```
XP_atual = soma(pontos de todas ações)
nivel_atual = calcular_nivel(XP_atual)
XP_necessario_proximo = XP_necessario(nivel_atual + 1)
XP_ja_ganho_neste_nivel = XP_atual - XP_total_ate_nivel(nivel_atual)
progresso = XP_ja_ganho_neste_nivel / (XP_necessario_proximo - XP_total_ate_nivel(nivel_atual))
```

### Casos de Borda

1. **Ação repetida (farming)**
   - Não dar pontos se já fez a ação
   - Avisar: "Você já explorou este personagem"
   - Oferecer explorar outros

2. **Múltiplas conquistas de uma vez**
   - Ex: Explorar 100 personagens de uma vez
   - Dar todas as conquistas
   - Celebrar todas juntas

3. **Nível máximo atingido**
   - Se nível 100, não pode subir mais
   - Mas ainda pode ganhar pontos (para ranking)
   - Mostrar "Nível Máximo: Rei dos Piratas"

4. **Reset de progresso**
   - Se usuário pedir reset, confirmar 3x
   - Apagar todos os dados de progresso
   - Não pode desfazer

### Validações

- Pontos devem ser >= 0
- Nível deve estar entre 1-100
- Ações devem ser válidas
- Não pode dar pontos negativos
- Conquistas devem ser desbloqueadas apenas uma vez

### Exemplos

**Exemplo 1: Usuário explora personagem novo**
```
Ação: Explorar "Luffy"
Pontos ganhos: +10
XP total: 150 → 160
Nível: 1 (não mudou)
Progresso: 160/283 (56%)

Conquistas verificadas:
  - Nenhuma nova (ainda tem 0 personagens explorados)
```

**Exemplo 2: Usuário completa desafio**
```
Ação: Completar desafio "Encontre conexão Luffy-Shanks"
Pontos ganhos: +150
XP total: 500 → 650
Nível: 1 → 2 (subiu!)
Progresso: 0/3648 (0%)

Conquistas:
  - 🎯 "Desafiante" desbloqueada! (1º desafio)
```

---

## 10. RAG - Retrieval Augmented Generation (RF010)

### Descrição
Sistema que busca informações relevantes antes de gerar resposta da IA, combinando dados do grafo, wiki e embeddings.

### Entradas
- **Pergunta do Usuário**: String
- **Contexto da Conversa**: Histórico de mensagens anteriores
- **Contexto do Grafo**: Estado atual (personagens visíveis, filtros)

### Saídas
- **Resposta da IA**: String com markdown
- **Fontes/Citações**: Array de referências
- **Ações Sugeridas**: Array de ações no grafo

### Algoritmo

**Passo 1: Extrair Entidades e Intenção**
```
1. Usar NER para identificar personagens, locais, eventos mencionados
2. Classificar intenção:
   - "caminho": perguntas sobre conexões
   - "agregacao": perguntas sobre quantidades
   - "comparacao": perguntas comparativas
   - "analise": perguntas explicativas
   - "descoberta": pedidos de sugestões
```

**Passo 2: Buscar no Grafo de Conhecimento**
```
para cada entidade identificada:
  1. Buscar nó no grafo
  2. Extrair propriedades (bounty, cargo, afiliação, etc)
  3. Extrair conexões (relações com outros nós)
  4. Extrair eventos relacionados

dados_grafo = {
  personagens: [...],
  conexoes: [...],
  eventos: [...]
}
```

**Passo 3: Buscar na Wiki (Embeddings)**
```
1. Gerar embedding da pergunta
2. Buscar no vector DB (Pinecone/Qdrant) por similaridade
3. Retornar top K chunks mais relevantes (K=5-10)
4. Incluir metadados (capítulo, episódio, fonte)

dados_wiki = [
  { texto: "...", fonte: "cap_123", relevancia: 0.95 },
  ...
]
```

**Passo 4: Buscar em Conversas Anteriores**
```
se usuário logado:
  1. Buscar perguntas similares no histórico
  2. Extrair respostas anteriores relevantes
  3. Adicionar ao contexto

dados_historico = [...]
```

**Passo 5: Priorizar e Combinar Fontes**
```
prioridade_fontes = {
  grafo: 0.4,      // dados estruturados são mais confiáveis
  wiki: 0.4,       // texto rico em contexto
  historico: 0.2   // contexto da conversa
}

dados_combinados = combinar(
  dados_grafo (peso 0.4),
  dados_wiki (peso 0.4),
  dados_historico (peso 0.2)
)

// Ordenar por relevância
dados_ordenados = ordenar_por_relevancia(dados_combinados)
```

**Passo 6: Construir Contexto para LLM**
```
contexto = f"""
Dados do Grafo:
{dados_grafo_formatados}

Informações da Wiki:
{dados_wiki_formatados}

Histórico da Conversa:
{dados_historico_formatados}

Pergunta do Usuário: {pergunta}
"""
```

**Passo 7: Gerar Resposta com LLM**
```
prompt = f"""
Você é um assistente especializado em One Piece.
Use APENAS as informações fornecidas abaixo.
Se não souber algo, diga que não tem essa informação.

Contexto:
{contexto}

Pergunta: {pergunta}

Responda de forma clara e cite suas fontes.
"""

resposta = llm.generate(prompt)
```

**Passo 8: Extrair Citações**
```
1. Identificar trechos da resposta que vêm de fontes específicas
2. Mapear para capítulos/episódios
3. Formatar citações: "📖 Fonte: Cap. 123 | Ep. 456"
```

**Passo 9: Identificar Ações no Grafo**
```
se intenção == "caminho":
  acoes = ["destacar_caminho", "zoom_para_caminho"]
se intenção == "comparacao":
  acoes = ["destacar_personagens", "mostrar_comparacao"]
...
```

### Casos de Borda

1. **Nenhuma informação encontrada**
   - Resposta: "Não encontrei informações sobre isso. Você quis dizer [sugestão]?"
   - Oferecer busca alternativa
   - Não inventar informações

2. **Informações conflitantes**
   - Priorizar fonte mais confiável (grafo > wiki > histórico)
   - Ou mencionar conflito: "Há informações conflitantes sobre isso..."
   - Oferecer ambas as versões

3. **Pergunta ambígua**
   - Listar opções: "Você quis dizer X ou Y?"
   - Usar contexto da conversa para desambiguar
   - Perguntar ao usuário se necessário

4. **Contexto muito longo**
   - Limitar tamanho do contexto (ex: 4000 tokens)
   - Priorizar informações mais relevantes
   - Truncar se necessário

5. **Rate limiting da API de LLM**
   - Cachear respostas similares
   - Retornar resposta em cache se disponível
   - Avisar usuário se houver delay

### Validações

- Pergunta não deve estar vazia
- Entidades devem existir (ou sugerir alternativas)
- Contexto não deve exceder limite de tokens
- Resposta não deve exceder limite de tokens
- Citações devem ser válidas (capítulo/episódio existem)

### Exemplos

**Exemplo 1: Pergunta sobre caminho**
```
Pergunta: "Qual a conexão entre Luffy e Shanks?"

Busca:
  - Grafo: Luffy → Rayleigh → Shanks (caminho encontrado)
  - Wiki: Texto sobre relação Luffy-Shanks
  - Histórico: Nenhum

Resposta:
  "Luffy conhece Shanks através de Rayleigh, que foi 
   primeiro imediato do Roger e mentor de Shanks.
   
   Caminho: Luffy → Rayleigh → Shanks (2 passos)
   
   📖 Fonte: Cap. 551-574 | Ep. 460-483
   
   [Ver no grafo] [Explorar mais conexões]"
```

**Exemplo 2: Pergunta sem informações**
```
Pergunta: "Quem é o personagem XYZ que não existe?"

Busca:
  - Grafo: Nenhum resultado
  - Wiki: Nenhum resultado
  - Histórico: Nenhum

Resposta:
  "Não encontrei informações sobre 'XYZ'. 
   Você quis dizer algum destes?
   - [Sugestão 1]
   - [Sugestão 2]
   
   Ou você pode buscar por nome, afiliação ou poder."
```

---

## Considerações Finais

Todas essas regras de negócio devem ser:
- **Testáveis**: Cada algoritmo deve ter testes unitários
- **Configuráveis**: Parâmetros (pesos, limites) devem estar em config
- **Documentadas**: Código deve ter comentários explicando lógica
- **Versionadas**: Mudanças em regras devem ser rastreadas
- **Auditáveis**: Logs de quando e como regras foram aplicadas