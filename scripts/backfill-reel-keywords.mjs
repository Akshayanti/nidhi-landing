#!/usr/bin/env node
/**
 * One-time backfill (May 2026) for Discovery reels.
 *
 * Adds caption.instagramKeywords + caption.tiktokTopics + caption.tiktokExtraTags
 * to each saved Discovery plan, AND rotates the slot-4 / slot-5 hashtags so
 * no community anchor runs on more than ~3 of 16 reels (PLAYBOOK §30
 * cohort-fight protection — pre-fix audit found #expatfinance running on
 * 12 of 16, anchoring the account to one cluster).
 *
 * After patching plans, re-emits captions via the existing renderer. Videos
 * are NOT re-rendered: the keyword surfaces don't affect video output.
 *
 * Hand-tuned per-post — quality matters more than volume here. PLAYBOOK §6
 * documents the 13–18 keyword sweet spot, the multilingual selection rule
 * (translate only when meaningfully different from EN), and the no-cohort
 * fight constraint that varies anchors across the series.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { writePlatformCaptions } from "./lib/render-platform-caption.mjs";

const PLANS_DIR = join(import.meta.dirname, "../output/plans/discovery");
const CAPTIONS_DIR = join(import.meta.dirname, "../output/captions/discovery");

/**
 * Per-post backfill spec. Hashtags here REPLACE the existing array.
 * Slots 1+2 are mandatory (`nidhi`, `nidhibasics`); slot 3 is the topic-
 * specific niche tag (unique per post); slots 4+5 rotate from the anchor
 * pool documented in PLAYBOOK §Hashtags.
 */
const SPECS = [
  {
    file: "01-what-is-net-worth.json",
    hashtags: ["nidhi", "nidhibasics", "networthtracking", "beginnerfinance", "wealthbuilding"],
    instagramKeywords: [
      "net worth", "calculate net worth", "what is net worth", "personal balance sheet",
      "wealth vs salary", "household finance", "europe expats", "first time investor",
      "money basics", "Vermögensaufbau", "Eigenkapital", "patrimoine net",
      "patrimonio neto", "patrimonio personale", "vermogen berekenen",
    ],
    tiktokTopics: [
      "net worth meaning explained", "wealth vs salary explained",
      "personal balance sheet basics", "single number that matters",
    ],
    tiktokExtraTags: ["moneytok", "financialeducation"],
  },
  {
    file: "02-how-to-calculate-net-worth.json",
    hashtags: ["nidhi", "nidhibasics", "networthcalc", "salarytalk", "financialgoals"],
    instagramKeywords: [
      "calculate net worth", "net worth tracker", "assets minus liabilities",
      "multi currency net worth", "expat finance", "money basics",
      "europe expats", "household finance",
      "Nettovermögen berechnen", "patrimoine calcul", "calcular patrimonio neto",
      "patrimonio netto calcolo", "vermogen berekenen", "netto formue",
    ],
    tiktokTopics: [
      "how to calculate net worth in 10 minutes", "net worth tracker spreadsheet",
      "multi currency assets explained", "expat finance basics",
    ],
    tiktokExtraTags: ["financetok"],
  },
  {
    file: "03-assets.json",
    hashtags: ["nidhi", "nidhibasics", "realassets", "firstgenwealth", "compoundgrowth"],
    instagramKeywords: [
      "what counts as an asset", "real assets vs paper assets",
      "appreciating assets", "income producing assets", "assets explained",
      "balance sheet basics", "europe expats", "first generation wealth",
      "money basics", "Vermögenswerte", "actifs financiers", "activos financieros",
      "attivi patrimoniali", "vermogensbestanddelen",
    ],
    tiktokTopics: [
      "what counts as a real asset", "appreciating vs depreciating assets",
      "salary is not an asset", "income producing assets list",
    ],
    tiktokExtraTags: ["moneytok", "expatlifehacks"],
  },
  {
    file: "04-liabilities.json",
    hashtags: ["nidhi", "nidhibasics", "debtmath", "paycheckplanning", "smartmoney"],
    instagramKeywords: [
      "what counts as a liability", "good debt vs bad debt",
      "debt to income ratio", "mortgage vs consumer debt", "interest rate impact",
      "personal finance", "europe expats", "household finance",
      "Verbindlichkeiten", "Schulden Tilgung", "passifs financiers",
      "pasivos financieros", "passività finanziarie", "schulden afbetalen",
    ],
    tiktokTopics: [
      "good debt vs bad debt explained", "what is a liability in finance",
      "debt to income ratio basics", "mortgage as good debt",
    ],
    tiktokExtraTags: ["financetok", "financialeducation"],
  },
  {
    file: "05-how-to-get-out-of-debt.json",
    hashtags: ["nidhi", "nidhibasics", "debtfreejourney", "savingsmindset", "moneymindset"],
    instagramKeywords: [
      "snowball method", "avalanche method", "pay off debt fast",
      "debt payoff strategy", "minimum payments", "debt psychology",
      "europe expats", "personal finance", "household finance",
      "Schuldenfrei werden", "Schuldentilgung", "rembourser ses dettes",
      "salir de deudas", "uscire dai debiti", "schuldenvrij worden",
    ],
    tiktokTopics: [
      "snowball vs avalanche debt method", "how to pay off debt fast",
      "debt payoff motivation", "smallest debt first strategy",
    ],
    tiktokExtraTags: ["moneytok"],
  },
  {
    file: "06-appreciation-vs-depreciation.json",
    hashtags: ["nidhi", "nidhibasics", "compoundgrowth", "firemath", "wealthbuilding"],
    instagramKeywords: [
      "compound interest", "appreciation vs depreciation", "time in the market",
      "early investor advantage", "long term investing", "starting late catch up",
      "europe expats", "money basics",
      "Zinseszins", "Kapitalanlage", "intérêts composés", "interés compuesto",
      "interesse composto", "samengestelde rente", "ränta på ränta",
    ],
    tiktokTopics: [
      "compound interest explained simply", "tortoise and hare investing",
      "starting late vs starting early", "time in the market math",
    ],
    tiktokExtraTags: ["financetok", "financialeducation"],
  },
  {
    file: "07-liquidity.json",
    hashtags: ["nidhi", "nidhibasics", "liquidityrisk", "personalfinanceeurope", "smartmoney"],
    instagramKeywords: [
      "what is liquidity", "liquid vs illiquid assets", "emergency cash access",
      "house rich cash poor", "stuck money problem", "midas problem",
      "europe expats", "household finance",
      "Liquidität verstehen", "liquidités personnelles", "liquidez financiera",
      "liquidità finanziaria", "liquide middelen",
    ],
    tiktokTopics: [
      "what is liquidity in finance", "house rich cash poor explained",
      "liquid assets meaning", "stuck wealth problem",
    ],
    tiktokExtraTags: ["moneytok"],
  },
  {
    file: "08-emergency-fund.json",
    hashtags: ["nidhi", "nidhibasics", "emergencyfundeurope", "fireeurope", "beginnerfinance"],
    instagramKeywords: [
      "emergency fund", "how much to save", "rainy day fund",
      "three months expenses", "six months expenses", "high yield savings",
      "europe expats", "money basics",
      "Notgroschen", "épargne d'urgence", "fondo de emergencia",
      "fondo emergenza", "noodfonds", "nødfond",
    ],
    tiktokTopics: [
      "how big should emergency fund be", "three or six months expenses",
      "where to keep emergency fund", "emergency fund math europe",
    ],
    tiktokExtraTags: ["europemoney"],
  },
  {
    file: "09-income-vs-wealth.json",
    hashtags: ["nidhi", "nidhibasics", "savingsratemath", "salarytalk", "wealthbuilding"],
    instagramKeywords: [
      "income vs wealth", "salary is not wealth", "savings rate matters",
      "lifestyle inflation", "high income low wealth", "stealth wealth",
      "europe expats", "personal finance",
      "Sparquote", "taux d'épargne", "tasa de ahorro", "tasso di risparmio",
      "spaarquote", "Lebensstil Inflation",
    ],
    tiktokTopics: [
      "income vs wealth explained", "savings rate is the metric",
      "lifestyle inflation trap", "why high earners stay broke",
    ],
    tiktokExtraTags: ["financialeducation", "moneytok"],
  },
  {
    file: "10-cash-flow-101.json",
    hashtags: ["nidhi", "nidhibasics", "cashflowmanagement", "paycheckplanning", "budgetingbasics"],
    instagramKeywords: [
      "cash flow basics", "income minus expenses", "monthly surplus",
      "where money goes", "track spending", "fixed vs variable costs",
      "europe expats", "household finance",
      "Cashflow planen", "Geldfluss", "flux de trésorerie", "flujo de caja personal",
      "flusso di cassa", "geldstromen huishouden",
    ],
    tiktokTopics: [
      "where does my money go", "cash flow vs budget difference",
      "personal cash flow statement", "tracking monthly surplus",
    ],
    tiktokExtraTags: ["financetok"],
  },
  {
    file: "11-purchasing-power.json",
    hashtags: ["nidhi", "nidhibasics", "purchasingpower", "expatlife", "savingsmindset"],
    instagramKeywords: [
      "real purchasing power", "inflation eats savings", "real returns",
      "cash drag", "what 1000 euros bought", "saving alone is not enough",
      "europe expats", "money basics",
      "Kaufkraft", "Kaufkraftverlust", "pouvoir d'achat", "poder adquisitivo",
      "potere d'acquisto", "koopkracht", "Inflation Schutz",
    ],
    tiktokTopics: [
      "what is purchasing power", "why your savings shrink over time",
      "inflation vs returns explained", "cash losing value math",
    ],
    tiktokExtraTags: ["europemoney", "moneytok"],
  },
  {
    file: "12-why-your-euro-buys-more-in-some-countries.json",
    hashtags: ["nidhi", "nidhibasics", "geoarbitrage", "movingabroad", "digitalnomadfinance"],
    instagramKeywords: [
      "purchasing power parity", "exchange rate vs ppp", "geographic arbitrage",
      "cost of living abroad", "expat salary value", "big mac index",
      "europe expats", "household finance",
      "Kaufkraftparität", "parité pouvoir d'achat", "paridad poder adquisitivo",
      "parità potere d'acquisto", "koopkrachtpariteit",
    ],
    tiktokTopics: [
      "purchasing power parity explained", "why euro buys more abroad",
      "geoarbitrage for expats", "cost of living comparison",
    ],
    tiktokExtraTags: ["expatlifehacks", "financetok"],
  },
  {
    file: "13-saving-vs-investing.json",
    hashtags: ["nidhi", "nidhibasics", "savevsinvest", "beginnerfinance", "firemath"],
    instagramKeywords: [
      "saving vs investing", "when to invest", "right money right place",
      "ant and grasshopper investing", "high yield savings vs index",
      "long term vs short term", "europe expats", "money basics",
      "sparen oder investieren", "épargne ou investissement",
      "ahorrar o invertir", "risparmio o investimento", "sparen of beleggen",
    ],
    tiktokTopics: [
      "saving vs investing explained", "when should I start investing",
      "matching money to time horizon", "high yield savings vs index funds",
    ],
    tiktokExtraTags: ["financialeducation", "moneytok"],
  },
  {
    file: "14-budgeting.json",
    hashtags: ["nidhi", "nidhibasics", "budgetingeurope", "frugaleurope", "financialgoals"],
    instagramKeywords: [
      "budgeting basics", "50 30 20 rule", "zero based budget",
      "monthly budget plan", "automate savings", "budget that sticks",
      "europe expats", "household finance",
      "Budget planen", "Haushaltsbuch", "budget mensuel", "presupuesto mensual",
      "bilancio mensile", "maandbudget", "budgetplanering",
    ],
    tiktokTopics: [
      "50 30 20 rule explained", "how to make a budget that sticks",
      "zero based budgeting", "automate your money",
    ],
    tiktokExtraTags: ["europemoney"],
  },
  {
    file: "15-credit-and-credit-scores.json",
    hashtags: ["nidhi", "nidhibasics", "creditscoreeurope", "expatfinance", "personalfinanceeurope"],
    instagramKeywords: [
      "european credit score", "credit history abroad", "schufa score",
      "first mortgage approval", "expat credit history", "build credit europe",
      "europe expats", "household finance",
      "Schufa Auskunft", "Bonitätsprüfung", "score de crédit",
      "historial crediticio", "punteggio creditizio", "kredietwaardigheid",
    ],
    tiktokTopics: [
      "credit score europe explained", "schufa for expats",
      "build credit history abroad", "first mortgage requirements",
    ],
    tiktokExtraTags: ["financetok", "financialeducation"],
  },
  {
    file: "16-insurance-basics.json",
    hashtags: ["nidhi", "nidhibasics", "moneyinaction", "expatfinance", "fireeurope"],
    instagramKeywords: [
      "insurance basics", "what to insure first", "renters insurance europe",
      "disability insurance", "liability insurance", "transfer risk",
      "europe expats", "personal finance",
      "Versicherungsbasics", "Berufsunfähigkeitsversicherung",
      "assurance habitation", "seguro de hogar", "assicurazione casa",
      "aansprakelijkheidsverzekering",
    ],
    tiktokTopics: [
      "what insurance do you actually need", "renters insurance for expats",
      "disability insurance basics", "transfer risk vs absorb risk",
    ],
    tiktokExtraTags: ["europemoney", "moneytok"],
  },
];

async function main() {
  // Sanity audit: no anchor in slot 4-5 should run more than 3 times.
  const anchorUse = {};
  for (const s of SPECS) {
    s.hashtags.slice(3).forEach(t => anchorUse[t] = (anchorUse[t] ?? 0) + 1);
  }
  const overused = Object.entries(anchorUse).filter(([, n]) => n > 3);
  if (overused.length > 0) {
    console.error("✗ Anchor over-use detected:", overused);
    process.exit(1);
  }

  // Topic-tag uniqueness audit (slot 3 must be unique per post).
  const topicTags = SPECS.map(s => s.hashtags[2]);
  const dupes = topicTags.filter((t, i) => topicTags.indexOf(t) !== i);
  if (dupes.length > 0) {
    console.error("✗ Duplicate topic tag in slot 3:", dupes);
    process.exit(1);
  }

  console.log(`Patching ${SPECS.length} Discovery plans + re-emitting captions...`);

  for (const spec of SPECS) {
    const planPath = join(PLANS_DIR, spec.file);
    const plan = JSON.parse(await readFile(planPath, "utf-8"));

    plan.hashtags = spec.hashtags;
    plan.caption = {
      ...plan.caption,
      instagramKeywords: spec.instagramKeywords,
      tiktokTopics: spec.tiktokTopics,
      tiktokExtraTags: spec.tiktokExtraTags,
    };

    await writeFile(planPath, JSON.stringify(plan, null, 2), "utf-8");

    // Re-emit captions only — no video re-render needed since these
    // surfaces don't affect the rendered mp4.
    const fileBase = spec.file.replace(/\.json$/, "");
    await writePlatformCaptions({
      plan,
      captionsDir: CAPTIONS_DIR,
      fileBase,
      relatedTool: undefined,
      reelPromise: undefined,
    });

    const summary = `${plan.hashtags.length} tags · ${spec.instagramKeywords.length} kw · ${spec.tiktokTopics.length} tt-topics · ${spec.tiktokExtraTags.length} tt-extras`;
    console.log(`  ✓ ${fileBase.padEnd(50)} ${summary}`);
  }

  // Final cross-series anchor distribution audit.
  console.log("\nFinal anchor distribution (slots 4-5):");
  Object.entries(anchorUse).sort((a, b) => b[1] - a[1]).forEach(([t, n]) =>
    console.log(`  ${(n + "x").padEnd(5)} #${t}`)
  );

  // IG keyword count distribution.
  const counts = SPECS.map(s => s.instagramKeywords.length);
  const min = Math.min(...counts), max = Math.max(...counts);
  const avg = (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1);
  console.log(`\nIG keyword counts: min=${min} max=${max} avg=${avg} (target 13-18)`);
}

main().catch(err => { console.error(err); process.exit(1); });
