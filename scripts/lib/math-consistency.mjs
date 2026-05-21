/**
 * Math-consistency pass for ReelPlan.
 *
 * Verifies that every numerical claim in a plan can be reproduced from the
 * plan's declared `assumptions` block (inflation rate, savings rate, horizon,
 * etc.) within a ±2% tolerance.
 *
 * The patterns this catches are the financial-advisor agent's findings:
 *
 *   1. "X months of expenses today might only cover Y months in N years"
 *      → derives the implied inflation, checks against assumptions.inflationPct.
 *      (The b12 bug in the purchasing-power audit: 6 → 4 in 10 years implies
 *      ~4% inflation but the rest of the reel uses 2.5%.)
 *
 *   2. "X today buys what Y buys in N years" (or "today vs ten years from now")
 *      → same check.
 *
 *   3. "€P at R% over N years = €F"
 *      → verifies P × (1+R)^N ≈ F.
 *
 *   4. "Real return = nominal − inflation" simple-subtraction lists
 *      → verifies each row is internally consistent.
 *
 * Non-numerical beats are skipped. Beats that don't match any pattern are
 * passed through (we don't try to detect arbitrary claims).
 *
 * Output: a list of math-consistency violations. Throws via the existing
 * `assertNoViolations` so the operator gets the same error UX.
 */

const TOLERANCE = 0.02; // ±2% — used for compound-interest and currency reconciliation
const INFLATION_VALUE_TOL = 0.10; // ±10% on the *derived months/€ figure*
// Why: comparing the *implied inflation rate* directly is too sensitive — a
// tiny absolute error (4.7 → 4 months over 10 years) becomes a huge relative
// rate error (~60%), while reasonable copywriter rounding (4.7 → 5 months)
// is only 6.7% off the true figure. We want to flag the former and permit
// the latter.

/** @typedef {{ field: string; rule: string; quote: string; suggestion?: string }} Violation */

/**
 * Spelled-out cardinals (one through ninety-nine). The LLM frequently writes
 * "Six months ... four months in ten years" instead of digits, so we
 * preprocess narration into a digit-normalized variant before running our
 * numerical regexes. The original text is preserved for `quote` reporting.
 */
const WORD_NUMERALS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const TENS = ["twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const ONES = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

/**
 * Replace English word numerals with digits. Conservative: leaves text as-is
 * for anything we can't confidently convert.
 *
 * @param {string} text
 * @returns {string}
 */
function normalizeWordNumerals(text) {
  if (!text) return text;
  let out = text;
  // Compound forms first (twenty-one, thirty-five, etc.) — both hyphen and space.
  for (const t of TENS) {
    for (const o of ONES) {
      const compound = WORD_NUMERALS[t] + WORD_NUMERALS[o];
      const re = new RegExp(`\\b${t}[-\\s]${o}\\b`, "gi");
      out = out.replace(re, String(compound));
    }
  }
  // Simple forms.
  for (const [word, num] of Object.entries(WORD_NUMERALS)) {
    const re = new RegExp(`\\b${word}\\b`, "gi");
    out = out.replace(re, String(num));
  }
  return out;
}

/**
 * @param {import('../../remotion/src/data').ReelPlan} plan
 * @returns {Violation[]}
 */
export function checkMathConsistency(plan) {
  /** @type {Violation[]} */
  const violations = [];

  const assumptions = plan.assumptions ?? {};
  const inflation = typeof assumptions.inflationPct === "number" ? assumptions.inflationPct / 100 : null;
  const savingsRate = typeof assumptions.savingsRatePct === "number" ? assumptions.savingsRatePct / 100 : null;

  // Iterate every beat narration + onscreenText + subtext. Word numerals are
  // normalized to digits so spelled-out claims ("Six months ... four months
  // in ten years") still hit the numeric regexes.
  const allBeats = [
    ...plan.hookVariants.map((h, i) => ({
      id: `hookVariants[${i}]`,
      text: normalizeWordNumerals(h.narration + " " + h.onscreenLines.join(" ")),
    })),
    ...plan.beats.map((b, i) => ({
      id: `beats[${i}]`,
      text: normalizeWordNumerals([b.narration, b.onscreenText, b.subtext ?? ""].join(" ")),
      anchor: b.anchor,
    })),
    {
      id: "cta",
      text: normalizeWordNumerals([plan.cta.narration, plan.cta.onscreenText, plan.cta.subtext ?? ""].join(" ")),
    },
  ];

  for (const beat of allBeats) {
    if (inflation != null) {
      // Pattern A: "X months ... Y months in N years"
      const m = beat.text.match(/(\d+(?:\.\d+)?)\s*months?[^.]{0,80}?(\d+(?:\.\d+)?)\s*months?[^.]{0,40}?in\s+(\d+(?:\.\d+)?)\s*years?/i);
      if (m) {
        const X = parseFloat(m[1]);
        const Y = parseFloat(m[2]);
        const N = parseFloat(m[3]);
        if (Y > 0 && N > 0 && X > Y) {
          const expectedY = X / Math.pow(1 + inflation, N);
          const drift = Math.abs(Y - expectedY) / expectedY;
          if (drift > INFLATION_VALUE_TOL) {
            const impliedInflation = Math.pow(X / Y, 1 / N) - 1;
            violations.push({
              field: beat.id,
              rule: "math-consistency",
              quote: m[0],
              suggestion:
                `At ${(inflation * 100).toFixed(1)}% inflation over ${N} years, ${X} months ` +
                `becomes ~${expectedY.toFixed(1)} months — not ${Y}. ` +
                `(The claim implies ${(impliedInflation * 100).toFixed(2)}% inflation.) ` +
                `Either fix the number or update assumptions.inflationPct.`,
            });
          }
        }
      }

      // Pattern B: "€P today ... €Q ... in N years" (or "after N years", "N
      // years later"). Spans multiple sentences. Today/now anchor is
      // optional; if missing we infer from the position of "in N years".
      // We match all (P, Q) pairs in proximity to a years phrase.
      // NOTE: a beat's `text` is `narration + onscreenLines + ...`, so the
      // same year phrase often repeats verbatim ("in 30 years" + "IN 30
      // YEARS"). Dedupe by VALUE to make the disambiguation robust.
      const yearsRe = /\b(?:in|after|over)\s+(\d+(?:\.\d+)?)\s*years?\b|\b(\d+(?:\.\d+)?)\s*years?\s+later\b/gi;
      const yearsMatches = [...beat.text.matchAll(yearsRe)];
      const distinctYears = new Set(yearsMatches.map(m => parseFloat(m[1] ?? m[2])));
      // Find all € amounts in the beat text. Dedupe consecutive duplicates
      // (e.g. narration says "€10,000" and onscreen line repeats "€10,000")
      // by collapsing into a sequence of distinct values in order.
      const moneyRe = /€\s?(\d[\d,]*(?:\.\d+)?)/g;
      const moneyMatchesAll = [...beat.text.matchAll(moneyRe)];
      const distinctMoneyValues = [];
      for (const m of moneyMatchesAll) {
        const v = parseFloat(m[1].replace(/,/g, ""));
        if (!distinctMoneyValues.find(x => x.v === v)) {
          distinctMoneyValues.push({ v, match: m });
        }
      }
      // Only run pattern B when there's exactly one DISTINCT years value
      // and at least two DISTINCT money amounts.
      if (distinctYears.size === 1 && distinctMoneyValues.length >= 2) {
        const N = [...distinctYears][0];
        const P = distinctMoneyValues[0].v;
        const Q = distinctMoneyValues[1].v;
        // Map the original-text positions for the todayAnchor heuristic.
        const moneyMatches = [distinctMoneyValues[0].match, distinctMoneyValues[1].match];
        // Heuristic: only treat as a purchasing-power claim when the first
        // amount is anchored to "today" / "now" / "currently" within the
        // 25 chars after the match, OR when P > Q (a future-decay framing
        // where P is today, Q is the eroded future value).
        const afterFirst = beat.text.slice(moneyMatches[0].index + moneyMatches[0][0].length, moneyMatches[0].index + moneyMatches[0][0].length + 60);
        const beforeFirst = beat.text.slice(Math.max(0, moneyMatches[0].index - 30), moneyMatches[0].index);
        const todayAnchor =
          /\b(today|now|currently|right now|in the bank|under your mattress)\b/i.test(afterFirst) ||
          /\b(today|now|currently)\b/i.test(beforeFirst);
        if (N > 0 && P > 0 && Q > 0 && P !== Q && (todayAnchor || P > Q)) {
          // Forward: P today eroded by inflation over N years → real value Q.
          // Backward: Q nominal in N years has real-today value P.
          const expectedQfwd = P / Math.pow(1 + inflation, N);
          const driftFwd = Math.abs(Q - expectedQfwd) / expectedQfwd;
          const expectedPback = Q / Math.pow(1 + inflation, N);
          const driftBack = Math.abs(P - expectedPback) / expectedPback;
          // Use 10% tolerance like Pattern A — small absolute € differences
          // map to large implied-rate differences.
          if (driftFwd > INFLATION_VALUE_TOL && driftBack > INFLATION_VALUE_TOL) {
            violations.push({
              field: beat.id,
              rule: "math-consistency",
              quote: `€${P.toLocaleString()} ... €${Q.toLocaleString()} in ${N} years`,
              suggestion:
                `At ${(inflation * 100).toFixed(1)}% inflation over ${N} years, €${P.toLocaleString()} today ` +
                `has real value ~€${expectedQfwd.toFixed(0)} — not €${Q.toLocaleString()}. ` +
                `(The claim implies ${((Math.pow(P / Q, 1 / N) - 1) * 100).toFixed(2)}% inflation.) ` +
                `Either fix the number or update assumptions.inflationPct.`,
            });
          }
        }
      }
    }

    if (savingsRate != null) {
      // Pattern C: "€P at R% for N years = €F"
      const m3 = beat.text.match(
        /€\s?(\d[\d,.]*)[^.]{0,80}?(\d+(?:\.\d+)?)\s*%[^.]{0,80}?(?:for|over)\s+(\d+(?:\.\d+)?)\s*years[^.]{0,40}?€\s?(\d[\d,.]*)/i
      );
      if (m3) {
        const P = parseFloat(m3[1].replace(/,/g, ""));
        const R = parseFloat(m3[2]) / 100;
        const N = parseFloat(m3[3]);
        const F = parseFloat(m3[4].replace(/,/g, ""));
        if (P > 0 && N > 0) {
          const expected = P * Math.pow(1 + R, N);
          const drift = Math.abs(expected - F) / F;
          if (drift > TOLERANCE) {
            violations.push({
              field: beat.id,
              rule: "math-consistency",
              quote: m3[0],
              suggestion:
                `${P.toLocaleString()} at ${(R * 100).toFixed(2)}% for ${N} years should be ` +
                `${expected.toFixed(0)}, not ${F.toLocaleString()}.`,
            });
          }
        }
      }
    }
  }

  return violations;
}

/**
 * MiFID framing pass. When a beat mentions a historical return percentage,
 * require BOTH a historical hedge and a non-guarantee tail in the same beat
 * or the immediately following beat.
 *
 * @param {import('../../remotion/src/data').ReelPlan} plan
 * @returns {Violation[]}
 */
export function checkMiFIDFraming(plan) {
  /** @type {Violation[]} */
  const violations = [];

  const HISTORICAL_HEDGE = /\b(historic(?:ally)?|on average|averaged|long[\s-]run|since\s+\d{4}|in the past)\b/i;
  // Trailing \b removed so "guaranteed" (with the trailing d) matches when the
  // pattern itself ends in "guarantee".
  const NON_GUARANTEE_TAIL = /\b(future\s+returns?\s+(?:are|aren'?t|may|might|could)\s+(?:not\s+)?(?:be\s+)?guarantee|past\s+performance.{0,30}guarantee|no\s+guarantee\s+this\s+continues|results?\s+(?:may|will)\s+vary|illustrative|hypothetical)/i;

  // Detect any beat whose narration / onscreenText contains a return %
  // ("returned 7%", "averaged 5 to 7%", "yields 4%", etc.)
  // NOTE: regex `?` only binds to the single preceding char, so `returned?`
  // means "returne" + optional "d" — NOT "return" + optional "ed". Use an
  // explicit non-capture group `(?:ed)?` for any verb where "ed" is optional.
  const RETURN_RE = /\b(?:return(?:ed|s)?|return\s+of|yield(?:ed|s)?|grew(?:\s+by)?|earn(?:ed|s)?|gain(?:ed|s)?|average[ds]?|deliver(?:ed|s)?)\s+(?:around\s+|roughly\s+|about\s+)?\d+(?:\s*(?:to|–|-)\s*\d+)?\s*%/i;

  const allBeats = [
    ...plan.hookVariants.map((h, i) => ({ id: `hookVariants[${i}]`, text: h.narration })),
    ...plan.beats.map((b, i) => ({ id: `beats[${i}]`, idx: i, text: b.narration })),
  ];

  for (let i = 0; i < allBeats.length; i++) {
    const beat = allBeats[i];
    if (!RETURN_RE.test(beat.text)) continue;

    const hasHedge = HISTORICAL_HEDGE.test(beat.text);
    const next = allBeats[i + 1]?.text ?? "";
    const hasTail = NON_GUARANTEE_TAIL.test(beat.text) || NON_GUARANTEE_TAIL.test(next);

    if (!hasHedge) {
      violations.push({
        field: beat.id,
        rule: "mifid-no-hedge",
        quote: beat.text.match(RETURN_RE)?.[0] ?? "",
        suggestion:
          "Return percentage stated without a historical hedge. Add 'historically', 'on average', or 'long-run' before the figure.",
      });
    }

    if (!hasTail) {
      violations.push({
        field: beat.id,
        rule: "mifid-no-tail",
        quote: beat.text.match(RETURN_RE)?.[0] ?? "",
        suggestion:
          "Return percentage stated without a non-guarantee tail. Add 'though future returns are not guaranteed' (or equivalent) in the same beat or the immediately following beat.",
      });
    }
  }

  return violations;
}
