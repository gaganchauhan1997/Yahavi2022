/**
 * 7 SEO content templates. Each defines:
 *  - id, label, icon (lucide name), pitch
 *  - search query builder
 *  - outline prompt
 *  - section prompt
 *  - target word count
 */

import type { SearchResult } from './search';

export type TemplateId =
  | 'longform-blog'
  | 'listicle'
  | 'how-to-guide'
  | 'product-review'
  | 'comparison'
  | 'tutorial-walkthrough'
  | 'landing-page-copy';

export interface Template {
  id: TemplateId;
  label: string;
  icon: string;
  pitch: string;
  targetWords: [number, number];
  buildSearchQuery: (title: string) => string;
  buildOutlinePrompt: (title: string, sources: SearchResult[]) => string;
  buildSectionPrompt: (title: string, section: OutlineSection, sources: SearchResult[], previousMd: string) => string;
}

export interface OutlineSection {
  heading: string;
  intent: string;
  wordTarget: number;
  bulletHints?: string[];
}

export interface Outline {
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  intro: OutlineSection;
  sections: OutlineSection[];
  conclusion: OutlineSection;
  faq: Array<{ q: string; a_intent: string }>;
}

const SOURCES_HINT = (sources: SearchResult[]) => {
  if (!sources.length) return 'NO LIVE SEARCH RESULTS — rely only on well-known authority domains the user can verify (official docs, Wikipedia, .gov, MDN, IEEE, peer-reviewed journals). NEVER fabricate URLs. If unsure of a URL, omit it and just name the source in plain text.';
  return 'CITATIONS — use ONLY these verified sources. Reference them as numbered Markdown footnotes [^1] [^2] etc. exactly as listed below. Do NOT invent additional URLs.\n\n' +
    sources.map((s, i) => `[^${i + 1}]: [${s.title}](${s.url}) — ${s.source}`).join('\n');
};

const COMMON_RULES = `
WRITING RULES (mandatory — content scored on these):
- Voice: confident, specific, expert. Like Claude/ChatGPT/Perplexity Pro at their best.
- Sentences: average 16-22 words. Mix short punchy lines with longer analytical ones.
- Flesch reading-ease target: 60-75 (grade ~8-10).
- Use concrete examples, real numbers, real product names. No vague filler ("In today's fast-paced world...").
- Every major claim cited with [^N] footnote referencing the sources block.
- Use H2 for major sections, H3 for sub-sections. NEVER skip a level.
- Add at least one comparison table (Markdown pipe table) when the topic supports it.
- Add at least 2 unordered or ordered lists.
- Include a "Key takeaways" callout at the end of long sections.
- Output PURE Markdown only. No code fences around the document. No "Here is the article" preamble.
`;

const TEMPLATES: Record<TemplateId, Template> = {
  'longform-blog': {
    id: 'longform-blog',
    label: 'Long-form Blog Post',
    icon: 'FileText',
    pitch: 'Authoritative 1500-3000 word pillar article. Best for SEO ranking + thought leadership.',
    targetWords: [1800, 2800],
    buildSearchQuery: (t) => `${t} latest 2026 in-depth guide`,
    buildOutlinePrompt: (title, sources) => `You are an elite SEO content strategist.
Plan a 2200-word pillar blog post titled: "${title}".

${SOURCES_HINT(sources)}

Return ONLY a JSON object (no markdown fences) with this exact shape:
{
  "metaTitle": "string ≤ 60 chars, includes primary keyword",
  "metaDescription": "string 140-158 chars, includes primary keyword + benefit + CTA",
  "primaryKeyword": "string",
  "secondaryKeywords": ["string", "string", ...] (5-8 items),
  "intro": { "heading": "Introduction", "intent": "Hook + problem + promise + what reader will learn", "wordTarget": 180 },
  "sections": [
    { "heading": "string (H2)", "intent": "what this section must answer", "wordTarget": 350, "bulletHints": ["sub-point", "sub-point"] }
    // 5-7 sections, each with wordTarget 300-450
  ],
  "conclusion": { "heading": "Conclusion", "intent": "Synthesis + call to action", "wordTarget": 180 },
  "faq": [ { "q": "Question?", "a_intent": "what to answer" } ] // 4-6 FAQs
}`,
    buildSectionPrompt: (title, section, sources, prev) => `You are writing one section of a long-form blog post.
Article title: "${title}"
Section heading: "${section.heading}"
Section intent: ${section.intent}
Sub-points to cover: ${(section.bulletHints || []).join(' | ') || 'as you see fit'}
Target length: ${section.wordTarget} words (±10%).

${SOURCES_HINT(sources)}

${COMMON_RULES}

Previous content (for tone + continuity, DO NOT repeat):
"""
${prev.slice(-1500)}
"""

Output the section starting with "## ${section.heading}" then the body in Markdown.`,
  },

  'listicle': {
    id: 'listicle',
    label: 'Listicle / Top N',
    icon: 'List',
    pitch: '"Top 10 best X" style. High click-through, easy skim, ranks fast.',
    targetWords: [1400, 2400],
    buildSearchQuery: (t) => `best ${t} top picks 2026 reviews`,
    buildOutlinePrompt: (title, sources) => `Plan a listicle titled: "${title}".

${SOURCES_HINT(sources)}

Return ONLY JSON:
{
  "metaTitle": "≤60 chars, with the number + keyword",
  "metaDescription": "140-158 chars, hook + benefit",
  "primaryKeyword": "string",
  "secondaryKeywords": [5-8 strings],
  "intro": { "heading": "Why This List Matters", "intent": "Set the scene, criteria for inclusion", "wordTarget": 200 },
  "sections": [
    { "heading": "1. <Item Name>", "intent": "describe item, pros, cons, who it's for, price/availability", "wordTarget": 220, "bulletHints": ["pros","cons","best for"] }
    // 8-12 items numbered 1..N
  ],
  "conclusion": { "heading": "Our Pick", "intent": "Recap + recommend overall winner + alternatives by use case", "wordTarget": 200 },
  "faq": [4-5 FAQs]
}`,
    buildSectionPrompt: (title, section, sources, prev) => `Write item entry for a listicle.
Listicle title: "${title}"
Item heading: "${section.heading}"
What to cover: ${section.intent}
Hints: ${(section.bulletHints || []).join(' | ')}
Target: ${section.wordTarget} words.

${SOURCES_HINT(sources)}

${COMMON_RULES}

For this item include a small Markdown table summarising:
| Best for | Price tier | Standout feature | Watch out for |

Previous items (avoid repetition):
"""
${prev.slice(-1500)}
"""

Output starting with "### ${section.heading}".`,
  },

  'how-to-guide': {
    id: 'how-to-guide',
    label: 'How-to Guide',
    icon: 'Compass',
    pitch: 'Step-by-step actionable guide. Triggers HowTo schema in Google.',
    targetWords: [1200, 2200],
    buildSearchQuery: (t) => `how to ${t} step by step tutorial`,
    buildOutlinePrompt: (title, sources) => `Plan a How-to Guide titled: "${title}".

${SOURCES_HINT(sources)}

Return ONLY JSON:
{
  "metaTitle": "≤60 chars, starts with 'How to'",
  "metaDescription": "140-158 chars, promises clear steps + outcome",
  "primaryKeyword": "string",
  "secondaryKeywords": [5-8],
  "intro": { "heading": "What You'll Achieve", "intent": "outcome + prerequisites + estimated time", "wordTarget": 180 },
  "sections": [
    { "heading": "Step 1: <verb-led action>", "intent": "exact action + why + how to verify success", "wordTarget": 220, "bulletHints": ["substep","substep","gotcha"] }
    // 5-8 steps
  ],
  "conclusion": { "heading": "Wrapping Up & Next Steps", "intent": "Recap, common pitfalls, next-level resources", "wordTarget": 200 },
  "faq": [4-5 troubleshooting FAQs]
}`,
    buildSectionPrompt: (title, section, sources, prev) => `Write one step of a how-to guide.
Guide title: "${title}"
Step heading: "${section.heading}"
Intent: ${section.intent}
Substeps to cover: ${(section.bulletHints || []).join(' | ')}
Target: ${section.wordTarget} words.

${SOURCES_HINT(sources)}

${COMMON_RULES}

Include numbered substeps (ordered list). End with a "✓ Verify:" italic line that tells the reader how to confirm success before moving on.

Previous steps:
"""
${prev.slice(-1500)}
"""

Output starting with "## ${section.heading}".`,
  },

  'product-review': {
    id: 'product-review',
    label: 'Product Review',
    icon: 'Star',
    pitch: 'Detailed honest review with pros/cons, alternatives, verdict + Review schema.',
    targetWords: [1500, 2500],
    buildSearchQuery: (t) => `${t} review pros cons specs price`,
    buildOutlinePrompt: (title, sources) => `Plan a balanced product review titled: "${title}".

${SOURCES_HINT(sources)}

Return ONLY JSON with the standard shape, plus "sections" must include:
- "At a Glance" (TL;DR + score)
- "Specs & Pricing"
- "What I Loved"
- "What's Frustrating"
- "Real-World Performance"
- "Who It's For (and Who Should Skip)"
- "Alternatives Worth Considering"
- "Final Verdict & Score /10"

intro.wordTarget=180, conclusion=180, each section 220-300, faq 4-5.`,
    buildSectionPrompt: (title, section, sources, prev) => `Write one section of a product review.
Review title: "${title}"
Section: "${section.heading}"
Intent: ${section.intent}
Target: ${section.wordTarget} words.

${SOURCES_HINT(sources)}

${COMMON_RULES}

Be specific with measurements, benchmarks, dates, prices. If the section is "At a Glance" include a quick rating table:
| Build | Performance | Value | Support | Overall |

Previous sections:
"""
${prev.slice(-1500)}
"""

Output starting with "## ${section.heading}".`,
  },

  'comparison': {
    id: 'comparison',
    label: 'Comparison (X vs Y)',
    icon: 'Scale',
    pitch: '"A vs B" head-to-head. High commercial intent traffic.',
    targetWords: [1400, 2400],
    buildSearchQuery: (t) => `${t} comparison differences pros cons`,
    buildOutlinePrompt: (title, sources) => `Plan a comparison post titled: "${title}".

${SOURCES_HINT(sources)}

Return ONLY JSON. Sections must include:
- "Quick Verdict" (one-liner winner per use case)
- "Side-by-Side Spec Table" (intent: produce a real Markdown table)
- "Pricing Breakdown"
- "Performance / UX"
- "Ecosystem & Integrations"
- "Pros & Cons of Each"
- "Which Should You Pick?" (decision tree)

intro 180w, conclusion 180w, each section 250-350w, faq 4-5.`,
    buildSectionPrompt: (title, section, sources, prev) => `Write one section of a comparison post.
Post title: "${title}"
Section: "${section.heading}"
Intent: ${section.intent}
Target: ${section.wordTarget} words.

${SOURCES_HINT(sources)}

${COMMON_RULES}

If section is "Side-by-Side Spec Table" output a clean Markdown table comparing both options across at least 8 attributes.

Previous sections:
"""
${prev.slice(-1500)}
"""

Output starting with "## ${section.heading}".`,
  },

  'tutorial-walkthrough': {
    id: 'tutorial-walkthrough',
    label: 'Tech Tutorial / Walkthrough',
    icon: 'Code2',
    pitch: 'Hands-on dev tutorial with code blocks. Earns long dwell time + GitHub-style backlinks.',
    targetWords: [1500, 3000],
    buildSearchQuery: (t) => `${t} tutorial code example github`,
    buildOutlinePrompt: (title, sources) => `Plan a developer tutorial titled: "${title}".

${SOURCES_HINT(sources)}

Return ONLY JSON. Sections should walk from setup → core implementation → advanced → testing → deploy. Include:
- "Prerequisites & Setup"
- "Project Structure"
- 3-5 implementation phases (each a section with code)
- "Testing It"
- "Deploying / Shipping"
- "Common Pitfalls"

intro 180w, conclusion 180w, sections 300-500w (more for implementation), faq 4-5.`,
    buildSectionPrompt: (title, section, sources, prev) => `Write one section of a developer tutorial.
Tutorial: "${title}"
Section: "${section.heading}"
Intent: ${section.intent}
Target: ${section.wordTarget} words.

${SOURCES_HINT(sources)}

${COMMON_RULES}

INCLUDE at least one fenced code block (\`\`\`lang\\n...\\n\`\`\`) with realistic, runnable code. Annotate non-obvious lines with brief inline comments. Explain WHY before WHAT.

Previous sections:
"""
${prev.slice(-1500)}
"""

Output starting with "## ${section.heading}".`,
  },

  'landing-page-copy': {
    id: 'landing-page-copy',
    label: 'SEO Landing Page Copy',
    icon: 'Megaphone',
    pitch: 'Conversion-optimized landing page with hero, features, social proof, CTA blocks.',
    targetWords: [900, 1600],
    buildSearchQuery: (t) => `${t} features benefits use cases customers`,
    buildOutlinePrompt: (title, sources) => `Plan a high-converting SEO landing page titled: "${title}".

${SOURCES_HINT(sources)}

Return ONLY JSON. Sections:
- "Hero Headline + Subhead + CTA"
- "The Problem" (pain agitation)
- "How <Product> Solves It" (3-5 feature blocks)
- "Use Cases" (3-4 mini personas)
- "Social Proof / Stats"
- "Pricing Snapshot"
- "FAQ Snippet" (intent: 5-line teaser, full FAQ goes in faq array)

intro 120w, conclusion 120w (final CTA block), sections 180-260w, faq 5-7.`,
    buildSectionPrompt: (title, section, sources, prev) => `Write one section of a landing page.
Page: "${title}"
Section: "${section.heading}"
Intent: ${section.intent}
Target: ${section.wordTarget} words.

${SOURCES_HINT(sources)}

${COMMON_RULES}

Tone: punchy, benefit-led, second-person ("you"). Use bold for key phrases. Each feature block ends with a one-line micro-CTA.

Previous sections:
"""
${prev.slice(-1500)}
"""

Output starting with "## ${section.heading}".`,
  },
};

export const TEMPLATE_LIST: Template[] = Object.values(TEMPLATES);

export function getTemplate(id: TemplateId): Template {
  return TEMPLATES[id];
}
