import type { Document } from "../Types/Storage";

type IndexKeys = Record<string, IndexValues>;
type IndexValues = Record<string, Set<string>>;
type IndexForEachFn = (key: string, values: IndexValues) => void;

export class Index {
  public readonly keys: IndexKeys = {};

  private loaded = false;

  constructor(keys: string[]) {
    for (const key of keys) {
      this.addKey(key);
    }
  }

  /*
   |--------------------------------------------------------------------------------
   | Modifiers
   |--------------------------------------------------------------------------------
   */

  public load(documents: Document[]) {
    if (this.loaded) {
      return; // already processed this instance
    }
    this.loaded = true;
    for (const document of documents) {
      this.add(document);
    }
  }

  public add(document: Document) {
    for (const key in this.keys) {
      const value = document[key as keyof typeof document];
      this.addValue(key, value);
      this.keys[key][value].add(document.id);
    }
  }

  public update(prevDocument: Document, nextDocument: Document) {
    for (const key in this.keys) {
      const prevValue = prevDocument[key as keyof typeof prevDocument];
      const nextValue = nextDocument[key as keyof typeof nextDocument];
      if (prevValue !== nextValue) {
        this.remove(prevDocument);
      }
      this.add(nextDocument);
    }
  }

  public remove(document: Document) {
    for (const key in this.keys) {
      const value = document[key as keyof typeof document];
      this.addValue(key, value);
      this.keys[key][value].delete(document.id);
      if (this.keys[key][value].size === 0) {
        delete this.keys[key][value];
      }
    }
  }

  /*
   |--------------------------------------------------------------------------------
   | Higher Order Functions
   |--------------------------------------------------------------------------------
   */

  public forEach(fn: IndexForEachFn) {
    for (const key in this.keys) {
      fn(key, this.keys[key]);
    }
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  private addKey(key: string) {
    if (!this.keys[key]) {
      this.keys[key] = {};
    }
  }

  private addValue(key: string, value: string) {
    if (!this.keys[key][value]) {
      this.keys[key][value] = new Set();
    }
  }
}
