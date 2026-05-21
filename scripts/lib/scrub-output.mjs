/**
 * Brand-rule scrubber for LLM-generated reel scripts.
 *
 * Enforces hard rules from docs/plans/PLAYBOOK.md and docs/plans/blog-content-plan.md:
 *
 *   1. NO em dashes (—), en dashes (–), or `--`. Replaced with periods or commas.
 *      ("they scream 'generated text' when overused" — blog-content-plan.md:71)
 *   2. NO US-only finance terms: 401(k), IRA, Roth, FICO, Social Security, HSA, 529.
 *   3. NO India-only framing: #desifinance, #indiansineurope, "lakh"/"crore" units in
 *      narration (acceptable in caption only if explicitly Indian-audience post).
 *   4. NO MiFID-violating content: tickers ($XYZ, named brokerages),
 *      return-as-fact phrasing ("X returns 8% per year").
 *   5. CTA must be in the approved set: save / tag / share / poll. Reject
 *      "comment X for Y", "follow for more", "DM me", "first N people".
 *   6. NO emoji-only sentences. (Brand voice is editorial.)
 *
 * Strategy: auto-fix where unambiguous (dashes), throw with line + suggestion
 * for everything else so the operator/LLM can rewrite.
 */

const DASH_RE = /[—–]|--/g;

// Auto-convert "EUR 10,000" → "€10,000" so downstream regexes (math
// consistency, currency formatting) can rely on a single canonical token.
// Negative lookbehind skips "USD/EUR" exchange-rate phrasing, which must
// stay verbatim.
const EUR_PREFIX_RE = /(?<!USD\s*\/\s*)\bEUR\s+(\d[\d,]*(?:\.\d+)?)/g;

// Common placeholder strings the LLM occasionally emits when it's confused
// or when a JSON template leaks through. We treat any of these as a hard
// failure on a narration / onscreenText field.
const PLACEHOLDER_VALUES = new Set([
  "narration",
  "onscreentext",
  "onscreen text",
  "subtext",
  "tbd",
  "todo",
  "placeholder",
  "lorem ipsum",
  "...",
  "—",
]);

const US_ONLY_TERMS = [
  // Tax-advantaged vehicles
  /\b401\s*[(\-]?\s*k[)\-]?\b/i,
  /\bIRA\b/,
  /\bRoth\b/,
  /\bFICO\b/i,
  /\bSocial Security\b/i,
  /\bHSA\b/,
  /\b529\s+plan\b/i,
  /\bW-?2\b/,
  /\bAmericanExpat\b/i,
  // Currency: hard-block "$" prefix and "dollar(s)" in narration; the scrub
  // suggestion is to convert to EUR. (Captions allowed because operators may
  // explicitly write a multi-currency CTA, but narration must default to EUR.)
  /\$\s?\d/,
  /\b(US ?dollars?|U\.S\. ?dollars?)\b/i,
  /\bUSD\b(?!\s*\/\s*EUR)/, // permit "USD/EUR" in conversion contexts
  // Federal / state apparatus
  /\b(Federal Reserve|the\s+Fed)\b/i,
  /\bWall Street\b/i,
  /\bIRS\b/,
  /\b(Medicare|Medicaid|Obamacare|Affordable Care Act|ACA)\b/i,
  // US retailers / brands as proxies for "everyday spending".
  // Case-sensitive: these are proper nouns. "Target" the English word is too
  // common to safely filter case-insensitively, so we drop it from the list
  // entirely. Walmart / Costco etc. are unambiguous as brand names.
  /\b(Walmart|Costco|Kroger|Walgreens|Whole Foods|Trader Joe'?s|Best Buy)\b/,
  /\bCVS\b/, // case-sensitive (CVS is unambiguously the retailer in caps)
  // US holidays and cultural anchors. Mostly capitalized in practice; we
  // permit the /i flag because "thanksgiving" / "black friday" lowercased
  // are still US-anchored.
  /\b(Thanksgiving|Black Friday|July\s*4(th)?|Memorial Day|Labor Day|Super Bowl|Cyber Monday)\b/i,
  // Geography references that anchor "American everyday"
  /\bSilicon Valley\b/i,
  // US-specific finance jargon
  /\b(prime mortgage|conforming loan|jumbo loan)\b/i,
];

const INDIA_ONLY_TERMS = [
  /\b(lakh|crore|paisa)\b/i,
  /\b(SIP|ELSS|PPF|EPF|NPS)\b/, // Indian-only investment vehicles in narration
  /#desifinance/i,
  /#indiansineurope/i,
  /#indianfinance/i,
];

const TICKER_RE = /\$[A-Z]{1,5}\b/;

const NAMED_BROKERS = [
  /\b(Vanguard|Fidelity|Schwab|Robinhood|eToro|Trading\s*212|Interactive\s*Brokers|Degiro|Trade\s*Republic|XTB|Revolut\s*Trade|Plus500|IG\s*Markets)\b/i,
];

// Range-collapse patterns: the LLM occasionally drops the separator in a
// numeric range, e.g. "4 to 6%" → "46%", "25 to 35" → "2535". The narration
// usually reads correctly but the on-screen text loses the range entirely.
// We catch the high-risk, unambiguous case (ages 3–4 digits) here. Other
// numeric collapses (percent, money) are caught by math-consistency.mjs and
// by the LLM-prompt guard in llm-script-writer.mjs.
const RANGE_COLLAPSE_AGE = /\bage[ds]?\s+(\d{3,4})\b/i;
// Two adjacent €-amounts with no separator: never legitimate in our copy
// ("€6,000€12,000" should be "€6,000 to €12,000"). Catches money-range
// collapses without false-positive risk.
const RANGE_COLLAPSE_CURRENCY = /€[\d,.]+€\d/;

// Return-as-fact patterns (heuristic, false-positive prone but useful)
const RETURN_AS_FACT = [
  /\b(stocks|equities|the\s+market|S&P\s*500)\s+(returns?|will\s+return|gives?\s+you|delivers?)\s+\d/i,
  /\bguaranteed\s+\d+\s*%/i,
  /\byou\s+will\s+earn\s+\d+\s*%/i,
];

const BANNED_CTAS = [
  /\bcomment\s+\w+\s+(?:and\s+I'?ll|to\s+get|for\s+(?:the|a))/i,
  /\bDM\s+me\b/i,
  /\bfirst\s+\d+\s+(replies|comments)/i,
  // Generic "follow for more / follow for tips" stays banned.
  // Specific series asks ("follow for the rest of the basics series") are
  // allowed because they tie to the series-anchoring play.
  /\bfollow\s+for\s+(more|tips|content|posts|videos)\b/i,
  /\blink\s+in\s+bio\s+now\b/i, // urgency-bait phrasing
];

/**
 * Suggestion text per US-ism category. Helps the operator (or a regen prompt)
 * patch the violation precisely.
 * @param {string} match
 */
function usOnlySuggestion(match) {
  const m = match.toLowerCase();
  if (/401|ira|roth|529|hsa|w-?2/.test(m)) {
    return "Use EU framing: 'workplace pension', 'tax-advantaged retirement account', 'state pension'.";
  }
  if (/fico/.test(m)) {
    return "Use 'credit history' or 'credit score' (without the FICO brand).";
  }
  if (/social security/.test(m)) {
    return "Use 'state pension' or 'public retirement system'.";
  }
  if (/^\$\s?\d/.test(m) || /usd|dollar/.test(m)) {
    return "Default to EUR. Write 'EUR 3,000' (the renderer keeps plain text safe for TTS).";
  }
  if (/fed|federal reserve|wall street/.test(m)) {
    return "Use 'central banks' or 'the markets' generically; or name the ECB if EU-specific.";
  }
  if (/thanksgiving|black friday|super bowl|memorial day|labor day|july 4/.test(m)) {
    return "Pick a non-US cultural anchor (a payday, Christmas, the new tax year, a quarterly bill).";
  }
  if (/walmart|target|costco|kroger|cvs|walgreens|whole foods|trader joe|best buy/.test(m)) {
    return "Use a generic 'the supermarket', 'the corner shop', 'an online retailer'.";
  }
  if (/medicare|medicaid|obamacare|aca/.test(m)) {
    return "Use 'public healthcare' or country-neutral 'state-funded health cover'.";
  }
  if (/silicon valley/.test(m)) {
    return "Pick an EU equivalent ('Berlin tech scene', 'Lisbon startup hub') or generic 'the tech industry'.";
  }
  if (/irs/.test(m)) {
    return "Use 'the tax authority' or country-specific equivalent.";
  }
  if (/prime mortgage|conforming|jumbo/.test(m)) {
    return "Use generic 'mortgage' or describe the loan parameter (rate, term, deposit) directly.";
  }
  return "Reframe in EU/global terms.";
}

const APPROVED_CTA_HINTS = {
  save: ["save this", "save it", "bookmark"],
  tag: ["tag", "send this to"],
  share: ["share this", "send this"],
  poll: ["poll", "what's your"],
};

/** @typedef {{ field: string; rule: string; quote: string; suggestion?: string }} Violation */

/**
 * Detect placeholder / templated values that would ship as broken content.
 * Returns a single violation if the input is empty, a literal field name,
 * or a known placeholder token; otherwise null.
 *
 * @param {string} input
 * @param {string} field
 * @param {{ minWords?: number }} [opts]
 * @returns {Violation | null}
 */
export function detectPlaceholder(input, field, opts = {}) {
  const minWords = opts.minWords ?? 1;
  const trimmed = (input ?? "").trim();
  if (trimmed.length === 0) {
    return {
      field,
      rule: "placeholder",
      quote: "(empty)",
      suggestion: `Field "${field}" is empty. Write the actual content.`,
    };
  }
  if (PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) {
    return {
      field,
      rule: "placeholder",
      quote: trimmed,
      suggestion: `Field "${field}" contains the literal placeholder "${trimmed}". Replace with real content.`,
    };
  }
  // A narration string with fewer than `minWords` words is almost certainly
  // a placeholder or a debugging artifact.
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount < minWords) {
    return {
      field,
      rule: "placeholder",
      quote: trimmed,
      suggestion: `Field "${field}" has only ${wordCount} word(s); expected at least ${minWords}. Write real content.`,
    };
  }
  return null;
}

/**
 * Scrub a single string in place.
 * Returns the cleaned string + any violations that require human/LLM intervention.
 *
 * @param {string} input
 * @param {string} field - dotted path for error messages
 * @returns {{ cleaned: string; violations: Violation[] }}
 */
export function scrubString(input, field) {
  /** @type {Violation[]} */
  const violations = [];
  let cleaned = input;

  // 0. Auto-convert "EUR 10,000" → "€10,000" before any other processing.
  // This is unambiguous and lets the math-consistency regex match
  // €-prefixed amounts in narration that the LLM wrote with the EUR prefix.
  cleaned = cleaned.replace(EUR_PREFIX_RE, "€$1");

  // 1. Auto-fix dashes.
  // Em/en dash inside a clause becomes a comma; otherwise period.
  cleaned = cleaned.replace(DASH_RE, (match, offset, full) => {
    const before = full[offset - 1];
    const after = full[offset + match.length];
    // If surrounded by spaces, prefer comma + space (mid-clause break).
    if (before === " " && after === " ") return ",";
    // No spacing: just delete (rare but possible in compound words).
    return "";
  });
  // Squeeze accidental double commas. Collapse only horizontal whitespace
  // runs (preserving \n so multi-line caption fields keep their structure).
  cleaned = cleaned
    .replace(/,[ \t]*,/g, ",")
    .replace(/[ \t]+,/g, ",")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  for (const re of US_ONLY_TERMS) {
    const m = cleaned.match(re);
    if (m) {
      violations.push({
        field,
        rule: "us-only-term",
        quote: m[0],
        suggestion: usOnlySuggestion(m[0]),
      });
    }
  }

  for (const re of INDIA_ONLY_TERMS) {
    const m = cleaned.match(re);
    if (m) {
      violations.push({
        field,
        rule: "india-only-term",
        quote: m[0],
        suggestion: "Use universal framing (e.g. 'monthly investment plan' instead of SIP, EUR units instead of lakh/crore).",
      });
    }
  }

  const tickerMatch = cleaned.match(TICKER_RE);
  if (tickerMatch) {
    violations.push({
      field,
      rule: "ticker",
      quote: tickerMatch[0],
      suggestion: "Remove ticker. Refer to the asset class (e.g. 'a broad equity index fund') not a specific instrument (MiFID).",
    });
  }

  for (const re of NAMED_BROKERS) {
    const m = cleaned.match(re);
    if (m) {
      violations.push({
        field,
        rule: "named-broker",
        quote: m[0],
        suggestion: "Remove brokerage name. Use a generic descriptor ('a brokerage', 'an investment platform').",
      });
    }
  }

  const ageMatch = cleaned.match(RANGE_COLLAPSE_AGE);
  if (ageMatch) {
    violations.push({
      field,
      rule: "range-collapse",
      quote: ageMatch[0],
      suggestion: `"${ageMatch[0]}" looks like a collapsed age range. Write "Age 25 to 35" or "Age 25-35", not "Age 2535".`,
    });
  }

  const currencyCollapseMatch = cleaned.match(RANGE_COLLAPSE_CURRENCY);
  if (currencyCollapseMatch) {
    violations.push({
      field,
      rule: "range-collapse",
      quote: currencyCollapseMatch[0],
      suggestion: `Two €-amounts joined with no separator. Write "€6,000 to €12,000" or "€6k to €12k", not "€6,000€12,000".`,
    });
  }

  for (const re of RETURN_AS_FACT) {
    const m = cleaned.match(re);
    if (m) {
      violations.push({
        field,
        rule: "return-as-fact",
        quote: m[0],
        suggestion: "Frame returns as historical or illustrative ('historically averaged X% before inflation', 'in this illustrative scenario').",
      });
    }
  }

  return { cleaned, violations };
}

/**
 * Validate that the CTA narration matches its declared `approved` type.
 * @param {{ approved: string; narration: string; onscreenText: string }} cta
 * @returns {Violation[]}
 */
export function validateCTA(cta) {
  /** @type {Violation[]} */
  const violations = [];

  if (!["save", "tag", "share", "poll"].includes(cta.approved)) {
    violations.push({
      field: "cta.approved",
      rule: "unapproved-cta-type",
      quote: cta.approved,
      suggestion: "Must be one of: save, tag, share, poll.",
    });
    return violations;
  }

  const combined = `${cta.narration} ${cta.onscreenText}`.toLowerCase();

  for (const re of BANNED_CTAS) {
    const m = combined.match(re);
    if (m) {
      violations.push({
        field: "cta.narration",
        rule: "banned-cta-phrase",
        quote: m[0],
        suggestion: "Use Save / Tag / Share / Poll only (PLAYBOOK §Engagement).",
      });
    }
  }

  // Soft check: declared CTA type should appear in the narration.
  const hints = APPROVED_CTA_HINTS[cta.approved];
  if (!hints.some(h => combined.includes(h))) {
    violations.push({
      field: "cta.narration",
      rule: "cta-type-mismatch",
      quote: cta.narration,
      suggestion: `Declared CTA type "${cta.approved}" but narration does not contain any of: ${hints.join(", ")}.`,
    });
  }

  return violations;
}

import { checkMathConsistency, checkMiFIDFraming } from "./math-consistency.mjs";

/**
 * Walk a ReelPlan and scrub every user-facing string. Returns the cleaned
 * plan plus an array of unresolved violations. Caller decides whether to
 * throw, regenerate, or proceed.
 *
 * @param {import('../../remotion/src/data').ReelPlan} plan
 */
export function scrubPlan(plan) {
  /** @type {Violation[]} */
  const violations = [];
  const cleaned = JSON.parse(JSON.stringify(plan));

  const fields = [
    ["topic", v => { cleaned.topic = v; }, plan.topic],
  ];
  for (const [field, set, val] of fields) {
    const r = scrubString(val, field);
    set(r.cleaned);
    violations.push(...r.violations);
  }

  for (let i = 0; i < cleaned.hookVariants.length; i++) {
    const h = cleaned.hookVariants[i];
    const ph = detectPlaceholder(h.narration, `hookVariants[${i}].narration`, { minWords: 3 });
    if (ph) violations.push(ph);
    const a = scrubString(h.narration, `hookVariants[${i}].narration`);
    h.narration = a.cleaned;
    violations.push(...a.violations);

    h.onscreenLines = h.onscreenLines.map((line, j) => {
      const r = scrubString(line, `hookVariants[${i}].onscreenLines[${j}]`);
      violations.push(...r.violations);
      return r.cleaned;
    });
  }

  for (let i = 0; i < cleaned.beats.length; i++) {
    const b = cleaned.beats[i];
    // Narration must be substantive prose; onscreenText must be non-empty.
    const phNarr = detectPlaceholder(b.narration, `beats[${i}].narration`, { minWords: 3 });
    if (phNarr) violations.push(phNarr);
    const phOnscreen = detectPlaceholder(b.onscreenText, `beats[${i}].onscreenText`, { minWords: 1 });
    if (phOnscreen) violations.push(phOnscreen);

    const fieldsToScrub = [
      ["narration", b.narration],
      ["onscreenText", b.onscreenText],
    ];
    if (b.subtext) fieldsToScrub.push(["subtext", b.subtext]);
    for (const [k, v] of fieldsToScrub) {
      const r = scrubString(v, `beats[${i}].${k}`);
      b[k] = r.cleaned;
      violations.push(...r.violations);
    }
    if (b.anchor) {
      // Scrub anchor text fields where present.
      if (b.anchor.type === "stat") {
        const r1 = scrubString(b.anchor.value, `beats[${i}].anchor.value`);
        b.anchor.value = r1.cleaned; violations.push(...r1.violations);
        if (b.anchor.label) {
          const r2 = scrubString(b.anchor.label, `beats[${i}].anchor.label`);
          b.anchor.label = r2.cleaned; violations.push(...r2.violations);
        }
      } else if (b.anchor.type === "list") {
        b.anchor.items = b.anchor.items.map((item, j) => {
          const r = scrubString(item, `beats[${i}].anchor.items[${j}]`);
          violations.push(...r.violations);
          return r.cleaned;
        });
      } else if (b.anchor.type === "compare") {
        for (const side of ["left", "right"]) {
          const r1 = scrubString(b.anchor[side].label, `beats[${i}].anchor.${side}.label`);
          b.anchor[side].label = r1.cleaned; violations.push(...r1.violations);
          const r2 = scrubString(b.anchor[side].value, `beats[${i}].anchor.${side}.value`);
          b.anchor[side].value = r2.cleaned; violations.push(...r2.violations);
        }
      }
    }
  }

  // CTA
  const ctaNarr = scrubString(cleaned.cta.narration, "cta.narration");
  cleaned.cta.narration = ctaNarr.cleaned;
  violations.push(...ctaNarr.violations);
  const ctaText = scrubString(cleaned.cta.onscreenText, "cta.onscreenText");
  cleaned.cta.onscreenText = ctaText.cleaned;
  violations.push(...ctaText.violations);
  if (cleaned.cta.subtext) {
    const r = scrubString(cleaned.cta.subtext, "cta.subtext");
    cleaned.cta.subtext = r.cleaned;
    violations.push(...r.violations);
  }
  if (cleaned.cta.followAsk) {
    const r = scrubString(cleaned.cta.followAsk, "cta.followAsk");
    cleaned.cta.followAsk = r.cleaned;
    violations.push(...r.violations);
    // The follow ask is also subject to the banned-CTA-phrase filter.
    for (const re of BANNED_CTAS) {
      const m = r.cleaned.match(re);
      if (m) {
        violations.push({
          field: "cta.followAsk",
          rule: "banned-cta-phrase",
          quote: m[0],
          suggestion: "Use a specific series ask: 'For the rest of the Basics series.' Generic 'for more / for tips' is banned.",
        });
      }
    }
  }
  violations.push(...validateCTA(cleaned.cta));

  // Caption (platform copy, more permissive on emojis but still no dashes / banned terms)
  const capIg = scrubString(cleaned.caption.instagram, "caption.instagram");
  cleaned.caption.instagram = capIg.cleaned;
  violations.push(...capIg.violations);
  const capTt = scrubString(cleaned.caption.tiktok, "caption.tiktok");
  cleaned.caption.tiktok = capTt.cleaned;
  violations.push(...capTt.violations);

  // Hashtags: must not contain banned tags or US-isms.
  // Saturated tags (personalfinance / financialliteracy / moneytips) are
  // banned per PLAYBOOK §Hashtags and Decision #25.
  const BANNED_TAGS = [
    /^desifinance$/i, /^indiansineurope$/i, /^indianfinance$/i,
    /^americanexpat$/i, /^401k$/i, /^ira$/i, /^roth$/i, /^fico$/i,
    /^personalfinance$/i, /^financialliteracy$/i, /^moneytips$/i,
    /^fyp$/i, /^foryou$/i, /^foryoupage$/i,
  ];
  for (let i = 0; i < cleaned.hashtags.length; i++) {
    const tag = cleaned.hashtags[i].replace(/^#/, "");
    cleaned.hashtags[i] = tag;
    if (BANNED_TAGS.some(re => re.test(tag))) {
      violations.push({
        field: `hashtags[${i}]`,
        rule: "banned-hashtag",
        quote: `#${tag}`,
        suggestion: "Replace with an EU-leaning expat-finance tag (#fireeurope, #expatfinance, #personalfinanceeurope, etc.).",
      });
    }
  }
  if (cleaned.hashtags.length > 5) {
    violations.push({
      field: "hashtags",
      rule: "too-many-hashtags",
      quote: `${cleaned.hashtags.length}`,
      suggestion: "Cap at 5 (PLAYBOOK §Hashtags).",
    });
  }

  // Caption keyword block (May 2026 — IG-only multilingual search surface).
  // Validates count, ban list, dedupe within array, and dedupe vs hashtag
  // list. PLAYBOOK §6 documents the rationale; the hashtag/keyword surfaces
  // are distinct (community-follow vs search-query), so duplicating a term
  // across both pays for the same reach twice and wastes a slot.
  const igKeywords = cleaned.caption.instagramKeywords;
  if (Array.isArray(igKeywords)) {
    // Strip leading # (defensive — keywords are not tags) and tidy whitespace.
    cleaned.caption.instagramKeywords = igKeywords.map(k =>
      String(k).replace(/^#/, "").trim()
    ).filter(k => k.length > 0);
    const kws = cleaned.caption.instagramKeywords;

    if (kws.length < 13 || kws.length > 18) {
      violations.push({
        field: "caption.instagramKeywords",
        rule: "keyword-count-out-of-range",
        quote: `${kws.length}`,
        suggestion: "PLAYBOOK §6 sweet spot is 13–18 keywords per post. Below 13 leaves reach on the table; above ~30 triggers the IG spam filter; above 60 drops the post out of recommended-to-non-followers.",
      });
    }

    // Banned terms inside keywords (same ban list as hashtags + caption body).
    for (let i = 0; i < kws.length; i++) {
      const kw = kws[i];
      if (/^#/.test(kw)) {
        violations.push({
          field: `caption.instagramKeywords[${i}]`,
          rule: "keyword-has-hash",
          quote: kw,
          suggestion: "Keywords are not tags. Drop the leading #.",
        });
      }
      // Reuse the same US-only / India-only / banned-retailer regex set
      // from scrubString by running each keyword through it.
      const r = scrubString(kw, `caption.instagramKeywords[${i}]`);
      violations.push(...r.violations);
    }

    // Dedupe within array (case-insensitive).
    const seen = new Map();
    for (let i = 0; i < kws.length; i++) {
      const norm = kws[i].toLowerCase();
      if (seen.has(norm)) {
        violations.push({
          field: `caption.instagramKeywords[${i}]`,
          rule: "keyword-duplicate-in-array",
          quote: kws[i],
          suggestion: `Already at index ${seen.get(norm)}. Replace with a different concept or translation.`,
        });
      } else {
        seen.set(norm, i);
      }
    }

    // No keyword may equal a hashtag (token-collapse comparison: "expat
    // finance" vs `#expatfinance`). Hashtags = community follow, keywords =
    // search query — duplicating across surfaces wastes a slot.
    const hashtagSet = new Set(cleaned.hashtags.map(t => t.toLowerCase().replace(/[\s\-_]/g, "")));
    for (let i = 0; i < kws.length; i++) {
      const collapsed = kws[i].toLowerCase().replace(/[\s\-_]/g, "");
      if (hashtagSet.has(collapsed)) {
        violations.push({
          field: `caption.instagramKeywords[${i}]`,
          rule: "keyword-duplicates-hashtag",
          quote: kws[i],
          suggestion: `"${kws[i]}" matches a hashtag (#${collapsed}). Hashtags and keywords are distinct surfaces — pick a different concept, multilingual variant, or long-tail phrase for the keyword slot.`,
        });
      }
    }
  }

  // TikTok topics line (May 2026 — natural-language search-query phrases).
  const ttTopics = cleaned.caption.tiktokTopics;
  if (Array.isArray(ttTopics)) {
    cleaned.caption.tiktokTopics = ttTopics.map(t =>
      String(t).replace(/^#/, "").trim()
    ).filter(t => t.length > 0);
    const tts = cleaned.caption.tiktokTopics;

    if (tts.length < 3 || tts.length > 5) {
      violations.push({
        field: "caption.tiktokTopics",
        rule: "tiktok-topics-count-out-of-range",
        quote: `${tts.length}`,
        suggestion: "TikTok 'Topics:' line takes 3–5 natural-language search-query phrases. Below 3 misses reach; above 5 reads as keyword stuffing.",
      });
    }

    for (let i = 0; i < tts.length; i++) {
      const r = scrubString(tts[i], `caption.tiktokTopics[${i}]`);
      violations.push(...r.violations);
    }

    // Discourage byte-for-byte duplication with IG keywords. TikTok phrases
    // and IG keywords cover overlapping concepts naturally; explicit
    // duplication signals lazy authoring rather than per-platform tuning.
    if (Array.isArray(igKeywords) && igKeywords.length > 0) {
      const igSet = new Set(igKeywords.map(k => String(k).toLowerCase().trim()));
      for (let i = 0; i < tts.length; i++) {
        if (igSet.has(tts[i].toLowerCase())) {
          violations.push({
            field: `caption.tiktokTopics[${i}]`,
            rule: "tiktok-topic-duplicates-ig-keyword",
            quote: tts[i],
            suggestion: "Rewrite as a natural-language search query (e.g. 'how compound interest works' rather than 'compound interest'). TikTok and IG surfaces reward different phrasings.",
          });
        }
      }
    }
  }

  // TikTok extra tags (May 2026 — TikTok tolerates 5-7 hashtags vs IG's 5).
  const ttExtraTags = cleaned.caption.tiktokExtraTags;
  if (Array.isArray(ttExtraTags)) {
    cleaned.caption.tiktokExtraTags = ttExtraTags.map(t =>
      String(t).replace(/^#/, "").trim()
    ).filter(t => t.length > 0);
    const ets = cleaned.caption.tiktokExtraTags;

    if (ets.length > 3) {
      violations.push({
        field: "caption.tiktokExtraTags",
        rule: "tiktok-extra-tags-too-many",
        quote: `${ets.length}`,
        suggestion: "Cap TikTok extras at 3 (combined with the 5 IG hashtags = 8, near the platform's 7-cap recommendation).",
      });
    }

    for (let i = 0; i < ets.length; i++) {
      const tag = ets[i];
      if (BANNED_TAGS.some(re => re.test(tag))) {
        violations.push({
          field: `caption.tiktokExtraTags[${i}]`,
          rule: "banned-hashtag",
          quote: `#${tag}`,
          suggestion: "Use a TikTok-native niche: #moneytok, #financetok, #financialeducation, #expatlifehacks. Never #fyp / #foryou (saturated, flagged).",
        });
      }
      // Disallow duplication with the main IG hashtag list — extras should
      // be ADDITIONAL niche reach, not repeats.
      if (cleaned.hashtags.some(h => h.toLowerCase() === tag.toLowerCase())) {
        violations.push({
          field: `caption.tiktokExtraTags[${i}]`,
          rule: "tiktok-extra-tag-duplicates-hashtag",
          quote: `#${tag}`,
          suggestion: `#${tag} is already in the main hashtag list. Extras should be additional niches.`,
        });
      }
    }
  }

  // Math-consistency + MiFID framing passes (financial-correctness audit).
  violations.push(...checkMathConsistency(cleaned));
  violations.push(...checkMiFIDFraming(cleaned));

  return { plan: cleaned, violations };
}

/**
 * Throw if any violations are present. Used as a hard gate before TTS / render.
 * @param {Violation[]} violations
 */
export function assertNoViolations(violations) {
  if (violations.length === 0) return;
  const lines = violations.map((v, i) =>
    `  ${i + 1}. [${v.rule}] ${v.field}: "${v.quote}"\n     → ${v.suggestion ?? "(no suggestion)"}`
  );
  throw new Error(
    `Brand-rule violations detected (${violations.length}):\n${lines.join("\n")}\n\nFix the LLM output or rerun with --regenerate.`
  );
}
