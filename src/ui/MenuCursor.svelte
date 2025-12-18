<script lang="ts">
    import type { Position } from "types/Position";

    interface Props {
        diameter: number;
        modalWidth: number,
        modalHeight: number,
        dragging: boolean,
        setDrag: (boolean) => void,
        offset: Position,
        radialWrapper: HTMLElement,
    };

    let {
        diameter,
        modalWidth,
        modalHeight,
        dragging,
        setDrag,
        offset,
        radialWrapper,
    }: Props = $props();

</script>

<button
    aria-label="radial-draggable-button"
    data-tooltip-classes="go-away"
    role="menuitem"
    bind:clientWidth={diameter}
    style:border-radius="{diameter / 2}px"
    style:left="{modalWidth / 2 - diameter / 2 + offset.x}px"
    style:top="{modalHeight / 2 - diameter / 2 + offset.y}px"
    onmousedown={() => setDrag(true)}
    ontouchstart={() => setDrag(true)}
>
</button>

<style>
button {
    border: 1px solid var(--color-accent);
    position: absolute;
    width: var(
        --radial-button-diameter,
        var(--radial-button-diameter-config, 15%)
    );
    height: var(
        --radial-button-diameter,
        var(--radial-button-diameter-config, 15%)
    );
}
</style>
