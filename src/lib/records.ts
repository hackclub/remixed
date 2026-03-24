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
		title: 'RHYTHM GAME',
		desc: 'make game about timing stuff to the rhythm!',
		theme: {
			bg: '#dc2626',
			border: '#fb923c',
			titleColor: '#fff7ed',
			descColor: '#fecaca',
		},
	},
	{
		title: 'AUDIO EDITOR',
		desc: 'make a tool to change up audio! any kind of editor is fine!',
		theme: {
			bg: '#1e3a8a',
			border: '#93c5fd',
			titleColor: '#eff6ff',
			descColor: '#bfdbfe',
		},
	},
	{
		title: 'MUSIC PLAYER',
		desc: 'make something that plays music! be creative!',
		theme: {
			bg: '#6b21a8',
			border: '#e879f9',
			titleColor: '#fdf4ff',
			descColor: '#e9d5ff',
		},
	},
	{
		title: 'WILDCARD',
		desc: 'anything else related to music!!',
		theme: {
			bg: '#1c1917',
			border: '#a8a29e',
			titleColor: '#fafaf9',
			descColor: '#d6d3d1',
		},
	},
];
