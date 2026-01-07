import { randomUUID } from 'crypto'
import { IdGenerator } from './id-generator'
import { UniqueEntityID } from '../entity/unique-entity-id'

export class UUIDV4Generator extends IdGenerator {
	generate(prefix?: string): Promise<UniqueEntityID> {
		const uuid = randomUUID()
		const id = prefix ? `${prefix}:${uuid}` : uuid

		return Promise.resolve(new UniqueEntityID(id))
	}

	generateBatch(count: number, prefix?: string): Promise<UniqueEntityID[]> {
		const ids = Array.from({ length: count }, () => this.generate(prefix))
		return Promise.all(ids)
	}
}
