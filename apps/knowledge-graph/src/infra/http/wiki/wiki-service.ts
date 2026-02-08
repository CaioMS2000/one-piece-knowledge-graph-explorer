import * as cheerio from 'cheerio'
import { FetchCharacterDto, fetchCharacterDtoSchema } from './dto'

export class WikiService {
	private BASE_URL = 'https://onepiece.fandom.com/pt/api.php'

	private async request(params: Record<string, string | number>) {
		try {
			const stringParams: Record<string, string> = {}
			for (const [key, value] of Object.entries(params)) {
				stringParams[key] = String(value)
			}

			const urlParams = new URLSearchParams(stringParams)
			const url = `${this.BASE_URL}?${urlParams.toString()}`
			console.log(`\n🔗 Requesting: ${url}`)

			const response = await fetch(url)
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}
			const data = await response.json()
			return data
		} catch (error) {
			console.error('❌ Error requesting API:', error)
			throw error
		}
	}

	private extractValues(valueEl: cheerio.Cheerio<any>): string[] {
		const html = valueEl.html()?.trim() || ''

		// Caminho 1: Se tem <br>, split por <br> (multi-valor)
		if (/<br\s*\/?>/i.test(html)) {
			return html
				.split(/<br\s*\/?>/gi)
				.map(segment => cheerio.load(segment)('body').text().trim())
				.map(v =>
					v
						.replace(/\[\d+\]/g, '')
						.replace(/;\s*$/, '')
						.trim()
				)
				.filter(Boolean)
		}

		// Caminho 2: Sem <br>, extrair texto completo (valor único ou separado por ;)
		return [
			valueEl
				.text()
				.trim()
				.replace(/\[\d+\]/g, ''),
		]
	}

	private processInfoboxData(
		raw: Record<string, string | string[]>
	): Record<string, string | string[]> {
		const processed: Record<string, string | string[]> = {}

		for (const [label, value] of Object.entries(raw)) {
			// Se já é array (separado por <br>), manter como está
			if (Array.isArray(value)) {
				processed[label] = value
				continue
			}

			// 1. Remove referências [n]
			const cleaned = value.replace(/\[\d+\]/g, '')

			// 2. Detecta valores múltiplos (números separados ou padrões com ;)
			const numericPattern = /(\d{1,3}(?:\.\d{3})*(?:,\d+)?)/g
			const matches = cleaned.match(numericPattern)

			// Se tem múltiplos números grandes (> 6 dígitos) e parece ser lista de valores
			if (matches && matches.length > 1 && matches.some(m => m.length > 6)) {
				processed[label] = matches
			}
			// Se tem ponto-e-vírgula, separa
			else if (cleaned.includes(';')) {
				processed[label] = cleaned
					.split(';')
					.map(s => s.trim())
					.filter(Boolean)
			} else {
				processed[label] = cleaned.trim()
			}
		}

		return processed
	}

	async fetchCharacter(name: string): Promise<FetchCharacterDto> {
		try {
			const params = {
				action: 'parse',
				page: name,
				prop: 'text',
				format: 'json',
			}

			const data = (await this.request(params)) as any
			const html = data.parse.text['*']
			const $ = cheerio.load(html)

			interface InfoboxSection {
				section: string
				fields: Record<string, string | string[]>
			}

			const sections: InfoboxSection[] = []

			$('.pi-group').each((_, group) => {
				const header =
					$(group).find('.pi-header').first().text().trim() || 'Geral'
				const fields: Record<string, string | string[]> = {}

				$(group)
					.find('.pi-data')
					.each((_, el) => {
						const label = $(el).find('.pi-data-label').text().trim()
						const valueEl = $(el).find('.pi-data-value')
						if (label) {
							const values = this.extractValues(valueEl)
							fields[label] = values.length > 1 ? values : values[0]
						}
					})

				if (Object.keys(fields).length > 0) {
					sections.push({ section: header, fields })
				}
			})

			$('.portable-infobox > .pi-data').each((_, el) => {
				const label = $(el).find('.pi-data-label').text().trim()
				const valueEl = $(el).find('.pi-data-value')
				if (label) {
					const values = this.extractValues(valueEl)
					if (sections.length === 0) {
						sections.push({ section: 'Geral', fields: {} })
					}
					sections[0].fields[label] = values.length > 1 ? values : values[0]
				}
			})

			// Flatten all fields normalizing keys (strip trailing colons)
			const flatFields: Record<string, string | string[]> = {}
			for (const section of sections) {
				for (const [key, value] of Object.entries(section.fields)) {
					const normalizedKey = key.replace(/:$/, '').trim()
					flatFields[normalizedKey] = value
				}
			}

			const getString = (key: string): string => {
				const normalized = key.replace(/:$/, '').trim()
				const val = flatFields[normalized]
				if (typeof val === 'string') return val
				if (Array.isArray(val)) return val[0] ?? ''
				return ''
			}

			const getArray = (key: string): string[] => {
				const normalized = key.replace(/:$/, '').trim()
				const val = flatFields[normalized]
				if (Array.isArray(val)) return val
				if (typeof val === 'string') return val ? [val] : []
				return []
			}

			return fetchCharacterDtoSchema.parse({
				'Nome Japonês': getString('Nome Japonês'),
				'Nome Romanizado': getString('Nome Romanizado'),
				'Nome Oficial Brasileiro': getString('Nome Oficial Brasileiro'),
				'Afiliações': getArray('Afiliações'),
				'Ocupações': getString('Ocupações'),
				'Local de Nascimento': getString('Local de Nascimento'),
				'Pseudônimo': getArray('Pseudônimo'),
				'Estado:': getString('Estado'),
				'Idade:': getArray('Idade'),
				'Aniversário:': getString('Aniversário'),
				'Altura:': getArray('Altura'),
				'Recompensa:': getArray('Recompensa'),
			})
		} catch (e) {
			console.error('Fetch character error', e)
			throw e
		}
	}
}
