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

    $effect(() => console.log(diameter)
    )

    function handleMove(x, y) {
        if (!dragging) {
            return;
        }
        let next = {
            x:
            offset.x +
                event.offsetX -
                diameter / 2,
            y:
            offset.y +
                event.offsetY -
                diameter / 2,
        };

        const modal = radialWrapper.parentElement!.parentElement!;
        // boundary detection
        const modalRadius =
            parseFloat(getComputedStyle(modal).width) / 2;
        const distance = Math.sqrt(next.x * next.x + next.y * next.y);
        if (distance + diameter / 2 > modalRadius) {
            const shift = distance - modalRadius + diameter / 2;
            const angle = Math.atan2(next.y, next.x);
            const shiftX =
                Math.cos(angle) * shift * (next.x > 0 ? -1 : 1);
            const shiftY =
                Math.sin(angle) * shift * (next.x > 0 ? -1 : 1);
            next.x += shiftX;
            next.y += shiftY;
        }
        offset = next;

    }

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
    touchstart={() => setDrag(true)}
    touchmove={(event) => handleMove(event.originalEvent.touches[0].screenX, event.originalEvent.touches[0].screenY)}
    onmousemove={(event) => handleMove(event.x, event.y)}
    onclick={() => {
        setDrag(false);
        // if Click is more-or-less in the center...
        if (
            Math.abs(offset.x) <= diameter / 2 &&
            Math.abs(offset.y) <= diameter / 2
        ) {
            if (stateStack.length === 1) {
                closeMenu();
                return;
            }
            stateStack.pop();
        }
        offset = { x: 0, y: 0 };
    }}
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
