import { AggregateRoot, UniqueEntityID } from '@repo/core'
import { Bounty } from '../value-object/bounty'
import { Gender } from '../@types/character'
import { Sea } from '../@types/sea'
import { Haki } from '../value-object/haki'
import { Affiliation } from '../value-object/affiliation'

export type CharacterProps = {
	name: string
	age?: number
	bounty?: Bounty
	affiliation?: Affiliation
	origin?: Sea
	gender?: Gender
	haki: Haki[]
	devilFruitIds: UniqueEntityID[]
}

export class Character extends AggregateRoot<CharacterProps> {
	consumeDevilFruit(fruitId: UniqueEntityID) {}

	get name(): string {
		return this.props.name
	}
}
