export interface Action {
    id: string;

    // Overrides - Otherwise derrived from command-id:
    name?: string;
    color?: string;
    icon?: string;

    keycode?: string; // Keypress shortcut.
};
