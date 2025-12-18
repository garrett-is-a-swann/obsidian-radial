<script lang="ts">
    import { App, MarkdownView } from "obsidian";
    import type { Action } from "types/Action";
    import type { ActionGroup } from "types/ActionGroup";
    import { isAction } from "utils/type/isAction";
    import type { Position } from "types/Position";

    import MenuCursor from "ui/MenuCursor.svelte";
    import OptionZone from "ui/OptionZone.svelte";

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

    const { actions, parent, app, commands, closeMenu, setTarget }: Props =
        $props();

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
    const modalStyle = $derived(getComputedStyle(parent));
    const stack = {
        top<T>(stack: T[]): T {
            return stack[stack.length - 1];
        },
    };

    const buttonState = $state({
        dragging: false,
        offset: { ...stack.top(stateStack).menuOffset },
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
                buttonState.offset = {
                    x: buttonState.offset.x - position.x,
                    y: buttonState.offset.y - position.y,
                };
            }
            stateStack.push(nextState);
        }
        if (!setTarget) {
            buttonState.dragging = false;
        }
    };

    function handleMove(x: number, y: number) {
        console.log(x, y);
        console.log($state.snapshot(width));
        if (!buttonState.dragging) {
            return;
        }

        // TODO(Garrett): Solve race condition with handleMove overriding
        //     button offset-fixing in performAction causing jumping cursor visual bug.
        buttonState.offset.x += x;
        buttonState.offset.y += y;
    }
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
    ontouchmove={(event: TouchEvent) => {
        console.log(event);

        const touch = event.changedTouches[0];

        const targetElement = document.elementFromPoint(
            touch.clientX,
            touch.clientY,
        );

        if (targetElement && targetElement.hasAttribute("data-action-index")) {
            const actionIndex: number =
                +targetElement.getAttribute("data-action-index")!;
            performAction(stack.top(stateStack).actions.items[actionIndex], {
                x: +targetElement.getAttribute("data-next-target-x")!,
                y: +targetElement.getAttribute("data-next-target-y")!,
            });
        }

        const rect = radialWrapper.getBoundingClientRect();

        // Calculate the center X and Y coordinates (relative to the viewport)
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        handleMove(
            touch.clientX - centerX - buttonState.offset.x,
            touch.clientY - centerY - buttonState.offset.y,
        );
    }}
    onmousemove={(event) => handleMove(event.movementX, event.movementY)}
    ontouchend={() => {
        buttonState.dragging = false;
        buttonState.offset = { x: 0, y: 0 };
    }}
    onclick={() => {
        buttonState.dragging = false;
        buttonState.offset = { x: 0, y: 0 };
    }}
    onkeypress={() => "Implement me!"}
>
    <MenuCursor
        diameter={buttonDiameter}
        modalWidth={width}
        modalHeight={height}
        setDrag={(drag: boolean) => {
            console.log("drag");
            buttonState.dragging = drag;
        }}
        offset={buttonState.offset}
    />

    {#each stack.top(stateStack).actions.items as action, index (`${action}-${index}`)}
        {@const angleIncrement =
            (2 * Math.PI) / stack.top(stateStack).actions.items.length}
        {@const currentAngle = index * angleIncrement}
        <OptionZone
            {action}
            {index}
            {performAction}
            numSlices={stack.top(stateStack).actions.items.length}
            {commands}
            rotationAngle={currentAngle}
            offsetAngle={stack.top(stateStack).rotationRadians}
            regionAngle={angleIncrement}
            modalWidth={width}
            dragging={buttonState.dragging}
        />
    {/each}
</div>

<style>
    .radial-wrapper {
        /* Width/Height control the "padding" of the radial menu -- top/right computed based on clientWidth */
        width: 105%;
        height: 105%;

        display: flex;
        justify-content: center;
        align-items: center;

        position: relative;
    }
</style>
