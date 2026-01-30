import {
	injectable as _injectable,
	inject as _inject,
	singleton as _singleton,
	container as _container,
	InjectionToken as _InjectionToken,
} from 'tsyringe'
import {
	TypedMap as _TypedMap,
	DeepPartial as _DeepPartial,
	DistributiveOmit as _DistributiveOmit,
} from '@repo/core'
import { TOKENS as _TOKENS } from './tokens'

declare global {
	type DeepPartial<T> = _DeepPartial<T>
	type DistributiveOmit<T, K extends PropertyKey> = _DistributiveOmit<T, K>
	type TypedMap = _TypedMap
	type InjectionToken<T> = _InjectionToken<T>

	const TypedMap: typeof _TypedMap
	const injectable: typeof _injectable
	const inject: typeof _inject
	const singleton: typeof _singleton
	const container: typeof _container
	const TOKENS: typeof _TOKENS
}

Object.assign(globalThis, {
	TypedMap: _TypedMap,
	injectable: _injectable,
	inject: _inject,
	singleton: _singleton,
	container: _container,
	TOKENS: _TOKENS,
})
