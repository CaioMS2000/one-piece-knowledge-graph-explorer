# Como Modelar a Exceção do Barba Negra

## O Problema

- **Regra Geral:** Personagens só podem ter UMA Devil Fruit
- **Exceção:** Barba Negra tem DUAS (Yami Yami no Mi + Gura Gura no Mi)
- **Desafio:** Como modelar isso em DDD sem quebrar as invariantes do domínio?

---

## ✅ Solução Recomendada: Array + Regra de Negócio Explícita

### Implementação:

```typescript
import { AggregateRoot, UniqueEntityID, Result } from "@repo/core";
import { Bounty } from "../value-object/bounty";
import { Gender } from "../@types/character";
import { Sea } from "../@types/sea";
import { Haki } from "../value-object/haki";
import { Affiliation } from "../value-object/affiliation";

export type CharacterProps = {
    name: string
    age?: number
    bounty?: Bounty
    affiliation?: Affiliation
    origin?: Sea
    gender?: Gender
    haki: Haki[]
    devilFruitIds: string[]  // Array para suportar Barba Negra
    hasAnomalousBody: boolean // Flag que explica a capacidade especial
}

export class Character extends AggregateRoot<CharacterProps> {

    // Getter encapsulado
    get name(): string {
        return this.props.name;
    }

    get devilFruitIds(): ReadonlyArray<string> {
        return this.props.devilFruitIds;
    }

    get hasAnomalousBody(): boolean {
        return this.props.hasAnomalousBody;
    }

    // ✅ REGRA DE NEGÓCIO: Consumir Devil Fruit
    consumeDevilFruit(devilFruitId: string): Result<void> {
        // Regra 1: Não pode consumir a mesma fruta duas vezes
        if (this.props.devilFruitIds.includes(devilFruitId)) {
            return Result.fail("Character already possesses this Devil Fruit");
        }

        // Regra 2: Personagens normais só podem ter UMA Devil Fruit
        if (this.props.devilFruitIds.length >= 1 && !this.props.hasAnomalousBody) {
            return Result.fail(
                `${this.props.name} cannot consume multiple Devil Fruits. ` +
                `Only characters with anomalous bodies can possess more than one.`
            );
        }

        // Regra 3: Mesmo Barba Negra tem limite (máximo 2 até agora no manga)
        if (this.props.devilFruitIds.length >= 2) {
            return Result.fail(
                `Character has reached the maximum number of Devil Fruits (2)`
            );
        }

        // Adiciona a fruta
        this.props.devilFruitIds.push(devilFruitId);

        // Dispara evento de domínio
        this.addDomainEvent({
            type: 'DevilFruitConsumed',
            aggregateId: this.id,
            characterId: this.id.toString(),
            devilFruitId,
            occurredAt: new Date()
        });

        return Result.ok<void>();
    }

    // ✅ REGRA DE NEGÓCIO: Remover Devil Fruit (quando personagem morre)
    loseDevilFruit(devilFruitId: string): Result<void> {
        const index = this.props.devilFruitIds.indexOf(devilFruitId);

        if (index === -1) {
            return Result.fail("Character does not possess this Devil Fruit");
        }

        this.props.devilFruitIds.splice(index, 1);

        this.addDomainEvent({
            type: 'DevilFruitLost',
            aggregateId: this.id,
            characterId: this.id.toString(),
            devilFruitId,
            occurredAt: new Date()
        });

        return Result.ok<void>();
    }

    // Consultas úteis
    hasDevilFruit(): boolean {
        return this.props.devilFruitIds.length > 0;
    }

    hasMultipleDevilFruits(): boolean {
        return this.props.devilFruitIds.length > 1;
    }

    canConsumeDevilFruit(): boolean {
        // Pode consumir se: (não tem nenhuma) OU (tem corpo anômalo E tem menos de 2)
        return this.props.devilFruitIds.length === 0 ||
               (this.props.hasAnomalousBody && this.props.devilFruitIds.length < 2);
    }
}
```

---

## 🎯 Como Criar o Barba Negra

```typescript
// Factory ou Use Case
const blackbeardOrError = Character.create({
    name: "Marshall D. Teach",
    age: 40,
    bounty: Bounty.create(3_996_000_000).getValue(),
    affiliation: Affiliation.create({
        type: 'Pirate',
        organizationId: 'blackbeard-pirates-id',
        rank: 'Captain'
    }).getValue(),
    origin: 'Unknown' as Sea,
    gender: 'Male' as Gender,
    haki: [],
    devilFruitIds: [], // Começa sem frutas
    hasAnomalousBody: true // 🎯 Flag especial!
}, new UniqueEntityID('blackbeard-id'));

const blackbeard = blackbeardOrError.getValue();

// Consome primeira fruta (Yami Yami no Mi)
const result1 = blackbeard.consumeDevilFruit('yami-yami-id');
console.log(result1.isSuccess); // ✅ true

// Consome segunda fruta (Gura Gura no Mi) - Só funciona porque hasAnomalousBody = true
const result2 = blackbeard.consumeDevilFruit('gura-gura-id');
console.log(result2.isSuccess); // ✅ true

// Tenta consumir terceira fruta (falha mesmo com corpo anômalo)
const result3 = blackbeard.consumeDevilFruit('mera-mera-id');
console.log(result3.isSuccess); // ❌ false
console.log(result3.error); // "Character has reached the maximum number of Devil Fruits (2)"
```

---

## 🎯 Como Criar o Luffy (personagem normal)

```typescript
const luffyOrError = Character.create({
    name: "Monkey D. Luffy",
    age: 19,
    bounty: Bounty.create(3_000_000_000).getValue(),
    affiliation: Affiliation.create({
        type: 'Pirate',
        organizationId: 'straw-hat-pirates-id',
        rank: 'Captain'
    }).getValue(),
    origin: 'Eastblue' as Sea,
    gender: 'Male' as Gender,
    haki: [],
    devilFruitIds: [],
    hasAnomalousBody: false // Personagem normal
}, new UniqueEntityID('luffy-id'));

const luffy = luffyOrError.getValue();

// Consome Gomu Gomu no Mi
const result1 = luffy.consumeDevilFruit('gomu-gomu-id');
console.log(result1.isSuccess); // ✅ true

// Tenta consumir segunda fruta (FALHA - personagem normal)
const result2 = luffy.consumeDevilFruit('mera-mera-id');
console.log(result2.isSuccess); // ❌ false
console.log(result2.error);
// "Monkey D. Luffy cannot consume multiple Devil Fruits.
//  Only characters with anomalous bodies can possess more than one."
```

---

## 🏗️ Vantagens Dessa Abordagem

1. ✅ **Invariante protegida:** A regra de "uma fruta por personagem" está no domínio
2. ✅ **Exceção explícita:** O campo `hasAnomalousBody` deixa claro que é um caso especial
3. ✅ **Flexível:** Se Oda revelar outro personagem com múltiplas frutas, basta criar com `hasAnomalousBody: true`
4. ✅ **Testável:** Fácil escrever testes unitários para validar as regras
5. ✅ **Eventos de domínio:** Outros bounded contexts podem reagir quando uma fruta é consumida

---

## 🧪 Testes Unitários

```typescript
describe('Character - Devil Fruit Rules', () => {
    it('should allow normal character to consume one devil fruit', () => {
        const character = createNormalCharacter();
        const result = character.consumeDevilFruit('fruit-1');

        expect(result.isSuccess).toBe(true);
        expect(character.devilFruitIds).toHaveLength(1);
    });

    it('should prevent normal character from consuming two devil fruits', () => {
        const character = createNormalCharacter();
        character.consumeDevilFruit('fruit-1');

        const result = character.consumeDevilFruit('fruit-2');

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('cannot consume multiple Devil Fruits');
    });

    it('should allow anomalous character to consume two devil fruits', () => {
        const character = createAnomalousCharacter(); // hasAnomalousBody: true

        const result1 = character.consumeDevilFruit('fruit-1');
        const result2 = character.consumeDevilFruit('fruit-2');

        expect(result1.isSuccess).toBe(true);
        expect(result2.isSuccess).toBe(true);
        expect(character.devilFruitIds).toHaveLength(2);
    });

    it('should prevent even anomalous character from consuming three devil fruits', () => {
        const character = createAnomalousCharacter();
        character.consumeDevilFruit('fruit-1');
        character.consumeDevilFruit('fruit-2');

        const result = character.consumeDevilFruit('fruit-3');

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('maximum number of Devil Fruits');
    });

    it('should prevent consuming the same devil fruit twice', () => {
        const character = createAnomalousCharacter();
        character.consumeDevilFruit('fruit-1');

        const result = character.consumeDevilFruit('fruit-1');

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('already possesses this Devil Fruit');
    });
});
```

---

## 💭 Alternativas Consideradas (e por que não usar)

### ❌ Opção 1: Campo opcional único
```typescript
devilFruit?: string  // Não suporta Barba Negra
```

### ❌ Opção 2: Campos separados
```typescript
devilFruit?: string
secondDevilFruit?: string  // Feio, não escalável
```

### ❌ Opção 3: Subclasse especial
```typescript
class AnomalousCharacter extends Character {
    // Complexidade desnecessária
}
```

---

## ✅ Conclusão

Use **array + flag `hasAnomalousBody`** porque:
- Expressa a regra de negócio claramente no domínio
- Mantém a invariante protegida
- É testável e explícito
- Suporta casos futuros (se Oda adicionar mais personagens assim)
