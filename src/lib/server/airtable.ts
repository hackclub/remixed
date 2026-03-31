import { env } from '$env/dynamic/private';

type AirtableShipRecord = {
	codeUrl: string | null;
	playableUrl: string | null;
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	screenshot: string | null;
	description: string | null;
	githubUsername: string | null;
	addressLine1: string | null;
	addressLine2: string | null;
	city: string | null;
	state: string | null;
	country: string | null;
	zipCode: string | null;
	birthday: string | null;
	overrideHoursSpent: number;
	overrideHoursJustification: string;
};

export async function createAirtableShipRecord(record: AirtableShipRecord): Promise<void> {
	const baseId = env.AIRTABLE_BASE_ID;
	const tableId = env.AIRTABLE_TABLE_ID;
	const pat = env.AIRTABLE_PAT;

	if (!baseId || !tableId || !pat) {
		console.warn('Airtable not configured, skipping record creation');
		return;
	}

	const fields: Record<string, unknown> = {};
	if (record.codeUrl) fields['Code URL'] = record.codeUrl;
	if (record.playableUrl) fields['Playable URL'] = record.playableUrl;
	if (record.firstName) fields['First Name'] = record.firstName;
	if (record.lastName) fields['Last Name'] = record.lastName;
	if (record.email) fields['Email'] = record.email;
	if (record.screenshot) fields['Screenshot'] = record.screenshot;
	if (record.description) fields['Description'] = record.description;
	if (record.githubUsername) fields['GitHub Username'] = record.githubUsername;
	if (record.addressLine1) fields['Address (Line 1)'] = record.addressLine1;
	if (record.addressLine2) fields['Address (Line 2)'] = record.addressLine2;
	if (record.city) fields['City'] = record.city;
	if (record.state) fields['State / Province'] = record.state;
	if (record.country) fields['Country'] = record.country;
	if (record.zipCode) fields['ZIP / Postal Code'] = record.zipCode;
	if (record.birthday) fields['Birthday'] = record.birthday;
	fields['Optional - Override Hours Spent'] = record.overrideHoursSpent;
	fields['Optional - Override Hours Spent Justification'] = record.overrideHoursJustification;

	const resp = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${pat}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ fields }),
	});

	if (!resp.ok) {
		const body = await resp.text();
		console.error(`Airtable record creation failed (${resp.status}): ${body}`);
	}
}

export function extractGithubUsername(githubUrl: string | null): string | null {
	if (!githubUrl) return null;
	try {
		const url = new URL(githubUrl);
		if (url.hostname !== 'github.com') return null;
		const parts = url.pathname.split('/').filter(Boolean);
		return parts[0] ?? null;
	} catch {
		return null;
	}
}
