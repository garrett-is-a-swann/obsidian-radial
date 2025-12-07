import { App, Modal, Plugin, PluginSettingTab, Setting, TooltipOptions } from 'obsidian';

import { mount, unmount } from 'svelte';
import RadialMenu from 'ui/RadialMenu.svelte'

import type { ActionGroup } from 'types/ActionGroup'

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

enum ConfigurationFormat {
	Markdown,
	YAML,
};

const TEMPORARY_CONFIGURATION_CHANGE_ME = {
	format: ConfigurationFormat.YAML,
	actions: {
		items: [
			"command-palette:open",
			"editor:focus",
			"global-search:open",
			"editor:context-menu",
			"switcher:open",
			"app:go-back",
			"app:go-forward",
			"spacekeys:repeat-last",
			{
				name: "Workspace",
				items: [
					"editor:focus",
					"workspace:close",
					"file-explorer:open",
					"editor:focus-left",
					"editor:focus-right",
					"editor:focus-top",
					"editor:focus-bottom",
					"workspace:next-tab",
					"workspace:new-tab",
					"outline:open",
					"workspace:previous-tab",
					"workspace:toggle-pin",
					"workspace:split-horizontal",
					"workspace:toggle-stacked-tabs",
					"tag-pane:open",
					"workspace:undo-close-pane",
					"workspace:split-vertical",
					"app:toggle-left-sidebar",
					"app:toggle-right-sidebar",
					"app:toggle-ribbon",
					"workspace:open-in-new-window",
					"workspace:move-to-new-window"
				]
			},
			{
				name: "Close",
				items: [
					"workspace:close-tab-group",
					"workspace:close-others-tab-group",
					{
						name: "test",
						items: [
							{
								name: "c.t.0",
								items: [
									{
										name: "c.t.0.0",
										items: [
											"command-palette:open",
											"command-palette:open",
											"command-palette:open",
										]
									},
									"command-palette:open",
									"command-palette:open",
									"command-palette:open",
								]
							},
							{
								name: "c.t.1",
								items: [
									"command-palette:open",
									"command-palette:open",
									"command-palette:open",
								]
							},
							{
								name: "c.t.1",
								items: [
									"command-palette:open",
									"command-palette:open",
									"command-palette:open",
								]
							}
						]
					}
				]
			}
		]
	}
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

type OptionalDetails = Partial<MandatoryDetails>

interface SettingFormTextField extends FormField<FormFieldType.String, string>, MandatoryDetails {
	placeholder?: string;
	callback?: (plugin: Plugin, previous: string, next: string) => string
};

interface SettingFormButtonField extends FormField<FormFieldType.Button, null>, OptionalDetails {
	text: string;
	callback: (plugin: Plugin) => (evt: MouseEvent) => unknown | Promise<unknown>;
	class?: string | ((plugin: Plugin) => string);
	// icon
	// cta
	is_warning?: Boolean | ((plugin: Plugin) => Boolean); // TODO(Garrett): should allow promise-based?
	is_disabled?: Boolean | ((plugin: Plugin) => Boolean);
	// tooltip
}

interface SettingFormToggleField extends FormField<FormFieldType.Toggle, Boolean>, MandatoryDetails {
	tooltip?: { text: String, options?: TooltipOptions };
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
	configuration?: {
		actions: ActionGroup;
		format: ConfigurationFormat;
	};
	reset_configuration_button: SettingFormButtonField;
}

const DEFAULT_SETTINGS: RadialFormSettings = {
	configuration_path: {
		name: "Configuration Path",
		type: FormFieldType.String, // TODO: ...does this have to be set manually? Missing c++...
		value: undefined,
		description: 'Path to a yaml or md file with yaml body, designating the radial menu configuration.',
		placeholder: 'path/to/some.yaml',
		callback: (plugin: RadialPlugin, _previous: string, next: string) => {
			if (next.toLowerCase().endsWith('.yaml') || next.toLowerCase().endsWith('.yml')) {
				// TODO Parse the file.
				plugin.settings.configuration = {
					format: ConfigurationFormat.YAML,
					actions: plugin.settings.configuration?.actions ?? {
						items: []
					}
				};
			} else {
				// TODO Parse the file.
				plugin.settings.configuration = {
					format: ConfigurationFormat.YAML,
					actions: plugin.settings.configuration?.actions ?? {
						items: []
					}
				};
			}
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
				{ configuration: TEMPORARY_CONFIGURATION_CHANGE_ME },
			) as RadialSettings;
			await plugin.saveSettings();
		},
		is_warning: true,
	}
}

export default class RadialPlugin extends Plugin {
	settings: RadialSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'open-radial-menu',
			name: 'Open radial menu',
			callback: () => {
				new RadialModal(this.app, this).open();
			}
		});

		this.addSettingTab(new SettingsRoot(this.app, this));

	}

	onunload() {

	}

	async loadSettings() {
		// TODO(Garrett): This isn't going to cut it.... per-field configuration versioning could be a good idea... low priority....
		// I see why people add a refresh button.
		//
		// UPDATE: Now that i have coalesceFormFields, I can probably just save {path.to.value: value, ...} as cached state, and marshall to avoid caching actual config.
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
			RADIAL_SETTINGS_CONFIGURATION,
			{ configuration: TEMPORARY_CONFIGURATION_CHANGE_ME },
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class RadialModal extends Modal {
	ref: Record<string, any>;
	plugin: RadialPlugin;
	constructor(app: App, plugin: RadialPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;

		const parent = contentEl.parentElement as HTMLElement;
		this.ref = mount(RadialMenu, {
			target: contentEl,
			props: {
				actions: this.plugin.settings.configuration?.actions,
				parent: contentEl,
				app: this.app,
				commands: (this.app as any).commands.commands, // Internal API - TODO(Garrett): Add obsidian-typings
				closeMenu: () => {
					this.close();
				},
				setTarget: this.plugin.settings.radial_menu.radial_retargeting.value && ((offset: { x: number, y: number }) => {
					const px_regex = /(-?[0-9]*(?:\.[0-9]*)?)px/;
					const left_match = parent.style.left.match(px_regex);
					if (left_match) {
						parent.style.left = `${parseFloat(left_match[1]) + offset.x}px`;
					}
					else {
						if (parent.style.left) {
							console.error("RadialRetargeting Error - Modal left has no px:", parent.style.left);
						}
						parent.style.left = `${offset.x}px`;
					}

					const top_match = parent.style.top?.match(px_regex);
					if (top_match) {
						parent.style.top = `${parseFloat(top_match[1]) + offset.y}px`;
					} else {
						if (parent.style.top) {
							console.error("RadialRetargeting Error - Modal top has no px:", parent.style.top);
						}
						parent.style.top = `${offset.y}px`;
					}
				}),
			}
		});

		if (parent) {
			parent.classList.add("radial-menu")
			if (this.plugin.settings.radial_menu.diameter.value) {
				parent.style.cssText += `${CSS_CUSTOM_PROPERTIES.RADIAL_MENU_DIAMETER.internal}: ${this.plugin.settings.radial_menu.diameter.value};`
			}
			if (this.plugin.settings.radial_menu.diameter.value) {
				parent.style.cssText += `${CSS_CUSTOM_PROPERTIES.RADIAL_BUTTON_DIAMETER.internal}: ${this.plugin.settings.radial_menu.button_size.value};`
			}
		}
	}

	onClose() {
		const { contentEl } = this;
		if (this.ref) {
			unmount(this.ref);
		}
		contentEl.empty();
	}
}

class SettingsRoot extends PluginSettingTab {
	plugin: RadialPlugin;

	constructor(app: App, plugin: RadialPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private coalesceFormFields(settings: any = undefined, form_fields: FormField<any, any>[] | undefined = undefined) {
		if (!settings) {
			settings = this.plugin.settings;
		}
		if (!form_fields) {
			form_fields = [];
		}

		for (const setting of Object.values(settings) as any[]) {
			if (setting?.type >= FormFieldType.LAST) {
				this.coalesceFormFields(setting, form_fields);
			}
			else if (setting.type !== undefined) {
				form_fields.push(setting);
			}
		}
		return form_fields;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		for (const element of this.coalesceFormFields()) {
			if (element.type === FormFieldType.String) {
				const { name, description, placeholder, callback } = element as SettingFormTextField;
				new Setting(containerEl)
					.setName(name)
					.setDesc(description)
					.addText(text => {
						text
							.setValue(element.value ?? "")
							.onChange(async (next_value: string) => {
								element.value = callback ? callback(this.plugin, element.value, next_value) : next_value || undefined;
								await this.plugin.saveSettings();
							});
						if (placeholder) {
							text.setPlaceholder(placeholder);
						}
					});
			}
			if (element.type === FormFieldType.Button) {
				const { name, description, text, callback, is_warning } = element as Omit<SettingFormButtonField, "is_warning"> & { is_warning: Boolean & ((plugin: Plugin) => Boolean) };
				const setting = new Setting(containerEl)
					.addButton((button) => {
						button
							.setButtonText(text)
							.onClick(callback(this.plugin));
						if (is_warning?.call ? is_warning(this.plugin) : is_warning) {
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
				const { name, description, tooltip, /*is_disabled,*/ } = element as SettingFormToggleField;
				new Setting(containerEl)
					.setName(name)
					.setDesc(description)
					.addToggle(toggle => {
						toggle
							.setValue(element.value ?? false)
							.onChange(async (next_value: Boolean) => {
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
