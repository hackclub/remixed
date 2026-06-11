<script lang="ts">
	import type { PageData } from './$types';
	import {
		formatHours,
		NOTES_PER_HOUR,
		MIN_NOTES_PER_HOUR,
		MAX_NOTES_PER_HOUR,
		NOTE_VALUE_USD,
	} from '$lib';

	let { data }: { data: PageData } = $props();

	// --- review creator (targets the pending ship) ---
	type ReviewMode = 'ship_comment' | 'internal_comment' | 'rejection' | 'approval';
	let reviewMode = $state<ReviewMode>('ship_comment');
	const pendingShip = data.pendingShip;
	let adjustedHours = $state(
		pendingShip ? parseFloat((pendingShip.seconds / 3600).toFixed(1)) : 0,
	);
	let notesPerHour = $state(NOTES_PER_HOUR);
	let notesPayout = $derived(Math.ceil(adjustedHours * notesPerHour));
	let hourlyRate = $derived((notesPerHour * NOTE_VALUE_USD).toFixed(2));
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
		editHasHours = review.review.type === 'APPROVAL';
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

	function reviewTypeBadge(type: string) {
		switch (type) {
			case 'APPROVAL':
			case 'HQ_APPROVAL':
				return 'badge-success';
			case 'REJECTION':
			case 'HQ_REJECTION':
				return 'badge-error';
			default:
				return 'badge-ghost';
		}
	}

	function reviewsForShip(shipId: number) {
		return data.reviews.filter((r) => r.review.shipId === shipId);
	}

	function shipStatusBadge(status: string) {
		switch (status) {
			case 'APPROVED':
				return 'badge-success';
			case 'REJECTED':
				return 'badge-error';
			case 'REVIEWER_APPROVED':
				return 'badge-warning';
			case 'CANCELLED':
				return 'badge-ghost';
			default:
				return 'badge-neutral';
		}
	}

	function shipStatusLabel(status: string) {
		switch (status) {
			case 'REVIEWER_APPROVED':
				return 'Awaiting HQ';
			default:
				return status.charAt(0) + status.slice(1).toLowerCase();
		}
	}

	const totalProjectSeconds = data.project.hackatimeSeconds ?? 0;
	const unshippedSeconds = Math.max(0, totalProjectSeconds - data.project.committedSeconds);
</script>

<svelte:head><title>{data.project.title} — Ship Review</title></svelte:head>

<!-- Edit review popover -->
<div
	bind:this={editPopover}
	class="bg-base-200 shadow-2xl rounded-xl border border-base-300 w-[min(90vw,36rem)]"
	popover
	id="edit-review"
>
	<div class="px-5 py-4 border-b border-base-300">
		<h3 class="font-semibold text-sm">Edit Review</h3>
	</div>
	<form action="?/editReview" method="POST" class="p-5 space-y-3">
		<input type="hidden" name="reviewId" value={editingReviewId} />
		{#if editHasHours}
			<fieldset class="fieldset p-0">
				<legend class="fieldset-legend font-normal text-xs">Adjusted Hours</legend>
				<input
					type="number"
					name="adjustedHours"
					step="0.1"
					min="0.1"
					bind:value={editAdjustedHours}
					class="input input-bordered input-sm w-full"
				/>
			</fieldset>
		{/if}
		<fieldset class="fieldset p-0">
			<legend class="fieldset-legend font-normal text-xs">User Comment</legend>
			<textarea
				name="userComment"
				class="textarea textarea-bordered textarea-sm w-full"
				bind:value={editUserComment}
			></textarea>
		</fieldset>
		<fieldset class="fieldset p-0">
			<legend class="fieldset-legend font-normal text-xs">Internal Comment</legend>
			<textarea
				name="internalComment"
				class="textarea textarea-bordered textarea-sm w-full"
				bind:value={editInternalComment}
			></textarea>
		</fieldset>
		<div class="flex gap-2 pt-1">
			<button
				type="button"
				class="btn btn-sm btn-outline flex-1"
				onclick={() => editPopover?.hidePopover()}>Cancel</button
			>
			<button type="submit" class="btn btn-sm btn-primary flex-1">Save</button>
		</div>
	</form>
</div>

<div class="max-w-3xl mx-auto space-y-6">
	<!-- Project header -->
	<div class="card bg-base-100 border border-base-300">
		<div class="card-body p-5">
			<div class="flex items-start justify-between gap-4">
				<div>
					<h1 class="text-xl font-bold">{data.project.title}</h1>
					<p class="text-sm text-base-content/60 mt-0.5">
						by <a href="/user/{data.user.id}" class="link link-hover">@{data.user.username}</a>
						<span class="ml-1 font-mono text-xs opacity-60">{data.user.slackId}</span>
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Time stats -->
	<div class="stats stats-horizontal border border-base-300 bg-base-100 w-full shadow-sm">
		<div class="stat py-3">
			<div class="stat-title text-xs">Total project time</div>
			<div class="stat-value text-lg">{formatHours(totalProjectSeconds)}</div>
		</div>
		<div class="stat py-3">
			<div class="stat-title text-xs">Committed time</div>
			<div class="stat-value text-lg">{formatHours(data.project.committedSeconds)}</div>
		</div>
		<div class="stat py-3">
			<div class="stat-title text-xs">Unshipped time</div>
			<div class="stat-value text-lg">{formatHours(unshippedSeconds)}</div>
		</div>
	</div>

	<!-- Hackatime projects -->
	{#if data.project.hackatimeProjects.length > 0}
		<div class="card bg-base-100 border border-base-300">
			<div class="card-body p-4">
				<p class="text-xs text-base-content/50 mb-2">Hackatime projects</p>
				<div class="flex flex-wrap gap-2">
					{#each data.project.hackatimeProjects as proj}
						<span class="badge badge-outline badge-sm">{proj}</span>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Screenshot -->
	{#if data.project.coverArt}
		<div class="rounded-box overflow-hidden border border-base-300">
			<img
				src={data.project.coverArt}
				alt="Project screenshot"
				class="w-full object-cover"
				onerror={(e: any) => (e.currentTarget.src = '/404.jpg')}
			/>
		</div>
	{/if}

	<!-- Description -->
	{#if data.project.description}
		<div class="card bg-base-100 border border-base-300">
			<div class="card-body p-4">
				<p class="text-xs text-base-content/50 mb-1">Description</p>
				<p class="text-sm whitespace-pre-wrap">{data.project.description}</p>
			</div>
		</div>
	{/if}

	<!-- Links -->
	<div class="flex flex-wrap gap-2">
		{#if data.project.demoUrl}
			<a href={data.project.demoUrl} target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline">
				Demo ↗
			</a>
		{/if}
		{#if data.project.githubUrl}
			<a href={data.project.githubUrl} target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline">
				Repository ↗
			</a>
		{/if}
		<a href="/projects/{data.project.id}" class="btn btn-sm btn-ghost">Project Page</a>
		<a
			href="https://joe.fraud.hackclub.com/profile/{data.user.slackId}"
			target="_blank"
			rel="noopener noreferrer"
			class="btn btn-sm btn-ghost"
		>
			Joe ↗
		</a>
	</div>

	<!-- Review Timeline -->
	<div class="card bg-base-100 border border-base-300">
		<div class="card-body p-5">
			<h2 class="font-semibold mb-5">Review Timeline</h2>

			{#if data.projectShips.length === 0}
				<p class="text-sm text-base-content/40">No ships yet.</p>
			{:else}
				<div class="relative">
					<!-- Vertical stem line -->
					<div class="absolute left-[0.875rem] top-2 bottom-2 w-px" style="background-color: color-mix(in oklab, var(--color-base-content) 25%, transparent)"></div>

					{#each data.projectShips as ship}
						{@const shipRevs = reviewsForShip(ship.id)}

						<!-- Ship submitted event -->
						<div class="relative flex gap-4 pb-5">
							<div class="shrink-0 w-7 flex justify-center">
								<div class="w-3 h-3 rounded-full bg-gray-300 mt-1 z-10 relative"></div>
							</div>
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<img
										src={data.user.avatarUrl ?? '/404.jpg'}
										alt={data.user.username}
										class="w-5 h-5 rounded-full object-cover"
									/>
									<span class="font-semibold text-sm">@{data.user.username}</span>
									<span class="text-sm text-base-content/60">shipped {formatHours(ship.seconds)}</span>
									<span class="badge {shipStatusBadge(ship.status)} badge-sm">{shipStatusLabel(ship.status)}</span>
									{#if ship.status === 'APPROVED'}
										<form action="?/syncAirtable" method="POST" class="contents">
											<input type="hidden" name="shipId" value={ship.id} />
											<button type="submit" class="btn btn-xs btn-outline">Sync to Airtable</button>
										</form>
										<form action="?/reverseApproval" method="POST" class="contents" onsubmit={(e) => { if (!confirm('Reverse this approval? This will deduct notes and notify the user.')) e.preventDefault(); }}>
											<input type="hidden" name="shipId" value={ship.id} />
											<button type="submit" class="btn btn-xs btn-outline btn-error">Reverse Approval</button>
										</form>
									{/if}
									<span class="text-xs text-base-content/40 ml-auto">
										{new Date(ship.submittedAt).toLocaleString()} ({timeAgo(ship.submittedAt)})
									</span>
								</div>
							</div>
						</div>

						<!-- Review events -->
						{#each shipRevs as r}
							{@const isEdited = r.review.updatedAt.getTime() !== r.review.createdAt.getTime()}
							<div class="relative flex gap-4 pb-5">
								<div class="shrink-0 w-7 flex justify-center">
									<div
										class="w-3 h-3 rounded-full border-2 mt-1 z-10 relative {r.review.type === 'APPROVAL' || r.review.type === 'HQ_APPROVAL'
											? 'bg-success border-success'
											: r.review.type === 'REJECTION' || r.review.type === 'HQ_REJECTION'
												? 'bg-error border-error'
												: 'bg-base-300 border-base-300'}"
									></div>
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-start gap-2">
										<img
											src={r.reviewer.avatarUrl ?? '/404.jpg'}
											alt={r.reviewer.username}
											class="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5"
										/>
										<div class="flex-1 min-w-0">
											<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
												<span class="font-semibold text-sm">@{r.reviewer.username}</span>
												<span class="badge {reviewTypeBadge(r.review.type)} badge-sm">
													{reviewTypeLabel(r.review.type)}
												</span>
												{#if r.review.adjustedHours}
													{@const rate = r.review.notesPerHour ?? NOTES_PER_HOUR}
													<span class="text-xs text-base-content/50">
														{r.review.adjustedHours}h &middot; {Math.ceil(r.review.adjustedHours * rate)} notes @ {rate}/h
													</span>
												{/if}
												{#if r.review.isInternal}
													<span class="badge badge-outline badge-xs">internal</span>
												{/if}
											</div>
											{#if r.review.userComment}
												<div class="mt-1.5 rounded-lg bg-base-200 px-3 py-2 text-sm">
													<p class="text-xs text-base-content/40 mb-0.5">Shipper-visible</p>
													{r.review.userComment}
												</div>
											{/if}
											{#if r.review.internalComment}
												<div class="mt-1.5 rounded-lg bg-warning/10 border border-warning/20 px-3 py-2 text-sm">
													<p class="text-xs text-base-content/40 mb-0.5">Review-team only</p>
													{r.review.internalComment}
												</div>
											{/if}
										</div>
										<div class="flex items-center gap-2 shrink-0">
											<span class="text-xs text-base-content/40">
												{new Date(r.review.createdAt).toLocaleString()}
												{#if isEdited}<em class="not-italic opacity-60"> (edited)</em>{/if}
											</span>
											{#if r.review.reviewerId === data.currentUserId}
												<button
													class="btn btn-outline btn-xs"
													onclick={() => openEdit(r)}
													popovertarget="edit-review"
												>Edit</button>
											{/if}
										</div>
									</div>
								</div>
							</div>
						{/each}
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Submit Review -->
	{#if pendingShip}
		<div class="card bg-base-100 border border-base-300">
			<div class="card-body p-5">
				<h2 class="font-semibold mb-4">Submit Review</h2>
				<form action={reviewFormAction} method="POST" class="space-y-3">
					<input type="hidden" name="shipId" value={pendingShip.id} />

					<fieldset class="fieldset p-0">
						<legend class="fieldset-legend font-normal text-xs">Review type</legend>
						<select bind:value={reviewMode} class="select select-bordered select-sm w-full">
							<option value="ship_comment">Ship Comment</option>
							<option value="internal_comment">Internal Comment</option>
							<option value="rejection">Rejection</option>
							<option value="approval">Approval</option>
						</select>
					</fieldset>

					{#if reviewMode === 'approval'}
						<fieldset class="fieldset p-0">
							<legend class="fieldset-legend font-normal text-xs">Approved Hours</legend>
							<input
								type="number"
								name="adjustedHours"
								step="0.1"
								min="0.1"
								max={(pendingShip.seconds / 3600).toFixed(1)}
								bind:value={adjustedHours}
								class="input input-bordered input-sm w-full"
							/>
						</fieldset>
						<fieldset class="fieldset p-0">
							<legend class="fieldset-legend font-normal text-xs">Notes per Hour — ${hourlyRate}/hr</legend>
							<div class="flex items-center gap-3">
								<input
									type="range"
									name="notesPerHour"
									min={MIN_NOTES_PER_HOUR}
									max={MAX_NOTES_PER_HOUR}
									step="1"
									bind:value={notesPerHour}
									class="range range-sm flex-1"
								/>
								<input
									type="number"
									min={MIN_NOTES_PER_HOUR}
									max={MAX_NOTES_PER_HOUR}
									step="1"
									bind:value={notesPerHour}
									class="input input-bordered input-sm w-20"
								/>
							</div>
						</fieldset>
						{#if notesPerHour * NOTE_VALUE_USD > 5}
							<div class="alert alert-warning alert-sm text-xs">
								This goes over the regular program payout amount! If in doubt — ask in the channel!
							</div>
						{/if}
						<p class="text-xs text-base-content/50">
							Payout: {notesPayout} notes ({adjustedHours}h &times; {notesPerHour} notes/h)
						</p>
					{/if}

					{#if isComment}
						{#if reviewMode === 'internal_comment'}
							<input type="hidden" name="isInternal" value="on" />
						{/if}
						<fieldset class="fieldset p-0">
							<legend class="fieldset-legend font-normal text-xs">
									{reviewMode === 'internal_comment'
										? 'Comment (only visible to review team)'
										: 'Comment (visible to shipper)'}
								</legend>
							<textarea
								required
								name="comment"
								rows="3"
								class="textarea textarea-bordered textarea-sm w-full"
								placeholder={reviewMode === 'internal_comment'
									? 'Only reviewers will see this...'
									: 'The shipper will be notified...'}
							></textarea>
						</fieldset>
					{:else}
						<fieldset class="fieldset p-0">
							<legend class="fieldset-legend font-normal text-xs">Shipper-visible comment (required)</legend>
							<textarea
								required
								name="userComment"
								rows="3"
								class="textarea textarea-bordered textarea-sm w-full"
								placeholder="This will be sent to the shipper"
							></textarea>
						</fieldset>
						<fieldset class="fieldset p-0">
							<legend class="fieldset-legend font-normal text-xs">Review-team-only comment (required)</legend>
							<textarea
								required
								name="internalComment"
								rows="2"
								class="textarea textarea-bordered textarea-sm w-full"
								placeholder="Only visible to reviewers"
							></textarea>
						</fieldset>
					{/if}

					<button
						type="submit"
						class="btn btn-sm btn-primary w-full"
					>
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
		</div>
	{/if}
</div>
