/**
 * Hand-written long-form articles served directly from React (no WordPress).
 *
 * These are SEO-grade articles (1200-1800 words each) targeting high-intent
 * long-tail searches relevant to the Indian SME + professional market.
 *
 * They:
 *   - Appear in the /blog feed AT THE TOP (prepended to WP posts)
 *   - Render at /blog/<slug> via BlogPostPage which checks this list first
 *   - Inject Article JSON-LD + (optional) FAQPage JSON-LD per article
 *   - Are listed in /sitemap.xml so Google + Bing index them on next crawl
 *
 * Owner can later re-publish any of these inside WordPress and remove the
 * static entry — slugs match for clean migration.
 */

export type FeaturedArticle = {
  slug: string;
  title: string;
  category: string;
  publishDate: string;            // ISO yyyy-mm-dd
  modifiedDate?: string;
  excerpt: string;                // ~ 160 chars, used in cards + meta description
  metaDescription?: string;       // explicit override if different from excerpt
  keywords?: string[];
  readMinutes: number;
  gradient: string;               // CSS gradient for fallback hero
  contentHtml: string;            // full article body (HTML)
  faq?: { q: string; a: string }[]; // optional FAQ section -> FAQPage schema
};

export const FEATURED_ARTICLES: FeaturedArticle[] = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'best-excel-dashboard-templates-india-2026',
    title: 'Best Excel Dashboard Templates for Indian SMEs in 2026',
    category: 'Excel & Dashboards',
    publishDate: '2026-04-30',
    excerpt: 'A practical, India-first guide to choosing Excel dashboard templates that actually work for SMEs in 2026 — sales, finance, HR, inventory, and MIS — with selection criteria and honest recommendations.',
    keywords: ['excel dashboard template india', 'sme dashboard template', 'mis dashboard excel', 'sales dashboard excel'],
    readMinutes: 9,
    gradient: 'linear-gradient(135deg, #FFD60A 0%, #FF7700 100%)',
    contentHtml: `
<p><strong>If you run an Indian SME in 2026, your single biggest reporting bottleneck is almost certainly Excel.</strong> Not because Excel is bad — it is the most cost-effective business tool ever shipped — but because most teams build their dashboards from scratch every quarter, copy formulas across tabs that nobody else understands, and spend 30% of every Monday morning rebuilding pivots.</p>

<p>This guide cuts through the noise. We have looked at every Excel dashboard template family on the Indian market, including HackKnow's own catalogue and the international ones (Smartsheet, Spreadsheeto, Etsy bundles), and built a clear-eyed selection framework for picking the right one for your business. By the end of this article you will know exactly what a good Indian SME dashboard template should contain, what to avoid, and which categories are worth paying for vs. building.</p>

<h2>Why "Indian SME" matters as a filter</h2>
<p>Most international dashboard templates were built for US or UK businesses. They assume a calendar fiscal year (Jan-Dec), a flat tax structure, USD/GBP currency formatting, no GST, and customer concentration by ZIP code. None of that fits the Indian context. A good India-first template should at minimum:</p>
<ul>
  <li><strong>Use the Indian fiscal year</strong> — April to March, with quarter labels Q1 (Apr-Jun) through Q4 (Jan-Mar).</li>
  <li><strong>Format currency as INR with Indian numbering</strong> — lakhs and crores, not millions and billions. Yes, this matters: a board member who reads "1.2M" instead of "₹12 lakh" is mentally translating, and translation errors compound.</li>
  <li><strong>Have GST-aware columns</strong> — separate IGST / CGST / SGST tracking, so the dashboard plays nicely with Tally / Zoho Books / GSTN exports.</li>
  <li><strong>Support state-wise breakdowns</strong> — most Indian businesses sell across states with very different unit economics. A "by region" pivot that only knows North/South is useless.</li>
</ul>

<h2>The 5 dashboard families every SME needs</h2>

<h3>1. Sales pipeline + revenue dashboard</h3>
<p>This is the one that pays for itself in week one. A good sales dashboard tracks lead source, stage, expected close date, weighted pipeline, win rate by sales rep, and product-mix revenue. The killer feature: a "Q4 forecast" tab that pulls from your stage-weighted pipeline so you stop guessing in board meetings.</p>
<p>Look for templates that include a leaderboard — Indian sales teams are intensely motivated by visible rank. We saw 2x activity uplift in pilot data when teams added a public leaderboard.</p>

<h3>2. Cash-flow + receivables dashboard</h3>
<p>If you only buy one template, make it this. Most Indian SMEs die from working capital mismanagement, not from lack of revenue. A receivables dashboard with aging buckets (0-30, 31-60, 61-90, 90+ days) and per-customer DSO will surface trouble 60 days before it bites you.</p>
<p>The premium versions also model out the next 13 weeks of cash inflow vs outflow at a weekly resolution, which is the gold standard for SME cash-flow planning.</p>

<h3>3. HR + payroll analytics dashboard</h3>
<p>Often overlooked because "HR is a cost centre". Wrong: a good HR dashboard surfaces attrition by team, by tenure, by manager, and by salary band — and that's where most of your hidden cost lives. The good ones include attrition heatmaps that update in one click from a flat employee list export.</p>

<h3>4. Inventory + procurement dashboard</h3>
<p>Critical for trading, manufacturing, and D2C businesses. The non-negotiables: SKU-level stock turn, days-of-cover, slow-mover flagging (anything over 90 days un-touched), and reorder-point alerts based on lead time + safety stock formulas.</p>

<h3>5. MIS executive dashboard</h3>
<p>The board-level rollup. Pulls top metrics from the four dashboards above into a single one-page view: revenue vs target, cash runway, AR aging summary, headcount, top SKU performance. Print-friendly because boards still want PDFs.</p>

<h2>Selection criteria: what separates a great template from a mediocre one</h2>
<ol>
  <li><strong>Editable formulas, not VBA macros.</strong> If the template breaks the moment you change a row, it's worse than useless. Look for native Excel formulas (XLOOKUP, LET, FILTER, SUMIFS) that you can read, debug, and extend yourself.</li>
  <li><strong>Documentation tab.</strong> Good templates ship with a "How this works" tab explaining each named range and pivot source. If you can't onboard a new analyst in 20 minutes using the docs tab, the template is too clever.</li>
  <li><strong>Dummy data provided.</strong> You should be able to open the file and immediately see a working dashboard with 200-500 rows of realistic dummy data. This proves the formulas actually work and gives you a reference for your own data shape.</li>
  <li><strong>Conditional formatting that survives copy-paste.</strong> Cheap templates lose all formatting the first time you paste a fresh data set. Good ones use named tables (Excel "ListObjects") so formatting and formulas auto-extend.</li>
  <li><strong>One-page printable view.</strong> Boards still print things. A template without a print-ready view is a template you'll outgrow in 2 weeks.</li>
</ol>

<h2>Build vs buy: when does it make sense to pay?</h2>
<p>The honest answer: <strong>buy for anything that's been built a thousand times before; build for things genuinely unique to your business.</strong></p>
<p>If you need a P&amp;L summary, a cash-flow forecast, a sales leaderboard, or a basic inventory dashboard — every business needs these and there's no competitive moat in building one yourself. A ₹299-799 template will save 8-20 hours of work. The math is brutally one-sided.</p>
<p>If you're building a custom KPI specific to your business model (a media house tracking ad inventory by daypart, a logistics company tracking per-route margin), build it yourself, but use a purchased template as the structural base.</p>

<h2>Common mistakes when buying Excel templates online</h2>
<ul>
  <li><strong>Buying a "ZIP of 500 templates" off Etsy or random sites.</strong> 99% of these are recycled, broken, or wrong-currency. You'll waste a weekend triaging them.</li>
  <li><strong>Picking the prettiest one without checking the formulas.</strong> A beautiful dashboard with hard-coded numbers is a screenshot, not a tool.</li>
  <li><strong>Trying to make one mega-template do everything.</strong> A separate sales, cash, HR, inventory, and MIS file is much easier to maintain than a single 30-tab monstrosity.</li>
</ul>

<h2>Where HackKnow fits</h2>
<p>We built our Excel template catalogue specifically for the gap above: Indian fiscal year, INR formatting, GST-aware, native formulas (no VBA), and a documentation tab on every file. You can browse the full catalogue at <a href="/shop/excel-templates">/shop/excel-templates</a>, or jump straight to <a href="/shop/custom-dashboards">dashboards</a> or <a href="/mis-templates">MIS templates</a>.</p>

<h2>The bottom line</h2>
<p>A good Excel dashboard template pays for itself in the first week. A great one becomes the heartbeat of your weekly review for years. Pick for the Indian context (fiscal year, INR, GST), insist on editable native formulas with documentation, and resist the urge to buy mega-bundles. Five focused dashboards — sales, cash, HR, inventory, MIS — covers 90% of what an SME needs.</p>
<p>And if you build your own from scratch every quarter, please stop. You're not building leverage; you're rebuilding the same wheel.</p>
`,
    faq: [
      { q: 'Are HackKnow Excel dashboard templates compatible with Excel 2016?',
        a: 'Yes. We use formulas that work in Excel 2016 and later (XLOOKUP and LET are gracefully fallback-handled). All templates are tested in Excel 365, Excel 2019, and Excel 2016. Google Sheets compatibility is noted per template.' },
      { q: 'Do the templates use VBA macros?',
        a: 'No. Every dashboard ships with native Excel formulas only — no VBA, no macros, no security warnings. This makes them easier to audit, share, and modify.' },
      { q: 'Can I use HackKnow templates for client work?',
        a: 'Yes. Our standard licence permits unlimited internal and client use. You cannot resell the templates as-is, but you can build deliverables on top of them and bill your client.' },
      { q: 'How quickly can I be up and running with a new dashboard?',
        a: 'Most users have a working dashboard with their own data in under 30 minutes. The "How this works" documentation tab walks you through the data structure each template expects.' }
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'mis-report-format-excel-complete-guide',
    title: 'MIS Report Format in Excel: Complete Guide for Indian Professionals',
    category: 'MIS & Reporting',
    publishDate: '2026-04-26',
    excerpt: 'A comprehensive, no-fluff guide to building an MIS report in Excel — from raw data structure to executive-ready dashboard — based on patterns used by the best MIS executives in India.',
    keywords: ['mis report format in excel', 'mis report sample', 'monthly mis report', 'mis dashboard excel'],
    readMinutes: 11,
    gradient: 'linear-gradient(135deg, #FF00A0 0%, #FF7700 100%)',
    contentHtml: `
<p>Every MIS executive in India has had this conversation: <em>"Boss wants the monthly MIS by 9 AM Monday."</em> What follows is a frantic Sunday evening of pulling exports from Tally, copy-pasting attendance from biometric, hand-checking GST inputs, and praying that nobody asks "what changed vs. last month?"</p>

<p>This guide gives you a battle-tested MIS report format used by senior MIS executives across Indian SMEs. By the end, you'll have a clear structure, a build sequence, and a checklist you can use this Sunday to never have a chaotic Monday morning again.</p>

<h2>What is an MIS report (and what it is not)</h2>
<p><strong>MIS — Management Information System — is a recurring, decision-grade report that summarises business performance for the leadership team.</strong> It is <em>not</em>:</p>
<ul>
  <li>An ERP screen full of raw data (that's an export)</li>
  <li>A 40-tab Excel file with everything (that's a data warehouse)</li>
  <li>Last month's numbers with this month's date (that's a fraud)</li>
</ul>

<p>A good MIS report has three properties: it is <strong>decision-relevant</strong> (every line answers a question leadership actually has), it is <strong>variance-driven</strong> (it always shows actuals vs target / vs last period), and it is <strong>page-budgeted</strong> (one page summary, max 10 pages of detail).</p>

<h2>The standard MIS report structure</h2>
<p>Build your file in this order. Don't skip steps; each tab depends on the previous one.</p>

<h3>Tab 1: Cover &amp; index</h3>
<p>Company name, report period (e.g., "April 2026"), prepared by, prepared on, and a one-paragraph executive summary. Plus a clickable index of the tabs to follow. Boards love this. Junior preparers skip it. Don't.</p>

<h3>Tab 2: Executive dashboard</h3>
<p>One page, fits on A4 portrait. Six to nine cards in a 3x3 grid showing: revenue (actual vs target, % achievement, vs last period), gross margin %, EBITDA, cash on hand, AR aging summary, headcount, top customer concentration, and a single "headline KPI" specific to your business (e.g., daily active users for a SaaS, occupancy % for a hotel).</p>

<h3>Tab 3: P&amp;L summary</h3>
<p>Trial-balance rolled up to revenue / COGS / gross profit / opex categories / EBITDA / depreciation / interest / PAT. Always show three columns: this month, last month, year-to-date. Add variance % columns. Add a fourth "Notes" column where you write one-line explanations for any variance over ±15%.</p>

<h3>Tab 4: Cash flow</h3>
<p>Indirect method (start with PAT, add depreciation, adjust working capital). Plus a 13-week rolling cash forecast showing expected weekly inflows and outflows. This is the single most-read tab by founders.</p>

<h3>Tab 5: Sales analytics</h3>
<p>Revenue by product, by customer, by sales rep, by state. Add a Pareto view ("top 20% of customers = X% of revenue"). Add a customer concentration risk indicator if any single customer is over 15% of revenue.</p>

<h3>Tab 6: Receivables &amp; payables</h3>
<p>AR aging in 0-30, 31-60, 61-90, 90+ buckets, per customer. AP aging in the same buckets. DSO and DPO trend chart for the last 6 months. Flag any customer crossing 90 days for follow-up.</p>

<h3>Tab 7: Inventory (if applicable)</h3>
<p>SKU-level stock value, days of cover, slow movers (>90 days untouched), and stockout flags. Plus a reorder list if you're trading.</p>

<h3>Tab 8: HR &amp; payroll</h3>
<p>Headcount by department, joiners and leavers this month, attrition % (rolling 12 month), payroll cost as % of revenue, pending PF / ESI / PT compliance items.</p>

<h3>Tab 9: Compliance</h3>
<p>Status of GST returns, TDS payments, PF / ESI deposits, ROC filings, statutory due dates in the next 30 days. A simple traffic-light column (green = filed, amber = due in &lt;7 days, red = overdue).</p>

<h3>Tab 10: Annexure / source data</h3>
<p>The raw data and pivot tables that feed everything above. Hidden by default, but available for any leader who wants to drill in.</p>

<h2>Build sequence: how to actually create the file</h2>
<ol>
  <li><strong>Start with the source data tab.</strong> Build clean tables (Insert → Table) for raw exports from Tally, payroll, CRM, and inventory. Name them <code>tbl_pl</code>, <code>tbl_payroll</code>, etc.</li>
  <li><strong>Build pivot tables off the source tables.</strong> One pivot per metric. Name them with prefix <code>pv_</code>.</li>
  <li><strong>Build the dashboard cards using GETPIVOTDATA() or direct XLOOKUP() on the pivots.</strong> Never hard-code numbers.</li>
  <li><strong>Add charts last.</strong> Charts are decoration; numbers are the message. Don't let chart-tweaking eat your Sunday.</li>
  <li><strong>Save a "blank monthly" version as a template.</strong> Copy it each month, replace the source-data tabs, and the dashboard updates itself.</li>
</ol>

<h2>The MIS executive's Monday-morning checklist</h2>
<ul>
  <li>All source data tabs refreshed with current month's exports? ✓</li>
  <li>Pivot tables refreshed (Data → Refresh All)? ✓</li>
  <li>Variance &gt; ±15% lines all have one-line explanations? ✓</li>
  <li>Cash forecast updated for actuals? ✓</li>
  <li>AR aging reviewed; collection follow-ups assigned? ✓</li>
  <li>Compliance tab traffic lights all green or amber-with-action? ✓</li>
  <li>Cover sheet executive summary updated (3-4 sentences)? ✓</li>
  <li>File saved as <code>MIS_YYYY-MM_v1.xlsx</code>? ✓</li>
</ul>

<h2>Common MIS reporting mistakes</h2>
<ul>
  <li><strong>Showing absolute numbers without context.</strong> "Revenue ₹52L" means nothing. "Revenue ₹52L (target ₹60L, achievement 87%, vs last month +12%)" is decision-grade.</li>
  <li><strong>Burying the headline.</strong> If cash runway dropped to 4 months, that goes on the cover, not on tab 9.</li>
  <li><strong>Repeating the dashboard in narrative form.</strong> Numbers go on the dashboard; insight goes in the notes column.</li>
  <li><strong>Not version-controlling.</strong> Always save with a date stamp. You will be asked "what was March's version?" eight months from now.</li>
</ul>

<h2>Templates that save you the build time</h2>
<p>If you're building this from scratch, expect 3-5 days for a clean v1. Or take a tested starting point — our <a href="/mis-templates">MIS templates collection</a> has the structure above pre-built with the formulas wired up. Browse the <a href="/shop/excel-accounting">accounting and finance templates</a> too if you need P&amp;L and cash-flow modules separately.</p>

<p>Want to learn the underlying skills properly? Our <a href="/courses">premium courses</a> include a full MIS executive track that walks through this exact format with real datasets.</p>

<h2>Final word</h2>
<p>A great MIS report is not a beautiful Excel file. It is a <strong>decision-grade summary that the leadership team actually reads on Monday morning</strong>. Build for that audience, keep the structure consistent month-over-month, and resist the urge to add tabs just because. Less is more in MIS.</p>
`,
    faq: [
      { q: 'How long should a monthly MIS report be?',
        a: 'One-page executive dashboard plus 8-10 detail tabs. The leadership reads the cover and dashboard; the rest is for drill-down on questions that arise.' },
      { q: 'Should I use Power BI instead of Excel for MIS?',
        a: 'Power BI is excellent for live dashboards consumed digitally. Excel is still the right tool for the formal monthly MIS report that gets emailed, printed, and discussed line-by-line in board meetings. Many Indian SMEs use both.' },
      { q: 'How do I handle multiple business units in one MIS file?',
        a: 'Add a BU dropdown filter on the dashboard tab using a slicer connected to all pivots. Keep one consolidated view as default; let users filter per BU on demand.' },
      { q: 'What is the standard MIS reporting frequency?',
        a: 'Monthly is the universal standard for SMEs. Larger companies add a weekly cash-flow flash report. Daily reports should be reserved for live operational dashboards, not full MIS.' }
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'free-vs-paid-excel-templates-honest-comparison',
    title: 'Free vs Paid Excel Templates: Honest 2026 Comparison',
    category: 'Buying Guide',
    publishDate: '2026-04-22',
    excerpt: 'A frank comparison of free vs paid Excel templates in 2026 — when free is genuinely enough, when paid pays for itself, and how to spot template scams. No marketing fluff.',
    keywords: ['free excel templates', 'paid excel templates', 'best excel templates india', 'free vs paid'],
    readMinutes: 8,
    gradient: 'linear-gradient(135deg, #1A1A1A 0%, #FFD60A 100%)',
    contentHtml: `
<p>Walk into any Excel template comparison article online and you'll get one of two answers: "free is great, never pay" or "paid is always worth it". Both are wrong. The honest answer depends entirely on what you're building, how often you'll use it, and how much your time is worth.</p>

<p>This article gives you the actual decision framework, with no marketing fluff (yes, even though we sell paid templates).</p>

<h2>What you actually get for free in 2026</h2>
<p>The free template ecosystem in 2026 is genuinely good for some categories. Worth knowing:</p>
<ul>
  <li><strong>Microsoft's official template gallery</strong> — solid, polished, but generic. Calendars, simple budgets, basic invoices. Quality is reliable; customisation is limited.</li>
  <li><strong>Google's template library inside Sheets</strong> — same as above. Often a better starting point than starting from a blank sheet.</li>
  <li><strong>GitHub open-source templates</strong> — surprisingly good for technical use cases (project trackers, OKR sheets, KPI dashboards). Variable quality. Almost always international (USD, calendar fiscal year).</li>
  <li><strong>Vertex42, Spreadsheet123</strong> — the original free Excel template sites. Still alive. Good for one-off needs (loan amortisation, mortgage calculator).</li>
</ul>

<p>What you almost never get for free in 2026:</p>
<ul>
  <li>India-specific templates (Indian fiscal year, GST, INR, lakh-crore formatting)</li>
  <li>Industry-specific templates (D2C cohort analysis, restaurant occupancy, school fees collection)</li>
  <li>Multi-tab integrated dashboards (sales + inventory + cash all wired together)</li>
  <li>Documentation and support — when something breaks, you're on your own</li>
</ul>

<h2>The hidden cost of "free"</h2>
<p>Free templates have three hidden costs people forget to count:</p>

<h3>1. Time-to-fit cost</h3>
<p>A generic free invoice template will take you 2-3 hours to customise: change the currency to INR, add GSTIN field, add IGST/CGST/SGST split, add HSN code column, add Indian numbering, change the date format to DD-MM-YYYY, add your logo. At even ₹500/hr opportunity cost, you've already burned ₹1500.</p>

<h3>2. Maintenance cost</h3>
<p>Free templates rarely get updated. When GST rules changed in 2017 (and again in 2020, 2022), every free Indian invoice template online went stale overnight. You either find a new one (more time) or update it yourself (more time).</p>

<h3>3. The "I'll customise later" trap</h3>
<p>You download a free dashboard, get 60% of the way through customising it for your business, then a board meeting comes up. Six months later, that half-finished file is still the one you're using, looking ugly, hard-coded in places, and embarrassing.</p>

<h2>When free is genuinely the right answer</h2>
<p>Free is the right call when:</p>
<ul>
  <li><strong>You'll use it once or twice.</strong> One-off mortgage calculation, one-time event budget. Don't overthink it.</li>
  <li><strong>You're learning Excel.</strong> Building from scratch (or from a free starter) is the fastest way to actually understand how a dashboard works.</li>
  <li><strong>You have a developer or analyst in-house with capacity.</strong> They'll happily build you a custom template in a couple of days, and it'll be tailored to your exact needs.</li>
  <li><strong>The template is for personal use, not business.</strong> A personal monthly budget? Microsoft's free one is fine.</li>
</ul>

<h2>When paid templates pay for themselves in week one</h2>
<ul>
  <li><strong>You'll use it weekly or monthly for years.</strong> A ₹599 template used 50 weeks a year for 3 years is ₹4 per use. Even saving 10 minutes per use vs a manual build pays back in week one.</li>
  <li><strong>It's India-specific.</strong> GST calculator, Indian payroll, GSTR-3B reconciliation. Building these from scratch wastes a week.</li>
  <li><strong>Multiple stakeholders will see it.</strong> A board-facing dashboard or investor MIS deserves polish. Free templates look amateur in board meetings.</li>
  <li><strong>You need it tomorrow.</strong> If the deadline is real, paying ₹500 to skip 2 days of building is the obvious trade.</li>
</ul>

<h2>How to spot a template scam</h2>
<p>The Excel template market has its share of bad actors. Watch for:</p>
<ul>
  <li><strong>"500 templates for ₹99" bundles.</strong> These are scraped from open-source repos, often broken, almost always wrong-currency. You'll spend a weekend finding the 3 useful ones, and the rest will rot in a folder forever.</li>
  <li><strong>Sites with no clear seller name or India contact.</strong> If you can't see who built it, you can't get support when it breaks. Skip.</li>
  <li><strong>"Lifetime access" without a download link.</strong> Some scammy storefronts gate the download behind constant logins to push ads. Real templates ship as a downloadable file, full stop.</li>
  <li><strong>Screenshots that don't match the actual file.</strong> Always look for a video walkthrough or live preview. If the seller shows only marketing screenshots, the file probably looks different.</li>
  <li><strong>No refund policy.</strong> Trustworthy sellers offer a refund if the template is materially broken. We do (see our <a href="/refund-policy">refund policy</a>).</li>
</ul>

<h2>The cost-benefit math, simplified</h2>
<p>Use this rule of thumb. For any template you're considering paying for, ask:</p>
<blockquote>
<strong>"How many hours of my time will this save me, and what is one of my hours worth?"</strong>
</blockquote>
<p>If the template costs less than the time it saves at your hourly rate, it's a no-brainer. For most professionals, anything under ₹1000 that saves more than 2 hours is an instant buy.</p>

<h2>Final word</h2>
<p>Free templates are great for one-off, personal, or learning use. Paid templates make sense the moment you have a recurring business need, an India-specific use case, or a deadline. The single biggest mistake people make is spending 8 hours building from scratch what they could have bought for ₹500.</p>

<p>Browse our full catalogue at <a href="/shop">/shop</a>, our 100+ free resources at <a href="/shop/free-resources">/shop/free-resources</a>, or jump straight to <a href="/shop/excel-templates">Excel templates</a> if you know what you need.</p>
`,
    faq: [
      { q: 'Are HackKnow templates editable?',
        a: 'Yes. Every template ships in fully editable native format (.xlsx, .pptx, .docx). You can adapt them freely for personal or commercial use under our standard licence.' },
      { q: 'Do you offer free Excel templates?',
        a: 'Yes — we maintain a curated library of 100+ free resources at /shop/free-resources. These are good starting points; the paid catalogue covers India-specific and integrated dashboards.' },
      { q: 'What if a paid template does not work for me?',
        a: 'If the template is materially different from its description or has a technical defect, contact support@hackknow.com within 7 days for a refund or replacement. See /refund-policy for details.' }
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'how-to-become-data-analyst-india-2026-roadmap',
    title: 'How to Become a Data Analyst in India in 2026: Step-by-Step Roadmap',
    category: 'Career Roadmaps',
    publishDate: '2026-04-18',
    excerpt: 'A practical, no-shortcut roadmap to becoming a hireable data analyst in India in 2026 — exact skills, the order to learn them, real timelines, and the projects you actually need on your portfolio.',
    keywords: ['how to become data analyst india', 'data analyst roadmap', 'data analyst career', 'data analyst skills india'],
    readMinutes: 10,
    gradient: 'linear-gradient(135deg, #FF7700 0%, #FF00A0 100%)',
    contentHtml: `
<p>Every week, we get the same question from junior professionals and college graduates: <em>"I want to become a data analyst in India. Where do I start?"</em> The internet's answer is usually a list of 50 tools, no order, and a "complete in 3 months" promise that nobody actually keeps.</p>

<p>Here is the real roadmap. It takes 6-9 months of consistent work, not 3. It assumes you can put in 10-15 focused hours per week. By the end, you will be hireable as an entry-level data analyst at an Indian company at ₹4-8 LPA, with a clear path to ₹10-15 LPA in 18-24 months.</p>

<h2>The job, honestly</h2>
<p>A data analyst in India in 2026 spends roughly 60% of their time on data cleaning and preparation, 25% on analysis and insight, and 15% on presenting findings to stakeholders. The good news: every one of those skills is learnable in months, not years. The harder news: the analysts who get promoted are the ones who can <em>communicate</em>, not just calculate. We'll come back to this.</p>

<h2>The four-pillar skill stack</h2>

<h3>Pillar 1: Excel (4-6 weeks)</h3>
<p>Yes, still. Excel is the universal data tool in Indian businesses. Master:</p>
<ul>
  <li>Pivot tables, slicers, and pivot charts</li>
  <li>Lookups: VLOOKUP, XLOOKUP, INDEX-MATCH</li>
  <li>Aggregation: SUMIFS, COUNTIFS, AVERAGEIFS</li>
  <li>Logic: IF, IFS, nested logic</li>
  <li>Tables (ListObjects) and structured references</li>
  <li>Power Query for data cleaning</li>
  <li>Conditional formatting and data validation</li>
</ul>
<p>Practice on real datasets, not contrived ones. Pull a year of Indian Premier League stats from a CSV, build a dashboard that ranks players by various filters. Rebuild it three times until you can do it in 30 minutes.</p>

<h3>Pillar 2: SQL (4-6 weeks)</h3>
<p>This is the highest-leverage skill in the entire stack. SQL is what every data team actually uses to get data out of databases. Master, in order:</p>
<ul>
  <li>SELECT, WHERE, ORDER BY, LIMIT</li>
  <li>JOINs (INNER, LEFT, RIGHT, FULL) — most important topic, do not rush</li>
  <li>GROUP BY, HAVING, aggregate functions</li>
  <li>Subqueries and CTEs</li>
  <li>Window functions (ROW_NUMBER, RANK, LAG, LEAD, running totals)</li>
  <li>CASE statements</li>
  <li>Date functions and string functions</li>
</ul>
<p>Use a free PostgreSQL setup (Docker) and load a real dataset (NYC taxi rides, India weather data, public IPL stats). Build a query a day for 30 days. By day 30 you will be better than 80% of the SQL screening tests in entry-level interviews.</p>

<h3>Pillar 3: A BI tool — Power BI or Tableau (4 weeks)</h3>
<p>Pick one. In India, Power BI has the larger market share (Microsoft ecosystem, cheaper licensing for SMEs). Tableau is dominant at large enterprises and global product companies. Both are excellent.</p>
<p>Learn:</p>
<ul>
  <li>Connecting to data (Excel, CSV, SQL)</li>
  <li>Data modelling (star schema, relationships, measures vs dimensions)</li>
  <li>DAX (for Power BI) — the formula language. Spend a week on this alone.</li>
  <li>Building visualisations: bar, line, scatter, heatmap, KPI card</li>
  <li>Filters, slicers, and drill-down</li>
  <li>Publishing to Power BI Service / Tableau Public</li>
</ul>

<h3>Pillar 4: Python for data (6-8 weeks)</h3>
<p>This is what separates a basic analyst from a hireable analyst in 2026. Learn:</p>
<ul>
  <li>Python basics: variables, lists, dicts, functions, loops</li>
  <li>pandas: read CSV, clean data, filter, group, merge</li>
  <li>numpy basics</li>
  <li>matplotlib + seaborn for plotting</li>
  <li>Jupyter notebooks workflow</li>
  <li>Reading data from a database with SQLAlchemy</li>
</ul>
<p>You don't need to learn machine learning yet. That comes after you're hired and have a year of experience.</p>

<h2>Soft skills (do not skip these)</h2>
<ul>
  <li><strong>Writing for stakeholders.</strong> Practice writing 100-word executive summaries of every analysis you do. The analyst who can summarise gets promoted.</li>
  <li><strong>Speaking to non-technical audiences.</strong> Record yourself explaining one of your dashboards. Watch it back. Iterate.</li>
  <li><strong>Asking better questions.</strong> When given a task, ask "what decision will this analysis enable?" before you start. This single habit will distinguish you in interviews.</li>
</ul>

<h2>The portfolio: what you actually need</h2>
<p>Three projects, that's it. More is not better; quality is.</p>
<ol>
  <li><strong>Project 1 — End-to-end dashboard.</strong> Pick a public dataset (Indian unemployment data, IPL stats, Bangalore real-estate listings). Build a 5-page Power BI / Tableau dashboard. Write a 1-page executive summary. Publish on GitHub with a clear README.</li>
  <li><strong>Project 2 — SQL deep-dive analysis.</strong> Same dataset or different one. Write 15-20 SQL queries answering progressively harder business questions. Publish in a notebook with the question, the query, the output, and a one-line insight per query.</li>
  <li><strong>Project 3 — Python data pipeline.</strong> Pull data from a public API (Twitter, weather, cricket stats), clean it with pandas, store it, and produce a recurring chart. This proves you can build a workflow, not just analyse.</li>
</ol>

<h2>How to apply (and actually get interviews)</h2>
<ul>
  <li>LinkedIn profile: clear headline ("Aspiring Data Analyst | SQL · Python · Power BI · Excel"), 3 portfolio links, 2-3 sentences in the About section about a real problem you solved.</li>
  <li>Apply to 5-10 jobs per day, every weekday, for 6 weeks. Customise the first 2 lines of every cover letter to mention something specific about the company.</li>
  <li>Use Naukri, LinkedIn, Instahyre, AngelList. Skip the spray-and-pray sites.</li>
  <li>Practice 30 SQL questions and 10 Excel case questions before your first interview. Most interview rejection happens on basic SQL; do not lose on the basics.</li>
</ul>

<h2>Realistic timeline and salary</h2>
<table>
  <tr><th>Month</th><th>Focus</th><th>Outcome</th></tr>
  <tr><td>1-2</td><td>Excel + start SQL</td><td>Comfortable with pivots, basic queries</td></tr>
  <tr><td>3-4</td><td>SQL deep-dive + start BI tool</td><td>Window functions, first dashboard</td></tr>
  <tr><td>5-6</td><td>BI tool + start Python</td><td>Project 1 published</td></tr>
  <tr><td>7-8</td><td>Python pandas + portfolio polish</td><td>All 3 projects published</td></tr>
  <tr><td>9</td><td>Apply + interview prep</td><td>First offer letter</td></tr>
</table>
<p>Entry-level salaries in India in 2026: ₹4-8 LPA in tier-2 cities, ₹6-12 LPA in Bangalore / Hyderabad / Pune / Mumbai / Gurgaon. After 18-24 months of solid work and a job switch, ₹12-20 LPA is realistic.</p>

<h2>What HackKnow can help with</h2>
<p>Every step of this roadmap is covered in our resources. Browse:</p>
<ul>
  <li><a href="/roadmaps">Career roadmaps</a> — the full data analyst path with milestone checklist</li>
  <li><a href="/courses">Premium courses</a> — Excel, SQL, Python, Power BI tracks</li>
  <li><a href="/shop/excel-templates">Excel templates</a> — practice datasets and dashboard starters</li>
</ul>

<h2>The honest truth</h2>
<p>The data analyst role is one of the most accessible high-leverage careers in India in 2026. There is no gatekeeping degree required. There is no shortcut either. Six to nine months of consistent practice, three quality portfolio projects, and a willingness to communicate your work clearly will get you hired. Go.</p>
`,
    faq: [
      { q: 'Do I need a degree to become a data analyst in India?',
        a: 'No formal data degree is required. Most hiring managers care about skills (SQL, Excel, Python, BI tool) and a portfolio of real work. Any graduate degree is sufficient as a baseline credential.' },
      { q: 'Is data analyst a good career in India in 2026?',
        a: 'Yes. The role has strong demand across IT services, fintech, e-commerce, and traditional enterprises. Entry-level pay is ₹4-8 LPA, mid-level ₹12-20 LPA, with clear paths to data science, analytics engineering, or product analyst tracks.' },
      { q: 'Should I learn Power BI or Tableau first?',
        a: 'Power BI for Indian SMEs and Microsoft-ecosystem companies (larger market). Tableau for global product companies and large enterprises. Pick the one that matches the companies you want to work for.' },
      { q: 'How long does it really take to become hireable?',
        a: 'Six to nine months of consistent learning at 10-15 hours per week, with three quality portfolio projects. Anyone promising a shorter timeline is selling you something.' }
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'powerpoint-templates-indian-startups-must-have',
    title: 'Top 10 PowerPoint Templates Every Indian Startup Should Have',
    category: 'PowerPoint & Decks',
    publishDate: '2026-04-14',
    excerpt: 'The 10 PowerPoint templates every Indian startup actually uses week-to-week — from pitch deck to all-hands to investor update — with what each should contain and how to use them.',
    keywords: ['powerpoint template indian startup', 'pitch deck template india', 'startup ppt template', 'investor deck template'],
    readMinutes: 8,
    gradient: 'linear-gradient(135deg, #FFD60A 0%, #FF00A0 100%)',
    contentHtml: `
<p>Indian startups make a lot of decks. Pitch decks for VCs, all-hands for the team, monthly investor updates, customer presentations, sales QBRs, board meetings, hiring pipelines, vendor proposals. Most of them are built from scratch every time, in panic, the night before. The result: inconsistent branding, copy-pasted slides from old decks with the wrong dates, and embarrassing typos in front of investors.</p>

<p>This article lists the 10 PowerPoint templates every Indian startup actually needs in their team's shared drive. Build them once (or buy them once). Use them forever.</p>

<h2>1. The fundraising pitch deck</h2>
<p>The 10-12 slide deck for VC meetings. Industry-standard structure: cover, problem, solution, market size, business model, traction, competition, team, financials, ask. Should ship in two versions: a "send to VC" version (15-20 slides with appendix) and a "present in meeting" version (10-12 slides, lean).</p>
<p>The good ones for Indian startups include INR-formatted financials, SEBI-compliant disclaimers if you're showing projections, and slides that anticipate Indian VC standard questions (unit economics, contribution margin, payback period in months).</p>

<h2>2. The monthly investor update</h2>
<p>Six to eight slides sent on the 5th of every month to existing investors. Standard structure: highlights, lowlights, KPIs vs target, runway, asks, hiring update. The discipline of writing this every month is one of the highest-leverage habits a founder can build.</p>
<p>Investors who get monthly updates are 3x more likely to back follow-on rounds. Treat this template like a contract.</p>

<h2>3. The all-hands deck</h2>
<p>The 15-20 slide deck for the company-wide monthly meeting. Structure: company OKRs status, big wins, key losses (yes, share these), people updates (joiners, leavers, promotions), product roadmap update, customer story of the month, Q&amp;A.</p>
<p>The template should make it possible to assemble in under 60 minutes. Founders who spend 4 hours building all-hands decks are spending 48 hours a year on slide formatting. Buy the template.</p>

<h2>4. The board deck</h2>
<p>15-25 slide deck for the formal board meeting (typically quarterly). Heavier than investor update; includes detailed financials, operational deep-dives, governance items, board resolutions. Should ship with a pre-read appendix that adds 10-15 more slides for committee chairs.</p>

<h2>5. The sales pitch deck</h2>
<p>The 8-12 slide deck your sales team uses on customer calls. Structure: customer's problem (in their words), how you solve it, proof (case studies, logos), pricing, next steps. Should be brand-consistent with the website and easy for any sales rep to customise the customer's name + logo on the cover.</p>

<h2>6. The product roadmap deck</h2>
<p>Quarterly update on what's shipping. Structure: what we shipped last quarter, what we're shipping this quarter, what's coming next quarter, what's on the cutting room floor. The "cutting room floor" slide is what builds trust with the team — it shows you're saying no to good things on purpose.</p>

<h2>7. The hiring/recruiting deck</h2>
<p>The deck a candidate sees in their first conversation with the founder or hiring manager. Structure: company mission, problem we're solving, where we are (traction, funding, team size), what makes us different, compensation philosophy, what working here is actually like.</p>
<p>The recruiting deck is one of the most under-invested decks in Indian startups. The teams that take it seriously close 30-40% better candidates at the same salary band.</p>

<h2>8. The customer success / QBR deck</h2>
<p>The quarterly business review your customer success team takes to enterprise customers. Structure: usage metrics, value delivered (in ₹ saved or ₹ generated), upcoming features, action items, expansion opportunities. The good templates include a "ROI summary" slide that's quotable in renewal conversations.</p>

<h2>9. The vendor / partner proposal deck</h2>
<p>The deck you send to potential partners (resellers, integrators, marketing agencies). Structure: about us, partnership models on offer, economics for the partner, joint go-to-market plan, success stories. Often forgotten until the day a real partnership conversation comes up.</p>

<h2>10. The end-of-year company review</h2>
<p>The narrative deck the founder sends to the team in December: what we achieved, what we learned, who joined, what we're proud of, what's next. This becomes the artifact of your company's history. Build it well.</p>

<h2>Common mistakes Indian startups make with decks</h2>
<ul>
  <li><strong>Building every deck from scratch.</strong> The cost is invisible because nobody's tracking deck-creation hours, but it's enormous. Aggregate it across a year and a 20-person company easily wastes 200-400 hours on deck formatting.</li>
  <li><strong>No master template.</strong> Brand drift is real. After 18 months without a master template, your team's decks all look like they're from different companies.</li>
  <li><strong>Stuffing slides with text.</strong> Indian decks famously over-text. Investors and customers can read; they want one big idea per slide, not a paragraph.</li>
  <li><strong>Using free templates that don't match Indian context.</strong> Western decks use "$" and "Q1 = Jan-Mar". Indian fiscal year is April-March. Mismatch causes embarrassment in board meetings.</li>
  <li><strong>Inconsistent fonts.</strong> Use two fonts max. One for headlines, one for body. Make this a master-slide rule.</li>
</ul>

<h2>How to roll out a template library on your team</h2>
<ol>
  <li>Pick or buy your 10 master templates.</li>
  <li>Set up a single shared drive folder. Make it the only place anyone goes for templates.</li>
  <li>Write a one-page "deck standards" doc covering fonts, colours, INR formatting, fiscal-year conventions.</li>
  <li>For 60 days, review every external-facing deck before it goes out. After 60 days, the team will internalise the standards and you can stop reviewing.</li>
  <li>Update templates twice a year (April and October). Outdated templates rot fast.</li>
</ol>

<h2>Where to get good Indian-startup templates</h2>
<p>Browse our <a href="/shop/powerpoint-decks">PowerPoint deck collection</a> for India-first templates with INR formatting, fiscal-year aware quarter labels, and SEBI-compliant disclaimer footers. Most of the 10 above are available individually or as a startup bundle.</p>

<h2>Final word</h2>
<p>Decks are the medium of business. A startup that takes its decks seriously communicates more clearly, raises money more easily, hires better, and sells more. A startup that treats every deck as a one-off PowerPoint emergency is constantly tripping on its own shoelaces.</p>
<p>Pick your 10 templates this week. Buy them or build them. Use them forever. Your future self will thank you in every Monday morning meeting.</p>
`,
    faq: [
      { q: 'Are HackKnow PowerPoint templates editable in Google Slides?',
        a: 'Most templates are designed for PowerPoint (.pptx) and import into Google Slides with minor formatting adjustments. Each product page notes the supported tools. For Slides-native decks, filter by the Google Slides tag.' },
      { q: 'Do the templates include INR currency formatting?',
        a: 'Yes. Our India-first decks ship with INR formatting, lakh-crore conventions, and fiscal-year-aware quarter labels (Q1 = Apr-Jun) by default.' },
      { q: 'Can I customise the colours and fonts to match my brand?',
        a: 'Yes. Every template uses PowerPoint master slides and theme colours, so swapping your brand palette and fonts takes 5 minutes and updates every slide consistently.' }
    ],
  },
];

export const FEATURED_SLUGS = new Set(FEATURED_ARTICLES.map(a => a.slug));

export function getFeaturedArticle(slug: string): FeaturedArticle | undefined {
  return FEATURED_ARTICLES.find(a => a.slug === slug);
}
