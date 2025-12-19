# Problema da falta de externalização e disciplina de foco.
## O problema de trabalhar em várias coisas ao mesmo tempo

**Regra de ouro**: Uma branch, uma coisa. Se você está trabalhando em "adicionar autenticação OAuth", essa branch só deve ter mudanças relacionadas a isso. Ponto.

**Como aplicar na prática:**

```bash
# Comece sempre criando uma branch específica
git checkout -b feature/oauth-authentication

# Trabalhe APENAS nisso
# Quando terminar, commit e PR/merge
```

Se no meio do caminho você pensar "ah, vou aproveitar e arrumar aquele bug no validator", **PARE**. Você tem 3 opções:

1. **Anotar e fazer depois** (melhor para coisas não urgentes)
2. **Stash, troca de branch, resolve, volta** (para coisas rápidas)
3. **Se já editou muita coisa**: Usa `git add -p` para commitar seletivamente (explico abaixo)

## O problema da refatoração no meio do caminho

Esse é ainda mais traiçoeiro. Você está implementando feature X, vê código feio/ruim, e pensa "vou melhorar isso aqui rapidinho". Resultado: seu PR tem 500 linhas mudadas, metade é a feature, metade é refatoração, e o revisor não entende nada.

**Solução: Commits separados, mesmo na mesma branch**

```bash
# Cenário: Você está em feature/add-payment
# Vê que o código de validação está horrível

# 1. Faça a refatoração PRIMEIRO
# Edita apenas os arquivos de validação
git add src/validators/
git commit -m "refactor: improve validation logic readability"

# 2. AGORA implemente sua feature
# Edita os arquivos de pagamento
git add src/payment/
git commit -m "feat: add credit card payment support"
```

**Vantagens dessa abordagem:**
- Histórico limpo e compreensível
- Mais fácil revisar (cada commit faz uma coisa)
- Se precisar reverter, reverte só a parte problemática
- Bisect do git funciona melhor para encontrar bugs

## Ferramentas práticas do Git

### 1. `git add -p` (patch mode) - SUA NOVA MELHOR AMIGA

Quando você já editou muita coisa misturada:

```bash
# Em vez de "git add ."
git add -p

# O git vai mostrar cada "hunk" (pedaço) de mudança
# e perguntar o que fazer:
# y = adiciona esse pedaço
# n = pula esse pedaço  
# s = divide em pedaços menores
# q = sai
```

Exemplo real:
```bash
# Você editou 3 arquivos: auth.js, user.js, validator.js
# auth.js e user.js são da feature OAuth
# validator.js é uma refatoração que você fez no meio

git add -p

# Quando mostrar mudanças de auth.js → y
# Quando mostrar mudanças de user.js → y
# Quando mostrar mudanças de validator.js → n

git commit -m "feat: add OAuth authentication"

# Agora commita a refatoração separada
git add validator.js
git commit -m "refactor: simplify validation logic"
```

### 2. `git stash` - Para quando você precisa mudar de contexto

```bash
# Você está no meio de algo, precisa trocar de contexto
git stash save "WIP: oauth integration"

# Troca de branch, faz outra coisa
git checkout -b hotfix/critical-bug
# ... resolve o bug ...
git commit -m "fix: critical bug in payment"

# Volta ao trabalho anterior
git checkout feature/oauth-authentication
git stash pop
```

### 3. `git commit --amend` - Para ajustar o último commit

```bash
# Esqueceu algo pequeno no último commit?
# Edita o arquivo
git add arquivo.js
git commit --amend --no-edit

# Ou se quiser mudar a mensagem também
git commit --amend
```

## Workflow recomendado

**ANTES de começar a codar:**

1. Cria issue no Linear/GitHub
2. Cria branch específica: `git checkout -b feature/nome-descritivo`
3. Foca APENAS naquilo

**DURANTE o desenvolvimento:**

4. Se encontrar algo para refatorar:
   - Se for pequeno (< 5 min): Stash, cria branch separada, faz, volta
   - Se for médio: Anota num TODO/issue e faz depois
   - Se for NECESSÁRIO para sua feature: Commita a refatoração primeiro, depois a feature

5. Commits pequenos e frequentes são melhores que commits gigantes
   - "feat: add login form UI" 
   - "feat: add login validation logic"
   - "feat: integrate login with backend API"
   - É melhor que um único "feat: add login"

**ANTES de fazer push/PR:**

6. Revisa seus commits: `git log --oneline`
7. Se ficou bagunçado, considere fazer rebase interativo para limpar (mais avançado, não se preocupe com isso agora)

## Mensagens de commit

Use convenções simples:

- `feat:` - nova funcionalidade
- `fix:` - correção de bug  
- `refactor:` - mudança de código sem alterar comportamento
- `docs:` - só documentação
- `test:` - adicionar/modificar testes
- `chore:` - mudanças de build, configs, etc

Exemplo: `feat: add OAuth login with Google`

## Dica de transição

Você não vai acertar de primeira. Nas próximas 2-3 semanas, sempre que for dar `git status` e ver 10 arquivos modificados, pergunte-se:

**"Isso aqui é tudo parte da mesma mudança lógica?"**

- Se sim: `git add .` e commita tudo junto
- Se não: Usa `git add -p` ou adiciona seletivamente com `git add arquivo1.js arquivo2.js`

Depois de algumas semanas isso vira automático. O segredo é: **uma mudança lógica = um commit**. Se você não consegue descrever o commit em uma frase, provavelmente são múltiplos commits.

---

# Workflow de branches e quando fazer merge

## Fatores de variância:
1. Se está trabalhando sozinho vs em equipe
2. Se tem processo de code review
3. O tamanho/complexidade das mudanças
4. Se as branches são dependentes entre si

## A abordagem muda **dependendo do contexto**. Cenários práticos:
### Cenário 1: Trabalhando sozinho ou em projeto pessoal

**Sim, faça merge frequentemente na main.**

```bash
# Terminou a feature A
git checkout main
git merge feature/feature-a
git push origin main
git branch -d feature/feature-a  # deleta a branch local

# Começa a feature B
git checkout -b feature/feature-b
# Já tem as mudanças de feature-a aqui
```

**Vantagens:**
- Sua main sempre tem o código mais atual
- Novas branches já partem do estado mais recente
- Simples e direto

**Quando usar:** Projetos pessoais, prototipagem, ou quando você é o único desenvolvedor.

### Cenário 2: Trabalhando em equipe (mais comum profissionalmente)

Aqui tem um **processo de review** antes do merge:

```bash
# Terminou a feature A
git push origin feature/feature-a

# Abre Pull Request (GitHub) ou Merge Request (GitLab)
# Alguém revisa o código
# Após aprovação, faz merge via interface (GitHub/GitLab)

# Atualiza sua main local
git checkout main
git pull origin main

# Começa feature B
git checkout -b feature/feature-b
```

**Importante:** Você NÃO faz merge direto na main local. O merge acontece após code review, geralmente pela interface web do GitHub/GitLab.

**Vantagens:**
- Qualidade de código (alguém revisa antes de entrar)
- Histórico limpo e rastreável
- CI/CD roda testes antes do merge

### Cenário 3: Feature B depende de Feature A (ainda não mergeada)

Às vezes você precisa começar feature B, mas ela depende de código que está na feature A que ainda não foi mergeada (esperando review, por exemplo).

**Opção 1 - Branch a partir da branch:**

```bash
# Feature A ainda não foi mergeada
git checkout feature/feature-a
git checkout -b feature/feature-b

# Trabalha na feature B
# Quando terminar, abre PR com base em feature-a
```

Depois que feature-a for mergeada na main, você faz rebase de feature-b:

```bash
git checkout main
git pull
git checkout feature/feature-b
git rebase main
```

**Opção 2 - Espera mergear A antes de começar B:**

Simplesmente aguarda a feature A ser mergeada antes de começar B. Enquanto isso, trabalha em outra coisa independente.

### Cenário 4: Desenvolvimento em paralelo de múltiplas features

Se você está trabalhando em várias features ao mesmo tempo (comum em times maiores):

```bash
# Todas partem da main
main
├── feature/auth
├── feature/payment  
└── feature/notifications

# Cada uma é independente
# Cada uma abre seu PR separado
# Podem ser mergeadas em qualquer ordem
```

Quando uma é mergeada, você **atualiza as outras** se necessário:

```bash
# feature/auth foi mergeada
git checkout feature/payment
git rebase main  # ou git merge main

# Resolve conflitos se houver
# Continua trabalhando
```

## Workflow recomendado para ambiente profissional

1. **Sempre parta da main atualizada:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/nova-feature
   ```

2. **Durante desenvolvimento, mantenha sua branch atualizada:**
   ```bash
   # A cada 1-2 dias, ou quando outras features forem mergeadas
   git checkout main
   git pull
   git checkout feature/sua-feature
   git rebase main  # ou merge main se preferir
   ```

3. **Quando terminar:**
   ```bash
   git push origin feature/sua-feature
   # Abre PR no GitHub/GitLab
   # Aguarda review
   # Após aprovação, faz merge (pela interface ou CLI)
   ```

4. **Após merge, limpa:**
   ```bash
   git checkout main
   git pull
   git branch -d feature/sua-feature  # local
   git push origin --delete feature/sua-feature  # remoto (opcional)
   ```