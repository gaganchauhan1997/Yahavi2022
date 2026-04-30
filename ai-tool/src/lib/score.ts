/**
 * Quality scorer — runs entirely in browser on generated Markdown.
 * 100-point weighted scale, target ≥90.
 *
 * Buckets:
 *   length        15
 *   structure     15
 *   readability   15  (Flesch reading ease 60-75 ideal)
 *   keywordDens   10
 *   citations     15
 *   listsTables   10
 *   coherence     10  (no thin sections, no abrupt transitions)
 *   originality   10  (low n-gram repetition)
 */

export interface ScoreBreakdown {
  total: number;
  length: number;
  structure: number;
  readability: number;
  keywordDensity: number;
  citations: number;
  listsTables: number;
  coherence: number;
  originality: number;
  metrics: {
    wordCount: number;
    flesch: number;
    h2Count: number;
    h3Count: number;
    codeBlocks: number;
    citationCount: number;
    listCount: number;
    tableCount: number;
    keywordHits: number;
    keywordDensityPct: number;
    avgSectionWords: number;
    repetitionRatio: number;
  };
  weakest: string[];
}

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/g, '');
  word = word.replace(/^y/, '');
  const m = word.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

function flesch(text: string): number {
  const sentences = text.split(/[.!?]+\s/).filter(s => s.trim().length > 5);
  const words = text.match(/\b[\w']+\b/g) || [];
  if (!sentences.length || !words.length) return 0;
  const syllables = words.reduce((s, w) => s + countSyllables(w), 0);
  return 206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length);
}

function plainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_~|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ngramRepetition(text: string, n = 4): number {
  const words = text.toLowerCase().match(/\b[\w']+\b/g) || [];
  if (words.length < n * 4) return 0;
  const grams: Record<string, number> = {};
  for (let i = 0; i <= words.length - n; i++) {
    const g = words.slice(i, i + n).join(' ');
    grams[g] = (grams[g] || 0) + 1;
  }
  const repeats = Object.values(grams).filter(v => v > 1).reduce((a, b) => a + b - 1, 0);
  return repeats / (words.length - n + 1);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function scoreContent(md: string, primaryKeyword: string): ScoreBreakdown {
  const text = plainText(md);
  const words = text.match(/\b[\w']+\b/g) || [];
  const wc = words.length;

  // Sections
  const h2 = (md.match(/^##\s+/gm) || []).length;
  const h3 = (md.match(/^###\s+/gm) || []).length;
  const codeBlocks = (md.match(/```/g) || []).length / 2;
  const lists = (md.match(/^\s*(?:[-*+]|\d+\.)\s+/gm) || []).length;
  const tables = (md.match(/^\|.*\|.*\|/gm) || []).length > 0
    ? (md.match(/^(?=\|.*\|.*\|)(?!\|[\s:|-]+\|$)/gm) || []).length / 3 // approx tables, not rows
    : 0;
  const tableCount = (md.match(/\n\|[\s:|-]+\|/g) || []).length; // separator row = 1 per table

  // Citations: footnote refs [^N] OR markdown links to outside domains
  const footnotes = (md.match(/\[\^\d+\]/g) || []).length;
  const externalLinks = (md.match(/\]\(https?:\/\/[^)]+\)/g) || []).length;
  const citationCount = Math.max(footnotes, Math.min(externalLinks, 12));

  // Keyword density
  const kwLower = primaryKeyword.toLowerCase().trim();
  let kwHits = 0;
  if (kwLower) {
    const re = new RegExp('\\b' + kwLower.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'gi');
    kwHits = (text.match(re) || []).length;
  }
  const kwDensity = wc ? (kwHits / wc) * 100 : 0;

  // Section coherence: avg words per H2 section
  const sections = md.split(/^##\s+/m).slice(1);
  const sectionWords = sections.map(s => (plainText(s).match(/\b[\w']+\b/g) || []).length);
  const avgSection = sectionWords.length ? sectionWords.reduce((a, b) => a + b, 0) / sectionWords.length : 0;
  const thinSections = sectionWords.filter(w => w < 80).length;

  const fleschScore = flesch(text);
  const repetition = ngramRepetition(text, 4);

  // ---------------- Bucket scoring ----------------
  // Length (15)
  let lengthPts = 0;
  if (wc >= 1500 && wc <= 3200) lengthPts = 15;
  else if (wc >= 1100) lengthPts = 12;
  else if (wc >= 800) lengthPts = 8;
  else if (wc >= 500) lengthPts = 4;

  // Structure (15)
  let structurePts = 0;
  if (h2 >= 5 && h3 >= 3) structurePts = 15;
  else if (h2 >= 4) structurePts = 12;
  else if (h2 >= 3) structurePts = 8;
  else if (h2 >= 1) structurePts = 4;

  // Readability (15) — sweet spot 55-75 Flesch
  let readPts = 0;
  if (fleschScore >= 55 && fleschScore <= 75) readPts = 15;
  else if (fleschScore >= 45 && fleschScore <= 85) readPts = 11;
  else if (fleschScore >= 35) readPts = 7;
  else if (fleschScore > 0) readPts = 3;

  // Keyword density (10) — 0.6-1.8% sweet
  let kwPts = 0;
  if (kwDensity >= 0.6 && kwDensity <= 1.8) kwPts = 10;
  else if (kwDensity >= 0.3 && kwDensity <= 2.5) kwPts = 7;
  else if (kwDensity > 0) kwPts = 3;

  // Citations (15)
  let citPts = 0;
  if (citationCount >= 5) citPts = 15;
  else if (citationCount >= 3) citPts = 11;
  else if (citationCount >= 1) citPts = 6;

  // Lists/tables (10)
  let ltPts = 0;
  const hasTable = tableCount >= 1;
  const hasLists = lists >= 4;
  if (hasTable && hasLists) ltPts = 10;
  else if (hasTable || lists >= 6) ltPts = 7;
  else if (lists >= 2) ltPts = 4;

  // Coherence (10)
  let cohPts = 10;
  if (avgSection < 120) cohPts -= 4;
  if (thinSections > 1) cohPts -= 3;
  cohPts = clamp(cohPts, 0, 10);

  // Originality (10)
  let origPts = 10;
  if (repetition > 0.10) origPts = 4;
  else if (repetition > 0.06) origPts = 7;
  else if (repetition > 0.03) origPts = 9;

  const total = lengthPts + structurePts + readPts + kwPts + citPts + ltPts + cohPts + origPts;

  // Weakest buckets to feed back to the LLM
  const buckets: Array<[string, number, number]> = [
    ['length', lengthPts, 15],
    ['structure', structurePts, 15],
    ['readability', readPts, 15],
    ['keywordDensity', kwPts, 10],
    ['citations', citPts, 15],
    ['listsTables', ltPts, 10],
    ['coherence', cohPts, 10],
    ['originality', origPts, 10],
  ];
  const weakest = buckets
    .map(([k, got, max]) => ({ k, ratio: got / max, gap: max - got }))
    .filter(x => x.ratio < 0.7 && x.gap >= 2)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 3)
    .map(x => x.k);

  return {
    total: Math.round(total),
    length: lengthPts,
    structure: structurePts,
    readability: readPts,
    keywordDensity: kwPts,
    citations: citPts,
    listsTables: ltPts,
    coherence: cohPts,
    originality: origPts,
    metrics: {
      wordCount: wc,
      flesch: Math.round(fleschScore * 10) / 10,
      h2Count: h2,
      h3Count: h3,
      codeBlocks,
      citationCount,
      listCount: lists,
      tableCount,
      keywordHits: kwHits,
      keywordDensityPct: Math.round(kwDensity * 100) / 100,
      avgSectionWords: Math.round(avgSection),
      repetitionRatio: Math.round(repetition * 1000) / 1000,
    },
    weakest,
  };
}

export function weakestFeedback(weakest: string[], breakdown: ScoreBreakdown, primaryKeyword: string): string {
  const m = breakdown.metrics;
  const tips: Record<string, string> = {
    length: `Word count is ${m.wordCount} — expand sections to reach 1800-2600 words. Add more concrete examples, mini case studies and a 'Common questions' aside.`,
    structure: `Only ${m.h2Count} H2 sections — break content into ≥5 H2s and add ≥3 H3 sub-headings for scannability.`,
    readability: `Flesch is ${m.flesch} — shorten sentences (aim 16-22 words avg), swap jargon for plain phrasing, use more active voice.`,
    keywordDensity: `Primary keyword "${primaryKeyword}" appears ${m.keywordHits}× (density ${m.keywordDensityPct}%). Aim for 0.8-1.5% — sprinkle it naturally in headings, intro, conclusion.`,
    citations: `Only ${m.citationCount} citations — every major claim needs a [^N] footnote. Add at least 5 unique sources.`,
    listsTables: `Need ≥1 Markdown table and ≥4 list items. Add a comparison/spec table and turn long paragraphs into bullet groups.`,
    coherence: `Some sections are too thin (avg ${m.avgSectionWords} words). Each H2 section should be 250-450 words with examples + a takeaway.`,
    originality: `n-gram repetition is high (${(m.repetitionRatio * 100).toFixed(1)}%). Vary sentence openers, avoid recycling the same phrases across sections.`,
  };
  return weakest.map(k => '- ' + tips[k]).join('\n');
}
