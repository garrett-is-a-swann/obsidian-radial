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
        commands: { [key: string]: { id: string; name: string; icon: string } }; // TODO(Garrett): Use obsidian-typings for type info.
        modalWidth: number;
        offsetAngle: number;
        rotationAngle: number;
        regionAngle: number;
        dragging: boolean;
        zoneBorderDegrees?: number;
        deadzoneRadiusPct?: number;
        actionInsetOffsetPct?: number;
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
        zoneBorderDegrees = 1,
        deadzoneRadiusPct = 20,
        actionInsetOffsetPct = 3,
    }: Props = $props();

    function polar(
        angle: number,
        radius: number,
        { x, y }: Position = center,
    ): [number, number] {
        return [x + radius * Math.cos(angle), y + radius * Math.sin(angle)];
    }
    function lerp(a: number, b: number, t: number) {
        return a + (b - a) * t;
    }

    function isActionish(action: Action | ActionGroup): boolean {
        if (isActionGroup(action)) {
            return false;
        }
        const actionId = isAction(action)?.id;
        return Boolean(actionId && actionId != "psuedo-element:back");
    }

    const center: Position = { x: 50, y: 50 };
    const angle = $derived(rotationAngle - offsetAngle);
    const shiftRadius = $derived(((deadzoneRadiusPct / 50) * modalWidth) / 2);
    const nextCenterOffset = $derived({
        x: Math.cos(angle),
        y: Math.sin(angle),
    });

    const ARC_STEPS = $derived(Math.floor(31 / numSlices) + 1);
    const OUTER_ARC_STEPS = $derived(Math.floor(31 / numSlices) + 1);
    const R = 50; // outer radius
    const iconPositionPct = 6;

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
        const borderWidth = (zoneBorderDegrees * Math.PI) / 180;
        const aLo = borderWidth / 2 - regionAngle / 2;
        const aHi = aLo + regionAngle - borderWidth;
        const steps = isActionish(action) ? ARC_STEPS : 2;
        const arcPath: [number, number][] = [
            // Outer
            ...Array.from({ length: OUTER_ARC_STEPS + 1 }, (_, i) => {
                const t = lerp(aLo, aHi, i / OUTER_ARC_STEPS);
                return polar(t, R);
            }),
            // Inset
            ...Array.from({ length: steps + 1 }, (_, i) => {
                const t = lerp(aHi, aLo, i / steps);
                return polar(t, 50 - actionRadius);
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

    const actionRadius = $derived(
        50 -
            deadzoneRadiusPct -
            (isActionish(action)
                ? actionInsetOffsetPct
                : isAction(action)?.id === "psuedo-element:back"
                  ? -actionInsetOffsetPct
                  : 0),
    );
    const actionId = $derived(isAction(action)?.id);
    const commandData = $derived(actionId ? commands[actionId] : undefined);
    const iconName = $derived(action.icon || commandData?.icon);
    // TODO(Garrett): Decide between "aperture" and "circle-arrow-out-up-right" for action groups.
    const iconSVG = $derived(
        getIcon(
            iconName ??
                (actionId
                    ? "badge-question-mark"
                    : "circle-arrow-out-up-right"),
        ),
    );
</script>

<div
    class="radial-item-wrapper"
    data-action-index={index}
    data-next-target-x={nextCenterOffset.x * shiftRadius}
    data-next-target-y={nextCenterOffset.y * shiftRadius}
    style:--radial-deadzone-radius="{deadzoneRadiusPct}%"
    style:--radial-action-radius="{actionRadius}%"
    style:--radial-action-color={action.color ?? "var(--interactive-normal)"}
>
    <button
        class={[
            "radial-item",
            {
                "radial-item-action": isActionish(action),
                "radial-items-group": !isActionish(action),
                "radial-items-pop":
                    isAction(action)?.id === "psuedo-element:back",
            },
        ]}
        aria-label="radial-item-detail"
        role="menuitem"
        tabindex="0"
        style:width="{modalWidth}px"
        style:height="{modalWidth}px"
        style:rotate="{(angle * 180) / Math.PI}deg"
        style:clip-path={polygon}
        style:box-shadow="{0.75 * modalWidth}px 0 {0.15 * modalWidth}px 0px
        inset color-mix(in srgb, var(--radial-action-color, transparent) 60%,
        transparent)"
        onclick={() => tryAction(true)}
    >
    </button>

    <div class="radial-item-border-wrapper">
        <div
            class="radial-item-border-leading"
            style:rotate="{((angle - regionAngle / 2) * 180) / Math.PI +
                zoneBorderDegrees / 2}deg"
        >
            <div class="radial-item-border"></div>
        </div>
        <div
            class="radial-item-border-trailing"
            style:rotate="{((angle + regionAngle / 2) * 180) / Math.PI -
                zoneBorderDegrees / 2}deg"
        >
            <div class="radial-item-border"></div>
        </div>
    </div>

    <div class="radial-item-detail" id="radial-item-detail">
        <div
            class="radial-item-detail-icon"
            style:left="{(deadzoneRadiusPct + iconPositionPct) *
                Math.cos(angle) +
                50}%"
            style:top="{(deadzoneRadiusPct + iconPositionPct) *
                Math.sin(angle) +
                50}%"
        >
            {#if iconSVG}
                <svg
                    class="svg-icon {iconName}"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                    {@html iconSVG.getHTML()}
                </svg>
            {/if}
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
            {action.name || commandData?.name}
        </span>
    </div>
</div>

<style>
    .radial-item-wrapper {
        --interactive-hover: color-mix(
            in oklab,
            var(--radial-action-color) 85%,
            white
        );
        > .radial-item {
            position: absolute;

            &.radial-items-pop {
                /* Ideally this is user-customizable, so doing this here
                 * rather than colorizing the psuedo-element action directly. */
                --radial-action-color: red;
                --interactive-hover: color-mix(
                    in oklab,
                    var(--radial-action-color) 85%,
                    white
                );
            }
            &.radial-items-group {
                &:hover {
                    background: var(--interactive-hover);
                }
                background: var(--radial-action-color);
            }
        }
        > .radial-item-border-wrapper {
            pointer-events: none;
            > .radial-item-border-leading,
            .radial-item-border-trailing {
                position: absolute;
                width: 100%;
                aspect-ratio: 1/1;
                display: flex;
                justify-content: center;
                align-items: center;
                > .radial-item-border {
                    right: 0;
                    position: absolute;
                    background: var(--radial-action-border-color, gray);
                    width: var(--radial-action-radius);
                }
            }
        }
        > button:not(.radial-items-group) + .radial-item-border-wrapper {
            > .radial-item-border-leading > .radial-item-border {
                box-shadow: 0px 5px 5px 0px
                    hsl(from var(--radial-action-color) h s calc(l - 3)) inset;
                height: 10px;
                background: transparent;
                transform: translateY(5px);
            }
            > .radial-item-border-trailing > .radial-item-border {
                box-shadow: 0px -5px 5px 0px hsl(
                        from var(--radial-action-color) h s calc(l - 3)
                    ) inset;
                height: 10px;
                background: transparent;
                transform: translateY(-5px);
            }
        }
        > .radial-item-detail {
            pointer-events: none;
            > * {
                position: absolute;
                transform: translate(-50%, -50%);
            }
            > .radial-item-detail-body {
                text-align: center;
                font-size: small;
                width: 25%;
            }
        }
    }
</style>
