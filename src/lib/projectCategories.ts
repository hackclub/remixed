export const PROJECT_CATEGORIES = [
	'AUDIO_EDITOR',
	'RHYTHM_GAME',
	'MUSIC_PLAYER',
	'WILDCARD',
] as const;

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number];

export const PROJECT_CATEGORY_OPTIONS = [
	{ value: 'AUDIO_EDITOR', label: 'audio editor' },
	{ value: 'RHYTHM_GAME', label: 'rhythm game' },
	{ value: 'MUSIC_PLAYER', label: 'music player' },
	{ value: 'WILDCARD', label: 'wildcard (anything else)' },
] as const satisfies ReadonlyArray<{ value: ProjectCategory; label: string }>;

const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
	AUDIO_EDITOR: 'audio editor',
	RHYTHM_GAME: 'rhythm game',
	MUSIC_PLAYER: 'music player',
	WILDCARD: 'wildcard',
};

export function isProjectCategory(value: string): value is ProjectCategory {
	return (PROJECT_CATEGORIES as readonly string[]).includes(value);
}

export function formatProjectCategory(category: ProjectCategory): string {
	return PROJECT_CATEGORY_LABELS[category];
}
