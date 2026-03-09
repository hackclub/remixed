export type Record = {
	title: string;
	desc: string;
	theme: {
		bg: string;
		border: string;
		titleColor: string;
		descColor: string;
	};
};

export const records: Record[] = [
	{
		title: 'GAME',
		desc: 'make a fucking rhythm game',
		theme: {
			bg: '#dc2626',
			border: '#fb923c',
			titleColor: '#fff7ed',
			descColor: '#fecaca'
		}
	},
	{
		title: 'WEBSITE',
		desc: 'make a fucking website',
		theme: {
			bg: '#1e3a8a',
			border: '#93c5fd',
			titleColor: '#eff6ff',
			descColor: '#bfdbfe'
		}
	},
	{
		title: 'MUSIC',
		desc: 'make some fucking beats',
		theme: {
			bg: '#6b21a8',
			border: '#e879f9',
			titleColor: '#fdf4ff',
			descColor: '#e9d5ff'
		}
	},
	{
		title: 'OTHER',
		desc: 'anything else related to music',
		theme: {
			bg: '#1c1917',
			border: '#a8a29e',
			titleColor: '#fafaf9',
			descColor: '#d6d3d1'
		}
	}
];
