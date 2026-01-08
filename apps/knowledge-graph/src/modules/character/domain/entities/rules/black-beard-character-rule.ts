import { Rule } from '@repo/core'
import { Character } from '../character'

export class CharacterIsBlackBeardRule extends Rule {
	constructor(private readonly character: Character) {
		super()
	}

	public get message(): string {
		return 'Character must be Black Beard'
	}

	public isValid(): boolean {
		return ['Marshall D. Teach', 'Blackbeard'].some(name =>
			this.character.name.includes(name)
		)
	}
}
