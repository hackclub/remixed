<script lang="ts">
	import type { PageData } from './$types';
	import { formatHours, NOTES_PER_HOUR } from '$lib';
	import { styleAdminPopover, styleButton, styleInput } from '$lib/styles.js';

	let { data }: { data: PageData } = $props();

	// --- review creator (targets the pending ship) ---
	type ReviewMode = 'ship_comment' | 'internal_comment' | 'rejection' | 'approval';
	let reviewMode = $state<ReviewMode>('ship_comment');
	const pendingShip = data.pendingShip;
	let adjustedHours = $state(
		pendingShip ? parseFloat((pendingShip.seconds / 3600).toFixed(1)) : 0,
	);
	let notesPayout = $derived(Math.ceil(adjustedHours * NOTES_PER_HOUR));
	let isComment = $derived(reviewMode === 'ship_comment' || reviewMode === 'internal_comment');
	let reviewFormAction = $derived(
		isComment ? '?/comment' : reviewMode === 'rejection' ? '?/reject' : '?/approve',
	);

	// --- edit review popover ---
	let editingReviewId = $state(0);
	let editUserComment = $state('');
	let editInternalComment = $state('');
	let editAdjustedHours = $state(0);
	let editHasHours = $state(false);
	let editPopover: HTMLElement | undefined = $state();

	function openEdit(review: (typeof data.reviews)[number]) {
		editingReviewId = review.review.id;
		editUserComment = review.review.userComment ?? '';
		editInternalComment = review.review.internalComment ?? '';
		editAdjustedHours = review.review.adjustedHours ?? 0;
		editHasHours = review.review.type === 'APPROVAL' || review.review.type === 'HQ_APPROVAL';
	}

	// --- helpers ---
	function timeAgo(date: Date): string {
		const s = Math.floor((Date.now() - date.getTime()) / 1000);
		if (s < 60) return `${s}s ago`;
		const m = Math.floor(s / 60);
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ago`;
		const d = Math.floor(h / 24);
		return `${d}d ago`;
	}

	function reviewTypeLabel(type: string) {
		switch (type) {
			case 'APPROVAL':
				return 'Approved';
			case 'REJECTION':
				return 'Rejected';
			case 'COMMENT':
				return 'Comment';
			case 'HQ_APPROVAL':
				return 'HQ Approved';
			case 'HQ_REJECTION':
				return 'HQ Returned';
			default:
				return type;
		}
	}

	function reviewTypeColor(type: string) {
		switch (type) {
			case 'APPROVAL':
			case 'HQ_APPROVAL':
				return 'text-green-700';
			case 'REJECTION':
			case 'HQ_REJECTION':
				return 'text-accent-red';
			default:
				return '';
		}
	}

	function reviewsForShip(shipId: number) {
		return data.reviews.filter((r) => r.review.shipId === shipId);
	}

	function shipStatusLabel(status: string) {
		switch (status) {
			case 'REVIEWER_APPROVED':
				return 'AWAITING HQ';
			case 'PENDING':
				return 'PENDING';
			case 'APPROVED':
				return 'APPROVED';
			case 'REJECTED':
				return 'REJECTED';
			case 'CANCELLED':
				return 'CANCELLED';
			default:
				return status;
		}
	}

	function shipStatusColor(status: string) {
		switch (status) {
			case 'APPROVED':
				return 'text-green-700';
			case 'REJECTED':
				return 'text-accent-red';
			case 'REVIEWER_APPROVED':
				return 'text-yellow-700';
			case 'CANCELLED':
				return 'text-text/50';
			default:
				return '';
		}
	}

	const totalProjectSeconds = data.project.hackatimeSeconds ?? 0;
	const totalShippedSeconds = data.projectShips
		.filter((s) => s.status !== 'CANCELLED')
		.reduce((sum, s) => sum + s.seconds, 0);
	const unshippedSeconds = Math.max(0, totalProjectSeconds - data.project.committedSeconds - totalShippedSeconds);
</script>

<!-- Edit review popover -->
<div bind:this={editPopover} class={styleAdminPopover} popover id="edit-review">
	<form action="?/editReview" method="POST" class="space-y-4">
		<input type="hidden" name="reviewId" value={editingReviewId} />
		{#if editHasHours}
			<label class="block">
				<span class="text-sm">Adjusted Hours</span>
				<input
					type="number"
					name="adjustedHours"
					step="0.1"
					min="0.1"
					bind:value={editAdjustedHours}
					class="{styleInput} w-full border-2 border-text font-jua text-text"
				/>
			</label>
		{/if}
		<label class="block">
			<span class="text-sm">User Comment</span>
			<textarea
				name="userComment"
				class="{styleInput} w-full border-2 border-text font-jua text-text"
				bind:value={editUserComment}
			></textarea>
		</label>
		<label class="block">
			<span class="text-sm">Internal Comment</span>
			<textarea
				name="internalComment"
				class="{styleInput} w-full border-2 border-text font-jua text-text"
				bind:value={editInternalComment}
			></textarea>
		</label>
		<div class="flex gap-3">
			<button
				type="button"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				onclick={() => editPopover?.hidePopover()}>Cancel</button
			>
			<input
				type="submit"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				value="Save"
			/>
		</div>
	</form>
</div>

<div class="mx-auto max-w-3xl p-10 pb-40 font-jua text-text">
	<!-- 1. Project Name -->
	<div class="mb-6 rounded-xl border-2 border-text bg-text p-5 text-light">
		<h1 class="mb-1 text-3xl">{data.project.title}</h1>
		<p class="text-light/60">
			by <a href="/user/{data.user.id}" class="underline">@{data.user.username}</a>
		</p>
	</div>

	<!-- 2. Time stats -->
	<div class="mb-6 grid grid-cols-2 gap-4 rounded-xl border-2 border-text bg-accent-purple p-4 text-sm sm:grid-cols-3">
		<div>
			<p class="text-text/50">Total project time</p>
			<p class="text-lg">{formatHours(totalProjectSeconds)}</p>
		</div>
		<div>
			<p class="text-text/50">Committed time</p>
			<p class="text-lg">{formatHours(data.project.committedSeconds)}</p>
		</div>
		<div>
			<p class="text-text/50">Unshipped time</p>
			<p class="text-lg">{formatHours(unshippedSeconds)}</p>
		</div>
	</div>

	<!-- 3. Hackatime projects -->
	{#if data.project.hackatimeProjects.length > 0}
		<div class="mb-6 rounded-xl border-2 border-text bg-accent-purple p-4">
			<p class="mb-2 text-sm text-text/50">Hackatime projects</p>
			<div class="flex flex-wrap gap-2">
				{#each data.project.hackatimeProjects as proj}
					<span class="rounded-lg bg-bg px-3 py-1 text-sm">{proj}</span>
				{/each}
			</div>
		</div>
	{/if}

	<!-- 4. Screenshot -->
	{#if data.project.coverArt}
		<div class="mb-6 overflow-hidden rounded-xl border-2 border-text bg-light">
			<img
				src={data.project.coverArt}
				alt="Project screenshot"
				class="w-full object-cover"
				onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
			/>
		</div>
	{/if}

	<!-- 5. Description -->
	{#if data.project.description}
		<div class="mb-6 rounded-xl border-2 border-text bg-accent-purple p-4 whitespace-pre-wrap text-sm text-text">
			{data.project.description}
		</div>
	{/if}

	<!-- 6. Buttons -->
	<div class="mb-8 flex flex-wrap gap-3">
		{#if data.project.demoUrl}
			<a
				href={data.project.demoUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="{styleButton} bg-text px-6 py-2 text-lg text-light">Demo</a
			>
		{/if}
		{#if data.project.githubUrl}
			<a
				href={data.project.githubUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="{styleButton} bg-text px-6 py-2 text-lg text-light">Repository</a
			>
		{/if}
		<a
			href="/projects/{data.project.id}"
			class="{styleButton} bg-text px-6 py-2 text-lg text-light">Project Page</a
		>
	</div>

	<!-- 7. Review Timeline -->
	<div class="mb-8 rounded-xl border-2 border-text bg-accent-purple p-6">
		<h2 class="mb-4 text-2xl">Review Timeline</h2>
		<div class="timeline relative ml-5 border-l-2 border-text pl-6">
			{#each data.projectShips as ship}
				{@const shipRevs = reviewsForShip(ship.id)}
				<!-- Ship submitted event -->
				<div class="relative mb-6">
					<div class="absolute -left-[33px] top-0.5 h-4 w-4 rounded-full border-2 border-text bg-accent-purple"></div>
					<div class="flex items-center gap-3">
						<img
							src={data.user.avatarUrl ?? '/404.jpg'}
							alt={data.user.username}
							class="h-8 w-8 rounded-full object-cover"
						/>
						<div>
							<span class="font-bold">@{data.user.username}</span>
							<span class="text-text/60"> shipped {formatHours(ship.seconds)}</span>
						</div>
						<span class="ml-auto flex items-center gap-2 text-xs text-text/40">
							<span class={shipStatusColor(ship.status)}>{shipStatusLabel(ship.status)}</span>
							&middot;
							{new Date(ship.submittedAt).toLocaleString()}
							({timeAgo(ship.submittedAt)})
						</span>
					</div>
				</div>

				<!-- Review events for this ship -->
				{#each shipRevs as r}
					{@const isEdited = r.review.updatedAt.getTime() !== r.review.createdAt.getTime()}
					<div class="relative mb-6">
						<div
							class="absolute -left-[33px] top-0.5 h-4 w-4 rounded-full border-2 border-text {r.review.type === 'APPROVAL' || r.review.type === 'HQ_APPROVAL'
								? 'bg-green-600'
								: r.review.type === 'REJECTION' || r.review.type === 'HQ_REJECTION'
									? 'bg-red-500'
									: 'bg-bg'}"
						></div>
						<div class="flex items-start gap-3">
							<img
								src={r.reviewer.avatarUrl ?? '/404.jpg'}
								alt={r.reviewer.username}
								class="h-8 w-8 shrink-0 rounded-full object-cover"
							/>
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-x-2">
									<span class="font-bold">@{r.reviewer.username}</span>
									<span class="text-sm {reviewTypeColor(r.review.type)}">
										{reviewTypeLabel(r.review.type)}
									</span>
									{#if r.review.adjustedHours}
										<span class="text-sm text-text/60">
											({r.review.adjustedHours}h &middot; {Math.ceil(r.review.adjustedHours * NOTES_PER_HOUR)} notes)
										</span>
									{/if}
									{#if r.review.isInternal}
										<span class="rounded bg-bg px-1.5 py-0.5 text-xs">internal</span>
									{/if}
								</div>
								{#if r.review.userComment}
									<div class="mt-1 rounded-lg bg-light px-3 py-2 text-sm">
										<p class="text-xs text-text/40">Shipper-visible</p>
										{r.review.userComment}
									</div>
								{/if}
								{#if r.review.internalComment}
									<div class="mt-1 rounded-lg bg-bg px-3 py-2 text-sm text-text">
										<p class="text-xs text-text/40">Review-team only</p>
										{r.review.internalComment}
									</div>
								{/if}
							</div>
							<div class="flex shrink-0 items-center gap-2">
								<span class="text-xs text-text/40">
									{new Date(r.review.createdAt).toLocaleString()}
									{#if isEdited}
										<span class="italic">(edited)</span>
									{/if}
								</span>
								{#if r.review.reviewerId === data.currentUserId}
									<button
										class="text-xs underline text-text/50 hover:text-text"
										onclick={() => openEdit(r)}
										popovertarget="edit-review"
									>
										Edit
									</button>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			{/each}

			{#if data.projectShips.length === 0}
				<p class="mb-6 text-sm text-text/40">No ships yet</p>
			{/if}
		</div>
	</div>

	<!-- 8. Review Creator (targets pending ship) -->
	{#if pendingShip}
		<div class="rounded-xl border-2 border-text bg-accent-purple p-6">
			<h2 class="mb-4 text-2xl">Submit Review</h2>
			<form action={reviewFormAction} method="POST" class="space-y-4">
				<input type="hidden" name="shipId" value={pendingShip.id} />
				<label class="block">
					<span class="text-sm text-text/60">Review type</span>
					<select
						bind:value={reviewMode}
						class="{styleInput} w-full border-2 border-text text-text"
					>
						<option value="ship_comment">Ship Comment</option>
						<option value="internal_comment">Internal Comment</option>
						<option value="rejection">Rejection</option>
						<option value="approval">Approval</option>
					</select>
				</label>

				{#if reviewMode === 'approval'}
					<label class="block">
						<span class="text-sm text-text/60">Approved Hours</span>
						<input
							type="number"
							name="adjustedHours"
							step="0.1"
							min="0.1"
							max={(pendingShip.seconds / 3600).toFixed(1)}
							bind:value={adjustedHours}
							class="{styleInput} w-full border-2 border-text text-text"
						/>
					</label>
					<p class="text-sm text-text/50">
						Payout: {notesPayout} notes ({adjustedHours}h &times; {NOTES_PER_HOUR} notes/h)
					</p>
				{/if}

				{#if isComment}
					{#if reviewMode === 'internal_comment'}
						<input type="hidden" name="isInternal" value="on" />
					{/if}
					<label class="block">
						<span class="text-sm text-text/60">
							{reviewMode === 'internal_comment'
								? 'Comment (only visible to review team)'
								: 'Comment (visible to shipper)'}
						</span>
						<textarea
							required
							name="comment"
							rows="3"
							class="{styleInput} w-full border-2 border-text text-text"
							placeholder={reviewMode === 'internal_comment'
								? 'Only reviewers will see this...'
								: 'The shipper will be notified...'}
						></textarea>
					</label>
				{:else}
					<label class="block">
						<span class="text-sm text-text/60">Shipper-visible comment (required)</span>
						<textarea
							required
							name="userComment"
							rows="3"
							class="{styleInput} w-full border-2 border-text text-text"
							placeholder="This will be sent to the shipper"
						></textarea>
					</label>
					<label class="block">
						<span class="text-sm text-text/60">Review-team-only comment (required)</span>
						<textarea
							required
							name="internalComment"
							rows="2"
							class="{styleInput} w-full border-2 border-text text-text"
							placeholder="Only visible to reviewers"
						></textarea>
					</label>
				{/if}

				<button type="submit" class="{styleButton} w-full bg-text px-6 py-2 text-lg text-light">
					{reviewMode === 'ship_comment'
						? 'Post Comment'
						: reviewMode === 'internal_comment'
							? 'Post Internal Comment'
							: reviewMode === 'rejection'
								? 'Reject'
								: 'Approve'}
				</button>
			</form>
		</div>
	{/if}
</div>
