import { Document, StorageAdapter } from "../Lib/Storage";

/*
 |--------------------------------------------------------------------------------
 | Instance Storage
 |--------------------------------------------------------------------------------
 */

//#region

export class InstanceStorage implements StorageAdapter {
  public readonly cache = new Map<string, Document[]>();

  public async set(name: string, documents: Document[]) {
    this.cache.set(name, documents);
  }
  public async get(name: string) {
    return this.cache.get(name) ?? [];
  }
  public async del(name: string) {
    this.cache.delete(name);
  }
}

//#endregion
