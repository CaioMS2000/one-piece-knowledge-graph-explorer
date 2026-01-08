import { test, expect } from 'bun:test'
import { Either } from './either'

function doSomeThing(shouldSuccess: boolean): Either<string, number> {
	if (shouldSuccess) {
		return Either.success(10)
	} else {
		return Either.failure('error')
	}
}

test('success result', () => {
	const result = doSomeThing(true)

	expect(result.isSuccess()).toBe(true)
	expect(result.isFailure()).toBe(false)
})

test('error result', () => {
	const result = doSomeThing(false)

	expect(result.isFailure()).toBe(true)
	expect(result.isSuccess()).toBe(false)
})
