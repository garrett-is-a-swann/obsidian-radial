<script lang="ts">
import type { Action } from 'types/Action';
import type { ActionGroup } from 'types/ActionGroup';
interface Props {
	actions: ActionGroup,
	parent: HTMLElement,
};
const { actions, parent } = $props();

let width = $state();
let height = $state();

const buttonRadius = 50;

const actionStack = $derived([ ...actions.items ]);

</script>

<div class="radial-wrapper" bind:clientWidth={width} bind:clientHeight={height}>
	<div>
		<p>{width}, {height}</p>
		<p>/ 2 = {width / 2}, {height / 2}</p>
	</div>

	{#each actionStack as action, index}
		{@const centerX = width / 2}
		{@const centerY = height / 2}
		{@const angleIncrement = (2 * Math.PI) / actions.items.length}
		{@const currentAngle = index * angleIncrement}
		{@const ratioY = Math.cos(currentAngle)}
		{@const ratioX = Math.sin(currentAngle)}
		{#if true}
			<div 
				class='radial-item'
				style:border-radius={action?.items ?? `${buttonRadius / 2}px`}
				style:width='{buttonRadius}px'
				style:height='{buttonRadius}px'
				style:top  ="{(1-ratioY) * centerY - (buttonRadius / 2)}px"
				style:right="{(1-ratioX) * centerX - (buttonRadius / 2)}px">
				{#if action.items === undefined}
					{action.substr(0, 5)}
				{:else}
					{action.name.substr(0, 5)}
				{/if}
			</div>
		{/if}
	{/each}
</div>

<style>
.radial-wrapper {
	/* Width/Height control the "padding" of the radial menu -- top/right computed based on clientWidth*/
	width: 90%;
	height: 90%;

	display: flex;
	justify-content: center;
	align-items: center;

	position: relative;
	> .radial-item {
		position: absolute;

		display: flex;
		justify-content: center;
		align-items: center;

		border: 1px solid white;
	}
}

</style>
