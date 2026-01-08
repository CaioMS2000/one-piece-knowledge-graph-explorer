export abstract class Rule {
	public abstract isValid(): boolean
	public abstract get message(): string
}

export function CheckRule(rule: Rule): void {
	if (!rule.isValid()) {
		throw new BusinessRuleValidationException(rule)
	}
}

export class BusinessRuleValidationException extends Error {
	constructor(public brokenRule: Rule) {
		super(brokenRule.message)
	}
}
