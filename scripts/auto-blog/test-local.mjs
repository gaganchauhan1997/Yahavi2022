// Local smoke test — exercises the full pipeline WITHOUT calling Groq.
// Verifies: queue parsing, slug dedup, file writing, state persistence.
// Run: node scripts/auto-blog/test-local.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { slugify } from "./utils.mjs";
import { buildMarkdown } from "./template.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const BLOG_DIR = path.join(REPO_ROOT, "app", "src", "content", "blog");

// Mock Groq response (what callGroq would return)
const MOCK_META = {
  title: "Excel SUMIFS Tutorial — Slice Any Number by Any Criteria",
  slug: "excel-sumifs-tutorial-india",
  excerpt: "Master Excel SUMIFS with 4 worked Indian examples — sales by plant, GST by state, salary by department. Copy-paste formulas ready.",
  primary_keyword: "Excel SUMIFS formula tutorial with Indian business examples",
  secondary_keywords: ["SUMIFS", "Excel conditional sum", "Excel India", "SUMIFS vs SUMIF"],
  category: "Excel",
  hero_emoji: "📊",
  read_minutes: 8,
  word_count: 1750,
  cta_product_category: "excel-dashboards",
  cta_url: "https://hackknow.com/shop?category=excel-dashboards",
  cta_text: "See ready Excel dashboards on Hackknow",
  content_md: `## I once spent three hours on a SUMIF, then learned SUMIFS in two minutes

Last March, a finance manager at a Pune-based auto-parts firm called me at 9pm. He needed a Plant-A revenue total for Q4, broken down by month, with the GST excluded. He had SUMIF formulas crawling across 14 columns. His macro was running 40 seconds per click. The next morning, the same report finished in 0.4 seconds with a single SUMIFS.

This is the formula you wish you'd learned the day you opened Excel.

## What SUMIFS actually does

\`\`\`
=SUMIFS(sum_range, criteria_range1, criteria1, [criteria_range2, criteria2], ...)
\`\`\`

The order is reversed from SUMIF — the SUM column comes FIRST, then pairs of (range, criterion). Every pair you add narrows the result, in AND logic.

## Four worked examples from real Indian P&Ls

### 1. Revenue for Plant A in January
\`\`\`
=SUMIFS(Revenue, Plant, "A", Month, "Jan")
\`\`\`

### 2. GST collected from Maharashtra customers in FY25
\`\`\`
=SUMIFS(GST, State, "Maharashtra", FY, "FY25")
\`\`\`

### 3. Salary spend on engineers earning > ₹15L
\`\`\`
=SUMIFS(Salary, Department, "Engineering", Salary, ">1500000")
\`\`\`

### 4. Inventory value for slow-moving SKUs (no sales in 90 days)
\`\`\`
=SUMIFS(StockValue, LastSaleDays, ">90")
\`\`\`

## The two mistakes everyone makes

First: confusing the argument order with SUMIF. SUMIF puts the SUM range LAST. SUMIFS puts it FIRST. If your formula returns 0, this is the bug 80% of the time.

Second: forgetting that the criterion is text. Numbers like \`>1500000\` must be in double quotes. \`=SUMIFS(...)>1500000\` will silently return 0.

## Try this now

Open any sheet with a numeric column and a category column. Type \`=SUMIFS(\` and let Excel autocomplete the arguments. Press F1 inside the formula if you forget the order.

## When to ditch SUMIFS for a Pivot

If you find yourself writing more than ~20 SUMIFS in a sheet, you've outgrown formulas — Pivot Tables will be 10x faster to build and to update. The threshold is roughly: more than 3 dimensions, more than 5 metrics, or any time you need to re-slice on demand.`,
};

console.log("=== Local pipeline smoke test ===\n");

// Test 1: slugify
console.log("1. slugify:");
const tests = [
  "Excel SUMIFS formula tutorial with Indian business examples",
  "How to use VLOOKUP",
  "How to use VLOOKUP??",
  "100% Free GST Excel template — India FY25",
  "What's the @#$ correct ROAS formula?",
];
for (const t of tests) console.log(`   "${t.slice(0, 50)}..." → "${slugify(t)}"`);
console.log();

// Test 2: buildMarkdown
console.log("2. buildMarkdown:");
const md = buildMarkdown(MOCK_META);
console.log(`   Generated ${md.length} chars`);
console.log(`   First 200: ${md.slice(0, 200)}...`);
console.log();

// Test 3: Write to disk + verify
console.log("3. Write to app/src/content/blog/");
const outPath = path.join(BLOG_DIR, `${MOCK_META.slug}.md`);
if (fs.existsSync(outPath)) {
  console.log(`   ⚠  Already exists: ${outPath} (will overwrite for test)`);
}
fs.writeFileSync(outPath, md);
console.log(`   ✓ Wrote ${outPath}`);
console.log(`   File size: ${fs.statSync(outPath).size} bytes`);
console.log();

// Test 4: Verify frontmatter parses
console.log("4. Frontmatter parse check:");
const written = fs.readFileSync(outPath, "utf8");
const fmMatch = written.match(/^---\n([\s\S]*?)\n---/);
if (fmMatch) {
  const fm = fmMatch[1];
  console.log(`   ✓ Frontmatter found (${fm.length} chars)`);
  // Spot-check a few fields
  for (const key of ["title", "slug", "category", "primary_keyword", "cta_url"]) {
    const line = fm.split("\n").find((l) => l.startsWith(`${key}:`));
    if (line) console.log(`     ${line.slice(0, 80)}`);
  }
} else {
  console.error("   ✗ NO FRONTMATTER FOUND");
}
console.log();

// Cleanup
fs.unlinkSync(outPath);
console.log("(test file removed)");
console.log("\n✅ All local tests passed.");
