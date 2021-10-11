import { Query } from "mingo";
import { Cursor } from "mingo/cursor";
import { RawObject } from "mingo/types";

import { Model, ModelClass } from "./Model";
import { observe, observeOne } from "./Observe";
import { Document, Storage } from "./Storage";

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

//#region

type Settings<M> = {
  model: M;
};

export type Options = {
  sort?: {
    [key: string]: 1 | -1;
  };
  skip?: number;
  limit?: number;
};

//#endregion

/*
 |--------------------------------------------------------------------------------
 | Collection
 |--------------------------------------------------------------------------------
 */

//#region

export class Collection<T extends Model = Model, M extends ModelClass<T> = ModelClass<T>> {
  public readonly name: string;
  public readonly model: M;
  public readonly storage: Storage;

  constructor(name: string, settings: Settings<M>) {
    this.name = name;
    this.model = settings.model;
    this.storage = new Storage(name);
  }

  /*
   |--------------------------------------------------------------------------------
   | Mutators
   |--------------------------------------------------------------------------------
   */

  //#region

  public async insert(document: ReturnType<T["toJSON"]>): Promise<T> {
    return this.toModel(await this.storage.insert(document));
  }

  public async update(document: Document & Partial<ReturnType<T["toJSON"]>>): Promise<T> {
    return this.toModel(await this.storage.update(document));
  }

  public async upsert(document: ReturnType<T["toJSON"]>): Promise<T> {
    return this.toModel(await this.storage.upsert(document));
  }

  public async delete(id: string): Promise<void> {
    return this.storage.delete(id);
  }

  //#endregion

  /*
   |--------------------------------------------------------------------------------
   | Observers
   |--------------------------------------------------------------------------------
   */

  //#region

  public observe(criteria: RawObject = {}, options?: Options) {
    let unsubscribe: () => void;
    let next: (value: T[]) => void;
    return {
      subscribe: (_next: (value: T[]) => void) => {
        next = _next;
        unsubscribe = observe(this, criteria, options, (documents: Document[]) => {
          next(documents.map((document) => this.toModel(document)));
        });
        return { unsubscribe };
      },
      filter: (criteria: RawObject, options?: Options) => {
        unsubscribe();
        unsubscribe = observe(this, criteria, options, (documents: Document[]) => {
          next(documents.map((document) => this.toModel(document)));
        });
      }
    };
  }

  public observeOne(criteria: RawObject = {}) {
    let unsubscribe: () => void;
    let next: (value?: T) => void;
    return {
      subscribe: (_next: (value?: T) => void) => {
        next = _next;
        unsubscribe = observeOne(this, criteria, (document: Document | undefined) => {
          next(document ? this.toModel(document) : undefined);
        });
        return { unsubscribe };
      },
      filter: (criteria: RawObject) => {
        unsubscribe();
        unsubscribe = observeOne(this, criteria, (document: Document | undefined) => {
          next(document ? this.toModel(document) : undefined);
        });
      }
    };
  }

  //#endregion

  /*
   |--------------------------------------------------------------------------------
   | Queries
   |--------------------------------------------------------------------------------
   */

  //#region

  /**
   * Retrieve a record by the document 'id' key.
   *
   * @url https://github.com/kofrasa/mingo

   * @remarks
   *
   * This is a optimized operation that skips the Mingo Query step and attempts to
   * retrieve the document directly from the collections document Map.
   */
  public async findById(id: string) {
    const document = this.storage.documents.get(id);
    if (document) {
      return this.toModel(document);
    }
  }

  /**
   * Performs a mingo criteria search over the collection data and returns any
   * documents matching the provided criteria and options.
   *
   * @url https://github.com/kofrasa/mingo
   */
  public async find(criteria: RawObject = {}, options?: Options) {
    return this.query(criteria, options).then((cursor) => {
      const documents = cursor.all() as Document[];
      return documents.map((document) => this.toModel(document));
    });
  }

  /**
   * Performs a mingo criteria search over the collection data and returns
   * a single document if one was found matching the criteria and options.
   *
   * @url https://github.com/kofrasa/mingo
   */
  public async findOne(criteria: RawObject = {}, options?: Options) {
    return this.query(criteria, options).then((cursor) => {
      const documents = cursor.all() as Document[];
      if (documents.length > 0) {
        return this.toModel(documents[0]);
      }
    });
  }

  /**
   * Performs a mingo criteria search over the collection data and returns
   * a document count of all documents found matching the criteria and options.
   *
   * @url https://github.com/kofrasa/mingo
   */
  public async count(criteria: RawObject = {}, options?: Options) {
    return this.query(criteria, options).then((cursor) => cursor.count());
  }

  /**
   * Performs a mingo criteria search over the collection data and returns
   * the mingo query cursor which can be further utilized for advanced
   * querying.
   *
   * @url https://github.com/kofrasa/mingo#searching-and-filtering
   */
  public async query(criteria: RawObject = {}, options?: Options) {
    await this.storage.load();
    const cursor = new Query(criteria).find(this.storage.data);
    if (options) {
      return addOptions(cursor, options);
    }
    return cursor;
  }

  //#endregion

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  //#region

  private toModel(document: Document) {
    return new this.model(document);
  }

  //#endregion
}

//#endregion

/*
 |--------------------------------------------------------------------------------
 | Utilities
 |--------------------------------------------------------------------------------
 */

//#region

export function addOptions(cursor: Cursor, options: Options): Cursor {
  if (options.sort) {
    cursor.sort(options.sort);
  }
  if (options.skip !== undefined) {
    cursor.skip(options.skip);
  }
  if (options.limit !== undefined) {
    cursor.limit(options.limit);
  }
  return cursor;
}
