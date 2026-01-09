import { randomUUID } from 'crypto'
import { IdGenerator } from './id-generator'

export class UUIDV4Generator extends IdGenerator {
	generate(prefix?: string): Promise<string> {
		const uuid = randomUUID()
		const id = prefix ? `${prefix}:${uuid}` : uuid

		return Promise.resolve(id)
	}

	generateBatch(count: number, prefix?: string): Promise<string[]> {
		const ids = Array.from({ length: count }, () => this.generate(prefix))
		return Promise.all(ids)
	}
}
