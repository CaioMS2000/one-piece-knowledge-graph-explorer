import * as cheerio from 'cheerio'
import * as fs from 'fs/promises'
import * as path from 'path'

const OUTPUT_DIR = path.join(process.cwd(), 'apps/knowledge-graph/test_outputs')

async function saveResult(filename: string, data: any) {
	try {
		const filePath = path.join(OUTPUT_DIR, filename)
		await fs.writeFile(filePath, JSON.stringify(data, null, 2))
		console.log(`💾 Saved: ${filename}`)
	} catch (error) {
		console.error(`❌ Error saving ${filename}:`, error)
	}
}

async function request(params: Record<string, string | number>) {
	try {
		const stringParams: Record<string, string> = {}
		for (const [key, value] of Object.entries(params)) {
			stringParams[key] = String(value)
		}

		const urlParams = new URLSearchParams(stringParams)
		const url = `https://onepiece.fandom.com/pt/api.php?${urlParams.toString()}`
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

async function runTests() {
	console.log('🚀 Starting Wiki API Tests...\n')
	console.log(`📂 Output directory: ${OUTPUT_DIR}\n`)

	// Ensure output dir exists
	try {
		await fs.access(OUTPUT_DIR)
	} catch {
		await fs.mkdir(OUTPUT_DIR, { recursive: true })
	}

	// Test 1: List Categories
	console.log('--- TEST 1: List Categories (allcategories) ---')
	try {
		const params = {
			action: 'query',
			list: 'allcategories',
			aclimit: 10,
			format: 'json',
		}
		const data = await request(params)
		await saveResult('test1_categories.json', data.query.allcategories)
		console.log('✅ Categories fetched.')
	} catch (e) {
		console.error('❌ Test 1 Failed')
		await saveResult('test1_error.json', { error: String(e) })
	}

	// Test 2: Category Members
	console.log('\n--- TEST 2: Category Members (Categoria:Personagens) ---')
	try {
		const params = {
			action: 'query',
			list: 'categorymembers',
			// cmtitle: 'Categoria:Personagens',
			cmtitle: 'Categoria:Personagens',
			cmlimit: 20,
			format: 'json',
		}
		const data = await request(params)
		await saveResult('test2_category_members.json', data.query.categorymembers)
		console.log('✅ Category members fetched.')
	} catch (e) {
		console.error('❌ Test 2 Failed')
		await saveResult('test2_error.json', { error: String(e) })
	}

	// Test 3: Parse Page Content (Simulating Extraction)
	console.log('\n--- TEST 3: Parse Page Content (HTML Extraction) ---')
	try {
		const params = {
			action: 'parse',
			page: 'Lista_de_Personagens_Canônicos',
			prop: 'text',
			format: 'json',
		}

		const data = await request(params)

		if (data.parse && data.parse.text && data.parse.text['*']) {
			const html = data.parse.text['*']
			const $ = cheerio.load(html)
			const characters: any[] = []

			$('table.wikitable tr').each((index, row) => {
				if ($(row).find('th').length > 0) return

				const cells = $(row).find('td')
				if (cells.length >= 4) {
					const character = {
						nome: $(cells[1]).text().trim(),
						capitulo: $(cells[2]).text().trim(),
						episodio: $(cells[3]).text().trim(),
						ano: $(cells[4]).text().trim(),
					}
					if (character.nome) characters.push(character)
				}
			})

			await saveResult('test3_extracted_characters.json', characters)
			console.log(`✅ Extracted ${characters.length} characters.`)
		} else {
			console.error('❌ HTML content not found')
		}
	} catch (e) {
		console.error('❌ Test 3 Failed', e)
		await saveResult('test3_error.json', { error: String(e) })
	}

	// Test 4: Fetch Page Details
	console.log('\n--- TEST 4: Fetch Character Details (Bellamy) ---')
	try {
		const params = {
			action: 'query',
			titles: 'Bellamy',
			prop: 'pageimages|info|extracts',
			pithumbsize: 500,
			exintro: 1,
			explaintext: 1,
			format: 'json',
			origin: '*',
		}
		const data = await request(params)
		await saveResult('test4_bellamy_details.json', data)
		console.log('✅ Page details fetched.')
	} catch (e) {
		console.error('❌ Test 4 Failed')
		await saveResult('test4_error.json', { error: String(e) })
	}

	// Test 5: Search
	console.log('\n--- TEST 5: Search (Luffy) ---')
	try {
		const params = {
			action: 'query',
			list: 'search',
			srsearch: 'Luffy',
			srlimit: 5,
			format: 'json',
		}
		const data = await request(params)
		await saveResult('test5_search_luffy.json', data.query.search)
		console.log('✅ Search results fetched.')
	} catch (e) {
		console.error('❌ Test 5 Failed')
		await saveResult('test5_error.json', { error: String(e) })
	}

	// Test 6: Inspect Table Headers (Debug)
	console.log('\n--- TEST 6: Inspect Table Headers (Debug) ---')
	try {
		const params = {
			action: 'parse',
			page: 'Lista_de_Personagens_Canônicos',
			prop: 'text',
			format: 'json',
		}

		const data = (await request(params)) as any

		if (data.parse && data.parse.text && data.parse.text['*']) {
			const html = data.parse.text['*']
			const $ = cheerio.load(html)

			const headers: string[] = []
			$('table.wikitable th').each((index, element) => {
				headers.push($(element).text().trim())
			})

			await saveResult('test6_table_headers.json', headers)
			console.log(`✅ Extracted headers: ${headers.join(', ')}`)
		}
	} catch (e) {
		console.error('❌ Test 6 Failed', e)
		await saveResult('test6_error.json', { error: String(e) })
	}

	// Test 7: Fetch Raw Wikitext (Luffy Infobox)
	console.log('\n--- TEST 7: Fetch Raw Wikitext (Luffy) ---')
	try {
		const params = {
			action: 'query',
			titles: 'Monkey D. Luffy',
			prop: 'revisions',
			rvprop: 'content',
			rvslots: 'main',
			format: 'json',
		}
		const data = (await request(params)) as any

		if (data.query && data.query.pages) {
			const pages = data.query.pages
			const pageId = Object.keys(pages)[0]
			const content = pages[pageId].revisions[0].slots.main['*']

			await saveResult('test7_luffy_raw.txt', content) // Save as txt for readability
			console.log(
				'✅ Fetched raw wikitext for Luffy. Check test7_luffy_raw.txt for "recompensa".'
			)
		} else {
			console.error('❌ Data structure unexpected for Test 7')
		}
	} catch (e) {
		console.error('❌ Test 7 Failed', e)
		await saveResult('test7_error.json', { error: String(e) })
	}

	// Test 8: Fetch Raw Wikitext (Bellamy - Comparison)
	console.log('\n--- TEST 8: Fetch Raw Wikitext (Bellamy) ---')
	try {
		const params = {
			action: 'query',
			titles: 'Bellamy',
			prop: 'revisions',
			rvprop: 'content',
			rvslots: 'main',
			format: 'json',
		}
		const data = (await request(params)) as any
		if (data.query && data.query.pages) {
			const pages = data.query.pages
			const pageId = Object.keys(pages)[0]
			const content = pages[pageId].revisions[0].slots.main['*']

			await saveResult('test8_bellamy_raw.txt', content)
			console.log('✅ Fetched raw wikitext for Bellamy.')
		}
	} catch (e) {
		console.error('❌ Test 8 Failed', e)
		await saveResult('test8_error.json', { error: String(e) })
	}

	// Test 9: Extract Bounty from PortableInfobox (parse + Cheerio)
	console.log('\n--- TEST 9: Extract Bounty from PortableInfobox (Luffy) ---')
	try {
		const params = {
			action: 'parse',
			page: 'Monkey_D._Luffy',
			prop: 'text',
			format: 'json',
		}

		const data = (await request(params)) as any
		const html = data.parse.text['*']
		const $ = cheerio.load(html)

		// Extrair todos os campos da PortableInfobox
		const infoboxData: Record<string, string> = {}

		$('.pi-data').each((_, el) => {
			const label = $(el).find('.pi-data-label').text().trim()
			const value = $(el).find('.pi-data-value').text().trim()
			if (label && value) {
				infoboxData[label] = value
			}
		})

		// Buscar especificamente por recompensa/bounty
		let bounty: string | null = null
		for (const [label, value] of Object.entries(infoboxData)) {
			if (
				label.toLowerCase().includes('recompensa') ||
				label.toLowerCase().includes('bounty')
			) {
				bounty = value
				break
			}
		}

		const obj = {
			bounty,
			allInfoboxFields: infoboxData,
		}
		await saveResult('test9_luffy_bounty.json', [obj])

		console.log(`✅ Bounty extracted: ${bounty || 'Not found'}`)
		console.log(`📋 Total infobox fields: ${Object.keys(infoboxData).length}`)
	} catch (e) {
		console.error('❌ Test 9 Failed', e)
		await saveResult('test9_error.json', { error: String(e) })
	}

	console.log('\n🏁 All tests completed.')
}

runTests()
