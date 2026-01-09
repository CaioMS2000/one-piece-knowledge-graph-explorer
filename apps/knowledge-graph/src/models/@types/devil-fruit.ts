export const DevilFruitType = ['paramecia', 'zoan', 'logia'] as const
export type DevilFruitType = (typeof DevilFruitType)[number]

export const AwakeningStatus = ['awakened', 'unawakened'] as const
export type AwakeningStatus = (typeof AwakeningStatus)[number]
