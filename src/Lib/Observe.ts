import { Query } from "mingo";
import { RawObject } from "mingo/types";

import { InstanceAdapter } from "../Adapters/InstanceAdapter";
import type { Options } from "../Types/Collection";
import type { Document } from "../Types/Storage";
import { toQueriedData } from "../Utils/Observe";
import { Collection } from "./Collection";
import { Storage } from "./Storage";

export function observe(
  collection: Collection,
  criteria: RawObject | undefined,
  options: Options | undefined,
  cb: (documents: Document[]) => void
): () => void {
  const store = new Storage("observer", new InstanceAdapter());

  // ### Initial Query

  collection.find(criteria, options).then(async (documents) => {
    for (const document of documents) {
      await store.insert(document);
    }
    cb(store.data);
  });

  // ### Change Listener

  return collection.storage.onChange(async (type, document) => {
    const id = document.id;

    let hasChanged = false;
    switch (type) {
      case "insert": {
        if (!criteria || new Query(criteria).test(document)) {
          await store.insert(document);
          hasChanged = true;
        }
        break;
      }
      case "update": {
        if (store.has(id)) {
          if (!criteria || new Query(criteria).test(document)) {
            await store.update(document);
            hasChanged = true;
          } else {
            await store.delete(id);
            hasChanged = true;
          }
        } else if (!criteria || new Query(criteria).test(document)) {
          await store.insert(document);
          hasChanged = true;
        }
        break;
      }
      case "delete": {
        if (!criteria || new Query(criteria).test(document)) {
          await store.delete(id);
          hasChanged = true;
        }
        break;
      }
    }
    if (hasChanged) {
      cb(toQueriedData(store.data, options));
    }
  });
}

/*
 |--------------------------------------------------------------------------------
 | Oberve One
 |--------------------------------------------------------------------------------
 */

export function observeOne(
  collection: Collection,
  criteria: RawObject | undefined,
  cb: (document: Document | undefined) => void
): () => void {
  collection.findOne(criteria).then(cb);
  return collection.storage.onChange((type, document) => {
    switch (type) {
      case "insert":
      case "update": {
        if (!criteria || new Query(criteria).test(document)) {
          cb(document);
        }
        break;
      }
      case "delete": {
        if (!criteria || new Query(criteria).test(document)) {
          cb(undefined);
        }
        break;
      }
    }
  });
}
