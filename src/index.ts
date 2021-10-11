import { container } from "./Container";
import { Collection, Options } from "./Lib/Collection";
import { Model, ModelClass } from "./Lib/Model";
import type { Document, StorageAdapter } from "./Lib/Storage";
import { delCollection, getCollection, setCollection } from "./Utils/Collections";

export { Collection, container, delCollection, Document, getCollection, Model, ModelClass, Options, setCollection, StorageAdapter };

export default {
  delCollection,
  getCollection,
  setCollection,
  Model,
  container,
  Collection
};
