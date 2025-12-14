<script lang="ts">
    import { App, MarkdownView } from "obsidian";
    import type { Action } from "types/Action";
    import type { ActionGroup } from "types/ActionGroup";
    import { isAction } from "utils/type/isAction";
    import { isActionGroup } from "utils/type/isActionGroup";
    import type { Position } from "types/Position";

    interface Props {
        actions: ActionGroup;
        parent: HTMLElement;
        app: App;
        // eslint-disable-next-line
        commands: { [key: string]: any }; // TODO(Garrett): Use obsidian-typings for type info.
        closeMenu: () => void;
        setTarget?: (offset: Position) => void;
    }

    interface StackState {
        actions: ActionGroup;
        rotationRadians: number;
        // Used if Radial Targeting is enabled.
        menuOffset: Position;
    }

    const {
        actions,
        parent: _parent,
        app,
        commands,
        closeMenu,
        setTarget,
    }: Props = $props();

    let width: number = $state(0);
    let height: number = $state(0);
    let buttonDiameter: number = $state(0);
    let radialWrapper: HTMLElement = $state() as HTMLElement;
    const stateStack: StackState[] = $state([
        {
            get actions() {
                return actions;
            },
            // Initial rotation so that menu unrolls from the top, like a clock.
            rotationRadians: Math.PI * 0.5,
            menuOffset: { x: 0, y: 0 },
        },
    ]);

    const stack = {
        top<T>(stack: T[]): T {
            return stack[stack.length - 1];
        },
    };

    const buttonState = $state({
        dragging: false,
        offset: stack.top(stateStack).menuOffset,
    });

    const performAction = (
        action: Action | ActionGroup,
        position: Position,
    ) => {
        if (isAction(action)) {
            const commandId = (action as Action).id;
            if (commandId.startsWith("psuedo-element")) {
                switch (commandId) {
                    case "psuedo-element:back":
                        // "Back" psuedo-element, should pop instead.
                        stateStack.pop();
                        if (setTarget) {
                            setTarget(stack.top(stateStack).menuOffset);
                        }
                        break;
                    default:
                        throw new Error(
                            "Radial Error - Unexpected Psuedo-element: " +
                                commandId,
                        );
                }
            } else {
                const command = commands[commandId];
                if (!command) {
                    // TODO(Garrett): Colorization/Pre-Verification commands are functional.
                    console.error("Unknown command:", command);
                }
                if (command.callback) {
                    command.callback();
                } else if (command.checkCallback) {
                    command.checkCallback(false);
                } else if (command.editorCheckCallback) {
                    command.editorCheckCallback(
                        false,
                        app.workspace.activeEditor,
                        app.workspace.getActiveViewOfType(MarkdownView),
                    );
                }
                closeMenu();
                return;
            }
        } else {
            const { items, ...rest } = action as ActionGroup;
            const nextState = {
                rotationRadians: stack.top(stateStack).rotationRadians,
                menuOffset: { x: 0, y: 0 },
                actions: {
                    ...rest,
                    items: [
                        {
                            id: "psuedo-element:back",
                            name: "Back",
                        },
                        ...items,
                    ],
                },
            };

            const rads = Math.atan2(-position.y, position.x);
            nextState.rotationRadians = rads + Math.PI;

            if (setTarget) {
                const currentOffset = stack.top(stateStack).menuOffset;
                nextState.menuOffset = {
                    x: currentOffset.x + position.x,
                    y: currentOffset.y + position.y,
                };

                setTarget(nextState.menuOffset);
            }
            stateStack.push(nextState);
        }
        if (!setTarget) {
            buttonState.dragging = false;
        }
        buttonState.offset = { x: 0, y: 0 };
    };
</script>

<div
    role="menu"
    tabindex="-1"
    class="radial-wrapper"
    bind:this={radialWrapper}
    bind:clientWidth={width}
    bind:clientHeight={height}
    onmouseenter={(event) => {
        if (buttonState.dragging) {
            const modal = radialWrapper.parentElement!.parentElement!;
            const modalStyle = getComputedStyle(modal);
            const radialBox = modal.getBoundingClientRect();
            buttonState.offset = {
                x:
                    event.clientX -
                    radialBox.left -
                    parseFloat(modalStyle.width) / 2,
                y:
                    event.clientY -
                    radialBox.top -
                    parseFloat(modalStyle.height) / 2,
            };
        }
    }}
    onmouseleave={(_event) => {
        if (buttonState.dragging) {
            buttonState.offset = {
                x: 0,
                y: 0,
            };
            buttonState.dragging = false;
        }
    }}
>
    <button
        aria-label="radial-draggable-button"
        data-tooltip-classes="go-away"
        role="menuitem"
        bind:clientWidth={buttonDiameter}
        style:border-radius="{buttonDiameter / 2}px"
        style:left="{width / 2 - buttonDiameter / 2 + buttonState.offset.x}px"
        style:top="{height / 2 - buttonDiameter / 2 + buttonState.offset.y}px"
        onmousedown={() => (buttonState.dragging = true)}
        onmousemove={(event) => {
            if (buttonState.dragging) {
                let next = {
                    x:
                        buttonState.offset.x +
                        event.offsetX -
                        buttonDiameter / 2,
                    y:
                        buttonState.offset.y +
                        event.offsetY -
                        buttonDiameter / 2,
                };

                const modal = radialWrapper.parentElement!.parentElement!;
                // boundary detection
                const modalRadius =
                    parseFloat(getComputedStyle(modal).width) / 2;
                const distance = Math.sqrt(next.x * next.x + next.y * next.y);
                if (distance + buttonDiameter / 2 > modalRadius) {
                    const shift = distance - modalRadius + buttonDiameter / 2;
                    const angle = Math.atan2(next.y, next.x);
                    const shiftX =
                        Math.cos(angle) * shift * (next.x > 0 ? -1 : 1);
                    const shiftY =
                        Math.sin(angle) * shift * (next.x > 0 ? -1 : 1);
                    next.x += shiftX;
                    next.y += shiftY;
                }
                buttonState.offset = next;
            }
        }}
        onclick={() => {
            buttonState.dragging = false;
            // if Click is more-or-less in the center...
            if (
                Math.abs(buttonState.offset.x) <= buttonDiameter / 2 &&
                Math.abs(buttonState.offset.y) <= buttonDiameter / 2
            ) {
                if (stateStack.length === 1) {
                    closeMenu();
                    return;
                }
                stateStack.pop();
            }
            buttonState.offset = { x: 0, y: 0 };
        }}
    >
    </button>
    {#each stack.top(stateStack).actions.items as action, index (`${action}-${index}`)}
        {@const centerX = width / 2}
        {@const centerY = height / 2}
        {@const angleIncrement =
            -(2 * Math.PI) / stack.top(stateStack).actions.items.length}
        {@const currentAngle =
            index * angleIncrement + stack.top(stateStack).rotationRadians}
        {@const ratioX = Math.cos(currentAngle)}
        {@const ratioY = Math.sin(currentAngle)}
        {@const posX = (1 - ratioX) * centerX}
        {@const posY = (1 - ratioY) * centerY}
        {@const offsetX = width / 2 - posX}
        {@const offsetY = -(height / 2 - posY)}
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
            style:border-radius={isAction(action)?.id &&
            isAction(action)?.id !== "psuedo-element:back"
                ? `${buttonDiameter / 2}px`
                : undefined}
            style:width="{buttonDiameter}px"
            style:height="{buttonDiameter}px"
            style:top="{posY - buttonDiameter / 2}px"
            style:right="{posX - buttonDiameter / 2}px"
            onmousemove={() =>
                buttonState.dragging &&
                performAction(action, { x: offsetX, y: offsetY })}
            onclick={() => performAction(action, { x: offsetX, y: offsetY })}
        >
            <span class="radial-item-body">
                {action.name?.slice(0, 5) ?? "Unknown"}
            </span>
        </button>
    {/each}
</div>

<style>
    .radial-wrapper {
        /* Width/Height control the "padding" of the radial menu -- top/right computed based on clientWidth */
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
                background: red;
                > .radial-item-body {
                    rotate: -45deg;
                }
            }
        }

        > button {
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
    }
</style>
