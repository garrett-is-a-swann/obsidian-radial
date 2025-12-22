<script lang="ts">
    import type { Position } from "types/Position";

    interface Props {
        diameter: number;
        modalWidth: number,
        modalHeight: number,
        setDrag: (boolean) => void,
        offset: Position,
    };

    let {
        diameter,
        modalWidth,
        modalHeight,
        setDrag,
        offset,
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
    aspect-ratio: 1/1;
}
</style>
