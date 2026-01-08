# Exemplo: Value Object Rico vs Anêmico

## ❌ Value Object Anêmico

```typescript
export type BountyProps = {
    amountOfBerries?: number;
}

export class Bounty extends ValueObject<BountyProps> {}

// Uso:
const bounty = new Bounty({ amountOfBerries: -1000 }); // ❌ Aceita valor negativo!
console.log(bounty.props.amountOfBerries); // Acesso direto às props
```

**Problemas:**
- Nenhuma validação
- Nenhum comportamento de domínio
- Apenas um "wrapper" de dados

---

## ✅ Value Object Rico (Com Domínio)

```typescript
import { ValueObject } from "@repo/core";
import { Result } from "@repo/core";

export type BountyProps = {
    amountOfBerries: number;
}

export class Bounty extends ValueObject<BountyProps> {
    // Construtor privado - força uso da factory
    private constructor(props: BountyProps) {
        super(props);
    }

    // ✅ 1. VALIDAÇÃO DE REGRA (principal característica de VO rico)
    public static create(berries: number): Result<Bounty> {
        if (berries < 0) {
            return Result.fail<Bounty>("Bounty cannot be negative");
        }

        if (berries > 5_655_000_000) {
            // Maior recompensa conhecida (Roger)
            return Result.fail<Bounty>("Bounty exceeds known maximum");
        }

        return Result.ok<Bounty>(new Bounty({ amountOfBerries: berries }));
    }

    // ✅ 2. COMPORTAMENTO DE DOMÍNIO (expressa conceito do negócio)
    isHighProfile(): boolean {
        // No universo de One Piece, 100M+ é considerado "high profile"
        return this.props.amountOfBerries >= 100_000_000;
    }

    isSuperNova(): boolean {
        // Supernovas têm recompensas de 100M+
        return this.props.amountOfBerries >= 100_000_000;
    }

    isYonkoLevel(): boolean {
        // Yonkos geralmente têm 1B+
        return this.props.amountOfBerries >= 1_000_000_000;
    }

    getThreatLevel(): 'Low' | 'Medium' | 'High' | 'Extreme' {
        const amount = this.props.amountOfBerries;
        if (amount < 10_000_000) return 'Low';
        if (amount < 100_000_000) return 'Medium';
        if (amount < 1_000_000_000) return 'High';
        return 'Extreme';
    }

    // ✅ 3. OPERAÇÕES IMUTÁVEIS (VOs são imutáveis!)
    increase(amount: number): Result<Bounty> {
        const newAmount = this.props.amountOfBerries + amount;
        return Bounty.create(newAmount); // Retorna um NOVO VO
    }

    decrease(amount: number): Result<Bounty> {
        const newAmount = this.props.amountOfBerries - amount;
        return Bounty.create(newAmount);
    }

    // ✅ 4. COMPARAÇÃO (VOs são comparáveis por valor)
    isGreaterThan(other: Bounty): boolean {
        return this.props.amountOfBerries > other.props.amountOfBerries;
    }

    // ⚠️ 5. FORMATAÇÃO (útil, mas sozinho NÃO torna rico)
    format(): string {
        return `฿${this.props.amountOfBerries.toLocaleString()}`;
    }

    formatShort(): string {
        const amount = this.props.amountOfBerries;
        if (amount >= 1_000_000_000) {
            return `฿${(amount / 1_000_000_000).toFixed(1)}B`;
        }
        if (amount >= 1_000_000) {
            return `฿${(amount / 1_000_000).toFixed(1)}M`;
        }
        return `฿${amount.toLocaleString()}`;
    }

    // Getter encapsulado
    get value(): number {
        return this.props.amountOfBerries;
    }
}
```

---

## 🎯 O Que Torna o VO Rico?

| Característica | Anêmico | Rico |
|----------------|---------|------|
| Validação de invariantes | ❌ | ✅ |
| Comportamentos de domínio | ❌ | ✅ |
| Imutabilidade garantida | ⚠️ | ✅ |
| Factory method | ❌ | ✅ |
| Encapsulamento | ❌ | ✅ |
| Métodos auxiliares | Às vezes | Sim |

---

## 📚 Uso Comparativo

### Anêmico:
```typescript
// ❌ Sem proteção
const bounty = new Bounty({ amountOfBerries: -1000 });

// ❌ Lógica de negócio espalha pelo código
if (bounty.props.amountOfBerries! >= 100_000_000) {
    console.log("High profile!");
}
```

### Rico:
```typescript
// ✅ Validação no momento da criação
const bountyOrError = Bounty.create(1_500_000_000);

if (bountyOrError.isFailure) {
    console.error(bountyOrError.error);
    return;
}

const bounty = bountyOrError.getValue();

// ✅ Lógica de negócio encapsulada
if (bounty.isHighProfile()) {
    console.log("High profile!");
}

// ✅ Comportamento expressivo
console.log(bounty.getThreatLevel()); // "Extreme"
console.log(bounty.formatShort());    // "฿1.5B"

// ✅ Operações imutáveis
const newBounty = bounty.increase(500_000_000).getValue();
console.log(newBounty.formatShort()); // "฿2.0B"
console.log(bounty.formatShort());    // "฿1.5B" (original não mudou!)
```

---

## 💡 Conclusão

**VO Anêmico** = Apenas tipagem + estrutura de dados
**VO Rico** = Tipagem + Validação + Comportamento de Domínio + Encapsulamento

**Você estava certo:** validação é a principal característica!
**Mas não é só isso:** comportamentos que expressam conceitos do negócio também tornam o VO rico.

Métodos de formatação sozinhos **não** tornam um VO rico - são apenas "helpers" convenientes.
