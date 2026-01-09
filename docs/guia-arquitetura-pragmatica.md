# Guia de Arquitetura Pragmática (Service Layer sem DDD)

Este documento apresenta uma abordagem pragmática para arquitetura de software backend, usando **Service Layer Pattern** sem a complexidade do Domain-Driven Design (DDD).

## 📋 Índice

- [Quando NÃO Usar DDD](#quando-não-usar-ddd)
- [Arquitetura Service Layer](#arquitetura-service-layer)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Responsabilidades de Cada Camada](#responsabilidades-de-cada-camada)
- [Evitando o "Service Hell"](#evitando-o-service-hell)
- [Models vs DTOs](#models-vs-dtos)
- [Relacionamentos Entre Models](#relacionamentos-entre-models)
- [Validações e Regras](#validações-e-regras)
- [Exemplos Práticos](#exemplos-práticos)
- [Quando Evoluir para DDD](#quando-evoluir-para-ddd)

---

## Quando NÃO Usar DDD

DDD (Domain-Driven Design) é uma ferramenta poderosa, mas **não é necessária em todos os projetos**. Evite DDD quando:

### ❌ Situações que NÃO justificam DDD:

1. **Não há especialistas de domínio disponíveis**
   - DDD exige colaboração próxima com experts do negócio
   - Se você só tem desenvolvedores interpretando requisitos, DDD perde seu principal valor

2. **Complexidade é técnica, não de negócio**
   - Algoritmos complexos ≠ Domínio complexo
   - Integrações com APIs externas ≠ Domínio complexo
   - Performance/otimização ≠ Domínio complexo

3. **CRUD com processamento**
   - Operações básicas (criar, ler, atualizar, deletar)
   - Com transformações, cálculos ou integrações
   - Sem regras de negócio que mudam frequentemente

4. **Projeto pequeno ou MVP**
   - Poucos desenvolvedores (1-3)
   - Prazo apertado
   - Necessidade de validar ideia rapidamente

5. **Domínio estável e bem conhecido**
   - Se o domínio não muda há anos
   - Se não há ambiguidade sobre conceitos
   - Se não há necessidade de "linguagem ubíqua"

### ✅ Use DDD apenas quando:

- Você tem acesso regular a especialistas do domínio
- O domínio tem regras de negócio complexas e mutáveis
- Há ambiguidade conceitual que precisa ser resolvida
- O sistema vai crescer significativamente (10+ devs, 5+ anos)
- O custo do over-engineering é aceitável

---

## Arquitetura Service Layer

A arquitetura Service Layer é uma alternativa pragmática ao DDD para sistemas que não precisam de sua complexidade.

### Princípios:

1. **Separação de Responsabilidades** - Cada camada tem um propósito claro
2. **Simplicidade** - Sem abstrações desnecessárias
3. **Testabilidade** - Camadas isoladas facilitam testes
4. **Manutenibilidade** - Código direto e fácil de entender

### Diagrama de Camadas:

```
┌─────────────────────────────────────────┐
│         API Layer (Routes)              │  ← HTTP, validação de entrada
├─────────────────────────────────────────┤
│         Service Layer                    │  ← Orquestração, lógica de negócio
├─────────────────────────────────────────┤
│         Repository Layer                 │  ← Acesso ao banco de dados
├─────────────────────────────────────────┤
│         Infrastructure                   │  ← Conexões, clients externos
└─────────────────────────────────────────┘
```

### Fluxo de Dados:

```
Request → Route → Service → Repository → Database
                     ↓
                  Utils/Validators/Factories
```

---

## Estrutura de Pastas

```
src/
├── api/                        # API Layer
│   ├── routes/                 # Endpoints HTTP
│   │   ├── user.routes.ts
│   │   └── product.routes.ts
│   ├── middlewares/            # Autenticação, logging, etc
│   └── schemas/                # Validação de entrada (Zod, Joi)
│
├── services/                   # Service Layer
│   ├── user.service.ts
│   └── product.service.ts
│
├── repositories/               # Repository Layer
│   ├── user.repository.ts
│   └── product.repository.ts
│
├── domain/                     # Regras de negócio distribuídas
│   ├── models/                 # Interfaces/Types (dados puros)
│   │   ├── user.ts
│   │   └── product.ts
│   ├── dtos/                   # Data Transfer Objects (API contracts)
│   │   ├── user-request.dto.ts
│   │   └── user-response.dto.ts
│   ├── factories/              # Criação de models com validações
│   │   └── user.factory.ts
│   ├── validators/             # Regras de validação complexas
│   │   └── user.validator.ts
│   └── utils/                  # Funções puras (cálculos, transformações)
│       └── price-calculator.util.ts
│
├── infrastructure/             # Infrastructure Layer
│   ├── database/               # Conexões com bancos
│   ├── cache/                  # Redis, cache in-memory
│   ├── http-clients/           # APIs externas
│   └── messaging/              # Filas, pub/sub
│
└── config/                     # Configurações
    └── database.config.ts
```

---

## Responsabilidades de Cada Camada

### 1. **API Layer (Routes)**

**Responsabilidade:** Receber requisições HTTP, validar entrada, chamar service, retornar resposta.

**O que FAZ:**
- Validar schema da requisição (Zod, Joi)
- Extrair parâmetros (path, query, body)
- Chamar o service apropriado
- Tratar erros e retornar status HTTP correto
- Serializar resposta (model → DTO)

**O que NÃO FAZ:**
- Lógica de negócio
- Acesso direto ao banco
- Cálculos complexos

**Exemplo:**

```typescript
// src/api/routes/user.routes.ts
import { FastifyInstance } from 'fastify';
import { createUserSchema } from '../schemas/user.schema';
import { UserService } from '../../services/user.service';

export async function userRoutes(fastify: FastifyInstance) {
  const userService = new UserService(/* deps */);

  fastify.post('/users', async (request, reply) => {
    // 1. Validar entrada
    const data = createUserSchema.parse(request.body);

    try {
      // 2. Chamar service
      const user = await userService.createUser(data);

      // 3. Retornar resposta
      return reply.status(201).send(user);
    } catch (error) {
      // 4. Tratar erro
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      throw error;
    }
  });

  fastify.get('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const user = await userService.getUser(id);

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    return user;
  });
}
```

---

### 2. **Service Layer**

**Responsabilidade:** Orquestrar operações, aplicar lógica de negócio, coordenar múltiplos repositórios.

**O que FAZ:**
- Orquestrar chamadas a múltiplos repositórios
- Aplicar regras de negócio (via validators/utils)
- Transformar models em DTOs
- Coordenar transações
- Delegar validações/cálculos para helpers

**O que NÃO FAZ:**
- Queries SQL diretas
- Validações inline (delega para validators)
- Cálculos inline (delega para utils)
- HTTP/Serialização (responsabilidade da API Layer)

**Exemplo:**

```typescript
// src/services/user.service.ts
import { UserRepository } from '../repositories/user.repository';
import { createUser } from '../domain/factories/user.factory';
import { validateUserCreation } from '../domain/validators/user.validator';
import { UserResponseDTO } from '../domain/dtos/user-response.dto';

export class UserService {
  constructor(private userRepo: UserRepository) {}

  async createUser(dto: CreateUserDTO): Promise<UserResponseDTO> {
    // 1. Validar (delegado)
    validateUserCreation(dto);

    // 2. Verificar duplicidade (lógica de negócio)
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    // 3. Criar model (delegado)
    const user = createUser(dto);

    // 4. Persistir
    const saved = await this.userRepo.save(user);

    // 5. Retornar DTO
    return this.toResponseDTO(saved);
  }

  async getUser(id: string): Promise<UserResponseDTO | null> {
    const user = await this.userRepo.findById(id);
    return user ? this.toResponseDTO(user) : null;
  }

  private toResponseDTO(user: User): UserResponseDTO {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      // Não expõe password, etc
    };
  }
}
```

**Regra de Ouro:** Se um método do service tem >50 linhas, extraia responsabilidades para factories/validators/utils.

---

### 3. **Repository Layer**

**Responsabilidade:** Isolar acesso ao banco de dados, queries SQL, mapeamento.

**O que FAZ:**
- Executar queries SQL (SELECT, INSERT, UPDATE, DELETE)
- Mapear rows do banco para models
- Mapear models para formato do banco
- Encapsular lógica de persistência

**O que NÃO FAZ:**
- Validações de negócio
- Cálculos
- Orquestração de múltiplas operações

**Exemplo:**

```typescript
// src/repositories/user.repository.ts
import { Pool } from 'pg';
import { User } from '../domain/models/user';

export class UserRepository {
  constructor(private pg: Pool) {}

  async save(user: User): Promise<User> {
    const result = await this.pg.query(
      `INSERT INTO users (id, email, name, password_hash, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user.id, user.email, user.name, user.passwordHash, user.createdAt]
    );

    return this.mapToUser(result.rows[0]);
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.pg.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0] ? this.mapToUser(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pg.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    return result.rows[0] ? this.mapToUser(result.rows[0]) : null;
  }

  private mapToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
```

---

### 4. **Domain Layer (Distribuído)**

O "domain" não é uma camada tradicional, mas um conjunto de helpers especializados:

#### 4.1 **Models** (Dados Puros)

**Responsabilidade:** Definir estrutura dos dados internos (1:1 com tabelas principais).

```typescript
// src/domain/models/user.ts
export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 4.2 **DTOs** (Contratos da API)

**Responsabilidade:** Definir o que entra e sai da API (diferente dos models internos).

```typescript
// src/domain/dtos/user-request.dto.ts
export interface CreateUserDTO {
  email: string;
  name: string;
  password: string;
}

// src/domain/dtos/user-response.dto.ts
export interface UserResponseDTO {
  id: string;
  email: string;
  name: string;
  createdAt: string; // ISO string, não Date
  // passwordHash NÃO é exposto
}
```

#### 4.3 **Factories** (Criação + Validações Básicas)

**Responsabilidade:** Criar models válidos, aplicar defaults, validações simples.

```typescript
// src/domain/factories/user.factory.ts
import { User } from '../models/user';
import { validateUserInput } from '../validators/user.validator';
import { hashPassword } from '../utils/crypto.util';

export function createUser(input: CreateUserInput): User {
  // Validar (pode delegar)
  validateUserInput(input);

  return {
    id: crypto.randomUUID(),
    email: input.email.toLowerCase(),
    name: input.name.trim(),
    passwordHash: hashPassword(input.password),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

#### 4.4 **Validators** (Regras Complexas)

**Responsabilidade:** Validações que envolvem múltiplos campos ou regras inter-relacionadas.

```typescript
// src/domain/validators/user.validator.ts
export function validateUserInput(input: CreateUserInput): void {
  if (!input.email || !input.email.includes('@')) {
    throw new ValidationError('Invalid email');
  }

  if (input.password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(input.password)) {
    throw new ValidationError('Password must contain uppercase letter');
  }
}

export function validatePasswordChange(current: string, newPassword: string): void {
  if (current === newPassword) {
    throw new ValidationError('New password must be different');
  }

  if (newPassword.length < 8) {
    throw new ValidationError('Password too short');
  }
}
```

#### 4.5 **Utils** (Funções Puras)

**Responsabilidade:** Cálculos, transformações, helpers sem side-effects.

```typescript
// src/domain/utils/price-calculator.util.ts
export function calculateDiscount(price: number, discountPercent: number): number {
  return price * (1 - discountPercent / 100);
}

export function calculateTax(price: number, taxRate: number): number {
  return price * (taxRate / 100);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
```

---

## Evitando o "Service Hell"

O maior risco de não usar DDD é acabar com **services gigantes** que fazem tudo. Isso é conhecido como "Service Hell" ou "God Object".

### ❌ Sintomas do Service Hell:

1. **Service com 500+ linhas**
2. **Métodos com 100+ linhas**
3. **Validações inline** espalhadas pelo código
4. **Cálculos inline** misturados com lógica de negócio
5. **Métodos privados demais** (sinal de que deveria ser classe separada)

### ✅ Como Evitar:

#### Regra 1: **Extrair Validações**

**❌ ERRADO:**
```typescript
async createUser(dto: CreateUserDTO) {
  // 20 linhas de validação inline
  if (!dto.email) throw new Error('Email required');
  if (!dto.email.includes('@')) throw new Error('Invalid email');
  if (dto.password.length < 8) throw new Error('Password too short');
  // ... mais 15 linhas

  const user = { ... };
  await this.repo.save(user);
}
```

**✅ CERTO:**
```typescript
async createUser(dto: CreateUserDTO) {
  validateUserInput(dto); // Delegado para validator

  const user = createUser(dto);
  await this.repo.save(user);
}
```

---

#### Regra 2: **Extrair Cálculos**

**❌ ERRADO:**
```typescript
async calculateOrderTotal(items: Item[]) {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.price * item.quantity;
  }

  const discount = subtotal * 0.1;
  const tax = (subtotal - discount) * 0.08;
  const total = subtotal - discount + tax;

  return total;
}
```

**✅ CERTO:**
```typescript
async calculateOrderTotal(items: Item[]) {
  const subtotal = calculateSubtotal(items);
  const discount = calculateDiscount(subtotal, 10);
  const tax = calculateTax(subtotal - discount, 8);

  return subtotal - discount + tax;
}

// Em utils/price-calculator.util.ts
function calculateSubtotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

---

#### Regra 3: **Extrair Criação para Factory**

**❌ ERRADO:**
```typescript
async createProduct(dto: CreateProductDTO) {
  const product = {
    id: crypto.randomUUID(),
    name: dto.name.trim(),
    price: dto.price || 0,
    slug: dto.name.toLowerCase().replace(/\s+/g, '-'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await this.repo.save(product);
}
```

**✅ CERTO:**
```typescript
async createProduct(dto: CreateProductDTO) {
  const product = createProduct(dto); // Factory cuida de tudo
  await this.repo.save(product);
}

// Em factories/product.factory.ts
function createProduct(dto: CreateProductDTO): Product {
  return {
    id: crypto.randomUUID(),
    name: dto.name.trim(),
    price: dto.price || 0,
    slug: slugify(dto.name),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

---

#### Regra 4: **Limitar Número de Services**

Não crie um service para cada operação. Agrupe por **bounded context** ou **agregado**.

**❌ ERRADO:**
```
services/
├── create-user.service.ts
├── update-user.service.ts
├── delete-user.service.ts
├── find-user.service.ts
└── ... 50 services
```

**✅ CERTO:**
```
services/
├── user.service.ts        # Todas operações de usuário
├── auth.service.ts        # Login, logout, tokens
├── order.service.ts       # Pedidos
└── payment.service.ts     # Pagamentos
```

Para um projeto médio: **4-8 services** é suficiente.

---

## Models vs DTOs

Uma dúvida comum: "Qual a diferença entre Model e DTO?"

### Model (Interno)

- **Propósito:** Representar dados como são armazenados/processados internamente
- **Onde vive:** `domain/models/`
- **Usado por:** Services, Repositories, Factories
- **Pode ter:** Campos privados, dados sensíveis (passwordHash), IDs internos

```typescript
// Model interno
export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;    // ← Sensível, nunca expor
  isActive: boolean;
  createdAt: Date;         // ← Date nativo
  updatedAt: Date;
}
```

### DTO (Externo)

- **Propósito:** Definir contratos da API (entrada/saída)
- **Onde vive:** `domain/dtos/`
- **Usado por:** Routes, Services (transformação)
- **Pode ter:** Campos renomeados, dados públicos, formatos serializáveis

```typescript
// DTO de entrada
export interface CreateUserDTO {
  email: string;
  name: string;
  password: string;        // ← Plain text (será hasheado)
}

// DTO de saída
export interface UserResponseDTO {
  id: string;
  email: string;
  name: string;
  createdAt: string;       // ← ISO string, não Date
  // passwordHash NÃO está aqui
  // isActive pode ou não estar (decisão de negócio)
}
```

### Quando Model = DTO?

Se não há diferença conceitual entre interno e externo, pode usar o mesmo:

```typescript
// Se o model é exatamente o que a API retorna:
export interface Product {
  id: string;
  name: string;
  price: number;
  createdAt: Date;
}

// Você pode retornar direto
async getProduct(id: string): Promise<Product | null> {
  return this.repo.findById(id);
}
```

Mas geralmente há pequenas diferenças (campos sensíveis, renomeações, formatações).

---

## Relacionamentos Entre Models

Em arquitetura pragmática, **models se referenciam apenas por IDs** (chaves estrangeiras), não por objetos aninhados.

### Princípio Fundamental

**Models são dados puros** - interfaces/types que espelham tabelas do banco. Eles não navegam entre objetos como no DDD.

### ✅ Correto: Referências por ID

```typescript
// src/domain/models/user.ts
export interface User {
  id: string;
  email: string;
  name: string;
  organizationId: string | null;  // ← FK (apenas ID)
  createdAt: Date;
}

// src/domain/models/organization.ts
export interface Organization {
  id: string;
  name: string;
  type: 'COMPANY' | 'NON_PROFIT';
}

// src/domain/models/order.ts
export interface Order {
  id: string;
  userId: string;           // ← FK para User
  productIds: string[];     // ← Array de IDs (não objetos Product)
  totalAmount: number;
  createdAt: Date;
}

// src/domain/models/product.ts
export interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;       // ← FK para Category
}
```

**Por quê apenas IDs?**
1. **Evita over-fetching** - Nem sempre precisa dos dados relacionados
2. **Simplicidade** - Serialização automática (JSON)
3. **Performance** - Controla quando fazer JOINs
4. **Cache** - Mais fácil invalidar/atualizar

---

### ❌ Incorreto: Objetos Aninhados (Estilo DDD)

```typescript
// ❌ NÃO FAÇA ISSO em Service Layer
export interface User {
  id: string;
  email: string;
  organization: Organization;  // ← Objeto completo (over-fetching)
}

export interface Order {
  id: string;
  user: User;                  // ← Objeto completo
  products: Product[];         // ← Array de objetos (sempre busca tudo)
}
```

**Problemas:**
- Sempre busca dados relacionados (mesmo quando não precisa)
- Dificulta cache e serialização
- Cria dependências circulares
- Complexidade desnecessária

---

### Como Obter Dados Relacionados?

Quando você precisa de dados relacionados, escolha uma destas estratégias:

#### **Estratégia 1: JOIN no Repository (Performance)**

Crie um model específico para a query agregada:

```typescript
// src/domain/models/user-with-organization.ts
export interface UserWithOrganization {
  id: string;
  email: string;
  name: string;
  organization: {              // ← Dados parciais da org
    id: string;
    name: string;
    type: string;
  } | null;
}

// src/repositories/user.repository.ts
export class UserRepository {
  async findByIdWithOrganization(id: string): Promise<UserWithOrganization | null> {
    const result = await this.pg.query(
      `SELECT
         u.id, u.email, u.name,
         o.id as org_id, o.name as org_name, o.type as org_type
       FROM users u
       LEFT JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1`,
      [id]
    );

    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      organization: row.org_id ? {
        id: row.org_id,
        name: row.org_name,
        type: row.org_type,
      } : null,
    };
  }
}
```

**Quando usar:**
- Query executada frequentemente
- Evitar problema N+1
- Performance crítica

---

#### **Estratégia 2: Service Orquestra Múltiplos Repos (Flexibilidade)**

Service busca em múltiplos repositories e combina:

```typescript
// src/services/user.service.ts
export class UserService {
  constructor(
    private userRepo: UserRepository,
    private organizationRepo: OrganizationRepository
  ) {}

  async getUserWithDetails(id: string): Promise<UserDetailDTO | null> {
    // 1. Buscar usuário
    const user = await this.userRepo.findById(id);
    if (!user) return null;

    // 2. Buscar organização (se existir)
    let organization = null;
    if (user.organizationId) {
      organization = await this.organizationRepo.findById(user.organizationId);
    }

    // 3. Montar DTO com dados relacionados
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      organization: organization ? {
        id: organization.id,
        name: organization.name,
        type: organization.type,
      } : null,
    };
  }
}
```

**Quando usar:**
- Lógica condicional complexa
- Dados opcionais/variáveis
- Múltiplas fontes de dados (Postgres + Neo4j, por exemplo)

---

#### **Estratégia 3: Lazy Loading Manual (Economia)**

Cliente decide se quer buscar dados relacionados:

```typescript
// src/services/user.service.ts
export class UserService {
  // Método básico (sem relacionamentos)
  async getUser(id: string): Promise<UserDTO | null> {
    const user = await this.userRepo.findById(id);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,  // ← Apenas o ID
    };
  }

  // Método com relacionamentos (opt-in)
  async getUserWithOrganization(id: string): Promise<UserDetailDTO | null> {
    const user = await this.getUser(id);
    if (!user) return null;

    let organization = null;
    if (user.organizationId) {
      organization = await this.organizationService.getOrganization(user.organizationId);
    }

    return {
      ...user,
      organization,
    };
  }
}
```

**Quando usar:**
- Nem sempre precisa dos relacionamentos
- Evitar over-fetching
- Endpoint com parâmetro `?include=organization`

---

### Exemplo Completo: Order + Products

```typescript
// src/domain/models/order.ts
export interface Order {
  id: string;
  userId: string;          // ← FK (não objeto User)
  productIds: string[];    // ← Array de IDs (não objetos)
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'SHIPPED';
  createdAt: Date;
}

// Model para resposta agregada
export interface OrderWithDetails {
  id: string;
  status: string;
  totalAmount: number;
  user: {
    id: string;
    name: string;
    email: string;
  };
  products: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  createdAt: Date;
}

// src/repositories/order.repository.ts
export class OrderRepository {
  async findByIdWithDetails(id: string): Promise<OrderWithDetails | null> {
    // JOIN com users e products
    const result = await this.pg.query(
      `SELECT
         o.id, o.status, o.total_amount, o.created_at,
         u.id as user_id, u.name as user_name, u.email as user_email,
         json_agg(
           json_build_object(
             'id', p.id,
             'name', p.name,
             'price', p.price,
             'quantity', oi.quantity
           )
         ) as products
       FROM orders o
       JOIN users u ON o.user_id = u.id
       JOIN order_items oi ON oi.order_id = o.id
       JOIN products p ON oi.product_id = p.id
       WHERE o.id = $1
       GROUP BY o.id, u.id`,
      [id]
    );

    if (!result.rows[0]) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      status: row.status,
      totalAmount: Number(row.total_amount),
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
      },
      products: row.products,
      createdAt: row.created_at,
    };
  }
}
```

---

### Tipos de Relacionamentos

#### **1:1 (Um para Um)**

```typescript
// User tem um Profile
export interface User {
  id: string;
  email: string;
  profileId: string;  // ← FK único
}

export interface Profile {
  id: string;
  userId: string;     // ← FK único (inverso)
  bio: string;
  avatar: string;
}
```

#### **1:N (Um para Muitos)**

```typescript
// User tem muitos Orders
export interface User {
  id: string;
  email: string;
  // Não tem orderIds (seria array gigante)
}

export interface Order {
  id: string;
  userId: string;  // ← FK para User (lado N)
  totalAmount: number;
}

// Buscar orders de um user:
// orderRepo.findByUserId(userId)
```

#### **N:M (Muitos para Muitos)**

```typescript
// Order tem muitos Products, Product está em muitos Orders
export interface Order {
  id: string;
  userId: string;
  // Não armazena productIds diretamente
}

export interface Product {
  id: string;
  name: string;
  // Não armazena orderIds diretamente
}

// Tabela de junção (order_items)
export interface OrderItem {
  id: string;
  orderId: string;    // ← FK para Order
  productId: string;  // ← FK para Product
  quantity: number;
  price: number;      // Preço no momento da compra
}

// Buscar produtos de um order:
// orderItemRepo.findByOrderId(orderId)
```

---

### Resumo: Relacionamentos

| Aspecto | DDD (Navegação de Objetos) | Service Layer (IDs) |
|---------|----------------------------|---------------------|
| **Referência** | `user.organization` (objeto) | `user.organizationId` (string) |
| **Buscar relacionados** | Automático (sempre carrega) | Manual (JOIN ou orquestração) |
| **Performance** | Over-fetching comum | Controlada |
| **Serialização** | Complexa (métodos toJSON) | Automática |
| **Flexibilidade** | Baixa (sempre busca tudo) | Alta (decide quando buscar) |

**Regra de Ouro:** Models = dados puros + IDs. Service/Repository decide quando/como buscar relacionados.

---

## Validações e Regras

Onde colocar cada tipo de validação/regra?

### 1. **Validação de Schema (API Layer)**

Usa bibliotecas como Zod, Joi, ou validadores do framework.

```typescript
// src/api/schemas/user.schema.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(3).max(100),
  password: z.string().min(8),
});
```

```typescript
// src/api/routes/user.routes.ts
fastify.post('/users', async (request, reply) => {
  const data = createUserSchema.parse(request.body); // ← Valida aqui
  const user = await userService.createUser(data);
  return reply.status(201).send(user);
});
```

---

### 2. **Validação de Negócio (Validators)**

Regras que envolvem múltiplos campos ou lógica complexa.

```typescript
// src/domain/validators/order.validator.ts
export function validateOrder(order: CreateOrderInput): void {
  if (order.items.length === 0) {
    throw new ValidationError('Order must have at least one item');
  }

  const total = calculateTotal(order.items);
  if (total < 10) {
    throw new ValidationError('Minimum order value is $10');
  }

  if (order.shippingAddress.country !== 'BR' && order.paymentMethod === 'BOLETO') {
    throw new ValidationError('Boleto only available for Brazil');
  }
}
```

---

### 3. **Invariantes (Factories ou Validators)**

Condições que **sempre** devem ser verdadeiras.

```typescript
// Exemplo: "Email deve ser único"
// ← Verificado no SERVICE (não factory, precisa consultar banco)

async createUser(dto: CreateUserDTO) {
  const existing = await this.repo.findByEmail(dto.email);
  if (existing) {
    throw new ConflictError('Email already registered'); // ← Invariante
  }

  const user = createUser(dto);
  await this.repo.save(user);
}
```

---

### 4. **Regras de Transformação (Utils)**

Lógica que transforma/calcula sem validar.

```typescript
// src/domain/utils/string.util.ts
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
}
```

---

## Exemplos Práticos

### Exemplo Completo: Feature de Criação de Produto

```
src/
├── api/routes/product.routes.ts
├── services/product.service.ts
├── repositories/product.repository.ts
├── domain/
│   ├── models/product.ts
│   ├── dtos/product.dto.ts
│   ├── factories/product.factory.ts
│   ├── validators/product.validator.ts
│   └── utils/price.util.ts
```

#### 1. Model

```typescript
// src/domain/models/product.ts
export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. DTOs

```typescript
// src/domain/dtos/product.dto.ts
export interface CreateProductDTO {
  name: string;
  price: number;
  stock: number;
}

export interface ProductResponseDTO {
  id: string;
  name: string;
  slug: string;
  price: number;
  formattedPrice: string; // ← Campo calculado
  inStock: boolean;       // ← Campo derivado
}
```

#### 3. Factory

```typescript
// src/domain/factories/product.factory.ts
import { Product } from '../models/product';
import { slugify } from '../utils/string.util';

export function createProduct(input: CreateProductInput): Product {
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    slug: slugify(input.name),
    price: input.price,
    stock: input.stock,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

#### 4. Validator

```typescript
// src/domain/validators/product.validator.ts
export function validateProductInput(input: CreateProductInput): void {
  if (!input.name || input.name.trim().length === 0) {
    throw new ValidationError('Name is required');
  }

  if (input.price <= 0) {
    throw new ValidationError('Price must be positive');
  }

  if (input.stock < 0) {
    throw new ValidationError('Stock cannot be negative');
  }
}
```

#### 5. Utils

```typescript
// src/domain/utils/price.util.ts
export function formatPrice(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
```

#### 6. Repository

```typescript
// src/repositories/product.repository.ts
export class ProductRepository {
  constructor(private pg: Pool) {}

  async save(product: Product): Promise<Product> {
    const result = await this.pg.query(
      `INSERT INTO products (id, name, slug, price, stock, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [product.id, product.name, product.slug, product.price, product.stock,
       product.isActive, product.createdAt, product.updatedAt]
    );

    return this.mapToProduct(result.rows[0]);
  }

  async findById(id: string): Promise<Product | null> {
    const result = await this.pg.query(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );

    return result.rows[0] ? this.mapToProduct(result.rows[0]) : null;
  }

  private mapToProduct(row: any): Product {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      price: Number(row.price),
      stock: row.stock,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
```

#### 7. Service

```typescript
// src/services/product.service.ts
import { ProductRepository } from '../repositories/product.repository';
import { createProduct } from '../domain/factories/product.factory';
import { validateProductInput } from '../domain/validators/product.validator';
import { formatPrice } from '../domain/utils/price.util';

export class ProductService {
  constructor(private productRepo: ProductRepository) {}

  async createProduct(dto: CreateProductDTO): Promise<ProductResponseDTO> {
    // 1. Validar
    validateProductInput(dto);

    // 2. Criar model
    const product = createProduct(dto);

    // 3. Salvar
    const saved = await this.productRepo.save(product);

    // 4. Retornar DTO
    return this.toResponseDTO(saved);
  }

  async getProduct(id: string): Promise<ProductResponseDTO | null> {
    const product = await this.productRepo.findById(id);
    return product ? this.toResponseDTO(product) : null;
  }

  private toResponseDTO(product: Product): ProductResponseDTO {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      formattedPrice: formatPrice(product.price),
      inStock: product.stock > 0,
    };
  }
}
```

#### 8. Route

```typescript
// src/api/routes/product.routes.ts
import { FastifyInstance } from 'fastify';
import { createProductSchema } from '../schemas/product.schema';

export async function productRoutes(fastify: FastifyInstance) {
  const productService = new ProductService(/* deps */);

  fastify.post('/products', async (request, reply) => {
    const data = createProductSchema.parse(request.body);

    try {
      const product = await productService.createProduct(data);
      return reply.status(201).send(product);
    } catch (error) {
      if (error instanceof ValidationError) {
        return reply.status(400).send({ error: error.message });
      }
      throw error;
    }
  });

  fastify.get('/products/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const product = await productService.getProduct(id);

    if (!product) {
      return reply.status(404).send({ error: 'Product not found' });
    }

    return product;
  });
}
```

---

## Quando Evoluir para DDD

Se o seu projeto começou com Service Layer e está crescendo, considere DDD quando:

### Sinais de que precisa de DDD:

1. **Regras de negócio complexas e mutáveis**
   - Lógica espalhada em múltiplos validators/utils
   - Difícil entender "o que o sistema faz"
   - Regras que mudam frequentemente

2. **Colaboração com especialistas de domínio**
   - Você tem acesso regular a experts
   - Há ambiguidade sobre conceitos
   - Necessidade de "linguagem ubíqua"

3. **Time grande (10+ devs)**
   - Múltiplos times trabalhando em paralelo
   - Necessidade de bounded contexts claros
   - Coordenação entre agregados

4. **Sistema crítico de longo prazo**
   - Vai rodar por 5+ anos
   - Alto custo de bugs/downtime
   - Necessidade de documentação viva (código)

### Migração Gradual:

Você não precisa reescrever tudo. Evolua gradualmente:

1. **Identifique agregados** - Quais entities sempre mudam juntas?
2. **Extraia value objects** - Conceitos que têm regras próprias (Email, Money, CPF)
3. **Crie entities** - Objetos com identidade e comportamento
4. **Defina bounded contexts** - Separe subdomínios
5. **Implemente use cases** - Se a orquestração ficar muito complexa

**Exemplo de migração:**

```typescript
// ANTES (Service Layer)
function validateUserInput(input: CreateUserInput): void {
  if (!input.email.includes('@')) throw new Error('Invalid email');
}

// DEPOIS (DDD com Value Object)
class Email {
  private constructor(private value: string) {}

  static create(value: string): Email {
    if (!value.includes('@')) {
      throw new InvalidEmailError();
    }
    return new Email(value);
  }

  getValue(): string {
    return this.value;
  }
}

class User {
  constructor(
    private id: string,
    private email: Email, // ← Agora é um Value Object
    private name: string
  ) {}
}
```

---

## Resumo Final

| Aspecto | Service Layer (Pragmático) | DDD (Complexo) |
|---------|----------------------------|----------------|
| **Estrutura** | Services + Repos + Helpers | Entities + VOs + Use Cases + Repos |
| **Models** | Interfaces simples | Classes com comportamento |
| **Validações** | Validators/Factories | Dentro das Entities/VOs |
| **Lógica** | Distribuída (utils, validators) | Encapsulada nas Entities |
| **Quando usar** | MVP, CRUD+, projetos pequenos | Domínio complexo, time grande |
| **Complexidade** | Baixa | Alta |
| **Time-to-market** | Rápido | Lento |
| **Manutenção** | Fácil (se seguir boas práticas) | Muito boa (se bem feito) |

---

## Checklist de Boas Práticas

Ao implementar Service Layer, sempre:

- [ ] Service com <200 linhas (se maior, refatore)
- [ ] Métodos com <50 linhas (se maior, extraia)
- [ ] Validações em validators/, não inline
- [ ] Cálculos em utils/, não inline
- [ ] Criação em factories/, não inline
- [ ] Queries em repositories/, não nos services
- [ ] DTOs diferentes dos models (se necessário)
- [ ] 1 service por agregado/contexto (não 1 por operação)
- [ ] Testes unitários para validators/utils (isolados)
- [ ] Testes de integração para services+repos
- [ ] Logs estruturados em todas as camadas
- [ ] Tratamento de erros consistente

---

## Referências e Leituras

- **Patterns of Enterprise Application Architecture** (Martin Fowler) - Capítulo sobre Service Layer
- **Clean Architecture** (Uncle Bob) - Princípios de separação de camadas
- **Refactoring** (Martin Fowler) - Técnicas de extração de métodos/classes
- **Working Effectively with Legacy Code** (Michael Feathers) - Como refatorar código sem testes

---

**Este guia é vivo.** Adapte às necessidades do seu projeto. O objetivo é **simplicidade e manutenibilidade**, não dogmatismo arquitetural.
