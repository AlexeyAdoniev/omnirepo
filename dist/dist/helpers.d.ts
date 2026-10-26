import type { WithId } from './types.js';
export declare class Chain<Value> {
    private readonly promise;
    constructor(promise: Promise<Value>);
    map<NextValue>(transform: (value: Value) => NextValue): Chain<NextValue>;
    next<NextValue>(transform: (value: Value) => Promise<NextValue>): Chain<NextValue>;
    execute(effect: (value: Value) => unknown): Promise<Value>;
    catch<RecoveredValue>(handler: (error: unknown) => RecoveredValue | Promise<RecoveredValue>): Chain<Value | RecoveredValue>;
}
export declare const chain: <Value>(promise: Promise<Value>) => Chain<Value>;
export declare const mapEntities: <T extends WithId>(entities: T[]) => Map<string, T>;
//# sourceMappingURL=helpers.d.ts.map