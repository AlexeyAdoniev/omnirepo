import type { WithId } from './types.js';

export class Chain<Value> {
  constructor(private readonly promise: Promise<Value>) {}

  aggregate<NextValue>(
    transform: (value: Value) => NextValue,
  ): Chain<NextValue> {
    return new Chain(
      (async () => transform(await this.promise))(),
    );
  }

  next<NextValue>(
    transform: (value: Value) => Promise<NextValue>,
  ): Chain<NextValue> {
    return new Chain(this.promise.then(transform));
  }

  tap(effect: (value: Value) => unknown): Promise<Value> {
    return this.promise.then(async value => {
      await effect(value);
      return value;
    });
  }
}

export const chain = <Value>(promise: Promise<Value>): Chain<Value> => {
  return new Chain(promise);
};

export const mapEntities = <T extends WithId>(entities: T[]): Map<string, T> => {
  return new Map(entities.map(entity => [String(entity._id), entity]));
};
