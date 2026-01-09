export type Resources = {
	[key: string]: unknown
}

export abstract class Class<T extends Resources> {
	protected abstract readonly resources: T
}
