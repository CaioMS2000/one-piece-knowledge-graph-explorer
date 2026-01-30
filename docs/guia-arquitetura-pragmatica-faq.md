# FAQ e Conceitos Chave - Arquitetura Pragmática

Este documento serve como complemento ao [Guia de Arquitetura Pragmática](./guia-arquitetura-pragmatica.md), focando nas dúvidas conceituais e nos "conflitos" práticos que surgem ao aplicar esse padrão, especialmente para quem vem de Backgrounds de POO clássica ou DDD.

## 1. Isso não viola os princípios da POO (Programação Orientada a Objetos)?

**Resposta Curta:** Sim e Não.

Na POO clássica ("purista"), a regra de ouro é o **Encapsulamento**: dado e comportamento devem andar juntos. O objeto `Pedido` deveria saber calcular seu próprio total.

Nesta **Arquitetura Pragmática**, adotamos propositalmente a **Separação de Estado e Comportamento**:
- **Dados (State):** Vivem nos Models (que são apenas Interfaces/Structs). São "burros", apenas carregam informação.
- **Comportamento (Behavior):** Vive nos Services, Validators e Utils. São funções que recebem os dados e operam sobre eles.

**Por que fazemos isso?**
- **Testabilidade:** Funções puras (Utils) são muito mais fáceis de testar do que métodos dentro de objetos complexos.
- **Simplicidade:** Serializar dados para JSON (API) é trivial quando o dado é apenas uma estrutura, sem métodos atrelados.
- **Contexto Moderno:** Linguagens modernas (Go, Rust, e o próprio TypeScript) favorecem composição e funções sobre herança e objetos complexos.

---

## 2. Se a Regra de Negócio não está na Entidade, onde ela fica?

No DDD (Modelo Rico), a regra fica *dentro* da entidade (`pedido.adicionarItem(item)`).
No Modelo Pragmático, nós "explodimos" a regra para fora da entidade, mas **ela continua tendo um lugar específico**.

Não deixe a regra solta no meio do Service. Organize em três categorias:

### A. Validators (Regras de "Pode ou Não Pode")
Validam se o estado atual permite uma operação.
- **Onde:** `src/domain/validators/`
- **Exemplo:** Verificar se o usuário tem saldo, se o e-mail já existe.
- ** Código:**
  ```typescript
  // Service chama:
  validateOrderLimit(user, totalAmount);
  ```

### B. Utils (Regras de "Cálculo e Transformação")
Lógica pura de transformação de dados. Entra dado, sai dado. Sem banco de dados.
- **Onde:** `src/domain/utils/`
- **Exemplo:** Calcular imposto, gerar slug, formatar datas.
- **Código:**
  ```typescript
  // Service chama:
  const tax = calculateTax(amount, 'SP');
  ```

### C. O Próprio Service (Regras de "Fluxo")
A regra de *ordem* das coisas.
- **Onde:** O método do Service.
- **Exemplo:** "Primeiro valida, se passar, salva no banco, depois envia e-mail".

---

## 3. Qual o real papel do "Service"? (Maestro vs Operário)

O maior erro ao aplicar essa arquitetura (o tal "Service Hell") é confundir o papel do Service.

### ❌ O Service Operário (Errado)
O Service tenta fazer o trabalho braçal. Ele tem `if`s de validação, laços `for` para somar totais, regex para validar strings.
- **Sintoma:** Métodos com 50+ linhas, difícil de ler.
- **Resultado:** Código acoplado e difícil de testar.

### ✅ O Service Maestro (Certo)
O Service não "trabalha", ele **delega**. Ele sabe **O QUE** precisa ser feito, mas não sabe **COMO** fazer.
- **Papel:** Coordenar. "Validador A, valide isso. Calculadora B, calcule aquilo. Repositório C, salve isso."
- **Sintoma:** Métodos curtos, limpos, que leem como um roteiro da operação.

**A Regra do Limite:** Se você tem um cálculo matemático ou uma validação complexa (`if` ou `regex`) diretamente solta no corpo do Service, você provavelmente deveria extrair para um Util ou Validator.

---

## 4. Comparativo Visual: Onde fica a Lógica?

| Aspecto | DDD (Modelo Rico) | Arquitetura Pragmática (Service Layer) |
| :--- | :--- | :--- |
| **A Entidade/Model** | É inteligente. Protege a si mesma. `pedido.adicionar(item)` | É "burra" (anêmica). Aceita qualquer dado. `pedido.items.push(item)` |
| **Quem protege o dado?** | A própria classe. | O Service (usando Validators) protege antes de salvar. |
| **Onde está a regra?** | Encapsulada no objeto. | Distribuída em funções especializadas (Validators/Utils). |
| **Foco** | Comportamento + Estado. | Fluxo de Dados + Transformações. |

---

## 5. Consistência de Dados: Memória vs Banco (Unit of Work)

Ao manipular dados complexos, você tem duas opções principais:

### 1: Carregar Tudo → Processar → Salvar Tudo (Unit of Work)
**Recomendado para 90% dos casos.**
Você carrega todos os dados necessários no início da transação, manipula os objetos em memória (passando por referência) e salva o estado final de uma vez.

- **Prós:**
  - **Atomicidade:** Tudo ou nada. Se der erro no meio, o banco não fica sujo.
  - **Performance:** Minimiza idas e vindas ao banco.
  - **Integridade:** Você valida o estado final do grafo de objetos antes de persistir.
- **Contras:**
  - **Concorrência:** Se o processo demorar muito, o dado que você leu no início pode estar desatualizado (use Optimistic Locking/Versionamento para resolver).

### 2: Carregar → Salvar → Recarregar (Incremental)
**Não Recomendado (exceto casos específicos).**
Você faz uma alteração, salva no banco para pegar um ID ou trigger, recarrega o dado, faz outra coisa...

- **Problemas:**
  - **"Dirty Reads":** Se não estiver numa transação serializável, você pode estar lendo dados parciais.
  - **Baixa Performance:** Problema N+1 de queries.
  - **Estado Inválido:** Se o processo falhar no meio, você pode ter salvo metade dos dados no banco.

### Dica de Ouro: IDs gerados pela Aplicação (UUID/CUID)
Muitas vezes, a Opção 2 é usada porque o dev precisa do ID do banco (Auto Incremento) para criar o próximo objeto.
Ao usar **UUIDs gerados no código**, você elimina essa dependência. Você pode criar o grafo inteiro de objetos (Pai + Filhos) na memória com todos os IDs já definidos e salvar tudo de uma só vez no final.

**Resumo:** O Service atua como fronteira da transação. **Abra transação → Carregue → Manipule → Salve → Commit.**
