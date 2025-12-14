import type { ActionGroup } from 'types/ActionGroup';
import type { ConfigurationFormat } from 'types/ConfigurationFormat'

export interface RadialMenuConfiguration {
    actions: ActionGroup;
    format: ConfigurationFormat;
    updatedAt: Date;
};
