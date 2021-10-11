import { Collection } from "../Lib/Collection";
import { Model, ModelClass } from "../Lib/Model";

const cache = new Map<string, any>();

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

//#region

export function setCollection<T extends Model>(name: string, model: ModelClass<T>): Collection<T> {
  const collection = new Collection<T>(name, { model });
  cache.set(name, collection);
  return collection;
}

export function getCollection<T extends Model>(name: string, model: ModelClass<T>): Collection<T> {
  const collection = cache.get(name);
  if (collection) {
    return collection;
  }
  return setCollection(name, model);
}

export function delCollection(name: string) {
  cache.delete(name);
}

//#endregion
