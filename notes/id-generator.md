## Geração de IDs
Deixar o `value` **obrigatório** no `UniqueEntityID` e usar o `IdGenerator` na camada de aplicação:

```typescript
// UniqueEntityID - só armazena e valida
constructor(value: string) {
  this.value = value
}

// Na camada de aplicação (Use Cases)
class CreateSomethingUseCase {
  constructor(private idGenerator: IdGenerator) {}
  
  async execute(input: Input) {
    const id = await this.idGenerator.generate('prefix')
    const entity = new Entity(props, id)
    // ...
  }
}
```

**Por quê?**
- Entidades/Value Objects devem ser "burros" - só guardam dados
- A geração de ID é uma regra de infraestrutura
- Facilita trocar estratégias (UUID v4, v7, ULID, etc)
- Testes ficam mais fáceis
- Segue Single Responsibility Principle
