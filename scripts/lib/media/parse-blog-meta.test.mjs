import { describe, it } from "node:test";
import assert from "node:assert";
import { parseFrontmatter, parseMarkdown } from "./parse-blog-meta.mjs";

describe("parseMarkdown", () => {
  it("extracts frontmatter and body separately", () => {
    const raw = `---
slug: "understanding-risk"
title: "Understanding Risk: What It Actually Means for Your Money"
level: "building"
order: 17
---

## Opening

This is the opening paragraph with a compelling scenario.

## What you can do

1. Separate your money by time horizon.
2. Build your emergency fund before taking investment risk.
3. Recognize the risk of inaction.
`;
    const { meta, body } = parseMarkdown(raw);
    assert.strictEqual(meta.slug, "understanding-risk");
    assert.strictEqual(meta.title, "Understanding Risk: What It Actually Means for Your Money");
    assert.strictEqual(meta.order, 17);
    assert.ok(body.includes("opening paragraph"));
    assert.ok(body.includes("What you can do"));
    assert.ok(!body.includes("---"));
    assert.ok(!body.includes("slug:"));
  });

  it("returns empty meta and raw body when no frontmatter", () => {
    const raw = `# Just a heading

Some content without frontmatter.
`;
    const { meta, body } = parseMarkdown(raw);
    assert.deepStrictEqual(meta, {});
    assert.strictEqual(body, raw);
  });
});

describe("parseFrontmatter", () => {
  it("parses simple string fields", () => {
    const raw = `---
slug: "understanding-risk"
title: "Understanding Risk: What It Actually Means for Your Money"
level: "building"
order: 17
---

# Content here
`;
    const result = parseFrontmatter(raw);
    assert.strictEqual(result.slug, "understanding-risk");
    assert.strictEqual(result.title, "Understanding Risk: What It Actually Means for Your Money");
    assert.strictEqual(result.level, "building");
    assert.strictEqual(result.order, 17);
  });

  it("parses tags array", () => {
    const raw = `---
slug: "test"
tags:
  - building
  - investing
  - risk
order: 1
---

Content
`;
    const result = parseFrontmatter(raw);
    assert.deepStrictEqual(result.tags, ["building", "investing", "risk"]);
  });

  it("parses inline array syntax", () => {
    const raw = `---
slug: "test"
tags: ["building", "investing"]
personas: ["eva", "petra"]
order: 1
---

Content
`;
    const result = parseFrontmatter(raw);
    assert.deepStrictEqual(result.tags, ["building", "investing"]);
    assert.deepStrictEqual(result.personas, ["eva", "petra"]);
  });

  it("returns empty object for no frontmatter", () => {
    const raw = `# Just a heading

Some content without frontmatter.
`;
    const result = parseFrontmatter(raw);
    assert.deepStrictEqual(result, {});
  });

  it("parses nested relatedTool object", () => {
    const raw = `---
slug: "test"
order: 1
relatedTool:
  url: "/free/multi-currency-net-worth"
  label: "Multi-currency net-worth calculator"
  cta: "Calculate yours in any currency"
reelPromise: "Worked example across 3 currencies + free calculator"
tags: ["discovery"]
---

Content
`;
    const result = parseFrontmatter(raw);
    assert.deepStrictEqual(result.relatedTool, {
      url: "/free/multi-currency-net-worth",
      label: "Multi-currency net-worth calculator",
      cta: "Calculate yours in any currency",
    });
    assert.strictEqual(
      result.reelPromise,
      "Worked example across 3 currencies + free calculator",
    );
    // Sibling fields after the nested object must still parse correctly.
    assert.deepStrictEqual(result.tags, ["discovery"]);
  });
});
