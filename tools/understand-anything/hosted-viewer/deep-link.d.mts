export function parseNodeParam(search: string): string | null;
export function resolveDeepLink(nodes: ReadonlyArray<{id: string}> | undefined, id: string): {status: 'found'; nodeId: string} | {status: 'not-found'; id: string};
export function mapUrlForNode(nodeId: string): string;
