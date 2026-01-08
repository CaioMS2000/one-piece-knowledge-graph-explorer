import { ValueObject } from '@repo/core'
import { AdvancedHaki, HakiType } from '../@types/haki'

export type HakiProps = {
	type: HakiType
	advancedHaki: AdvancedHaki[]
}

export class Haki extends ValueObject<HakiProps> {}
