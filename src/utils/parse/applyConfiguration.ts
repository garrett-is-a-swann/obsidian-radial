import type { RadialMenuConfiguration } from 'types/RadialMenuConfiguration';
import { ConfigurationFormat } from 'types/ConfigurationFormat';

import { parseYaml } from 'utils/parse/parseYaml';
import { parseMd } from 'utils/parse/parseMd';

export function applyConfiguration(configuration: Partial<RadialMenuConfiguration>, filename: string, contents: string): RadialMenuConfiguration {
    if (filename.toLowerCase().endsWith('.yaml') || filename.toLowerCase().endsWith('.yml')) {
        Object.assign(configuration, {
            format: ConfigurationFormat.YAML,
            actions: parseYaml(contents),
        });
    } else {
        Object.assign(
            configuration, {
            format: ConfigurationFormat.Markdown,
            actions: parseMd(contents) ?? {
                items: []
            },
        });
    };
    return configuration;
}
