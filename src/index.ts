import { InstanceAdapter } from "./Adapters/InstanceAdapter";
import { MemoryAdapter } from "./Adapters/MemoryAdapter";
import { Collection } from "./Lib/Collection";
import { Model } from "./Lib/Model";
import type { Options } from "./Types/Collection";
import type { ModelClass } from "./Types/Model";
import type { Adapter, Document } from "./Types/Storage";

export { Adapter, Collection, Document, InstanceAdapter, MemoryAdapter, Model, ModelClass, Options };

export default {
  MemoryAdapter,
  InstanceAdapter,
  Model,
  Collection
};
