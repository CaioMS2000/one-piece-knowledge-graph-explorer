export const HakiType = ['Armament', 'Conqueror', 'Observation'] as const
export type HakiType = (typeof HakiType)[number]

export const AdvancedHaki = [
	'FutureSight',
	'InternalDestruction',
	'Emission',
	'ConquerorCoating',
] as const
export type AdvancedHaki = (typeof AdvancedHaki)[number]

export type Haki = {
	type: HakiType
	advancedHaki: AdvancedHaki[]
}
