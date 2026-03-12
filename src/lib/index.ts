// place files you want to import through the `$lib` alias in this folder.

export type ProjectCategory = 'GAME' | 'WEBSITE' | 'DESKTOP_APP' | 'CLI' | 'OTHER';
export type ShipStatusPub = 'PENDING' | 'APPROVED' | 'REJECTED';

export function formatHours(seconds: number) {
	const minutes = seconds / 60.0;
	const hours = Math.floor(minutes / 60.0);
	const minuteTextRaw = String(minutes - hours * 60);
	const minuteText = minuteTextRaw.slice(0, minuteTextRaw.indexOf('.')).padStart(1, '0');
	return `${hours}h ${minuteText}m`;
}
