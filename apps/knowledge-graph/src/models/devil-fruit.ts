import { AwakeningStatus, DevilFruitType } from './@types/devil-fruit'

export type DevilFruit = {
	id: string
	japaneseName: string
	englishName: string
	nameMeaning: string
	type: DevilFruitType
	awakeningStatus: AwakeningStatus
	description: string
	abilities: string[]
	weaknesses: string[]
	currentUserId?: string
	firstAppearanceArc: string
	firstAppearanceChapter: number
	imageUrl: string
	wikiUrl: string
	createdAt: Date
	updatedAt: Date
}

export const DevilFruit = class DevilFruitClass {
	static create(data: DevilFruit): DevilFruit {
		return data
	}
}
