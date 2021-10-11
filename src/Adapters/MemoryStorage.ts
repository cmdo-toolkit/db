import { Document, StorageAdapter } from "../Lib/Storage";

const cache = new Map<string, Document[]>();

/*
 |--------------------------------------------------------------------------------
 | Memory Storage
 |--------------------------------------------------------------------------------
 */

//#region

export class MemoryStorage implements StorageAdapter {
  public async set(name: string, documents: Document[]) {
    cache.set(name, documents);
  }
  public async get(name: string) {
    return cache.get(name) ?? [];
  }
  public async del(name: string) {
    cache.delete(name);
  }
}

//#endregion
