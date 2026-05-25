import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMediaCategoryOptions,
  partitionMediaItems,
  resolveMediaCategoryInput,
} from "../media-management.ts";

test("partitionMediaItems separates builtin assets from uploaded media", () => {
  const items = [
    { id: -1, category: "builtin", filename: "logo.png" },
    { id: 12, category: "banner", filename: "hero.jpg" },
    { id: 13, category: null, filename: "custom.webp" },
  ];

  const result = partitionMediaItems(items);

  assert.deepEqual(
    result.builtinItems.map((item) => item.filename),
    ["logo.png"],
  );
  assert.deepEqual(
    result.uploadedItems.map((item) => item.filename),
    ["hero.jpg", "custom.webp"],
  );
});

test("resolveMediaCategoryInput prefers custom category and trims whitespace", () => {
  assert.equal(resolveMediaCategoryInput("banner", "  homepage-hero  "), "homepage-hero");
  assert.equal(resolveMediaCategoryInput("banner", "   "), "banner");
  assert.equal(resolveMediaCategoryInput("", "   "), null);
});

test("buildMediaCategoryOptions merges preset and custom categories without duplicates", () => {
  const options = buildMediaCategoryOptions(["banner", "campus", "custom", "banner"]);

  assert.equal(options[0]?.value, "banner");
  assert.equal(options[1]?.value, "logo");
  assert.ok(options.some((item) => item.value === "custom"));
  assert.equal(
    options.filter((item) => item.value === "banner").length,
    1,
  );
});
