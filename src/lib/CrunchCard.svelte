<script lang="ts">
	let { img, h2, h1, class: className = '', style: styleName = '' } = $props();
</script>

<div
	style={styleName}
	class="{className} w-max min-w-50 rounded-2xl bg-linear-to-br from-secondary to-[#53C1D7] p-1 shadow-xl"
>
	<div class="flex flex-col justify-center rounded-xl bg-text p-4 pt-20">
		<img src={img} alt="crunch" class="absolute -top-2/3 left-0 w-full origin-bottom" />
		<div class="text-md relative flex justify-center text-center font-jua">
			<h2 class="text-stroke text-stroke-1 bg-light">{h2}</h2>
			<h2 class="text-dark-gradient absolute top-0 p-1">{h2}</h2>
		</div>
		<div class="relative flex justify-center text-center font-jua text-2xl">
			<h1 class="text-stroke text-stroke-1 bg-light">{h1}</h1>
			<h1 class="text-dark-gradient absolute top-0 p-1">{h1}</h1>
		</div>
	</div>
</div>
