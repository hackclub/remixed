// place files you want to import through the `$lib` alias in this folder.

export {
	PROJECT_CATEGORIES,
	PROJECT_CATEGORY_OPTIONS,
	formatProjectCategory,
	isProjectCategory,
	type ProjectCategory,
} from './projectCategories';
export type ShipStatusPub = 'PENDING' | 'APPROVED' | 'REJECTED';
export type RoleEnumPub = 'USER' | 'STAFF' | 'REVIEWER' | 'ORGANIZER';

export function formatHours(seconds: number) {
	const minutes = seconds / 60.0;
	const hours = Math.floor(minutes / 60.0);
	const minuteTextRaw = String(minutes - hours * 60);
	const minuteText = minuteTextRaw.slice(0, minuteTextRaw.indexOf('.')).padStart(1, '0');
	return `${hours}h ${minuteText}m`;
}

export function validUrl(url: string | null): boolean {
	if (!url) return false;
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}

export function shuffleArray(array: any[]) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));

		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}
