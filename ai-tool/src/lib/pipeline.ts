/**
 * Generation pipeline — multi-pass orchestrator.
 *
 * Phases:
 *  1. RESEARCH    — fetch web sources via BYOK search (or skip)
 *  2. OUTLINE     — JSON outline from LLM (template-specific prompt)
 *  3. DRAFT       — section-by-section markdown
 *  4. SCORE       — local heuristic scorer
 *  5. POLISH      — if score < 90 and attempts left, regenerate weakest sections
 *                   with feedback baked into the prompt
 *  6. APPENDFAQ   — final FAQ section + meta block
 */

import type { Keys } from './keys';
import { generate } from './llm';
import { searchWeb, type SearchResult } from './search';
import { getTemplate, type TemplateId, type Outline } from './prompts';
import { scoreContent, weakestFeedback, type ScoreBreakdown } from './score';

export type PipelinePhase =
  | 'idle'
  | 'research'
  | 'outline'
  | 'draft'
  | 'score'
  | 'polish'
  | 'finalize'
  | 'done'
  | 'error';

export interface PipelineEvent {
  phase: PipelinePhase;
  detail?: string;
  progressPct?: number;
  partialMd?: string;
  outline?: Outline;
  sources?: SearchResult[];
  score?: ScoreBreakdown;
  attempt?: number;
}

export interface PipelineResult {
  markdown: string;
  outline: Outline;
  sources: SearchResult[];
  score: ScoreBreakdown;
  attempts: number;
  durationMs: number;
}

interface RunOpts {
  title: string;
  templateId: TemplateId;
  keys: Keys;
  onProgress?: (e: PipelineEvent) => void;
  signal?: AbortSignal;
  maxAttempts?: number;
  targetScore?: number;
}

function safeParseJson<T>(s: string): T | null {
  // Strip markdown code fences if present
  const cleaned = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try { return JSON.parse(cleaned) as T; }
  catch {
    // Try to extract first {...} block
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]) as T; } catch {}
    return null;
  }
}

export async function runPipeline(opts: RunOpts): Promise<PipelineResult> {
  const t0 = Date.now();
  const { title, templateId, keys, onProgress, signal } = opts;
  const maxAttempts = opts.maxAttempts ?? 2;
  const targetScore = opts.targetScore ?? 90;
  const tpl = getTemplate(templateId);
  const emit = (e: PipelineEvent) => { onProgress?.(e); };
  const checkAbort = () => { if (signal?.aborted) throw new Error('Cancelled by user'); };

  // ---------- 1. RESEARCH ----------
  emit({ phase: 'research', detail: 'Searching authority sources…', progressPct: 5 });
  let sources: SearchResult[] = [];
  try {
    sources = await searchWeb(tpl.buildSearchQuery(title), keys, 7);
  } catch (e) {
    // non-fatal — continue without sources
  }
  checkAbort();
  emit({ phase: 'research', detail: `Found ${sources.length} sources`, progressPct: 12, sources });

  // ---------- 2. OUTLINE ----------
  emit({ phase: 'outline', detail: 'Architecting outline…', progressPct: 18 });
  const outlineRaw = await generate(tpl.buildOutlinePrompt(title, sources), keys, {
    system: 'You are a senior SEO content strategist. Output strictly valid JSON only — no commentary, no markdown fences.',
    temperature: 0.6,
    maxTokens: 2200,
    jsonMode: true,
  });
  checkAbort();
  let outline = safeParseJson<Outline>(outlineRaw.text);
  if (!outline) {
    // Retry once without jsonMode flag (some Groq models are picky)
    const retry = await generate(tpl.buildOutlinePrompt(title, sources), keys, {
      system: 'You are a senior SEO content strategist. Output ONLY a JSON object, nothing else.',
      temperature: 0.5,
      maxTokens: 2200,
    });
    outline = safeParseJson<Outline>(retry.text);
  }
  if (!outline || !outline.sections?.length) {
    throw new Error('Outline generation failed — model returned non-JSON. Try again or switch provider.');
  }
  emit({ phase: 'outline', detail: `${outline.sections.length} sections planned`, progressPct: 26, outline });

  // ---------- 3. DRAFT ----------
  const draftSection = async (sec: typeof outline.intro, prevMd: string, label: string, baseProgress: number, span: number, idx: number, total: number): Promise<string> => {
    emit({ phase: 'draft', detail: `Writing: ${label}`, progressPct: baseProgress + (idx / total) * span, partialMd: prevMd });
    const prompt = tpl.buildSectionPrompt(title, sec, sources, prevMd);
    const r = await generate(prompt, keys, {
      system: 'You are an elite long-form writer combining the precision of a senior editor with the voice of a top-tier journalist. Output pure Markdown only.',
      temperature: 0.78,
      maxTokens: 1800,
    });
    return r.text.trim();
  };

  let md = `# ${outline.metaTitle || title}\n\n`;
  // Intro
  md += await draftSection(outline.intro, md, 'Introduction', 28, 8, 0, 1);
  md += '\n\n';
  // Sections
  const total = outline.sections.length;
  for (let i = 0; i < outline.sections.length; i++) {
    checkAbort();
    md += await draftSection(outline.sections[i], md, outline.sections[i].heading, 36, 38, i, total);
    md += '\n\n';
  }
  // Conclusion
  checkAbort();
  md += await draftSection(outline.conclusion, md, 'Conclusion', 74, 4, 0, 1);
  md += '\n\n';

  // ---------- 4. APPEND FAQ + META ----------
  emit({ phase: 'finalize', detail: 'Adding FAQ + meta…', progressPct: 80, partialMd: md });
  if (outline.faq?.length) {
    const faqPrompt = `Write a "## Frequently Asked Questions" section for the article titled "${title}".
Answer each Q in 60-90 words, factual + helpful. Use ### for each question.

Questions:
${outline.faq.map((f, i) => `${i + 1}. ${f.q} — ${f.a_intent}`).join('\n')}

Return Markdown only, starting with "## Frequently Asked Questions".`;
    const faqR = await generate(faqPrompt, keys, {
      system: 'You are an editor writing crisp FAQ answers. Markdown only.',
      temperature: 0.65,
      maxTokens: 1600,
    });
    md += faqR.text.trim() + '\n\n';
  }

  // ---------- 5. SCORE + POLISH ----------
  let score = scoreContent(md, outline.primaryKeyword || title);
  emit({ phase: 'score', detail: `Score: ${score.total}/100`, progressPct: 86, score, partialMd: md });
  let attempts = 1;

  while (score.total < targetScore && attempts < maxAttempts) {
    checkAbort();
    attempts++;
    emit({ phase: 'polish', detail: `Score ${score.total} < ${targetScore} — revising weakest areas…`, progressPct: 88, score, attempt: attempts });
    const feedback = weakestFeedback(score.weakest, score, outline.primaryKeyword || title);
    const polishPrompt = `You are revising a Markdown article to lift its quality score from ${score.total}/100 to ≥${targetScore}/100.

PRIMARY KEYWORD: ${outline.primaryKeyword || title}

WEAKNESSES TO FIX (in order of importance):
${feedback}

CURRENT ARTICLE:
"""
${md}
"""

Return the FULL REVISED Markdown article (not a diff). Keep all good content; expand where needed; tighten where weak; add citations as [^N] footnotes; ensure ≥5 H2 sections; add a Markdown table if missing. Do NOT add a preamble — start directly with "# " heading.`;
    const polished = await generate(polishPrompt, keys, {
      system: 'You are a senior editor performing a structural rewrite to hit a quality bar. Markdown output only.',
      temperature: 0.6,
      maxTokens: 8000,
    });
    const newMd = polished.text.trim();
    const newScore = scoreContent(newMd, outline.primaryKeyword || title);
    if (newScore.total > score.total) {
      md = newMd;
      score = newScore;
    }
    emit({ phase: 'polish', detail: `Pass ${attempts} → ${score.total}/100`, progressPct: 92, score, attempt: attempts, partialMd: md });
  }

  // Append source bibliography if we have sources & not already inline
  if (sources.length && !md.includes('## Sources')) {
    md += '## Sources\n\n';
    sources.forEach((s, i) => {
      md += `[^${i + 1}]: [${s.title}](${s.url}) — ${s.source}${s.publishedDate ? ` (${s.publishedDate})` : ''}\n`;
    });
    md += '\n';
    score = scoreContent(md, outline.primaryKeyword || title);
  }

  emit({ phase: 'done', detail: `Final score: ${score.total}/100`, progressPct: 100, score, partialMd: md });

  return {
    markdown: md,
    outline,
    sources,
    score,
    attempts,
    durationMs: Date.now() - t0,
  };
}
