import type { Action } from 'types/Action';
import type { ActionGroup } from 'types/ActionGroup';
import { hasKey } from 'utils/type/hasKey';

export function isActionGroup(
    item: ActionGroup | Action | Record<string, unknown>,
): ActionGroup | undefined {
    return hasKey(item, "items")
        ? (item as ActionGroup)
        : undefined;
}

