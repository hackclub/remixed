<script lang="ts">
	import type { PageData } from './$types';
	import { formatHours, formatProjectCategory, NOTES_PER_HOUR } from '$lib';
	import { styleAdminPopover, styleButton, styleInput } from '$lib/styles.js';

	let { data }: { data: PageData } = $props();

	let adjustedHours = $state(0);
	let notesPayout = $derived(Math.ceil(adjustedHours * NOTES_PER_HOUR));

	let editingReviewId = $state(0);
	let editUserComment = $state('');
	let editInternalComment = $state('');
	let editAdjustedHours = $state(0);
	let editHasHours = $state(false);

	let approvePopover: HTMLElement | undefined = $state();
	let rejectPopover: HTMLElement | undefined = $state();
	let commentPopover: HTMLElement | undefined = $state();
	let editPopover: HTMLElement | undefined = $state();

	function openApprove() {
		adjustedHours = parseFloat((data.ship.seconds / 3600).toFixed(1));
	}

	function openEdit(review: (typeof data.reviews)[number]) {
		editingReviewId = review.review.id;
		editUserComment = review.review.userComment ?? '';
		editInternalComment = review.review.internalComment ?? '';
		editAdjustedHours = review.review.adjustedHours ?? 0;
		editHasHours =
			review.review.type === 'APPROVAL' || review.review.type === 'HQ_APPROVAL';
	}

	function reviewsForShip(shipId: number) {
		return data.reviews.filter((r) => r.review.shipId === shipId);
	}

	function reviewTypeLabel(type: string) {
		switch (type) {
			case 'APPROVAL':
				return 'Reviewer Approved';
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
				return 'text-text';
		}
	}

	function shipStatusLabel(status: string) {
		if (status === 'REVIEWER_APPROVED') return 'AWAITING HQ';
		return status;
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
				return 'text-text';
		}
	}
</script>

<!-- Approve popover -->
<div bind:this={approvePopover} class={styleAdminPopover} popover id="confirm-approve">
	<form action="?/approve" method="POST" class="space-y-4">
		<p class="text-lg">Ship time: {formatHours(data.ship.seconds)}</p>
		<label class="block">
			<span class="text-sm">Approved Hours</span>
			<input
				type="number"
				name="adjustedHours"
				step="0.1"
				min="0.1"
				max={(data.ship.seconds / 3600).toFixed(1)}
				bind:value={adjustedHours}
				class="{styleInput} w-full font-jua text-text"
			/>
		</label>
		<p class="text-sm">
			Payout: {notesPayout} notes ({adjustedHours}h x {NOTES_PER_HOUR} notes/h)
		</p>
		<label class="block">
			<span class="text-sm">Comment for shipper (required)</span>
			<textarea
				required
				name="userComment"
				class="{styleInput} w-full font-jua text-text"
				placeholder="Visible to the shipper"
			></textarea>
		</label>
		<label class="block">
			<span class="text-sm">Internal comment (required)</span>
			<textarea
				required
				name="internalComment"
				class="{styleInput} w-full font-jua text-text"
				placeholder="Only visible to reviewers"
			></textarea>
		</label>
		<div class="flex gap-3 pt-2">
			<button
				type="button"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				onclick={() => approvePopover?.hidePopover()}>Cancel</button
			>
			<input
				type="submit"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				value="Approve"
			/>
		</div>
	</form>
</div>

<!-- Reject popover -->
<div bind:this={rejectPopover} class={styleAdminPopover} popover id="confirm-reject">
	<form action="?/reject" method="POST" class="space-y-4">
		<label class="block">
			<span class="text-sm">Comment for shipper (required)</span>
			<textarea
				required
				name="userComment"
				class="{styleInput} w-full font-jua text-text"
				placeholder="Visible to the shipper"
			></textarea>
		</label>
		<label class="block">
			<span class="text-sm">Internal comment (required)</span>
			<textarea
				required
				name="internalComment"
				class="{styleInput} w-full font-jua text-text"
				placeholder="Only visible to reviewers"
			></textarea>
		</label>
		<div class="flex gap-3">
			<button
				type="button"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				onclick={() => rejectPopover?.hidePopover()}>Cancel</button
			>
			<input
				type="submit"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				value="Reject"
			/>
		</div>
	</form>
</div>

<!-- Comment popover -->
<div bind:this={commentPopover} class={styleAdminPopover} popover id="add-comment">
	<form action="?/comment" method="POST" class="space-y-4">
		<label class="block">
			<span class="text-sm">Comment</span>
			<textarea
				required
				name="comment"
				class="{styleInput} w-full font-jua text-text"
				placeholder="Write a comment..."
			></textarea>
		</label>
		<label class="flex cursor-pointer items-center gap-2">
			<input type="checkbox" name="isInternal" />
			<span class="text-sm">Internal only (user will NOT be notified)</span>
		</label>
		<div class="flex gap-3">
			<button
				type="button"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				onclick={() => commentPopover?.hidePopover()}>Cancel</button
			>
			<input
				type="submit"
				class="{styleButton} min-w-0 flex-1 bg-text px-4 py-2 text-lg text-light"
				value="Post"
			/>
		</div>
	</form>
</div>

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
					class="{styleInput} w-full font-jua text-text"
				/>
			</label>
		{/if}
		<label class="block">
			<span class="text-sm">User Comment</span>
			<textarea
				name="userComment"
				class="{styleInput} w-full font-jua text-text"
				bind:value={editUserComment}
			></textarea>
		</label>
		<label class="block">
			<span class="text-sm">Internal Comment</span>
			<textarea
				name="internalComment"
				class="{styleInput} w-full font-jua text-text"
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

<div class="p-10 pb-40 font-jua text-text">
	<!-- Project Header -->
	<div class="mb-8">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div>
				<h1 class="text-3xl">
					<a href="/projects/{data.project.id}" class="underline">{data.project.title}</a>
				</h1>
				<p class="text-text/70">
					by <a href="/user/{data.user.id}" class="underline">@{data.user.username}</a>
					&middot; {formatProjectCategory(data.project.category)}
				</p>
				{#if data.project.description}
					<p class="mt-2 max-w-xl text-sm text-text/80">{data.project.description}</p>
				{/if}
			</div>
			<div class="flex flex-wrap gap-2">
				{#if data.project.githubUrl}
					<a
						href={data.project.githubUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="{styleButton} bg-text px-4 py-1 text-lg text-light">Repository</a
					>
				{/if}
				{#if data.project.demoUrl}
					<a
						href={data.project.demoUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="{styleButton} bg-text px-4 py-1 text-lg text-light">Demo</a
					>
				{/if}
				<a
					href="https://joe.fraud.hackclub.com/billy/overview?u={data.user.username}"
					target="_blank"
					rel="noopener noreferrer"
					class="{styleButton} bg-text px-4 py-1 text-lg text-light">Joe Stats</a
				>
			</div>
		</div>
	</div>

	<!-- Ships -->
	<div class="space-y-6">
		{#each data.projectShips as ship}
			{@const isCurrentShip = ship.id === data.ship.id}
			{@const shipReviews = reviewsForShip(ship.id)}
			<div
				class="rounded-xl border-2 p-6 {isCurrentShip
					? 'border-text bg-accent-purple/40'
					: 'border-text/50 bg-accent-purple/20'}"
			>
				<div class="mb-4 flex items-center justify-between">
					<div class="flex items-center gap-4">
						<a href="/admin/ships/{ship.id}" class="text-xl underline">
							Ship #{ship.id}
						</a>
						<span class={shipStatusColor(ship.status)}>
							{shipStatusLabel(ship.status)}
						</span>
						{#if isCurrentShip}
							<span class="rounded bg-text/20 px-2 py-0.5 text-xs">current</span>
						{/if}
					</div>
					<div class="flex items-center gap-4 text-sm text-text/70">
						<span>{formatHours(ship.seconds)}</span>
						<span>{new Date(ship.submittedAt).toLocaleDateString()}</span>
					</div>
				</div>

				<!-- Actions for the current ship -->
				{#if isCurrentShip && ship.status === 'PENDING'}
					<div class="mb-4 flex gap-2">
						<button
							class="{styleButton} bg-text px-4 py-1 text-lg text-light"
							onclick={openApprove}
							popovertarget="confirm-approve">Approve</button
						>
						<button
							class="{styleButton} bg-text px-4 py-1 text-lg text-light"
							popovertarget="confirm-reject">Reject</button
						>
						<button
							class="{styleButton} bg-text px-4 py-1 text-lg text-light"
							popovertarget="add-comment">Comment</button
						>
					</div>
				{:else if isCurrentShip && ship.status !== 'CANCELLED'}
					<div class="mb-4 flex gap-2">
						<button
							class="{styleButton} bg-text px-4 py-1 text-lg text-light"
							popovertarget="add-comment">Comment</button
						>
					</div>
				{/if}

				<!-- Reviews for this ship -->
				{#if shipReviews.length > 0}
					<div class="space-y-3">
						{#each shipReviews as r}
							<div class="border-t border-text/30 pt-3">
								<div class="flex flex-wrap items-center justify-between gap-2">
									<div class="flex items-center gap-2">
										<span class="font-bold {reviewTypeColor(r.review.type)}">
											{reviewTypeLabel(r.review.type)}
										</span>
										<span class="text-sm text-text/70">by {r.reviewer.username}</span>
										{#if r.review.adjustedHours}
											<span class="text-sm">({r.review.adjustedHours}h)</span>
										{/if}
										{#if r.review.isInternal}
											<span class="rounded bg-text/20 px-1.5 py-0.5 text-xs">internal</span>
										{/if}
									</div>
									<div class="flex items-center gap-2">
										<span class="text-xs text-text/50">
											{new Date(r.review.createdAt).toLocaleString()}
											{#if r.review.updatedAt.getTime() !== r.review.createdAt.getTime()}
												(edited)
											{/if}
										</span>
										{#if r.review.reviewerId === data.currentUserId}
											<button
												class="text-xs underline"
												onclick={() => openEdit(r)}
												popovertarget="edit-review">Edit</button
											>
										{/if}
									</div>
								</div>
								{#if r.review.userComment}
									<p class="mt-1 text-sm">
										<span class="text-text/50">User:</span>
										{r.review.userComment}
									</p>
								{/if}
								{#if r.review.internalComment}
									<p class="mt-1 text-sm text-text/70">
										<span class="text-text/50">Internal:</span>
										{r.review.internalComment}
									</p>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-text/50">No reviews yet</p>
				{/if}
			</div>
		{/each}
	</div>
</div>
