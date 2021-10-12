import { InstanceAdapter } from "./Adapters/InstanceAdapter";
import { MemoryAdapter } from "./Adapters/MemoryAdapter";
import { Collection } from "./Lib/Collection";
import { Model } from "./Lib/Model";
import type { Options } from "./Types/Collection";
import type { ModelClass } from "./Types/Model";
import type { Adapter, Document } from "./Types/Storage";
import { delCollection, getCollection, setCollection } from "./Utils/Collections";

export {
  Adapter,
  Collection,
  delCollection,
  Document,
  getCollection,
  InstanceAdapter,
  MemoryAdapter,
  Model,
  ModelClass,
  Options,
  setCollection
};

export default {
  MemoryAdapter,
  InstanceAdapter,
  delCollection,
  getCollection,
  setCollection,
  Model,
  Collection
};
