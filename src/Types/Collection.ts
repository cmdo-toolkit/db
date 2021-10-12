import { ModelClass } from "./Model";
import type { Adapter } from "./Storage";

export type Settings<M extends ModelClass = ModelClass> = {
  model: M;
  adapter: Adapter;
};

export type Options = {
  sort?: {
    [key: string]: 1 | -1;
  };
  skip?: number;
  limit?: number;
};
