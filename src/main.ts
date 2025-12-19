import { App, Modal, Plugin, PluginSettingTab, Setting, } from 'obsidian';
import type { TooltipOptions } from 'obsidian';
import type { Position } from 'types/Position';
import type { RadialMenuConfiguration } from 'types/RadialMenuConfiguration';
import { hasKey } from 'utils/type/hasKey'

import { mount, unmount } from 'svelte';
import RadialMenu from 'ui/RadialMenu.svelte'

import { applyConfiguration } from 'utils/parse/applyConfiguration';

const CSS_CUSTOM_PROPERTIES = {
    RADIAL_MENU_DIAMETER: {
        external: '--radial-menu-diameter',
        internal: '--radial-menu-diameter-config',
        fallback: '--dialog-width',
    },
    RADIAL_BUTTON_DIAMETER: {
        external: '--radial-button-diameter',
        internal: '--radial-button-diameter-config',
        fallback: '15%',
    },
}


// TODO(Garrett): Handle more types: https://docs.obsidian.md/Reference/TypeScript+API/Setting#Methods
enum FormFieldType {
    String,
    Button,
    Toggle,
    LAST
};

enum SettingGroup {
    SemanticGroup = FormFieldType.LAST
};

interface FormField<FieldT, ValueT> {
    type: FieldT
    value?: ValueT;
};

interface MandatoryDetails {
    name: string;
    description: string;
}

interface SettingFormTextField extends FormField<FormFieldType.String, string>, MandatoryDetails {
    placeholder?: string;
    callback?: (plugin: Plugin, previous: string | undefined, next: string) => string | Promise<string>
};

type OptionalDetails = Partial<MandatoryDetails>

interface SettingFormButtonField extends FormField<FormFieldType.Button, null>, OptionalDetails {
    text: string;
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    callback: (plugin: Plugin) => (evt: MouseEvent) => unknown | Promise<unknown>; class?: string | ((plugin: Plugin) => string); // https://docs.obsidian.md/Reference/TypeScript+API/ButtonComponent/onClick
    // icon
    // cta
    is_warning?: ((plugin: Plugin) => boolean);
    is_disabled?: ((plugin: Plugin) => boolean);
    // tooltip
}

interface SettingFormToggleField extends FormField<FormFieldType.Toggle, boolean>, MandatoryDetails {
    tooltip?: { text: string, options?: TooltipOptions };
    //is_disabled?: Boolean | ((plugin: Plugin) => Boolean);
}

interface RadialFormSettings {
    configuration_path: SettingFormTextField;
    radial_menu: {
        type: SettingGroup;
        diameter: SettingFormTextField;
        button_size: SettingFormTextField;
        radial_retargeting: SettingFormToggleField;
    };
};

interface RadialSettings extends RadialFormSettings {
    configuration?: RadialMenuConfiguration;
    reset_configuration_button: SettingFormButtonField;
}

const DEFAULT_SETTINGS: RadialFormSettings = {
    configuration_path: {
        name: "Configuration Path",
        type: FormFieldType.String,
        value: undefined,
        description: 'Path to a yaml or md file with yaml body, designating the radial menu configuration.',
        placeholder: 'path/to/some.yaml',
        callback: async (plugin: RadialPlugin, _previous: string, next: string) => {
            await checkConfiguration(plugin.app, plugin.settings)
            return next;
        }
    },
    radial_menu: {
        type: SettingGroup.SemanticGroup,
        diameter: {
            name: "Radial Menu - Diameter",
            type: FormFieldType.String,
            value: undefined,
            description: `Manual override for Radial Menu diameter. Also overrideable via ${CSS_CUSTOM_PROPERTIES.RADIAL_MENU_DIAMETER.external} css custom property. Defaults to ${CSS_CUSTOM_PROPERTIES.RADIAL_MENU_DIAMETER.fallback} if neither of these are set.`,
            placeholder: 'Ex: 50vw'
        },
        button_size: {
            name: "Radial Menu - Button Diameter",
            type: FormFieldType.String,
            value: undefined,
            description: `Manual override for Radial Menu Buttons diameter. Also overridable via ${CSS_CUSTOM_PROPERTIES.RADIAL_BUTTON_DIAMETER.external} css custom property. Otherwise defaults to ${CSS_CUSTOM_PROPERTIES.RADIAL_BUTTON_DIAMETER.fallback}.`,
            placeholder: `Ex: ${CSS_CUSTOM_PROPERTIES.RADIAL_BUTTON_DIAMETER.fallback}`
        },
        radial_retargeting: {
            name: "Radial Retargeting",
            description: "Makes it so you can draw a continuous motion.",
            type: FormFieldType.Toggle,
            value: true,
        }
    }
}

const RADIAL_SETTINGS_CONFIGURATION: Partial<RadialSettings> = {
    reset_configuration_button: {
        type: FormFieldType.Button,
        text: "Reset configuration to plugin defaults",
        callback: (plugin: RadialPlugin) => async (_event: MouseEvent) => {
            plugin.settings = Object.assign(
                {},
                DEFAULT_SETTINGS,
                RADIAL_SETTINGS_CONFIGURATION,
            ) as RadialSettings;
            await plugin.saveSettings();
        },
        is_warning: () => true,
    },
}

export default class RadialPlugin extends Plugin {
    settings: RadialSettings;

    async onload() {
        await this.loadSettings();

        this.addCommand({
            id: 'open-radial-menu',
            name: 'Open radial menu',
            icon: 'life-buoy',
            callback: () => {
                new RadialModal(this.app, this).open();
            }
        });

        this.addSettingTab(new SettingsRoot(this.app, this));

    }

    onunload() {

    }

    async loadSettings() {
        // TODO(Garrett): use coalesceFormFields to save {path.to.value: value, ...} as cached state, and marshall to avoid caching actual config.
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData(),
            RADIAL_SETTINGS_CONFIGURATION,
        ) as typeof this.settings;
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

async function checkConfiguration(app: App, settings: RadialSettings) {
    if (settings.configuration_path.value === undefined) {
        console.error("obsidian-radial has no configuration path defined!")
        return false;
    }

    // Check if configuration is up to date.
    const file = app.vault.getFileByPath(settings.configuration_path.value);
    if (!file) {
        // TODO(Garrett): Show error information to user.
        console.error("File not found:", settings.configuration_path.value)
        return false;
    }

    if (!settings.configuration) {
        settings.configuration = {
            format: 0,
            actions: { items: [] },
            updatedAt: 0,
        };
    }

    const contents = await app.vault.cachedRead(file);
    if (settings.configuration.updatedAt <= file.stat.mtime) {
        applyConfiguration(settings.configuration, settings.configuration_path.value, contents);
    }
    return true;
}

class RadialModal extends Modal {
    ref: Record<string, unknown>;
    plugin: RadialPlugin;
    constructor(app: App, plugin: RadialPlugin) {
        super(app);
        this.plugin = plugin;
    }

    async onOpen() {
        const { contentEl } = this;

        if (!await checkConfiguration(this.plugin.app, this.plugin.settings)) {
            this.close();
            return;
        }

        const {
            configuration, radial_menu,
        } = this.plugin.settings;


        const parent = contentEl.parentElement!;
        this.ref = mount(RadialMenu, {
            target: contentEl,
            props: {
                actions: configuration!.actions,
                modalContainer: parent,
                app: this.app,
                // eslint-disable-next-line
                commands: (this.app as any)?.commands?.commands, //  Internal API - TODO(Garrett): Add obsidian-typings
                closeMenu: () => {
                    this.close();
                },
                setTarget: radial_menu.radial_retargeting.value ? ((offset: Position) => {
                    parent.style.left = `${offset.x}px`;
                    parent.style.top = `${offset.y}px`;
                }) : undefined,
            }
        });

        if (parent) {
            parent.classList.add("radial-menu")
            if (radial_menu.diameter.value) {
                parent.style.setProperty(CSS_CUSTOM_PROPERTIES.RADIAL_MENU_DIAMETER.internal, radial_menu.diameter.value);
            }
            if (radial_menu.diameter.value) {
                parent.style.setProperty(
                    CSS_CUSTOM_PROPERTIES.RADIAL_BUTTON_DIAMETER.internal,
                    radial_menu.button_size.value ?? null
                );
            }
        }
    }

    onClose() {
        const { contentEl } = this;
        if (this.ref) {
            void (unmount(this.ref));
        }
        contentEl.empty();
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}


class SettingsRoot extends PluginSettingTab {
    plugin: RadialPlugin;

    constructor(app: App, plugin: RadialPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    private coalesceFormFields<T>(settings: T, form_fields: (SettingFormTextField | SettingFormButtonField | SettingFormToggleField)[] | undefined = undefined) {
        if (!form_fields) {
            form_fields = [];
        }
        if (!isRecord(settings)) {
            throw new Error("Bad config!");
        }

        for (const setting of Object.values(settings)) {
            if (!hasKey(setting, "type")) {
                continue;
            }
            const setting_type = Number(setting?.type);
            if (setting_type as FormFieldType >= FormFieldType.LAST) {
                this.coalesceFormFields(setting, form_fields);
            }
            else if (setting_type !== undefined) {
                form_fields.push(setting as (SettingFormTextField | SettingFormButtonField | SettingFormToggleField));
            }
        }
        return form_fields;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        for (const element of this.coalesceFormFields(this.plugin.settings)) {
            if (element.type === FormFieldType.String) {
                const { name, description, placeholder, callback } = element;
                new Setting(containerEl)
                    .setName(name)
                    .setDesc(description)
                    .addText(text => {
                        text
                            .setValue(element.value ?? "")
                            .onChange(async (next_value: string) => {
                                element.value = callback
                                    ? await callback(this.plugin, element.value, next_value)
                                    : next_value || undefined;
                                await this.plugin.saveSettings();
                            });
                        if (placeholder) {
                            text.setPlaceholder(placeholder);
                        }
                    });
            }
            if (element.type === FormFieldType.Button) {
                const { name, description, text, callback, is_warning } = element;
                const setting = new Setting(containerEl)
                    .addButton((button) => {
                        button
                            .setButtonText(text)
                            .onClick(callback(this.plugin));
                        if (is_warning && is_warning(this.plugin)) {
                            button.setWarning();
                        }
                    });
                if (name) {
                    setting.setName(name);
                }
                if (description) {
                    setting.setDesc(description);
                }
            }
            if (element.type === FormFieldType.Toggle) {
                const { name, description, tooltip, /*is_disabled,*/ } = element;
                new Setting(containerEl)
                    .setName(name)
                    .setDesc(description)
                    .addToggle(toggle => {
                        toggle
                            .setValue(element.value ?? false)
                            .onChange(async (next_value: boolean) => {
                                element.value = next_value;
                                await this.plugin.saveSettings();
                            });
                        if (tooltip) {
                            toggle.setTooltip(tooltip?.text, tooltip?.options);
                        }
                    })
                    ;
            }
        }
    }
}
