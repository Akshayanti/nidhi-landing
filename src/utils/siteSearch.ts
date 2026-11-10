/**
 * Search on the learning path's front page (/blog/), across lessons and How-to
 * guides. Browser-safe: no imports, no catalog. It runs in the reader's
 * browser and what they type stays in memory (see LearnHome.tsx).
 *
 * The old search matched the whole query as one substring, so a reader's own
 * sentence ("how do I pay off my credit card") or a plural ("credit cards")
 * found nothing. Here the query is split into words, filler words are dropped,
 * each word matches the start of a word in the item (so "rent" finds "renting"
 * and not "current"), and a few everyday words also match the words the lessons
 * use ("owe" finds "debt"). An item is a result when most of the query's words
 * match it; titles count most.
 */

export interface SearchItem {
  id: string;
  kind: 'lesson' | 'guide';
  title: string;
  /** Tags, guide search terms: count more than body text. */
  terms: string[];
  /** Description, guide answer, FAQ questions, headings. */
  text: string;
}

const STOP = new Set([
  'a', 'an', 'the', 'i', 'me', 'my', 'mine', 'we', 'our', 'you', 'your', 'it', 'its', 'is', 'am', 'are', 'was', 'be',
  'do', 'does', 'did', 'how', 'what', 'why', 'when', 'which', 'who', 'where', 'should', 'can', 'could', 'would', 'will',
  'to', 'of', 'for', 'in', 'on', 'at', 'by', 'with', 'from', 'and', 'or', 'if', 'this', 'that', 'there', 'about',
  'much', 'many', 'get', 'got', 'need', 'want', 'have', 'has', 'any', 'some', 'money', 'really', 'just', 'so', 'than',
  // The How-to hub is searched in every language (with each language's own
  // phrases for the guides), so the commonest filler words of those go too.
  // Spanish, Czech (accents already taken out), Hindi, Marathi.
  'como', 'que', 'mi', 'mis', 'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'y', 'o', 'es', 'se', 'por', 'para', 'con', 'puedo', 'dinero',
  'jak', 'co', 'je', 'se', 'si', 'mam', 'muj', 'moje', 'na', 'do', 'v', 've', 'z', 'a', 'i', 'k', 'to', 'penize',
  'मैं', 'मेरा', 'मेरी', 'मेरे', 'क्या', 'कैसे', 'है', 'हैं', 'का', 'की', 'के', 'को', 'में', 'से', 'और', 'या', 'पर', 'यह', 'पैसे', 'पैसों', 'अपने', 'अपना', 'अपनी', 'करूँ', 'करें', 'होता', 'होती',
  'मी', 'माझा', 'माझी', 'माझे', 'काय', 'कसे', 'कसा', 'कशी', 'आहे', 'आहेत', 'चा', 'ची', 'चे', 'ला', 'मध्ये', 'आणि', 'किंवा', 'हे', 'पैसे', 'पैशांचा', 'माझ्या', 'आपल्या', 'तुमच्या', 'करू', 'करायचे',
]);

/**
 * Everyday words → words the lessons use. One direction only: a word on the
 * left also matches the words on its right.
 */
const SYNONYMS: Record<string, string[]> = {
  owe: ['debt', 'loan', 'credit'],
  owing: ['debt', 'loan'],
  debt: ['owe', 'loan', 'credit'],
  borrow: ['loan', 'credit', 'debt'],
  loan: ['borrow', 'credit', 'emi', 'mortgage'],
  emi: ['loan', 'instalment'],
  card: ['credit'],
  budget: ['spending', 'cash flow', 'payday'],
  spend: ['budget', 'cash flow'],
  spending: ['budget', 'cash flow'],
  payday: ['cash flow', 'salary', 'pay'],
  salary: ['income', 'payday'],
  pay: ['payday', 'salary', 'income'],
  scam: ['fraud', 'suspicious', 'phishing'],
  fraud: ['scam', 'suspicious'],
  suspicious: ['scam', 'fraud'],
  transfer: ['remittance', 'send', 'currencies', 'exchange'],
  send: ['transfer', 'remittance'],
  remittance: ['transfer', 'send'],
  abroad: ['currencies', 'country', 'transfer'],
  rent: ['renting', 'housing', 'flatmates'],
  save: ['saving', 'emergency'],
  savings: ['saving', 'emergency'],
  retire: ['retirement', 'pension'],
  pension: ['retirement'],
  invest: ['investing', 'investment'],
  interest: ['rate', 'apr'],
  apr: ['interest'],
  tax: ['taxes', 'taxation'],
};

/**
 * Lower-case words, with apostrophes and Latin accents taken out ("půjčka"
 * matches "pujcka"). Letters of any script are kept, with their combining
 * marks, so a Hindi or Marathi word stays one word.
 */
export function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]s\b/g, '')
    .split(/[^\p{L}\p{M}\p{N}%]+/u)
    .filter(Boolean);
}

/** A light stem: "cards" → "card", "renting" stays (prefix matching covers it). */
function stem(w: string): string {
  if (w.length > 4 && w.endsWith('ies')) return `${w.slice(0, -3)}y`;
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

/** The query's meaningful words, stemmed and without repeats. */
export function queryWords(query: string): string[] {
  return [...new Set(words(query).filter((w) => !STOP.has(w)).map(stem))];
}

function matchesWord(haystack: string[], phraseText: string, needle: string): boolean {
  if (needle.includes(' ')) return ` ${phraseText} `.includes(` ${needle} `);
  return haystack.some((w) => w.startsWith(needle));
}

function fieldHas(fieldWords: string[], fieldText: string, word: string): boolean {
  if (matchesWord(fieldWords, fieldText, word)) return true;
  return (SYNONYMS[word] ?? []).some((alt) => matchesWord(fieldWords, fieldText, alt));
}

interface Prepared { item: SearchItem; fields: { words: string[]; text: string; weight: number }[] }

export function prepare(items: SearchItem[]): Prepared[] {
  return items.map((item) => ({
    item,
    fields: [
      { raw: item.title, weight: 3 },
      { raw: item.terms.join(' '), weight: 2 },
      { raw: item.text, weight: 1 },
    ].map(({ raw, weight }) => {
      const w = words(raw);
      return { words: w, text: w.join(' '), weight };
    }),
  }));
}

/**
 * Items matching most of the query's words, best first: more words matched,
 * then higher weight, then guides before lessons (a guide is the shorter
 * answer), then the given order.
 */
export function search(prepared: Prepared[], query: string): SearchItem[] {
  const q = queryWords(query);
  if (q.length === 0) return [];
  const needed = q.length <= 2 ? q.length : Math.ceil(q.length * 0.6);
  const scored = prepared.map((p, index) => {
    let matched = 0;
    let score = 0;
    for (const word of q) {
      const best = Math.max(0, ...p.fields.filter((f) => fieldHas(f.words, f.text, word)).map((f) => f.weight));
      if (best > 0) { matched += 1; score += best; }
    }
    return { item: p.item, matched, score, index };
  });
  return scored
    .filter((s) => s.matched >= needed)
    .sort((a, b) =>
      b.matched - a.matched
      || b.score - a.score
      || (a.item.kind === b.item.kind ? 0 : a.item.kind === 'guide' ? -1 : 1)
      || a.index - b.index)
    .map((s) => s.item);
}
