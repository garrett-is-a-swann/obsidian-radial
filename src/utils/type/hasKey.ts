export const hasKey = <K extends string>(
    v: unknown,
    k: K
): v is Record<K, unknown> =>
    typeof v === "object" && v !== null && k in v;
