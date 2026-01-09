export abstract class IdGenerator {
	/**
	 * Gera um ID único sequencial ofuscado.
	 * @param prefix - Prefixo opcional para namespacing (ex: 'booking', 'listing')
	 * @returns ID único no formato Base62 ofuscado
	 */
	abstract generate(prefix?: string): Promise<string>

	/**
	 * Gera múltiplos IDs em batch (otimização)
	 */
	abstract generateBatch(count: number, prefix?: string): Promise<string[]>
}
