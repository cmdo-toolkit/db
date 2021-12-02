import { Query } from "mingo";
import { RawObject } from "mingo/types";

import type { Options, Settings } from "../Types/Collection";
import type { ModelClass } from "../Types/Model";
import { Document as BaseDocument } from "../Types/Storage";
import { addOptions } from "../Utils/Query";
import { observe } from "./Observe";
import { observeOne } from "./ObserveOne";
import { Storage } from "./Storage";

export class Collection<Model extends ModelClass, Document = ReturnType<InstanceType<Model>["toJSON"]>> {
  public readonly name: string;
  public readonly model: Model;
  public readonly storage: Storage<Document>;

  constructor(model: Model, { adapter, indicies }: Settings<Document>) {
    this.name = model.$collection;
    this.model = model;
    this.storage = new Storage<Document>(this.name, adapter, indicies);
  }

  /*
   |--------------------------------------------------------------------------------
   | Mutators
   |--------------------------------------------------------------------------------
   */

  public async insert(document: Document) {
    return this.toModel(await this.storage.insert(document));
  }

  public async update(document: Document & Partial<Document>) {
    return this.toModel(await this.storage.update(document));
  }

  public async upsert(document: Document) {
    return this.toModel(await this.storage.upsert(document));
  }

  public async delete(id: string) {
    return this.storage.delete(id);
  }

  /*
   |--------------------------------------------------------------------------------
   | Observers
   |--------------------------------------------------------------------------------
   */

  public observe(criteria: RawObject = {}, options?: Options) {
    let unsubscribe: () => void;
    let next: (value: InstanceType<Model>[]) => void;
    return {
      subscribe: (_next: (value: InstanceType<Model>[]) => void) => {
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
    let next: (value?: InstanceType<Model>) => void;
    return {
      subscribe: (_next: (value?: InstanceType<Model>) => void) => {
        next = _next;
        unsubscribe = observeOne(this, criteria, (document?: Document) => {
          next(document ? this.toModel(document) : undefined);
        });
        return { unsubscribe };
      },
      filter: (criteria: RawObject) => {
        unsubscribe();
        unsubscribe = observeOne(this, criteria, (document?: Document) => {
          next(document ? this.toModel(document) : undefined);
        });
      }
    };
  }

  /*
   |--------------------------------------------------------------------------------
   | Queries
   |--------------------------------------------------------------------------------
   */

  /**
   * Retrieve a record by the document 'id' key.
   *
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

  public async findBy(key: string, value: string) {
    const index = this.storage.index.get(key);
    if (!index) {
      throw new Error("You cannot perform .findBy on a non indexed key");
    }
    const ids = index[value];
    if (ids) {
      return Array.from(ids).reduce<InstanceType<Model>[]>((models, id) => {
        const document = this.storage.documents.get(id);
        if (document) {
          models.push(this.toModel(document));
        }
        return models;
      }, []);
    }
    return [];
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
    const cursor = new Query(criteria).find(this.getQueryData(criteria));
    if (options) {
      return addOptions(cursor, options);
    }
    return cursor;
  }

  /*
   |--------------------------------------------------------------------------------
   | Utilities
   |--------------------------------------------------------------------------------
   */

  /**
   * Get the raw data for this collection.
   *
   * If criteria object is provided and it has matching indexed ids, only
   * the data within the matched ids is returned.
   *
   * If the indexing does not yield any ids the entire document storage
   * is returned.
   */
  public getQueryData(criteria: RawObject = {}) {
    const ids = new Set<string>();
    this.storage.index.forEach((key, values) => {
      const value = criteria[key];
      if (value && typeof value === "string") {
        const pointers = values[value];
        if (pointers) {
          for (const pointer of pointers) {
            ids.add(pointer);
          }
        }
      }
    });
    return ids.size === 0 ? this.storage.data : Array.from(ids).map((id) => this.storage.documents.get(id));
  }

  private toModel(document: Document) {
    return new this.model(document) as InstanceType<Model>;
  }
}
