export type BountyHistory = {
	id: string
	characterId: string
	amount: number
	arc: string
	chapter: number
	episode: number
	reason?: string
	createdAt: Date
}

export const BountyHistory = class BountyHistoryClass {
	static create(data: BountyHistory): BountyHistory {
		return data
	}
}
