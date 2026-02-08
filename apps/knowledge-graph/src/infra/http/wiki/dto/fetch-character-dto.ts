import z from 'zod'

export const fetchCharacterDtoSchema = z.object({
	'Nome Japonês': z.string().default(''),
	'Nome Romanizado': z.string().default(''),
	'Nome Oficial Brasileiro': z.string().default(''),
	'Afiliações': z.array(z.string()).default([]),
	'Ocupações': z.string().default(''),
	'Local de Nascimento': z.string().default(''),
	'Pseudônimo': z.array(z.string()).default([]),
	'Estado:': z.string().default(''),
	'Idade:': z.array(z.string()).default([]),
	'Aniversário:': z.string().default(''),
	'Altura:': z.array(z.string()).default([]),
	'Recompensa:': z.array(z.string()).default([]),
})

export type FetchCharacterDto = z.infer<typeof fetchCharacterDtoSchema>