import { Class } from './class'

type TestResources = {
	name: string
	age: number
	greet: (greeting: string) => string
}

class TestClass extends Class<TestResources> {
	constructor(protected readonly resources: TestResources) {
		super()
	}

	get name() {
		return this.resources.name
	}

	get age() {
		return this.resources.age
	}

	greet(greeting: string) {
		return this.resources.greet(greeting)
	}
}

test('should create instance with resources', () => {
	const resources: TestResources = {
		name: 'John Doe',
		age: 30,
		greet: (greeting: string) => `${greeting}, I'm John`,
	}

	const instance = new TestClass(resources)

	expect(instance).toBeInstanceOf(Class)
	expect(instance).toBeInstanceOf(TestClass)
})

test('should access properties from resources', () => {
	const resources: TestResources = {
		name: 'Jane Smith',
		age: 25,
		greet: (greeting: string) => `${greeting}, I'm Jane`,
	}

	const instance = new TestClass(resources)

	expect(instance.name).toBe('Jane Smith')
	expect(instance.age).toBe(25)
})

test('should execute functions from resources', () => {
	const greetMock = vi.fn((greeting: string) => `${greeting}, nice to meet you`)

	const resources: TestResources = {
		name: 'Bob',
		age: 40,
		greet: greetMock,
	}

	const instance = new TestClass(resources)
	const result = instance.greet('Hello')

	expect(greetMock).toHaveBeenCalledWith('Hello')
	expect(result).toBe('Hello, nice to meet you')
})

test('should support different resource types', () => {
	type ComplexResources = {
		id: number
		metadata: {
			created: Date
			updated: Date
		}
		items: string[]
		calculate: (a: number, b: number) => number
	}

	class ComplexClass extends Class<ComplexResources> {
		constructor(protected readonly resources: ComplexResources) {
			super()
		}

		get id() {
			return this.resources.id
		}

		get metadata() {
			return this.resources.metadata
		}

		get items() {
			return this.resources.items
		}

		calculate(a: number, b: number) {
			return this.resources.calculate(a, b)
		}
	}

	const now = new Date()
	const resources: ComplexResources = {
		id: 123,
		metadata: {
			created: now,
			updated: now,
		},
		items: ['item1', 'item2', 'item3'],
		calculate: (a, b) => a + b,
	}

	const instance = new ComplexClass(resources)

	expect(instance.id).toBe(123)
	expect(instance.metadata.created).toBe(now)
	expect(instance.items).toEqual(['item1', 'item2', 'item3'])
	expect(instance.calculate(5, 3)).toBe(8)
})

test('should allow multiple instances with different resources', () => {
	const instance1 = new TestClass({
		name: 'Alice',
		age: 28,
		greet: greeting => `${greeting} from Alice`,
	})

	const instance2 = new TestClass({
		name: 'Charlie',
		age: 35,
		greet: greeting => `${greeting} from Charlie`,
	})

	expect(instance1.name).toBe('Alice')
	expect(instance2.name).toBe('Charlie')
	expect(instance1.greet('Hi')).toBe('Hi from Alice')
	expect(instance2.greet('Hi')).toBe('Hi from Charlie')
})
