<script lang="ts">
	import { formatHours } from '$lib';
	import Sidebar from '$lib/Sidebar.svelte';

	let { data } = $props();
</script>

<Sidebar />
<div class="pt-10 pr-10 pl-40">
	<table class="w-full">
		<thead class="font-gothic">
			<tr>
				<th>ID</th>
				<th>User</th>
				<th>Title</th>
				<th>GitHub</th>
				<th>Demo</th>
				<th>Time</th>
			</tr>
		</thead>
		<tbody class="font-zcool">
			{#each data.ships as shipInfo}
				<tr>
					<td>{shipInfo.ship.projectId}</td>
					<td>
						<a href="/user/{shipInfo.user.id}">
							{shipInfo.user.username}
						</a>
					</td>
					<td class="">
						<a href="/projects/{shipInfo.project.id}">
							{shipInfo.project.title}
						</a>
					</td>
					<td>
						<a href={shipInfo.project.githubUrl} target="_blank" rel="noopener noreferrer">
							Github
						</a>
					</td>
					<td>
						<a href={shipInfo.project.demoUrl} target="_blank" rel="noopener noreferrer"> Demo </a>
					</td>
					<td title={shipInfo.project.hackatimeProjects}>
						{formatHours(shipInfo.ship.seconds)}
					</td>
					<td>
						<button class="cursor-pointer bg-green-500 px-4 text-white">Accept</button>
						<button class="cursor-pointer bg-primary px-4 text-white">Reject</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	td {
		border: 2px solid black;
		padding: 4px 8px;
	}
	a {
		text-decoration: underline;
	}
</style>
