export function sourceLocation(graph: unknown, projectRoot: string, requestedPath: string, nodeId: string|null, repositories?: Record<string,string>):
 {error:string;statusCode:number;errorCode:string} | {error?:undefined;absoluteFile:string;safeRelativePath:string;sourceRepo?:string;sourceCommit?:string};
