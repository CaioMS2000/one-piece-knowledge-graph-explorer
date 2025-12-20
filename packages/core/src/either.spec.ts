import { Either, failure, success } from './either'

function doSomeThing(shouldSuccess: boolean): Either<string, number> {
	if (shouldSuccess) {
		return success(10)
	} else {
		return failure('error')
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
