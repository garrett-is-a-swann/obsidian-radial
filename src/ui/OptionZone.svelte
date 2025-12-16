<script lang="ts">
import type { Action } from "types/Action";
import type { ActionGroup } from "types/ActionGroup";
import type { Position } from "types/Position";
import { isAction } from "utils/type/isAction";
import { isActionGroup } from "utils/type/isActionGroup";


interface Props {
    action: Action;
    index: number,
    numSlices: number
    performAction: (_action: Action | ActionGroup, pos: Position) => void,
    commands: { [key: string]: any }; // TODO(Garrett): Use obsidian-typings for type info.
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
    index,
    numSlices,
    performAction,
    commands,
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


function polar(angle: number, radius: number, offset: number = 0): [number, number] {
  return [
    offset + centerX + radius * Math.cos(angle),
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

function deg(rad) {
    return Math.floor(rad * 180 / Math.PI);
}

const centerX = 50;
const centerY = 50;

const deadzoneRadiusPct = 50 - 30;
const ARC_STEPS = $derived(Math.floor(31 / numSlices) + 1);
const OUTER_ARC_STEPS = $derived(Math.floor(19 / numSlices) + 1);
const R = 50; // outer radius

const angle = $derived(rotationAngle - offsetAngle);
const outerCicle = Array.from({ length: 32 + 1 }, (_, i) => {
    const t = lerp(-Math.PI * .3, Math.PI * .3, i / 32);
    return polar(t, R,);
});
const innerCicle = Array.from({ length: 32 + 1 }, (_, i) => {
    const t = lerp(Math.PI * .4, -Math.PI * .4, i / 32);
    return polar(t, deadzoneRadiusPct);
});

const polygon = $derived.by(() => {
    const unit = "%";
    if (numSlices === 1) {
        console.log("only 1");
        const arcPath = [
            ...outerCicle,
            ...innerCicle,
        ]
        const polygon = `polygon(${arcPath.map(([x, y])=> `${Math.abs(x)}${unit} ${Math.abs(y)}${unit}`).join(", ")})`
        return polygon;
    }
    const borderWidth = 1 * Math.PI / 180
    const aLo = -regionAngle / 2;
    const aHi = aLo + regionAngle - borderWidth;
    const steps = isAction(action)? ARC_STEPS: 1
    const arcPath: [number, number][] = [
        // Outer
        ...Array.from({ length: OUTER_ARC_STEPS + 1 }, (_, i) => {
            const t = lerp(aLo, aHi, i / OUTER_ARC_STEPS);
            return polar(t, R,);
        }),
        // Inset
        ...Array.from({ length: steps + 1 }, (_, i) => {
            const t = lerp(aHi, aLo, i / steps);
            return polar(t, deadzoneRadiusPct);
        }),
    ];
    const polygon = `polygon(${arcPath.map(([x, y])=> `${Math.abs(x)}${unit} ${Math.abs(y)}${unit}`).join(", ")})`
    return polygon
});

const tryAction = $derived(() => {
    if (!dragging) 
        return;
    const shiftRadius = (deadzoneRadiusPct/50) * +modalWidth.slice(0, -2) / 2;
    const position = {
        x: Math.cos(angle) * shiftRadius,
        y: Math.sin(angle) * shiftRadius,
    };
    performAction(action, position)
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
    style:--interactive-normal={action.color}
    style:--interactive-hover={action.color? `color-mix(in oklab, ${action.color} 90%, white)`: undefined}
    style:width={modalWidth}
    style:height={modalWidth}
    style:rotate={(angle) * 180 / Math.PI}deg
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
.radial-item-detail {
    position: relative;
}
</style>
