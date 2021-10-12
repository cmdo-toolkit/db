import { Collection } from "../Lib/Collection";
import type { Settings } from "../Types/Collection";

const cache = new Map<string, any>();

export function setCollection(name: string, settings: Settings) {
  const collection = new Collection(name, settings);
  cache.set(name, collection);
  return collection;
}

export function getCollection(name: string, settings: Settings) {
  const collection = cache.get(name);
  if (collection) {
    return collection;
  }
  return setCollection(name, settings);
}

export function delCollection(name: string) {
  cache.delete(name);
}
