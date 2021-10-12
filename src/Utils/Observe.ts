import { Query } from "mingo";

import type { Options } from "../Types/Collection";
import type { Document } from "../Types/Storage";
import { addOptions } from "./Query";

export function toQueriedData(documents: Document[], options?: Options): Document[] {
  if (options) {
    return addOptions(new Query({}).find(documents), options).all() as Document[];
  }
  return documents;
}
