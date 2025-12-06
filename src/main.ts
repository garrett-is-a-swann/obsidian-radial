import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

import { mount, unmount } from 'svelte';
import RadialMenu from 'ui/RadialMenu.svelte'

import type { ActionGroup } from 'types/ActionGroup'

const CSS_CUSTOM_PROPERTIES = {
	RADIAL_MENU_RADIUS: {
		external: '--radial-menu-radius',
		internal: '--radial-menu-radius-config',
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
					"workspace:close-others-tab-group"
				]
			}
		]
	}
}

enum FormFieldType {
	String,
	Button,
	LAST
};

enum SettingGroup {
	SemanticGroup = FormFieldType.LAST
};

interface FormField<FieldT, ValueT> {
	type: FieldT
	value?: ValueT;
};

interface SettingFormTextField extends FormField<FormFieldType.String, string> {
	name: string;
	description: string;
	placeholder?: string;
	callback?: (plugin: Plugin, previous: string, next: string) => string
};

interface SettingFormButtonField extends FormField<FormFieldType.Button, null> {
	text: string;
	callback: (plugin: Plugin) => (evt: MouseEvent) => unknown | Promise<unknown>;
	class?: string | ((plugin: Plugin) => string);
	// icon
	// cta
	is_warning?: Boolean | ((plugin: Plugin) => Boolean); // TODO(Garrett): should allow promise-based?
	is_disabled?: Boolean | ((plugin: Plugin) => Boolean);
	// tooltip
}

interface RadialFormSettings {
	configuration_path: SettingFormTextField;
	radial_menu: {
		type: SettingGroup;
		radius: SettingFormTextField;
		button_size: SettingFormTextField;
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
		radius: {
			name: "Radial Menu - Radius",
			type: FormFieldType.String,
			value: undefined,
			description: `Override for the radial menu radius. Also overrideable via ${CSS_CUSTOM_PROPERTIES.RADIAL_MENU_RADIUS.external} css custom property. Defaults to ${CSS_CUSTOM_PROPERTIES.RADIAL_MENU_RADIUS.fallback} if neither of these are set.`,
			placeholder: 'Ex: 50vw'
		},
		button_size: {
			name: "Radial Menu - Button Size",
			type: FormFieldType.String,
			value: undefined,
			description: `Size in pixels for Radial Menu Buttons. Also overridable via ${CSS_CUSTOM_PROPERTIES.RADIAL_BUTTON_DIAMETER.external} css custom property. Otherwise defaults to ${CSS_CUSTOM_PROPERTIES.RADIAL_BUTTON_DIAMETER.fallback}.`,
			placeholder: `Ex: ${CSS_CUSTOM_PROPERTIES.RADIAL_BUTTON_DIAMETER.fallback}`
		},
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

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (_evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new RadialModal(this.app, this).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'radial-menu',
			name: 'Open Radial Menu',
			editorCallback: (editor: Editor, _view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new RadialModal(this.app, this).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingsRoot(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
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
		this.ref = mount(RadialMenu, {
			target: contentEl,
			props: {
				actions: this.plugin.settings.configuration?.actions,
				parent: contentEl,
			}
		});

		const parent = contentEl.parentElement;
		if (parent) {
			parent.classList.add("radial-menu")
			if (this.plugin.settings.radial_menu.radius.value) {
				parent.style.cssText += `${CSS_CUSTOM_PROPERTIES.RADIAL_MENU_RADIUS.internal}: ${this.plugin.settings.radial_menu.radius.value};`
			}
			if (this.plugin.settings.radial_menu.radius.value) {
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
				const { text, callback, is_warning } = element as Omit<SettingFormButtonField, "is_warning"> & { is_warning: Boolean & ((plugin: Plugin) => Boolean) };
				new Setting(containerEl)
					.addButton((button) => {
						button
							.setButtonText(text)
							.onClick(callback(this.plugin));
						if (is_warning?.call ? is_warning(this.plugin) : is_warning) {
							button.setWarning();
						}
					});
			}
		}
	}
}
