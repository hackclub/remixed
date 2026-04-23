<script lang="ts">
	import { page } from '$app/state';
	import {
		LayoutDashboard,
		Ship,
		BadgeCheck,
		Users,
		ShoppingBag,
		Package,
		FolderOpen,
		ScrollText,
	} from 'lucide-svelte';
	import type { Component } from 'svelte';

	let { children, data } = $props();

	function isActive(href: string) {
		return href === '/admin' ? page.url.pathname === href : page.url.pathname.startsWith(href);
	}

	const ROUTE_ICONS: Record<string, Component> = {
		'/admin/ships': Ship,
		'/admin/hq': BadgeCheck,
		'/admin/users': Users,
		'/admin/shop': ShoppingBag,
		'/admin/orders': Package,
		'/admin/projects': FolderOpen,
		'/admin/audit': ScrollText,
	};
</script>

<div class="drawer lg:drawer-open bg-base-200 min-h-screen">
	<input id="admin-drawer" type="checkbox" class="drawer-toggle" />

	<div class="drawer-content flex flex-col">
		<!-- Mobile navbar -->
		<div class="navbar bg-base-100 border-base-300 border-b lg:hidden">
			<div class="flex-none">
				<label for="admin-drawer" class="btn btn-ghost btn-sm">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						class="inline-block h-5 w-5 stroke-current"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						></path>
					</svg>
				</label>
			</div>
			<div class="flex-1 px-2">
				<span class="text-sm font-semibold">Remixed Admin</span>
			</div>
		</div>

		<!-- Page content -->
		<main class="flex-1 p-6">
			{@render children()}
		</main>
	</div>

	<!-- Sidebar -->
	<div class="drawer-side z-20">
		<label for="admin-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
		<aside
			class="bg-base-100 border-base-300 flex min-h-screen w-52 flex-col rounded-r-2xl border-r"
		>
			<!-- Navigation -->
			<nav class="flex-1 p-2 pt-3">
				<ul class="menu gap-0.5 p-0">
					<li>
						<a href="/admin" class:menu-active={page.url.pathname === '/admin'}>
							<LayoutDashboard size={17} />
							Overview
						</a>
					</li>
					{#each data.adminLinks as link}
						{@const Icon = ROUTE_ICONS[link.href]}
						<li>
							<a href={link.href} class:menu-active={isActive(link.href)}>
								{#if Icon}
									<Icon size={17} />
								{/if}
								{link.title}
							</a>
						</li>
					{/each}
				</ul>
			</nav>

			<!-- Footer -->
			<div class="border-base-300 border-t p-3">
				<a href="/" class="btn btn-ghost btn-sm btn-block justify-start gap-2 text-xs font-normal">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						class="h-4 w-4 shrink-0"
					>
						<path
							fill-rule="evenodd"
							d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
							clip-rule="evenodd"
						/>
					</svg>
					Back to site
				</a>
			</div>
		</aside>
	</div>
</div>
