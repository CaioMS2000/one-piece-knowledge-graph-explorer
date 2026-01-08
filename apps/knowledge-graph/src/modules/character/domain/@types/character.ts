export const Status = ['Alive', 'Dead', 'Unknown'] as const
export type Status = (typeof Status)[number]

export const Race = [
	'Human',
	'Fishman',
	'Merman',
	'Mink',
	'Giant',
	'Dwarf',
	'Longarm',
	'Longleg',
	'Snakeneck',
	'Three_Eye',
	'Lunarian',
	'Cyborg',
	'Zombie',
	'Skeleton',
	'Hybrid',
	'Unknown',
] as const
export type Race = (typeof Race)[number]

export const Gender = ['Male', 'Female', 'Unknown'] as const
export type Gender = (typeof Gender)[number]

export const AffiliationType = [
	'Pirate',
	'Marine',
	'Revolutionary',
	'Cipherpol',
	'Civilian',
	'Nobility',
	'Other',
] as const
export type AffiliationType = (typeof AffiliationType)[number]
