# Yahavi Auto-Blog Pipeline

Writes 10 blogs every 4 hours using 10 free Groq API keys in parallel.
Skips duplicates. Auto-cools-down rate-limited keys. Persists state.

## How it works

```
content/blog-queue.json   ← keywords list YOU edit
            │
            ▼
.github/workflows/auto-blog.yml  ← cron every 4h
            │
            ▼
scripts/auto-blog/run.mjs        ← picks N keywords + N keys → parallel write
            │
            ▼
app/src/content/blog/<slug>.md   ← committed back to repo
            │
            ▼
content/blog-state.json          ← updated: done + cooldown + last_run
```

## One-time setup (5 minutes)

1. **Add 10 Groq API keys as GitHub Secrets**
   - Go to https://github.com/gaganchauhan1997/Yahavi2022/settings/secrets/actions
   - Click **New repository secret** ten times, naming them:
     - `GROQ_API_KEY_1`
     - `GROQ_API_KEY_2`
     - ... up to `GROQ_API_KEY_10`
   - Paste each free key from https://console.groq.com/keys

2. **Verify Actions are enabled**
   - https://github.com/gaganchauhan1997/Yahavi2022/actions
   - If prompted, allow Actions to run

3. **Trigger the first run manually** (don't wait for cron)
   - Actions tab → "Auto Blog Writer (Yahavi)" → "Run workflow"
   - It writes up to 10 blogs immediately, commits them, and pushes

After step 3, the cron takes over and runs every 4 hours forever.

## Add more keywords

Open `content/blog-queue.json` and append strings to the `keywords` array:

```json
{
  "keywords": [
    "...existing...",
    "How to make Diwali sales dashboard for retailers in Excel",
    "Excel tips for MSME accountants in Tamil Nadu"
  ]
}
```

Commit and push. Next cron tick picks them up. Already-written keywords are
skipped automatically (deduped by slug).

## Pause the pipeline

Two ways:

- **Disable the workflow**: Actions tab → "Auto Blog Writer (Yahavi)" → "..." → Disable workflow
- **Clear the queue**: edit `content/blog-queue.json` and set `keywords: []`

## Rate limit handling

When Groq returns `429 Too Many Requests`, the rate-limited key is marked
cooling down in `content/blog-state.json` for the duration of the
`Retry-After` header (default 1 hour). Other keys keep working. On the next
cron tick, the cooling-down key is skipped until its cooldown expires.

If ALL 10 keys are cooling down at once (unlikely on the free tier), the
run gracefully exits. Next run will try again.

## Dedup guarantees

Three layers of dedup prevent ever writing the same blog twice:

1. **State check** — `state.done` is consulted before picking keywords
2. **File check** — even if state is wrong, an existing `<slug>.md` is never overwritten
3. **Slug normalisation** — `"How to use VLOOKUP"` and `"how to use vlookup??"` produce the same slug

## Anti-AI-tell writing

The Groq system prompt explicitly:

- Bans phrases like "In today's fast-paced world", "It's important to note", "Furthermore"
- Requires varied sentence length + one personal anecdote per article
- Forces Indian business context (₹, lakhs, crores, GST, MSME)
- Includes 4-8 real Excel formulas in code blocks
- Closes with a soft CTA to the relevant Hackknow product

Edit `scripts/auto-blog/template.mjs` if you want to change the voice.

## Frontmatter

Each generated `<slug>.md` starts with YAML frontmatter:

```yaml
---
title: "Blog Title"
slug: "blog-slug"
excerpt: "150-160 character meta description"
date: "2026-05-15"
author: "Yahavi"
category: "Excel"
primary_keyword: "..."
secondary_keywords: ["...", "..."]
hero_emoji: "📊"
read_minutes: 8
word_count: 1700
cta_product_category: "excel-dashboards"
cta_url: "https://hackknow.com/shop?category=excel-dashboards"
cta_text: "See ready Excel dashboards on Hackknow"
ai_generated: true
auto_blog_version: 1
---
```

Read these in `app/src/lib/hk-content.ts` (or wherever the existing blog
loader lives) to render the post.

## Local development

```bash
# Test ONE blog locally with a single key
GROQ_API_KEY=gsk_yourkey BLOG_MAX_PER_RUN=1 node scripts/auto-blog/run.mjs

# Then check the output
ls -la app/src/content/blog/
cat app/src/content/blog/<your-slug>.md
```

## Budget math

Per blog ≈ 2500 input + 2500 output tokens = ~5K tokens.

Groq free tier (per key): 14,400 requests/day, 6,000 TPM, 30 RPM.

With 10 keys × 4 runs/day × 10 blogs/run = 400 blogs/day theoretical max.
Practical cap is your queue length. At 80 starter keywords + the rate
of new keyword additions, you'll have steady output for ~6 months.
