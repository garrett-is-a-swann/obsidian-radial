<script lang="ts">
    import type { Action } from "types/Action";
    import type { ActionGroup } from "types/ActionGroup";
    import type { Position } from "types/Position";

    import { getIcon } from "obsidian";

    import { isAction } from "utils/type/isAction";
    import { isActionGroup } from "utils/type/isActionGroup";

    interface Props {
        action: Action | ActionGroup;
        index: number;
        numSlices: number;
        performAction: (_action: Action | ActionGroup, pos: Position) => void;
        // ts-ignore @typescript-eslint/no-explicit-any
        commands: { [key: string]: string }; // TODO(Garrett): Use obsidian-typings for type info.
        modalWidth: number;
        offsetAngle: number;
        rotationAngle: number;
        regionAngle: number;
        dragging: boolean;
    }

    const {
        action,
        index,
        numSlices,
        performAction,
        commands,
        modalWidth,
        offsetAngle,
        rotationAngle,
        regionAngle,
        dragging,
    }: Props = $props();

    function polar(
        angle: number,
        radius: number,
        { x, y }: Position = center,
        offset: number = 0,
    ): [number, number] {
        return [
            offset + x + radius * Math.cos(angle),
            y + radius * Math.sin(angle),
        ];
    }
    function lerp(a: number, b: number, t: number) {
        return a + (b - a) * t;
    }

    const center: Position = { x: 50, y: 50 };
    const deadzoneRadiusPct = 50 - 30;
    const angle = $derived(rotationAngle - offsetAngle);
    const modalWidthPx = $derived(modalWidth);
    const shiftRadius = $derived(((deadzoneRadiusPct / 50) * modalWidthPx) / 2);
    const nextCenterOffset = $derived({
        x: Math.cos(angle),
        y: Math.sin(angle),
    });

    const ARC_STEPS = $derived(Math.floor(31 / numSlices) + 1);
    const OUTER_ARC_STEPS = $derived(Math.floor(31 / numSlices) + 1);
    const R = 50; // outer radius
    const iconPositionPct = 4;

    // TODO(Garrett): Determine maximum _minimum_ -- ie, what's the biggest space an option zone can take up
    //     when there are only a single or small number of option zones to draw, so that user doesn't accidentally
    //     drag thru multiple options.
    //     This is a good start, but not perfect:
    const outerCicle = Array.from({ length: 64 + 1 }, (_, i) => {
        const t = lerp(2 * Math.PI, 0, i / 64);
        return polar(t, R);
    });
    const innerCicle = Array.from({ length: 64 + 1 }, (_, i) => {
        const t = lerp(0, 2 * Math.PI, i / 64);
        return polar(t, deadzoneRadiusPct);
    });

    const polygon = $derived.by(() => {
        const unit = "%";
        if (numSlices === 1) {
            const arcPath = [...outerCicle, ...innerCicle];
            const polygon = `polygon(${arcPath.map(([x, y]) => `${Math.abs(x)}${unit} ${Math.abs(y)}${unit}`).join(", ")})`;
            return polygon;
        }
        const borderWidth = (1 * Math.PI) / 180;
        const aLo = -regionAngle / 2;
        const aHi = aLo + regionAngle - borderWidth;
        const steps =
            isAction(action)?.id != "psuedo-element:back" ? ARC_STEPS : 2;
        const arcPath: [number, number][] = [
            // Outer
            ...Array.from({ length: OUTER_ARC_STEPS + 1 }, (_, i) => {
                const t = lerp(aLo, aHi, i / OUTER_ARC_STEPS);
                return polar(t, R);
            }),
            // Inset
            ...Array.from({ length: steps + 1 }, (_, i) => {
                const t = lerp(aHi, aLo, i / steps);
                return polar(t, deadzoneRadiusPct);
            }),
        ];
        const polygon = `polygon(${arcPath.map(([x, y]) => `${Math.abs(x)}${unit} ${Math.abs(y)}${unit}`).join(", ")})`;
        return polygon;
    });

    const tryAction = $derived((clicked: boolean = false) => {
        if (!dragging && !clicked) return;
        performAction(action, {
            x: nextCenterOffset.x * shiftRadius,
            y: nextCenterOffset.y * shiftRadius,
        });
    });

    const iconName = $derived(
        (action.icon && commands[action.icon]?.icon) ||
            commands[action.id]?.icon,
    );
    const icon = $derived(getIcon(iconName ?? "aperture"));
</script>

<div
    class="radial-item-wrapper"
    data-action-index={index}
    data-next-target-x={nextCenterOffset.x * shiftRadius}
    data-next-target-y={nextCenterOffset.y * shiftRadius}
>
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
        style:--interactive-hover={action.color
            ? `color-mix(in oklab, ${action.color} 90%, white)`
            : undefined}
        style:width="{modalWidth}px"
        style:height="{modalWidth}px"
        style:rotate="{(angle * 180) / Math.PI}deg"
        style:clip-path={polygon}
        style:box-shadow="{0.75 * modalWidthPx}px 0 {0.15 * modalWidthPx}px 0px
        inset color-mix(in srgb, {action.color ?? 'transparent'} 60%, transparent)"
        onmousemove={() => tryAction()}
        ontouchmove={() => tryAction()}
        onclick={() => tryAction(true)}
    >
        <span class="radial-item-body">
            {action.name?.slice(0, 5) ?? "Unknown"}
        </span>
    </button>

    <div class="radial-item-detail">
        <div
            class="radial-item-detail-icon"
            style:left="{(deadzoneRadiusPct + iconPositionPct) *
                Math.cos(angle) +
                50}%"
            style:top="{(deadzoneRadiusPct + iconPositionPct) *
                Math.sin(angle) +
                50}%"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="svg-icon {iconName}"
            >
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html icon.getHTML()}
            </svg>
        </div>
        <span
            class="radial-item-detail-body"
            style:left="{(deadzoneRadiusPct +
                (center.x + iconPositionPct - deadzoneRadiusPct) / 2) *
                Math.cos(angle) +
                50}%"
            style:top="{(deadzoneRadiusPct +
                (center.y + iconPositionPct - deadzoneRadiusPct) / 2) *
                Math.sin(angle) +
                50}%"
        >
            {action.name}
        </span>
    </div>
</div>

<style>
    .radial-item-wrapper {
        > .radial-item {
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
        > .radial-item-detail {
            > * {
                position: absolute;
                transform: translate(-50%, -50%);
            }
            > .radial-item-detail-body {
                text-align: center;
            }
        }
    }
</style>
