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

	console.log('\n🏁 All tests completed.')
}

runTests()
