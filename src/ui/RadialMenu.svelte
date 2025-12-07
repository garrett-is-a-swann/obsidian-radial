<script lang="ts">
import type { App, MarkdownView } from 'obsidian';
import type { Action } from 'types/Action';
import type { ActionGroup } from 'types/ActionGroup';
interface Props {
	actions: ActionGroup,
	parent: HTMLElement,
	app: App,
	commands: any[], // TODO(Garrett): Use obsidian-typings for type info.
	closeMenu: () => void,
	setTarget?: (offset: { x: number, y: number }) => void,
};
const {
	actions,
	parent,
	app,
	commands,
	closeMenu,
	nextAction,
	setTarget,
} = $props();

let width = $state();
let height = $state();
let buttonDiameter = $state();
let radialWrapper = $state();

let actionStack = $state([ actions.items ]); // TODO(Garrett): figure out how to: svelte-ignore state_referenced_locally

const buttonState = $state({
	dragging: false,
	offset: {
		x: 0,
		y: 0,
	},
});

const performAction = (action)=> {
	if (action.items === undefined) {
		const command = commands[action];
		console.log(action);
		if (!command) {
			// TODO(Garrett): Colorization/Pre-Verification commands are functional.
			console.error("Unknown command:", command);
		}
		if (command.callback) {
			command.callback();
		}
		else if (command.checkCallback) {
			command.checkCallback(false);
		}
		else if (command.editorCheckCallback) {
			command.editorCheckCallback(false, app.workspace.activeEditor, app.workspace.getActiveViewOfType<MarkdownView>());
		}
		closeMenu();
		return;
	}
	else {
		if (setTarget) {
			setTarget(buttonState.offset)
		}
		if (action.items === null) {
			// "Back" psuedo-element, should pop instead.
			actionStack.pop();
		}
		else {
			actionStack.push([
				{
					name: "Back",
					items: null,
				},
				...action.items,
			]);
		}
	}
	if (!setTarget) {
		buttonState.dragging = false;
		buttonState.offset = {x: 0, y: 0};
	}
}

</script>

<div 
	role='menu'
	tabindex='-1'
	class="radial-wrapper"
	bind:this={radialWrapper}
	bind:clientWidth={width}
	bind:clientHeight={height}
	onmouseenter={(event)=>{
		if (buttonState.dragging) {
			const modal = radialWrapper.parentElement.parentElement;
			const modalStyle = getComputedStyle(modal);
			const radialBox = modal.getBoundingClientRect();
			buttonState.offset = {
				x: event.clientX - radialBox.left - parseFloat(modalStyle.width) / 2,
				y: event.clientY - radialBox.top - parseFloat(modalStyle.height) / 2,
			};
		}
	}}
	onmouseleave={(event)=> {
		if (buttonState.dragging) {
			buttonState.offset = {
				x: 0,
				y: 0,
			};
			buttonState.dragging = false;
		}
	}}>
	<button 
		aria-label='radial-draggable-button'
		bind:clientWidth={buttonDiameter}
		style:border-radius={buttonDiameter / 2}px
		style:left={(width / 2 - buttonDiameter / 2)  + buttonState.offset.x}px
		style:top ={(height / 2 - buttonDiameter / 2) + buttonState.offset.y}px
		onmousedown={()=>buttonState.dragging = true}
		onmousemove={(event)=> {
			if (buttonState.dragging) {
				let next = {
					x: buttonState.offset.x + event.offsetX - buttonDiameter / 2,
					y: buttonState.offset.y + event.offsetY - buttonDiameter / 2,
				};

				// boundary detection
				const modalRadius = parseFloat(getComputedStyle(radialWrapper.parentElement.parentElement).width) / 2;
				const distance = Math.sqrt(next.x * next.x + next.y * next.y);
				if (distance + (buttonDiameter / 2) > modalRadius) {
					const shift = (distance - modalRadius) + (buttonDiameter/2);
					const angle = Math.atan(next.y / next.x);
					const shiftX = Math.cos(angle) * shift * (next.x > 0? -1: 1);
					const shiftY = Math.sin(angle) * shift * (next.x > 0? -1: 1);
					next.x += shiftX;
					next.y += shiftY;
				}
				buttonState.offset = next;
			}

		}}
		onclick={()=> {
			buttonState.dragging = false
			if (Math.abs(buttonState.offset.x) <= buttonDiameter / 2 && Math.abs(buttonState.offset.y) <= buttonDiameter / 2) {
				if (actionStack.length === 1) {
					// TODO(Garrett): Close the modal.
					return;
				}
				actionStack.pop();
			}
			buttonState.offset = {x: 0, y: 0};
		}}>
		{buttonState.offset.x}, {buttonState.offset.y}
	</button>
	{#each actionStack[actionStack.length - 1] as action, index (action)}
		{@const centerX = width / 2}
		{@const centerY = height / 2}
		{@const angleIncrement = (2 * Math.PI) / actionStack[actionStack.length - 1].length}
		{@const currentAngle = index * angleIncrement}
		{@const ratioY = Math.cos(currentAngle)}
		{@const ratioX = Math.sin(currentAngle)}
		<button 
			class={['radial-item', {'radial-item-action': action.items === undefined, 'radial-items-group': !!action.items, 'radial-items-pop': action.items === null}]}
			role='menuitem'
			tabindex='0'
			style:border-radius={action?.items === undefined && `${buttonDiameter / 2}px`}
			style:width='{buttonDiameter / 2 * 2}px'
			style:height='{buttonDiameter / 2 * 2}px'
			style:top  ="{(1-ratioY) * centerY - (buttonDiameter / 2)}px"
			style:right="{(1-ratioX) * centerX - (buttonDiameter / 2)}px"
			onmousemove={()=> buttonState.dragging && performAction(action)}
			onclick={() => performAction(action)}>
			<span class='radial-item-body'>
				{#if action.items === undefined}
					{action.substr(0, 5)}
				{:else}
					{action.name.substr(0, 5)}
				{/if}
			</span>
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

		&.radial-items-pop {
			rotate: 45deg;
			> .radial-item-body {
				rotate: -45deg;
			}
		}
	}

	> button {
		border: 1px solid var(--color-accent);
		position: absolute;
		width: var(--radial-button-diameter, var(--radial-button-diameter-config, 15%));
		height: var(--radial-button-diameter, var(--radial-button-diameter-config, 15%));
	}

}

</style>
