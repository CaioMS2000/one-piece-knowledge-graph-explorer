export abstract class Rule {
	public abstract isValid(): boolean
	public abstract get message(): string
}

export class RuleValidationException extends Error {
	constructor(public brokenRule: Rule) {
		super(brokenRule.message)
	}
}

export function CheckRule(rule: Rule): void {
	if (!rule.isValid()) {
		throw new RuleValidationException(rule)
	}
}
