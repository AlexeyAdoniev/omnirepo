// abstraction for chaining asynchronous operations and handling their results
export class Chain {
    promise;
    constructor(promise) {
        this.promise = promise;
    }
    map(transform) {
        return new Chain((async () => transform(await this.promise))());
    }
    next(transform) {
        return new Chain(this.promise.then(transform));
    }
    execute(effect) {
        return this.promise.then(async (value) => {
            await effect(value);
            return value;
        });
    }
    catch(handler) {
        return new Chain(this.promise.catch(handler));
    }
}
export const chain = (promise) => {
    return new Chain(promise);
};
export const mapEntities = (entities) => {
    return new Map(entities.map(entity => [String(entity._id), entity]));
};
//# sourceMappingURL=helpers.js.map