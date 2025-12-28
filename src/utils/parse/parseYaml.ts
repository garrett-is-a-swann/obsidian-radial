import { parseYaml as _parseYaml } from 'obsidian';
import type { ActionGroup } from 'types/ActionGroup';
import type { Action } from 'types/Action';
import { isAction } from "utils/type/isAction";
import { isActionGroup } from "utils/type/isActionGroup";

function validateItem(item: Action): Action {
    if (item.id && typeof item.id === 'string') {
        return item;
    }
    console.error("parseYaml Error - Item is invalid: ", item);
    throw new Error("parseYaml Error - Item is invalid: " + item.id);
}

function validateGroup(group: ActionGroup): ActionGroup {
    if (!group.items || typeof group.name !== 'string') {
        console.error("parseYaml Error - Group is missing name: ", group);
        throw new Error("parseYaml Error - Group is missing name");
    }
    if (!group.items || !Array.isArray(group.items) || group.items.length === 0) {
        console.warn("parseYaml Warning - Group is missing items: ", group.name);
    }
    return group;
}

function rename(
    object: Record<string, unknown>,
    from: string,
    to: string
): void {
    if (!(to in object) && from in object) {
        delete Object.assign(object, { [to]: object[from] })[from];
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function updateNames<T>(action: T): void {
    if (!isRecord(action)) return;
    rename(action, "command", "id");
    rename(action, "description", "name");
}

function handleString(value: string, keycode: string | undefined = undefined) {
    // "plugin:action-id", or one of the few commands that don't follow the convention 🙃
    const match = value.match(/(daily-notes|insert-template|insert-current-date|insert-current-time|.*?:\S*)\s*(.*)/);
    if (match) {
        return validateItem({ id: match[1], keycode, name: match[2] });
    }
    throw new Error("Radial::parseYaml - Unknown string item: " + value);
}

function handleObject(item: Record<string, unknown>): Action | ActionGroup {
    function testUseKeycode(item: Record<string, unknown>): boolean {
        if (!isRecord(item)) return false;
        return Boolean((item.name && !item.keycode));
    }
    // some-key: "some-string" | {some-object}
    if (Object.keys(item).length === 1) {
        const [key, value] = Object.entries(item)[0];
        if (Array.isArray(value)) {
            return handleArray(value, { name: key });
        }
        if (typeof value === 'string') {
            // Spacekeys-style short-form action:
            // Ex: 'keycode': "ns:action Name goes here"
            return handleString(value, key);
        }

        if (value === null || value === undefined) {
            // Ex: `ns:action: `
            return handleString(key);
        }

        if (!isRecord(value)) {
            console.error("Radial Error - value type is not a record!", value);
            throw new Error("Radial Error - value type is not a record!")
        }

        updateNames(value);

        if (isActionGroup(value)) {
            if (testUseKeycode(value)) {
                // "keycode": { items, ... }
                return handleItems(isActionGroup(value)!, { keycode: key })
            }
            else {
                // "name": { items, keycode?, ... }
                return handleItems(isActionGroup(value)!, { name: key })
            }
        }
        if (key.match(/.*?:.*/)) {
            // plugin:action-id: {...action-description}
            return validateItem({
                ...value,
                id: key,
                name: (value as { name?: string })?.name,
            });
        }
        if (!isAction(value)) {
            console.error(`parseYaml Error - failed to handle tuple-object: Key=${key} Value=`, value);
            throw new Error(`parseYaml Error - failed to handle tuple-object: Key=${key} Value=${JSON.stringify(value)}`);
        }
        return validateItem({
            ...isAction(value)!,
            ...testUseKeycode(value) ? { keycode: key } : { name: key },
        });
    }
    else {
        updateNames(item);
        if (isActionGroup(item)) {
            return handleItems(isActionGroup(item)!);
        }
        if (isAction(item) === undefined) {
            console.error('parseYaml Error - Object missing id:', item);
            throw new Error(`parseYaml Error - Object missing id: ${JSON.stringify(item)}`);
        }
        return validateItem(isAction(item)!);
    }
}

function handleItem(item: Record<string, unknown>): Action | ActionGroup {
    if (typeof item === "string") {
        return handleString(item);
    }
    if (Array.isArray(item)) {
        return handleArray(item);
    }
    if (isActionGroup(item)) {
        return handleItems(isActionGroup(item)!);
    }
    return handleObject(item);

}

function handleArray(group: unknown[], { name, keycode }: Pick<ActionGroup, "name" | "keycode"> = {}): ActionGroup {
    return validateGroup({
        name,
        keycode,
        items: group.map(handleItem)
    });
}

function handleItems(group: ActionGroup, { name, keycode }: Pick<ActionGroup, "name" | "keycode"> = {}): ActionGroup {
    updateNames(group);
    return validateGroup({
        ...group,
        name: name ?? group.name,
        keycode: keycode,
        items: Object.entries(group.items)
            .map(([key, value]: [string, unknown]) =>
                handleObject({ [key]: value })
            )
    });
}

export function parseYaml(contents: string): ActionGroup {
    // eslint-disable-next-line
    const yaml: any = _parseYaml(contents); // https://docs.obsidian.md/Reference/TypeScript+API/parseYaml
    if (!isRecord(yaml)) {
        throw new Error("Oops");
    }
    const config = isActionGroup(yaml)
        ? handleItems(isActionGroup(yaml)!, { name: "root" })
        : Array.isArray(yaml)
            ? handleArray(yaml, { name: "root" })
            : undefined;
    if (!config) {
        throw new Error("Oops!!");
    }
    return config;
}
