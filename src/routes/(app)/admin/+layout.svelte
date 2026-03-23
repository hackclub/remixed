<script lang="ts">
	import { page } from '$app/state';

	let { children, data } = $props();

	function isActive(href: string) {
		return href === '/admin' ? page.url.pathname === href : page.url.pathname.startsWith(href);
	}

	function navClass(href: string) {
		return `hover-effect-shadow inline-flex items-center rounded-xl border-4 px-5 py-2 text-lg transition ${
			isActive(href) ? 'border-[#1C2C44] bg-primary text-text' : 'border-[#8B81FF] bg-bg text-text'
		}`;
	}
</script>

<section
	class="m-10 mb-0 rounded-[2rem] border-4 border-[#8B81FF] bg-bg font-jua text-text shadow-xl/20"
>
	<div class="flex flex-wrap items-center gap-3">
		<nav class="flex flex-1 flex-wrap gap-3">
			<a
				href="/admin"
				class={navClass('/admin')}
				aria-current={isActive('/admin') ? 'page' : undefined}>Overview</a
			>
			{#each data.adminLinks as link}
				<a
					href={link.href}
					class={navClass(link.href)}
					aria-current={isActive(link.href) ? 'page' : undefined}>{link.title}</a
				>
			{/each}
		</nav>
		{#if page.url.pathname !== '/admin'}
			<a href="/admin" class={navClass('/admin')}>Back</a>
		{/if}
	</div>
</section>

{@render children()}
