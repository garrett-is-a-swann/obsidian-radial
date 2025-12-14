import type { Action } from 'types/Action';
export interface ActionGroup {
    items: (Action | ActionGroup)[];
    name?: string;

    keycode?: string;

    icon?: string;
    color?: string;
};
