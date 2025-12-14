import type { Action } from 'types/Action';
import type { ActionGroup } from 'types/ActionGroup';
import { hasKey } from 'utils/type/hasKey'

export function isAction(item: ActionGroup | Action | Record<string, unknown>): Action | undefined {
    return hasKey(item, "id") && !hasKey(item, "items")
        ? item
        : undefined;
}
