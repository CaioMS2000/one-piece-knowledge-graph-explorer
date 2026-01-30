import { z } from 'zod'

export class TypedMap extends Map<string, unknown> {
	/**
	 * Cria uma instância de TypedMap com dados iniciais opcionais
	 */
	static create(initialData?: unknown) {
		return new TypedMap(Object.entries(initialData ?? {}))
	}

	/**
	 * Get com validação Zod
	 * @example
	 * // Opcional
	 * map.getTyped('key', { schema: z.boolean().optional() }) // → boolean | undefined
	 *
	 * // Obrigatório (lança erro se não existir)
	 * map.getTyped('key', { schema: z.boolean() }) // → boolean
	 */
	getTyped<T>(key: string, config: { schema: z.ZodType<T> }): T {
		const value = this.get(key)
		return config.schema.parse(value) // ← Zod valida e lança erro se inválido
	}

	/**
	 * Get com valor padrão
	 * @example
	 * map.getOr('count', { schema: z.number(), defaultValue: 0 }) // → number (nunca undefined)
	 */
	getOr<T>(key: string, config: { schema: z.ZodType<T>; defaultValue: T }): T {
		const value = this.get(key)

		if (value === undefined) {
			return config.defaultValue
		}

		return config.schema.parse(value)
	}

	/**
	 * Get sem validação (unsafe mas rápido)
	 */
	getUnsafe<T = any>(key: string): T | undefined {
		return this.get(key) as T | undefined
	}
}
