import { Index } from "../src/Lib/Index";

type Document = {
  id: string;
  name: string;
};

describe("Index", () => {
  describe("when creating a new index instance", () => {
    it("should add provided keys", () => {
      const index = new Index<Document>(["name"]);
      expect(index.keys.name).toBeDefined();
    });
  });

  describe("when adding a document", () => {
    it("should add document point for index value", () => {
      const index = new Index<Document>(["name"]);
      index.add({ id: "xyz", name: "John Doe" });
    });
  });
});
