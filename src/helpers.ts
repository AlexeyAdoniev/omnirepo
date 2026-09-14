import type { WithId } from './types.js';

export const mapEntities = <T extends WithId>(entities: T[]): Map<string, T> => {
  return new Map(entities.map(entity => [String(entity._id), entity]));
};