import { parseYaml as _parseYaml } from 'obsidian';
import type { ActionGroup } from 'types/ActionGroup';
import type { Action } from 'types/Action';

function handleItems(group: any, keycode: string | undefined = undefined): ActionGroup | Action {
    return {
        name: group.name ?? group.description,
        keycode: keycode,
        items: Object.keys(group.items).map((key: string): Action | ActionGroup => {
            if (typeof group.items[key] === "string") {
                return {
                    id: group.items[key],
                    keycode: key,
                }
            }
            if (group.items[key].items) {
                return handleItems(group.items[key], key)
            }

            throw new Error("Bad parse" + JSON.stringify(group.items[key]));
        })
    };
}

export function parseYaml(contents: string): ActionGroup {
    const yaml = _parseYaml(contents)
    return handleItems(yaml) as ActionGroup;
}
