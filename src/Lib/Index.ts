import type { Document as BaseDocument } from "../Types/Storage";

type IndexKeys<Document extends BaseDocument> = Record<keyof Document, IndexValues<Document>>;
type IndexValues<Document extends BaseDocument> = Record<Document[keyof Document], Set<string>>;
type IndexForEachFn<Document extends BaseDocument> = (key: string, values: IndexValues<Document>) => void;

export class Index<Document extends BaseDocument> {
  public readonly keys: IndexKeys<Document> = {} as IndexKeys<Document>;

  private loaded = false;

  constructor(keys: (keyof Document)[]) {
    for (const key of keys) {
      this.addKey(key);
    }
  }

  public get(key: keyof IndexKeys<Document>) {
    return this.keys[key];
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

  public forEach(fn: IndexForEachFn<Document>) {
    for (const key in this.keys) {
      fn(key, this.keys[key]);
    }
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  private addKey(key: keyof IndexKeys<Document>) {
    if (!this.keys[key]) {
      this.keys[key] = {} as IndexValues<Document>;
    }
  }

  private addValue(key: keyof IndexKeys<Document>, value: Document[keyof Document]) {
    if (!this.keys[key][value]) {
      this.keys[key][value] = new Set();
    }
  }
}
