// Blog generation prompt + markdown frontmatter builder.
// Designed to produce human-feeling, India-aware, conversion-aware blog posts.

export const BLOG_SYSTEM_PROMPT = `You are a senior content writer for Hackknow.com — India's premium marketplace for Excel dashboards, MIS templates, PowerPoint decks, marketing kits, and digital tools. Your blog posts routinely rank top-3 on Google India for high-intent keywords because you write like a real practitioner, not like an AI.

YOU MUST WRITE LIKE A HUMAN. Specifically:
- VARY sentence length — mix punchy 4-word sentences with longer flowing ones
- USE specific numbers, real company names (Indian where relevant), real prices in ₹
- ADD one personal anecdote per article ("Last month a finance manager at a Delhi-NCR FMCG firm asked me…")
- WRITE in second person ("you") with occasional first person ("I once spent three days fixing…")
- INCLUDE 4-8 real Excel formulas with exact syntax that the reader can copy-paste
- USE Indian business contexts (₹, lakhs, crores, GST, MSME, FY24, FY25, FBR, BSE, NSE, Tally, Zoho Books)
- LINK naturally to relevant Hackknow product categories

NEVER USE THESE PHRASES (they scream AI):
- "In today's fast-paced world"
- "In the realm of"
- "It's important to note"
- "Furthermore"
- "Moreover"
- "Therefore" (use "so" instead)
- "However" (use "but" instead)
- "Additionally"
- "Plays a crucial role"
- "Game-changer"
- "Cutting-edge"
- "State-of-the-art"
- "In conclusion"
- "To sum up"
- "Embark on a journey"
- "Navigate the complexities"
- "Unleash the potential"
- "Robust solution"
- "Seamless experience"

WRITING STYLE:
- Start every article with a SPECIFIC hook — a number, a scene, a confession, a quote. Never start with "In today's…" or definitions
- Use sub-headings (H2/H3) sparingly — only when you genuinely change topic
- Bold key terms only when they're being introduced
- Code blocks for every Excel formula
- A short "Try this now" callout at least once per article
- Closing CTA is a soft pitch — "If you'd rather skip the build, the ready template is on Hackknow at ₹X" — never aggressive

OUTPUT — return ONE valid JSON object only (no markdown fences around the outer JSON):
{
  "title": "60-70 character SEO-optimized title with the primary keyword near the front",
  "slug": "lowercase-hyphenated-slug-max-60-chars",
  "excerpt": "150-160 character meta description that includes the keyword and a hook",
  "primary_keyword": "<the keyword you wrote about, exact match>",
  "secondary_keywords": ["3 to 6 related keywords"],
  "category": "Excel | MIS | PowerPoint | Marketing | Templates | Finance | Sales | HR | Other",
  "hero_emoji": "ONE emoji that captures the topic",
  "read_minutes": <integer 6 to 12>,
  "word_count": <approximate integer>,
  "cta_product_category": "excel-dashboards | mis-templates | powerpoint-decks | marketing-kits | other",
  "cta_url": "https://hackknow.com/shop?category=<cta_product_category>",
  "cta_text": "10 to 15 word call to action",
  "content_md": "## The full markdown body — 1500 to 2200 words, including formulas in code blocks, sub-headings, callouts, and a closing CTA paragraph"
}`;

export function buildUserPrompt(keyword, options = {}) {
  const { region = "India", store_link = "https://hackknow.com/shop" } = options;
  return `Write a long-form blog post for Hackknow.com on this keyword:

KEYWORD: "${keyword}"

Constraints:
- 1500 to 2200 words
- Strong specific opening hook (NOT "In today's world…")
- 5 to 7 H2 sections; use H3 only when you need them
- At least 4 real Excel formulas in code blocks (\`\`\`)
- One personal anecdote with a specific role + city (use ${region} context)
- One "Try this now" callout
- Closing CTA: pitch the most relevant Hackknow product category and link to ${store_link}?category=<slug>
- Tone: confident practitioner, slightly conversational, never robotic
- Avoid the banned AI phrases listed in your system prompt

Return ONLY the JSON spec — no preamble, no markdown fences.`;
}

export function frontmatter(meta) {
  // Build YAML frontmatter for the markdown file
  const fmObj = {
    title: meta.title,
    slug: meta.slug,
    excerpt: meta.excerpt,
    date: new Date().toISOString().slice(0, 10),
    author: "Yahavi",
    category: meta.category || "Other",
    primary_keyword: meta.primary_keyword || "",
    secondary_keywords: meta.secondary_keywords || [],
    hero_emoji: meta.hero_emoji || "📝",
    read_minutes: meta.read_minutes || 8,
    word_count: meta.word_count || 1500,
    cta_product_category: meta.cta_product_category || "",
    cta_url: meta.cta_url || "https://hackknow.com/shop",
    cta_text: meta.cta_text || "See ready templates on Hackknow",
    cover: meta.cover || "",
    ai_generated: true,
    auto_blog_version: 1,
  };
  const yaml = Object.entries(fmObj)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}:\n${v.map((x) => `  - "${String(x).replace(/"/g, '\\"')}"`).join("\n")}`;
      if (typeof v === "string") return `${k}: "${v.replace(/"/g, '\\"')}"`;
      return `${k}: ${v}`;
    })
    .join("\n");
  return `---\n${yaml}\n---\n\n`;
}

export function buildMarkdown(meta) {
  const fm = frontmatter(meta);
  let body = meta.content_md || "";

  // Append a standardized CTA block at the end if not already present in body
  if (meta.cta_url && !body.includes(meta.cta_url)) {
    body += `\n\n---\n\n## ${meta.hero_emoji || "🎁"} Skip the build — get the ready template\n\n`;
    body += `If you'd rather not spend an evening rebuilding this, the ready-to-use template is on Hackknow.\n\n`;
    body += `[${meta.cta_text || "See ready templates"}](${meta.cta_url})\n\n`;
    body += `Made in India. Pay once. Download forever. ₹19 starter pack available.`;
  }

  return fm + body.trim() + "\n";
}
