import { EventEmitter } from "eventemitter3";
import { nanoid } from "nanoid";

import { container } from "../Container";

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

//#region

export type StorageAdapter = {
  set(name: string, documents: Document[]): Promise<void>;
  get(name: string): Promise<Document[]>;
  del(name: string): Promise<void>;
};

export type Document = {
  id: string;
};

type Status = "loading" | "ready" | "working";

export type ChangeType = "insert" | "update" | "delete";

type Operation = Insert | Update | Upsert | Delete;

type Insert = {
  type: "insert";
  document: {
    id?: string;
    [key: string]: unknown;
  };
} & OperationPromise;

type Update = {
  type: "update";
  document: Document;
} & OperationPromise;

type Upsert = {
  type: "upsert";
  document: Document;
} & OperationPromise;

type Delete = {
  type: "delete";
  id: string;
} & OperationDeletePromise;

type OperationPromise = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
};

type OperationDeletePromise = {
  resolve: () => void;
  reject: (reason?: any) => void;
};

//#endregion

/*
 |--------------------------------------------------------------------------------
 | Storage
 |--------------------------------------------------------------------------------
 */

//#region

export class Storage extends EventEmitter<{
  loading: () => void;
  ready: () => void;
  working: () => void;
  change: (type: ChangeType, document: Document) => void;
}> {
  public readonly name: string;
  public readonly adapter: StorageAdapter;
  public readonly documents: Map<string, Document>;
  public readonly operations: Operation[];
  public readonly debounce: {
    save?: NodeJS.Timeout;
  } = {
    save: undefined
  };

  public status: Status;

  constructor(name: string, adapter = container.get("StorageAdapter")) {
    super();
    this.name = name;
    this.adapter = adapter;
    this.documents = new Map();
    this.operations = [];
    this.status = "loading";
  }

  /*
   |--------------------------------------------------------------------------------
   | Errors
   |--------------------------------------------------------------------------------
   */

  //#region

  public static DuplicateDocumentError = class extends Error {
    public readonly type = "DuplicateDocumentError";

    constructor(id: string) {
      super(`Collection Insert Violation: Document '${id}' already exists`);
    }
  };

  public static DocumentNotFoundError = class extends Error {
    public readonly type = "DocumentNotFoundError";

    constructor(id: string) {
      super(`Collection Update Violation: Document '${id}' does not exists`);
    }
  };

  //#endregion

  /*
   |--------------------------------------------------------------------------------
   | Getters
   |--------------------------------------------------------------------------------
   */

  //#region

  public get data(): Document[] {
    return Array.from(this.documents.values());
  }

  //#endregion

  /*
   |--------------------------------------------------------------------------------
   | Lookup
   |--------------------------------------------------------------------------------
   */

  //#region

  public has(id: string): boolean {
    return this.documents.has(id);
  }

  //#endregion

  /*
   |--------------------------------------------------------------------------------
   | Status
   |--------------------------------------------------------------------------------
   */

  //#region

  public is(status: Status): boolean {
    return this.status === status;
  }

  private setStatus(value: Status): this {
    this.status = value;
    this.emit(value);
    return this;
  }

  //#endregion

  /*
   |--------------------------------------------------------------------------------
   | Event Handler
   |--------------------------------------------------------------------------------
   */

  //#region

  public onChange(cb: (type: ChangeType, document: Document) => void): () => void {
    this.addListener("change", cb);
    return () => {
      this.removeListener("change", cb);
    };
  }

  //#endregion

  /*
   |--------------------------------------------------------------------------------
   | Persistors
   |--------------------------------------------------------------------------------
   */

  //#region

  public async load(): Promise<this> {
    if (!this.is("loading")) {
      return this;
    }
    const documents = await this.adapter.get(this.name);
    for (const document of documents) {
      this.documents.set(document.id, document);
    }
    return this.setStatus("ready").process();
  }

  public async save(): Promise<this> {
    if (this.debounce.save) {
      clearTimeout(this.debounce.save);
    }
    this.debounce.save = setTimeout(() => {
      this.adapter.set(this.name, this.data);
    }, 500);
    return this;
  }

  /*
   |--------------------------------------------------------------------------------
   | Mutators
   |--------------------------------------------------------------------------------
   */

  //#region

  public async insert(document: Document): Promise<Document> {
    return new Promise((resolve, reject) => {
      this.load().then(() => {
        this.operations.push({ type: "insert", document, resolve, reject });
        this.process();
      });
    });
  }

  public async update(document: Document): Promise<Document> {
    return new Promise((resolve, reject) => {
      this.load().then(() => {
        this.operations.push({ type: "update", document, resolve, reject });
        this.process();
      });
    });
  }

  public async upsert(document: Document): Promise<Document> {
    return new Promise((resolve, reject) => {
      this.load().then(() => {
        this.operations.push({ type: "upsert", document, resolve, reject });
        this.process();
      });
    });
  }

  public async delete(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.load().then(() => {
        this.operations.push({ type: "delete", id, resolve, reject });
        this.process();
      });
    });
  }

  //#endregion

  /*
   |--------------------------------------------------------------------------------
   | Processor
   |--------------------------------------------------------------------------------
   */

  //#region

  private async process(): Promise<this> {
    if (this.is("loading") || this.is("working")) {
      return this;
    }

    this.setStatus("working");

    const operation = this.operations.shift();
    if (!operation) {
      return this.setStatus("ready");
    }

    try {
      operation.resolve(this.resolve(operation));
      this.save();
    } catch (error: any) {
      operation.reject(error);
    }

    this.setStatus("ready").process();

    return this;
  }

  private resolve(operation: Delete, attempts?: number): undefined;
  private resolve(operation: Operation, attempts?: number): Document;
  private resolve(operation: Operation, attempts = 0): Document | undefined {
    switch (operation.type) {
      case "insert": {
        const { id = nanoid(), ...data } = operation.document;
        if (this.documents.has(id)) {
          if (operation.document.id === undefined && attempts < 3) {
            return this.resolve(operation, attempts + 1);
          }
          throw new Storage.DuplicateDocumentError(id);
        }
        const document = { id, ...data };
        this.documents.set(id, document);
        this.emit("change", "insert", document);
        return document;
      }
      case "update": {
        const data = operation.document;
        if (!this.documents.has(data.id)) {
          throw new Storage.DocumentNotFoundError(data.id);
        }
        const document = { ...this.documents.get(data.id), ...data };
        this.documents.set(data.id, document);
        this.emit("change", "update", document);
        return document;
      }
      case "upsert": {
        const data = operation.document;
        let document: Document;
        if (this.documents.has(data.id)) {
          document = { ...this.documents.get(data.id), ...data };
          this.documents.set(data.id, document);
          this.emit("change", "update", document);
        } else {
          document = data;
          this.documents.set(document.id, document);
          this.emit("change", "insert", document);
        }
        return document;
      }
      case "delete": {
        this.documents.delete(operation.id);
        this.emit("change", "delete", { id: operation.id });
        break;
      }
    }
  }

  //#endregion
}

//#endregion
