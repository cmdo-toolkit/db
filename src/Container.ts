import { Container, Token } from "cmdo-inverse";

import { StorageAdapter } from "./Lib/Storage";

export const container = new Container<{
  StorageAdapter: Token<{ new (): StorageAdapter }, StorageAdapter>;
}>();
