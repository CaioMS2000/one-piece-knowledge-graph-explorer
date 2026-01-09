export const Sea = [
	'Eastblue',
	'Westblue',
	'Northblue',
	'Southblue',
	'Grandline',
	'Newworld',
	'Calmbelt',
	'Redline',
] as const
export type Sea = (typeof Sea)[number]
