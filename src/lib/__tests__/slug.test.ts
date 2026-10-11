import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "@/lib/slug";

describe("slug 生成", () => {
  it("小写化 + 非法字符转连字符 + 截断", () => {
    expect(slugify("Hello World 自考")).toBe("hello-world-自考");
    expect(slugify("A  B/C")).toBe("a-b-c");
  });

  it("空标题回退时间戳", () => {
    expect(slugify("！！！")).toMatch(/^item-\d+$/);
  });

  it("唯一性追加序号", async () => {
    const exists = new Set(["hello"]);
    const slug = await uniqueSlug("hello", (s) => Promise.resolve(exists.has(s)));
    expect(slug).toBe("hello-2");
  });
});
