<script lang="ts">
	let { img, h2, h1, class: className } = $props();
</script>

<div
	class="{className} relative w-50 rounded-2xl bg-linear-to-br from-secondary to-[#53C1D7] p-1 shadow-xl"
>
	<div class="flex flex-col justify-center rounded-xl bg-text p-4">
		<img src={img} alt="crunch" class="origin-bottom scale-140" />
		<div class="text-md relative flex justify-center text-center font-jua">
			<h2 class="text-stroke bg-light">{h2}</h2>
			<h2 class="text-dark-gradient absolute top-0 p-1">{h2}</h2>
		</div>
		<div class="relative flex justify-center text-center font-jua text-2xl">
			<h1 class="text-stroke bg-light">{h1}</h1>
			<h1 class="text-dark-gradient absolute top-0 p-1">{h1}</h1>
		</div>
	</div>
</div>
