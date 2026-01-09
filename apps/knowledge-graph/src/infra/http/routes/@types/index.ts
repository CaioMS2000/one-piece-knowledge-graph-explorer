type IsAny<T> = 0 extends 1 & T ? true : false

type SecondParamOrEmpty<T> = T extends (...args: infer A) => any
	? A extends [any, infer P, ...any[]]
		? IsAny<P> extends true
			? {}
			: unknown extends P
				? {}
				: P
		: {}
	: {}

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
	k: infer I
) => void
	? I
	: never

type Simplify<T> = { [K in keyof T]: T[K] } & {}

export type ExtractResources<Fns extends readonly ((...args: any[]) => any)[]> =
	Simplify<UnionToIntersection<SecondParamOrEmpty<Fns[number]>>>
