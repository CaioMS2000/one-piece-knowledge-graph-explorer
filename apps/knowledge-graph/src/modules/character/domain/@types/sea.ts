export const Sea = [
	'Eastblue',
	'Westblue',
	'Northblue',
	'Southblue',
	'Grandline',
	'Newworld',
	'Calmbelt',
	'Redline',
	'Unknown',
] as const
export type Sea = (typeof Sea)[number]
