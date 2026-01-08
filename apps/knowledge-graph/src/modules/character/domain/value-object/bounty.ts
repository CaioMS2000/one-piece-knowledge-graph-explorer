import { ValueObject } from '@repo/core'

export type BountyProps = {
	amountOfBerries?: number
}

export class Bounty extends ValueObject<BountyProps> {}
