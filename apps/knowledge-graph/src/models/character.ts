import { AffiliationType, Gender } from './@types/character'
import { Haki } from './@types/haki'
import { Sea } from './@types/sea'

export type Character = {
	name: string
	crew?: string
	rank?: string
	age?: number
	bounty?: number
	origin?: Sea
	birthplace?: string
	gender?: Gender
	affiliation: AffiliationType[]
	aliases: string[]
	birthdate?: Date
	haki: Haki[]
	firstAppearanceArc: string
	deathArc?: string
	powerScore: number
	powerScoreConfidence: number
	powerScoreUpdatedAt: Date
	description: string
	imageUrl: string
	wikiUrl: string
	createdAt: Date
	updatedAt: Date
	devilFruitIds: string[]
}

export const Character = class CharacterClass {
	static create(data: Character): Character {
		return data
	}
}
