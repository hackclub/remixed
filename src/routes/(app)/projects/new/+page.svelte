<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Create New Project</title>
</svelte:head>

<div class="relative z-2 flex min-h-screen w-full items-start justify-center px-4 pt-12 pb-40 sm:px-8">
	<form
		method="POST"
		class="flex w-full max-w-4xl flex-col rounded-[2rem] border-4 border-[#8B81FF] bg-text px-6 py-8 font-jua text-light shadow-2xl/30 sm:px-10 sm:py-10"
	>
		<h1 class="text-left text-4xl text-[#E2BEFF] text-shadow-flat sm:text-5xl">
			Create new project
		</h1>
		<p class="mt-1 mb-8 text-left text-lg text-[#E2BEFF]">
			You can change all of these fields later!
		</p>

		<div>
			<label class="mb-0 block text-2xl text-[#E2BEFF]" for="title">Title</label>
			<p class="mb-2 text-lg text-[#E2BEFF]">Give your project a cool name!</p>
			<input
				type="text"
				id="title"
				name="title"
				class="w-full rounded-2xl border-4 border-[#8B81FF] bg-text px-5 py-4 text-xl text-[#E2BEFF] outline-none"
				required
			/>
		</div>

		<div class="mt-6">
			<label class="mb-0 block text-2xl text-[#E2BEFF]" for="desc">Description</label>
			<p class="mb-2 text-lg text-[#E2BEFF]">Describe what your project is in detail.</p>
			<textarea
				id="desc"
				name="desc"
				rows="6"
				class="w-full rounded-2xl border-4 border-[#8B81FF] bg-text px-5 py-4 text-xl text-[#E2BEFF] outline-none"
			></textarea>
		</div>

		<div class="mt-6">
			<label class="mb-0 block text-2xl text-[#E2BEFF]" for="category">Category</label>
			<p class="mb-2 text-lg text-[#E2BEFF]">What kind of project are ya making?</p>
			<select
				name="category"
				id="category"
				class="w-full rounded-2xl border-4 border-[#8B81FF] bg-text px-5 py-4 text-xl text-[#E2BEFF] outline-none"
			>
				<option value="GAME">Game</option>
				<option value="WEBSITE">Website</option>
				<option value="DESKTOP_APP">Desktop App</option>
				<option value="CLI">CLI</option>
				<option value="OTHER">Other</option>
			</select>
		</div>

		<div class="mt-6">
			<label class="mb-0 block text-2xl text-[#E2BEFF]" for="hackatime">Hackatime Projects</label>
			<p class="mb-2 text-lg text-[#E2BEFF]">Use Ctrl+Click to select multiple!</p>
			<select
				multiple
				name="hackatime_projects"
				id="hackatime"
				class="min-h-52 w-full rounded-2xl border-4 border-[#8B81FF] bg-text px-5 py-4 text-xl text-[#E2BEFF] outline-none"
			>
				{#if data.projects.length > 0}
					{#each data.projects as proj}
						{#if proj.claimed}
							<option disabled value={proj.name}>{proj.name}</option>
						{:else}
							<option value={proj.name}>{proj.name}</option>
						{/if}
					{/each}
				{:else}
					<option disabled value="none">No Projects Found</option>
				{/if}
			</select>
		</div>

		<button
			type="submit"
			class="relative top-0 mx-auto mt-8 w-max cursor-pointer rounded-2xl bg-linear-to-r from-secondary to-[#54C1D7] p-1 shadow-none transition-all hover:-top-1 hover:shadow-lg/30 active:top-1 active:shadow-none"
		>
			<div class="rounded-xl bg-text px-8 py-2 sm:px-16">
				<div class="relative text-xl sm:text-3xl">
					<span class="text-stroke text-stroke-1 bg-linear-to-r from-[#6EF5FB] to-[#938BEC] p-1">
						create project
					</span>
					<span
						class="absolute top-0 left-0 bg-linear-to-b from-[#3E236D] to-[#42518E] bg-clip-text p-1 pt-0 text-transparent"
					>
						create project
					</span>
				</div>
			</div>
		</button>
	</form>
</div>
