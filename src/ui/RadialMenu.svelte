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

const buttonRadius = 25;

let actionStack = $state([ actions.items ]); // TODO(Garrett): figure out how to: svelte-ignore state_referenced_locally

const buttonState = $state({
	dragging: false,
	offset: {
		x: 0,
		y: 0,
	},
});

$inspect(buttonState);

const performAction = (action)=> {
	if (action.items === undefined) {
		// TODO(Garrett): Do the action.
	}
	else {
		actionStack.push([...action.items])
	}
	buttonState.dragging = false;
	buttonState.offset = {x: 0, y: 0};
}

</script>

<div class="radial-wrapper" bind:clientWidth={width} bind:clientHeight={height}>
	<button 
		aria-label='radial-draggable-button'
		style:width ={buttonRadius * 2}px
		style:height={buttonRadius * 2}px
		style:border-radius={buttonRadius}px
		style:left={(width / 2 - buttonRadius)  + buttonState.offset.x}px
		style:top ={(height / 2 - buttonRadius) + buttonState.offset.y}px
		onmousedown={()=>buttonState.dragging = true}
		onmousemove={(event)=> {
			if (buttonState.dragging) {
				buttonState.offset.x += event.offsetX - buttonRadius;
				buttonState.offset.y += event.offsetY - buttonRadius;

				// TODO(Garrett): boundary detection
			}

		}}
		onclick={()=> {
			buttonState.dragging = false
			if (Math.abs(buttonState.offset.x) <= buttonRadius && Math.abs(buttonState.offset.y) <= buttonRadius) {
				if (actionStack.length === 1) {
					// TODO(Garrett): Close the modal.
					return;
				}
				actionStack.pop();
			}
			buttonState.offset = {x: 0, y: 0};
		}}>
	</button>
	{#each actionStack[actionStack.length - 1] as action, index (action)}
		{@const centerX = width / 2}
		{@const centerY = height / 2}
		{@const angleIncrement = (2 * Math.PI) / actionStack[actionStack.length - 1].length}
		{@const currentAngle = index * angleIncrement}
		{@const ratioY = Math.cos(currentAngle)}
		{@const ratioX = Math.sin(currentAngle)}
		<button 
			class='radial-item'
			style:border-radius={action?.items ?? `${buttonRadius}px`}
			style:width='{buttonRadius * 2}px'
			style:height='{buttonRadius * 2}px'
			style:top  ="{(1-ratioY) * centerY - (buttonRadius)}px"
			style:right="{(1-ratioX) * centerX - (buttonRadius)}px"
			onmousemove={()=> buttonState.dragging && performAction(action)}
			onclick={() => performAction(action)}>
			{#if action.items === undefined}
				{action.substr(0, 5)}
			{:else}
				{action.name.substr(0, 5)}
			{/if}
		</button>
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

		border: 1px solid var(--color-accent);
	}

	> button {
		border: 1px solid var(--color-accent);
		position: absolute;
	}

}

</style>
