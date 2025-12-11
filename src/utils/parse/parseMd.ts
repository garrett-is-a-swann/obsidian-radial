import type { ActionGroup } from 'types/ActionGroup';

import { parseYaml } from 'utils/parse/parseYaml';

export function parseMd(contents: string): ActionGroup | undefined {
    const matches = contents.matchAll(/^```(.*|)$/mg);
    let block_start = undefined;
    let skip_next = false;
    for (const match of matches) {
        if (skip_next) {
            skip_next = false;
            continue;
        }
        if (!block_start) {
            if (!["yaml", "yml", ""].includes(match[1].trim().toLowerCase())) {
                skip_next = true;
                continue;
            }
            block_start = match;
        }
        else {
            return parseYaml(contents.substring(block_start.index as number + block_start[0].length, match.index))
        }
    }
    return undefined
}
