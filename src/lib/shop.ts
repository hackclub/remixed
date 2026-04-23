export type ShopRegion = 'US' | 'EU' | 'UK' | 'INDIA' | 'CANADA' | 'AUSTRALIA' | 'REST_OF_WORLD';

export const ALL_REGIONS: ShopRegion[] = [
	'US',
	'EU',
	'UK',
	'INDIA',
	'CANADA',
	'AUSTRALIA',
	'REST_OF_WORLD',
];
export const DEFAULT_REGION: ShopRegion = 'US';

export function getPriceForRegion(
	regionPrices: Record<string, number>,
	region: ShopRegion,
): number | undefined {
	return regionPrices[region];
}

export function getAvailableRegions(regionPrices: Record<string, number>): ShopRegion[] {
	return ALL_REGIONS.filter((region) => region in regionPrices);
}

export function formatRegionalPrices(regionPrices: Record<string, number>): string {
	const available = getAvailableRegions(regionPrices);
	if (available.length === 0) return 'No pricing';
	return available.map((r) => `${r}: ${regionPrices[r]}`).join(', ');
}

export function formatRegionName(region: ShopRegion): string {
	const names: Record<ShopRegion, string> = {
		US: 'United States',
		EU: 'Europe',
		UK: 'United Kingdom',
		INDIA: 'India',
		CANADA: 'Canada',
		AUSTRALIA: 'Australia',
		REST_OF_WORLD: 'Rest of World',
	};
	return names[region];
}
