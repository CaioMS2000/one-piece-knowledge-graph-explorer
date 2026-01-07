import { describe, expect, it } from 'bun:test'
import { UUIDV7Generator } from './uuid-v7-generator'

describe('UUIDV7Generator', () => {
	const generator = new UUIDV7Generator()

	describe('generate', () => {
		it('should generate a valid UUID v7', async () => {
			const id = await generator.generate()

			expect(id).toBeDefined()
			expect(id.toString()).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
			)
		})

		it('should generate unique IDs', async () => {
			const id1 = await generator.generate()
			const id2 = await generator.generate()

			expect(id1.toString()).not.toBe(id2.toString())
		})

		it('should generate ID with prefix when provided', async () => {
			const prefix = 'booking'
			const id = await generator.generate(prefix)

			expect(id.toString()).toMatch(
				/^booking:[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
			)
			expect(id.toString().startsWith(`${prefix}:`)).toBe(true)
		})

		it('should generate ID without prefix when not provided', async () => {
			const id = await generator.generate()

			expect(id.toString()).not.toContain(':')
		})

		it('should generate different IDs with the same prefix', async () => {
			const prefix = 'listing'
			const id1 = await generator.generate(prefix)
			const id2 = await generator.generate(prefix)

			expect(id1.toString()).not.toBe(id2.toString())
			expect(id1.toString().startsWith(`${prefix}:`)).toBe(true)
			expect(id2.toString().startsWith(`${prefix}:`)).toBe(true)
		})
	})

	describe('generateBatch', () => {
		it('should generate correct number of IDs', async () => {
			const count = 5
			const ids = await generator.generateBatch(count)

			expect(ids).toHaveLength(count)
		})

		it('should generate unique IDs in batch', async () => {
			const count = 10
			const ids = await generator.generateBatch(count)
			const uniqueIds = new Set(ids.map(id => id.toString()))

			expect(uniqueIds.size).toBe(count)
		})

		it('should generate batch with prefix when provided', async () => {
			const count = 3
			const prefix = 'user'
			const ids = await generator.generateBatch(count, prefix)

			ids.forEach(id => {
				expect(id.toString().startsWith(`${prefix}:`)).toBe(true)
			})
		})

		it('should generate batch without prefix when not provided', async () => {
			const count = 3
			const ids = await generator.generateBatch(count)

			ids.forEach(id => {
				expect(id.toString()).not.toContain(':')
				expect(id.toString()).toMatch(
					/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
				)
			})
		})

		it('should generate empty array when count is 0', async () => {
			const ids = await generator.generateBatch(0)

			expect(ids).toHaveLength(0)
		})

		it('should generate all valid UUID v7 in batch', async () => {
			const count = 5
			const ids = await generator.generateBatch(count)
			const uuidv7Regex =
				/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

			ids.forEach(id => {
				expect(id.toString()).toMatch(uuidv7Regex)
			})
		})
	})

	describe('temporal ordering', () => {
		it('should generate chronologically ordered IDs', async () => {
			const ids = await generator.generateBatch(5)

			// UUID v7 tem timestamp no início, então são naturalmente ordenáveis
			const sorted = [...ids].sort((a, b) =>
				a.toString().localeCompare(b.toString())
			)

			expect(ids.map(id => id.toString())).toEqual(
				sorted.map(id => id.toString())
			)
		})
	})
})
