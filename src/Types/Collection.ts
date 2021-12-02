import type { Adapter, Document as BaseDocument } from "./Storage";

export type Settings<Document extends BaseDocument> = {
  adapter: Adapter;
  indicies?: (keyof Document)[];
  unique?: string[][];
};

export type Options = {
  sort?: {
    [key: string]: 1 | -1;
  };
  skip?: number;
  limit?: number;
};
