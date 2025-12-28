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
        modalContainer: HTMLElement;
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
        modalContainer,
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
                            name: `Back (${stack.top(stateStack).actions.name})`,
                            icon: "undo-2",
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
            buttonState.offset = { x: 0, y: 0 };
        }
    };

    function handleMove(x: number, y: number) {
        if (!buttonState.dragging) {
            return;
        }
        buttonState.offset.x += x;
        buttonState.offset.y += y;
    }

    function handleCursorPosition({
        clientX,
        clientY,
    }: {
        clientX: number;
        clientY: number;
    }) {
        if (!buttonState.dragging) {
            return;
        }
        let targetElement = document.elementFromPoint(clientX, clientY);

        while (targetElement && targetElement != radialWrapper) {
            if (
                targetElement &&
                targetElement.hasAttribute("data-action-index")
            ) {
                const actionIndex: number =
                    +targetElement.getAttribute("data-action-index")!;
                performAction(
                    stack.top(stateStack).actions.items[actionIndex],
                    {
                        x: +targetElement.getAttribute("data-next-target-x")!,
                        y: +targetElement.getAttribute("data-next-target-y")!,
                    },
                );
            }

            targetElement = targetElement.parentElement;

            if (
                targetElement ==
                // the fullscreen semi-transparent modal background.
                modalContainer.parentElement
            ) {
                closeMenu();
                return;
            }
        }

        const rect = radialWrapper.getBoundingClientRect();

        // Calculate the center X and Y coordinates (relative to the viewport)
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        handleMove(
            clientX - centerX - buttonState.offset.x,
            clientY - centerY - buttonState.offset.y,
        );
    }
</script>

<div
    class="radial-wrapper"
    role="menu"
    tabindex="-1"
    bind:this={radialWrapper}
    bind:clientWidth={width}
    bind:clientHeight={height}
    onmouseenter={(event) => {
        if (buttonState.dragging) {
            const modalStyle = getComputedStyle(modalContainer);
            const radialBox = modalContainer.getBoundingClientRect();
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
        handleCursorPosition(event.changedTouches[0]);
    }}
    onmousemove={(event) => handleCursorPosition(event)}
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
            buttonState.dragging = drag;
        }}
        offset={buttonState.offset}
        text={stack.top(stateStack).actions.name}
    />

    {#each stack.top(stateStack).actions.items as action, index (`${action}-${index}`)}
        {@const numSlices = stack.top(stateStack).actions.items.length}
        {@const angleIncrement = (2 * Math.PI) / numSlices}
        {@const currentAngle = index * angleIncrement}
        <OptionZone
            {action}
            {index}
            {performAction}
            {numSlices}
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
        width: 100%;
        height: 100%;

        position: relative;
    }
</style>
