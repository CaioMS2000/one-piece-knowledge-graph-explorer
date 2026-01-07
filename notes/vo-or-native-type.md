## Quando usar um **Value Object (classe)**:

### 1. **Tem comportamento ou validação**
```typescript
// ❌ Só um type - sem comportamento
type Email = string

// ✅ Value Object - tem validação e comportamento
class Email {
  private constructor(private value: string) {}
  
  static create(value: string): Either<Error, Email> {
    if (!this.isValid(value)) {
      return failure(new Error('Invalid email'))
    }
    return success(new Email(value))
  }
  
  private static isValid(value: string): boolean {
    return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)
  }
  
  getValue(): string { return this.value }
  getDomain(): string { return this.value.split('@')[1] }
}
```

### 2. **Tem invariantes/regras de negócio**
```typescript
// ✅ Value Object - garante que dinheiro sempre tem valor válido e moeda
class Money {
  private constructor(
    private amount: number,
    private currency: string
  ) {}
  
  static create(amount: number, currency: string): Money {
    if (amount < 0) throw new Error('Amount cannot be negative')
    return new Money(amount, currency)
  }
  
  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies')
    }
    return new Money(this.amount + other.amount, this.currency)
  }
}
```

### 3. **Precisa de igualdade por valor (não por referência)**
```typescript
// ✅ Value Object - compara por valor
class CPF {
  constructor(private value: string) {}
  
  equals(other: CPF): boolean {
    return this.value === other.value
  }
}

const cpf1 = new CPF('123.456.789-00')
const cpf2 = new CPF('123.456.789-00')
cpf1.equals(cpf2) // true - mesmo valor
```

## Quando usar só um **type/interface**:

### 1. **É apenas estrutura de dados (DTOs, Props)**
```typescript
// ✅ Só type - apenas estrutura
type CreateUserDTO = {
  name: string
  email: string
  age: number
}

type UserProps = {
  name: string
  email: Email  // mas o Email é VO!
  age: number
}
```

### 2. **Não tem comportamento significativo**
```typescript
// ✅ Só type - enum simples
type UserRole = 'admin' | 'user' | 'guest'

// ❌ Não precisa ser classe se não tem comportamento
class UserRole {
  constructor(private value: 'admin' | 'user' | 'guest') {}
  getValue() { return this.value }
}
```

### 3. **É só um alias para clareza**
```typescript
// ✅ Só type - apenas semântica
type UserId = string
type Timestamp = number
type Percentage = number // entre 0-100
```

## Regra prática de ouro:

```typescript
// Pergunte-se:

// 1. Tem VALIDAÇÃO?
type CPF = string  // ❌ Qualquer string passa
class CPF {         // ✅ Valida formato
  static create(value: string): Either<Error, CPF>
}

// 2. Tem COMPORTAMENTO útil?
type Money = { amount: number, currency: string }  // ❌ Pode somar moedas diferentes
class Money {                                       // ✅ Impede operações inválidas
  add(other: Money): Money
}

// 3. É REUTILIZADO em vários lugares?
type Email = string  // ❌ Validação espalhada
class Email {        // ✅ Validação centralizada
  static create(value: string)
}

// 4. É conceito do DOMÍNIO?
type RequestBody = { ... }  // ✅ Type - conceito técnico
class ISBN {                 // ✅ Classe - conceito do domínio
  validate()
}
```

## Seu exemplo atual (UniqueEntityID):

```typescript
// ✅ É classe porque:
export class UniqueEntityID {
  // 1. Encapsula o valor (validação implícita de tipo)
  private value: string
  
  // 2. Tem comportamento (comparação)
  public equals(id: UniqueEntityID): boolean {
    return id.toValue() === this.value
  }
  
  // 3. É conceito central do domínio
  // 4. Garante que IDs são sempre strings válidas
}
```

## Exemplo prático do domínio:

```typescript
// ❌ NÃO precisa ser VO
type CharacterName = string
type ArcTitle = string

// ✅ DEVE ser VO - tem validação e regras
class DevilFruitName {
  private constructor(private value: string) {}
  
  static create(value: string): Either<Error, DevilFruitName> {
    if (!value || value.length < 3) {
      return failure(new Error('Devil Fruit name too short'))
    }
    if (!value.includes('no Mi')) {
      return failure(new Error('Must end with "no Mi"'))
    }
    return success(new DevilFruitName(value))
  }
}

// ✅ DEVE ser VO - tem comportamento complexo
class BountyAmount {
  private constructor(private berries: number) {}
  
  static create(berries: number): Either<Error, BountyAmount> {
    if (berries < 0) return failure(new Error('Negative bounty'))
    return success(new BountyAmount(berries))
  }
  
  isYonkoLevel(): boolean {
    return this.berries >= 1_000_000_000
  }
  
  format(): string {
    return `฿${this.berries.toLocaleString()}`
  }
}
```

**Em resumo**: Se você **não consegue** pensar em nenhum comportamento ou validação além de "guardar o valor", provavelmente é só um `type`. Se você pensa "isso precisa garantir X" ou "isso pode fazer Y", então é um **Value Object**!