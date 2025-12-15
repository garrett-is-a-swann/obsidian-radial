<script lang="ts">
import type { Action } from "types/Action";
import type { ActionGroup } from "types/ActionGroup";
import type { Position } from "types/Position";
import { isAction } from "utils/type/isAction";
import { isActionGroup } from "utils/type/isActionGroup";


interface Props {
    action: Action;
    performAction: (_action: Action | ActionGroup, pos: Position) => void,
    modalWidth: number;
    modalHeight: number;
    offsetAngle: number;
    rotationAngle: number;
    regionAngle: number;
    posX: number;
    posY: number;
    deadzoneDiameter: number;
    dragging: boolean
};

const {
    action,
    performAction,
    modalWidth,
    modalHeight,
    offsetAngle,
    rotationAngle,
    regionAngle,
    posX,
    posY,
    deadzoneDiameter,
    dragging,
} = $props();

const centerX = 50;
const centerY = 50;

// Circle radius as percentage of the square
const outerR = 30;
const ARC_STEPS = 8;

function polar(angle: number, radius: number): [number, number] {
  return [
    centerX + radius * Math.cos(angle),
    centerY + radius * Math.sin(angle),
  ];
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function insetPoint([x, y]: [number, number], t: number): [number, number] {
  return [
    lerp(x, 50, t),
    lerp(y, 50, t),
  ];
}

const R = 75;                 // outer radius
const inset = 0.55;

const polygon = $derived.by(() => {
    const unit = "%";
    const half = regionAngle / 2;
    const a0 = offsetAngle + half;
    const a1 = offsetAngle - half;
    const A = polar(a0, R);
    const B = polar(a1, R);

    const C = insetPoint(B, inset);
    const D = insetPoint(A, inset);
    const arcPath: [number, number][] = [
        A,
        B,
        C,
        D,
        A,
    ];
    const polygon = `polygon(${arcPath.map(([x, y])=> `${Math.abs(x)}${unit} ${Math.abs(y)}${unit}`).join(", ")})`
    console.log(polygon)
    return polygon
});

const tryAction = $derived(() => {
    if (!dragging) 
        return;
    const [x, y] = polar(offsetAngle, R);
    performAction(action, { x, y })
});

</script>

<button
    class={[
        "radial-item",
        {
            "radial-item-action": isAction(action),
            "radial-items-group":
            isActionGroup(action) ||
                isAction(action)?.id === "psuedo-element:back",
            "radial-items-pop":
            isAction(action)?.id === "psuedo-element:back",
        },
    ]}
    role="menuitem"
    tabindex="0"
    style:width={modalWidth}px
    style:height={modalHeight}px
    style:rotate={(rotationAngle - Math.PI * 0.5) * 180 / Math.PI}deg
    style:clip-path={polygon}
    onmousemove={tryAction}
    onclick={() => performAction(action, { x: offsetX, y: offsetY })}
>
    <span class="radial-item-body">
        {action.name?.slice(0, 5) ?? "Unknown"}
    </span>
</button>

<style>
.radial-item {
    position: absolute;

    display: flex;
    justify-content: center;
    align-items: center;

    border: 1px solid var(--color-accent);

    &.radial-items-pop {
        rotate: 45deg;
        background: red;
        > .radial-item-body {
            rotate: -45deg;
        }
    }
}
</style>
