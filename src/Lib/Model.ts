import type { Document } from "./Storage";

/*
 |--------------------------------------------------------------------------------
 | Types
 |--------------------------------------------------------------------------------
 */

export type ModelClass<T extends Model = Model> = {
  new (document: any): T;
};

/*
 |--------------------------------------------------------------------------------
 | Model
 |--------------------------------------------------------------------------------
 */

export abstract class Model<D extends Document = Document> {
  public static readonly $collection: string;

  public readonly id: string;

  constructor(document: D) {
    this.id = document.id;
  }

  /*
   |--------------------------------------------------------------------------------
   | Serializer
   |--------------------------------------------------------------------------------
   */

  public toJSON(props: any): D {
    return JSON.parse(
      JSON.stringify({
        id: this.id,
        ...props
      })
    );
  }
}
