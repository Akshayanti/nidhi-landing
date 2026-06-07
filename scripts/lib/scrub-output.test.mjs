import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { scrubString, validateCTA, scrubPlan, assertNoViolations, detectPlaceholder } from "./scrub-output.mjs";
import { checkMathConsistency, checkMiFIDFraming } from "./math-consistency.mjs";

describe("scrubString — dash auto-fix", () => {
  test("em dash with spaces becomes a comma", () => {
    const r = scrubString("Saving feels safe — but it isn't.", "x");
    assert.equal(r.cleaned, "Saving feels safe, but it isn't.");
    assert.equal(r.violations.length, 0);
  });

  test("en dash with spaces becomes a comma", () => {
    const r = scrubString("Three to six months – of essentials.", "x");
    assert.equal(r.cleaned, "Three to six months, of essentials.");
  });

  test("double hyphen becomes a comma", () => {
    const r = scrubString("Risk -- not danger -- is uncertainty.", "x");
    assert.equal(r.cleaned, "Risk, not danger, is uncertainty.");
  });

  test("preserves hyphens inside compound words", () => {
    const r = scrubString("It's a low-cost index fund.", "x");
    assert.equal(r.cleaned, "It's a low-cost index fund.");
  });
});

describe("scrubString — US-only rejection", () => {
  test("rejects 401k", () => {
    const r = scrubString("Max out your 401k now.", "x");
    assert.ok(r.violations.find(v => v.rule === "us-only-term"));
  });

  test("rejects $ currency prefix", () => {
    const r = scrubString("Save $3,000 in cash.", "x");
    assert.ok(r.violations.find(v => v.rule === "us-only-term" && v.quote.includes("$")));
  });

  test("rejects USD without EUR conversion context", () => {
    const r = scrubString("That's about USD 500 a month.", "x");
    assert.ok(r.violations.find(v => v.rule === "us-only-term"));
  });

  test("permits USD/EUR conversion phrasing", () => {
    const r = scrubString("Roughly USD/EUR 1.08 today.", "x");
    assert.equal(r.violations.filter(v => v.rule === "us-only-term").length, 0);
  });

  test("rejects FICO and Social Security", () => {
    const r1 = scrubString("Your FICO score matters.", "x");
    const r2 = scrubString("Don't rely on Social Security alone.", "x");
    assert.ok(r1.violations.find(v => v.rule === "us-only-term"));
    assert.ok(r2.violations.find(v => v.rule === "us-only-term"));
  });

  test("rejects US retailers and holidays", () => {
    const r1 = scrubString("Skip the Walmart run.", "x");
    const r2 = scrubString("Black Friday is the biggest spending trap.", "x");
    assert.ok(r1.violations.find(v => v.rule === "us-only-term"));
    assert.ok(r2.violations.find(v => v.rule === "us-only-term"));
  });

  test("does NOT flag the English word 'target' (false-positive guard)", () => {
    const r1 = scrubString("Set a target of three months of essentials.", "x");
    const r2 = scrubString("The full target is six months.", "x");
    const r3 = scrubString("Your target audience matters.", "x");
    assert.equal(r1.violations.filter(v => v.rule === "us-only-term").length, 0);
    assert.equal(r2.violations.filter(v => v.rule === "us-only-term").length, 0);
    assert.equal(r3.violations.filter(v => v.rule === "us-only-term").length, 0);
  });

  test("rejects Federal Reserve / Wall Street", () => {
    const r = scrubString("Watch what the Fed says about rates.", "x");
    assert.ok(r.violations.find(v => v.rule === "us-only-term"));
  });
});

describe("scrubString — India-only rejection", () => {
  test("rejects lakh / crore", () => {
    const r = scrubString("Save 5 lakh by next year.", "x");
    assert.ok(r.violations.find(v => v.rule === "india-only-term"));
  });

  test("rejects SIP/ELSS jargon", () => {
    const r = scrubString("Start a SIP for 5,000 a month.", "x");
    assert.ok(r.violations.find(v => v.rule === "india-only-term"));
  });
});

describe("scrubString — MiFID violations", () => {
  test("rejects tickers like $VTI", () => {
    const r = scrubString("Buy $VTI for diversification.", "x");
    assert.ok(r.violations.find(v => v.rule === "ticker"));
  });

  test("rejects named brokerages", () => {
    const r = scrubString("Open an account at Vanguard or Trading 212.", "x");
    assert.ok(r.violations.find(v => v.rule === "named-broker"));
  });

  test("rejects guaranteed return phrasing", () => {
    const r = scrubString("This gets you a guaranteed 8% per year.", "x");
    assert.ok(r.violations.find(v => v.rule === "return-as-fact"));
  });

  test("permits historical framing", () => {
    const r = scrubString("Equities historically averaged around 7% before inflation.", "x");
    assert.equal(r.violations.filter(v => v.rule === "return-as-fact").length, 0);
  });
});

describe("validateCTA", () => {
  test("approves a 'save' CTA narration that says 'save this'", () => {
    const v = validateCTA({ approved: "save", narration: "Save this for the day you'll need it.", onscreenText: "Save this" });
    assert.equal(v.length, 0);
  });

  test("rejects 'comment X for Y' CTA", () => {
    const v = validateCTA({ approved: "share", narration: "Comment FUND and I'll DM you the link.", onscreenText: "Comment FUND" });
    assert.ok(v.find(x => x.rule === "banned-cta-phrase"));
  });

  test("rejects 'follow for more' CTA", () => {
    const v = validateCTA({ approved: "save", narration: "Follow for more practical money breakdowns.", onscreenText: "Follow" });
    assert.ok(v.find(x => x.rule === "banned-cta-phrase"));
  });

  test("rejects unapproved CTA type", () => {
    const v = validateCTA({ approved: "subscribe", narration: "x", onscreenText: "x" });
    assert.ok(v.find(x => x.rule === "unapproved-cta-type"));
  });

  test("flags type/narration mismatch", () => {
    const v = validateCTA({ approved: "save", narration: "Send this to a friend.", onscreenText: "Send this" });
    assert.ok(v.find(x => x.rule === "cta-type-mismatch"));
  });
});

describe("scrubPlan + assertNoViolations integration", () => {
  const planTemplate = () => ({
    slug: "x",
    postTitle: "x",
    postLevel: "discovery",
    episode: 1,
    seriesTotal: 16,
    mode: "faithful",
    topic: "Emergency funds",
    mood: "calm-authority",
    hookVariants: [
      { id: "h1", layout: "big-number", narration: "One in four expats can't cover an emergency.", onscreenLines: ["One in four"], anchor: { type: "stat", value: "1 in 4", label: "couldn't cover EUR 400" }, emphasis: [] },
      { id: "h2", layout: "question", narration: "How long without income?", onscreenLines: ["How long?"] },
      { id: "h3", layout: "contradiction", narration: "Saving feels safe.", onscreenLines: ["Safe?"] },
    ],
    useHookVariant: 0,
    beats: [
      { id: "b1", kind: "definition", narration: "An emergency fund is cash for the unexpected.", onscreenText: "What it is" },
    ],
    cta: { approved: "save", narration: "Save this for the day you'll need it.", onscreenText: "Save this", handle: "@nidhi.today" },
    caption: { instagram: "First line. Hashtags below.", tiktok: "Short line." },
    hashtags: ["nidhi", "nidhibasics", "expatfinance", "emergencyfundeurope", "moneymindset"],
    availableFigures: [],
  });

  test("clean plan produces zero violations", () => {
    const r = scrubPlan(planTemplate());
    assert.equal(r.violations.length, 0);
    assertNoViolations(r.violations); // no-throw
  });

  test("auto-fixes em dashes inside narration", () => {
    const plan = planTemplate();
    plan.beats[0].narration = "An emergency fund — cash for the unexpected.";
    const r = scrubPlan(plan);
    assert.equal(r.plan.beats[0].narration, "An emergency fund, cash for the unexpected.");
  });

  test("throws on US-ism in narration", () => {
    const plan = planTemplate();
    plan.beats[0].narration = "Max out your 401k first.";
    const r = scrubPlan(plan);
    assert.throws(() => assertNoViolations(r.violations), /us-only-term/);
  });

  test("rejects banned hashtag", () => {
    const plan = planTemplate();
    plan.hashtags = ["nidhi", "nidhibasics", "desifinance", "fireeurope", "moneymindset"];
    const r = scrubPlan(plan);
    assert.ok(r.violations.find(v => v.rule === "banned-hashtag"));
  });

  test("flags > 5 hashtags", () => {
    const plan = planTemplate();
    plan.hashtags = ["nidhi", "a", "b", "c", "d", "e"];
    const r = scrubPlan(plan);
    assert.ok(r.violations.find(v => v.rule === "too-many-hashtags"));
  });
});

describe("scrubPlan — flow anchor", () => {
  const planWithFlow = (anchor) => ({
    slug: "x",
    postTitle: "x",
    postLevel: "building",
    episode: 1,
    seriesTotal: 16,
    mode: "faithful",
    topic: "Getting started investing",
    mood: "calm-authority",
    hookVariants: [
      { id: "h1", layout: "big-number", narration: "One in four expats can't cover an emergency.", onscreenLines: ["One in four"], anchor: { type: "stat", value: "1 in 4", label: "couldn't cover EUR 400" }, emphasis: [] },
      { id: "h2", layout: "question", narration: "How long without income?", onscreenLines: ["How long?"] },
      { id: "h3", layout: "contradiction", narration: "Saving feels safe.", onscreenLines: ["Safe?"] },
    ],
    useHookVariant: 0,
    beats: [
      { id: "b1", kind: "example", narration: "Four steps get your first portfolio running.", onscreenText: "How to start", anchor },
    ],
    cta: { approved: "save", narration: "Save this for the day you'll need it.", onscreenText: "Save this", handle: "@nidhi.today" },
    caption: { instagram: "First line.", tiktok: "Short line." },
    hashtags: ["nidhi", "nidhibuilding", "expatfinance", "indexinvesting", "wealthbuilding"],
    availableFigures: [],
  });

  const goodSteps = [
    { label: "Open a brokerage", detail: "any low-cost platform" },
    { label: "Pick a broad index fund" },
    { label: "Automate the transfer" },
    { label: "Rebalance once a year", outcome: true },
  ];

  test("a valid 4-step vertical flow produces zero violations", () => {
    const r = scrubPlan(planWithFlow({ type: "flow", orientation: "vertical", steps: goodSteps }));
    assert.equal(r.violations.length, 0);
    assertNoViolations(r.violations);
  });

  test("flags fewer than 3 steps", () => {
    const r = scrubPlan(planWithFlow({ type: "flow", steps: goodSteps.slice(0, 2) }));
    assert.ok(r.violations.find(v => v.rule === "flow-step-count"));
  });

  test("flags more than 5 steps", () => {
    const steps = [...goodSteps, { label: "Five" }, { label: "Six" }];
    const r = scrubPlan(planWithFlow({ type: "flow", steps }));
    assert.ok(r.violations.find(v => v.rule === "flow-step-count"));
  });

  test("flags horizontal orientation with more than 3 nodes", () => {
    const r = scrubPlan(planWithFlow({ type: "flow", orientation: "horizontal", steps: goodSteps }));
    assert.ok(r.violations.find(v => v.rule === "flow-horizontal-overflow"));
  });

  test("flags more than one outcome node", () => {
    const steps = goodSteps.map((s, i) => i < 2 ? { ...s, outcome: true } : s);
    const r = scrubPlan(planWithFlow({ type: "flow", steps }));
    assert.ok(r.violations.find(v => v.rule === "flow-multiple-outcomes"));
  });

  test("scrubs US-isms inside a step label", () => {
    const steps = [
      { label: "Open your 401k" },
      { label: "Pick a fund" },
      { label: "Automate it", outcome: true },
    ];
    const r = scrubPlan(planWithFlow({ type: "flow", steps }));
    assert.ok(r.violations.find(v => v.rule === "us-only-term" && v.field === "beats[0].anchor.steps[0].label"));
  });

  test("auto-fixes an em dash inside a step detail", () => {
    const steps = [
      { label: "Open a brokerage", detail: "fast — no paperwork" },
      { label: "Pick a fund" },
      { label: "Automate it", outcome: true },
    ];
    const r = scrubPlan(planWithFlow({ type: "flow", steps }));
    assert.equal(r.plan.beats[0].anchor.steps[0].detail, "fast, no paperwork");
  });
});

describe("scrubString — EUR prefix auto-conversion", () => {
  test("converts 'EUR 10,000' → '€10,000'", () => {
    const r = scrubString("You have EUR 10,000 in the bank today.", "x");
    assert.equal(r.cleaned, "You have €10,000 in the bank today.");
  });

  test("converts 'EUR 5,500' inside a sentence", () => {
    const r = scrubString("In thirty years, it buys EUR 5,500 worth of goods.", "x");
    assert.equal(r.cleaned, "In thirty years, it buys €5,500 worth of goods.");
  });

  test("preserves 'USD/EUR 1.08' exchange-rate phrasing", () => {
    const r = scrubString("Roughly USD/EUR 1.08 today.", "x");
    assert.equal(r.cleaned, "Roughly USD/EUR 1.08 today.");
    assert.equal(r.violations.filter(v => v.rule === "us-only-term").length, 0);
  });

  test("does not touch 'EUR' standalone (no following number)", () => {
    const r = scrubString("Prices in EUR are quoted gross.", "x");
    assert.equal(r.cleaned, "Prices in EUR are quoted gross.");
  });
});

describe("detectPlaceholder", () => {
  test("flags literal 'narration' as placeholder", () => {
    const v = detectPlaceholder("narration", "beats[5].narration", { minWords: 3 });
    assert.ok(v);
    assert.equal(v.rule, "placeholder");
  });

  test("flags empty narration", () => {
    const v = detectPlaceholder("", "beats[5].narration", { minWords: 3 });
    assert.ok(v);
    assert.equal(v.rule, "placeholder");
  });

  test("flags too-short narration", () => {
    const v = detectPlaceholder("Hi", "beats[5].narration", { minWords: 3 });
    assert.ok(v);
  });

  test("permits real narration", () => {
    const v = detectPlaceholder("An emergency fund is cash for the unexpected.", "beats[5].narration", { minWords: 3 });
    assert.equal(v, null);
  });
});

describe("scrubPlan — placeholder narration in beat", () => {
  const planWithPlaceholder = () => ({
    slug: "x",
    postTitle: "x",
    postLevel: "discovery",
    episode: 1,
    seriesTotal: 16,
    mode: "faithful",
    topic: "x",
    mood: "calm-authority",
    hookVariants: [
      { id: "h1", layout: "big-number", narration: "One in four expats can't cover an emergency.", onscreenLines: ["One in four"], anchor: { type: "stat", value: "1 in 4", label: "couldn't cover EUR 400" }, emphasis: [] },
      { id: "h2", layout: "question", narration: "How long without income?", onscreenLines: ["How long?"] },
      { id: "h3", layout: "contradiction", narration: "Saving feels safe.", onscreenLines: ["Safe?"] },
    ],
    useHookVariant: 0,
    beats: [
      { id: "b1", kind: "definition", narration: "narration", onscreenText: "x" },
    ],
    cta: { approved: "save", narration: "Save this for the day you'll need it.", onscreenText: "Save this", handle: "@nidhi.today" },
    caption: { instagram: "First line.", tiktok: "Short line." },
    hashtags: ["nidhi", "nidhibasics", "expatfinance", "emergencyfundeurope", "moneymindset"],
    availableFigures: [],
  });

  test("flags placeholder 'narration' in beats[0]", () => {
    const plan = planWithPlaceholder();
    const r = scrubPlan(plan);
    assert.ok(r.violations.find(v => v.rule === "placeholder" && v.field === "beats[0].narration"));
  });
});

describe("math-consistency: cross-sentence purchasing-power claim", () => {
  test("flags '€10,000 today ... €5,500 in 30 years' at 2.5% (real value is €4,767)", () => {
    const plan = {
      assumptions: { inflationPct: 2.5 },
      hookVariants: [{
        narration: "You have €10,000 in the bank today. In thirty years, it buys €5,500 worth of goods.",
        onscreenLines: ["x"],
      }],
      beats: [],
      cta: { narration: "Save this.", onscreenText: "Save this" },
    };
    const v = checkMathConsistency(plan);
    assert.ok(v.find(x => x.rule === "math-consistency"), `Expected math-consistency violation, got: ${JSON.stringify(v)}`);
  });

  test("permits '€10,000 today ... €4,800 in 30 years' at 2.5%", () => {
    const plan = {
      assumptions: { inflationPct: 2.5 },
      hookVariants: [{
        narration: "You have €10,000 in the bank today. In thirty years, it buys €4,800 worth of goods.",
        onscreenLines: ["x"],
      }],
      beats: [],
      cta: { narration: "Save this.", onscreenText: "Save this" },
    };
    const v = checkMathConsistency(plan);
    assert.equal(v.filter(x => x.rule === "math-consistency").length, 0);
  });

  test("flags hook with year phrase repeating across narration + onscreenLines (dedup regression)", () => {
    // Regression: a hook narration says "in 30 years" and the onscreenLine
    // repeats "IN 30 YEARS"; the year value is the same so Pattern B should
    // still apply. Earlier code aborted because it counted two year matches.
    const plan = {
      assumptions: { inflationPct: 2.5 },
      hookVariants: [{
        narration: "€10,000 in the bank today buys €5,500 worth of goods in 30 years.",
        onscreenLines: ["€10,000 TODAY", "€5,500 IN 30 YEARS"],
      }],
      beats: [],
      cta: { narration: "Save this.", onscreenText: "Save this" },
    };
    const v = checkMathConsistency(plan);
    assert.ok(v.find(x => x.rule === "math-consistency"), `Expected violation, got ${JSON.stringify(v)}`);
  });

  test("permits '€10,000 mattress ... €6,100 in 20 years' at 2.5%", () => {
    const plan = {
      assumptions: { inflationPct: 2.5 },
      hookVariants: [{
        narration: "Imagine €10,000 under your mattress. Twenty years later, same cash, but it only buys €6,100 worth of goods.",
        onscreenLines: ["x"],
      }],
      beats: [],
      cta: { narration: "Save this.", onscreenText: "Save this" },
    };
    const v = checkMathConsistency(plan);
    assert.equal(v.filter(x => x.rule === "math-consistency").length, 0);
  });
});

describe("math-consistency: months-in-future-years", () => {
  const base = (inflationPct, beatNarration) => ({
    assumptions: { inflationPct },
    hookVariants: [{ narration: "x", onscreenLines: ["x"] }],
    beats: [{ id: "b1", kind: "warning", narration: beatNarration, onscreenText: "x" }],
    cta: { narration: "Save this.", onscreenText: "Save this", subtext: "" },
  });

  test("flags 6→4 months in 10 years at 2.5% inflation (should be ~4.7)", () => {
    const v = checkMathConsistency(base(2.5, "Six months of expenses today might only cover four months in ten years."));
    assert.ok(v.find(x => x.rule === "math-consistency"));
  });

  test("permits 6→5 months in 10 years at 2.5% inflation", () => {
    const v = checkMathConsistency(base(2.5, "Six months today becomes about five months in ten years."));
    assert.equal(v.filter(x => x.rule === "math-consistency").length, 0);
  });

  test("permits 6→4 months in 16 years at 2.5% inflation", () => {
    const v = checkMathConsistency(base(2.5, "Six months today might cover only four months in sixteen years."));
    // 16 isn't a digit-only match for the regex (which expects /(\d+)\s*years/) and "sixteen" is text.
    // Either rewrite the test or let it pass. For robust checking, let's use "16 years":
    const v2 = checkMathConsistency(base(2.5, "Six months today might cover only four months in 16 years."));
    assert.equal(v2.filter(x => x.rule === "math-consistency").length, 0);
  });
});

describe("math-consistency: compound interest", () => {
  test("flags €10,000 at 0.5% for 30 years = €15,000 (correct is ~11,614)", () => {
    const plan = {
      assumptions: { savingsRatePct: 0.5 },
      hookVariants: [{ narration: "x", onscreenLines: ["x"] }],
      beats: [{ id: "b1", kind: "stat", narration: "Put €10,000 in a savings account at 0.5% for 30 years and you get €15,000.", onscreenText: "x" }],
      cta: { narration: "Save this.", onscreenText: "Save this" },
    };
    const v = checkMathConsistency(plan);
    assert.ok(v.find(x => x.rule === "math-consistency"));
  });

  test("permits €10,000 at 0.5% for 30 years = €11,614", () => {
    const plan = {
      assumptions: { savingsRatePct: 0.5 },
      hookVariants: [{ narration: "x", onscreenLines: ["x"] }],
      beats: [{ id: "b1", kind: "stat", narration: "Put €10,000 in a savings account at 0.5% for 30 years and you get €11,614.", onscreenText: "x" }],
      cta: { narration: "Save this.", onscreenText: "Save this" },
    };
    const v = checkMathConsistency(plan);
    assert.equal(v.filter(x => x.rule === "math-consistency").length, 0);
  });
});

describe("MiFID framing", () => {
  const plan = (narration, follow) => ({
    hookVariants: [{ narration: "x", onscreenLines: ["x"] }],
    beats: [
      { id: "b1", kind: "stat", narration, onscreenText: "x" },
      ...(follow ? [{ id: "b2", kind: "definition", narration: follow, onscreenText: "x" }] : []),
    ],
    cta: { narration: "Save this.", onscreenText: "Save this" },
  });

  test("flags 'stocks return 7%' (no hedge, no tail)", () => {
    const v = checkMiFIDFraming(plan("Stocks return 7% per year."));
    assert.ok(v.find(x => x.rule === "mifid-no-hedge"));
    assert.ok(v.find(x => x.rule === "mifid-no-tail"));
  });

  test("flags 'historically returned 7%' (hedge ok, tail missing)", () => {
    const v = checkMiFIDFraming(plan("Stocks have historically returned around 7% per year."));
    assert.equal(v.filter(x => x.rule === "mifid-no-hedge").length, 0);
    assert.ok(v.find(x => x.rule === "mifid-no-tail"));
  });

  test("permits 'historically returned 7%, future returns not guaranteed'", () => {
    const v = checkMiFIDFraming(plan(
      "Stocks have historically returned around 7% after inflation.",
      "Though future returns are not guaranteed.",
    ));
    assert.equal(v.length, 0);
  });
});
