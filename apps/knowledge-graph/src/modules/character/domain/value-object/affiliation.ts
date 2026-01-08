import { ValueObject } from '@repo/core'
import { AffiliationType } from '../@types/character'

export type AffiliationProps = {
	type: AffiliationType
	organizationId?: string // ID da organização (referência simples)
	rank?: string // Cargo/posição na organização (ex: "Captain", "Commander")
}

export class Affiliation extends ValueObject<AffiliationProps> {
	get type(): AffiliationType {
		return this.props.type
	}

	get organizationId(): string | undefined {
		return this.props.organizationId
	}

	get rank(): string | undefined {
		return this.props.rank
	}
}
