"""HackKnow Excel Templates — Wedding-format contextual content generator.

Each category has a CTX_PACK with hook templates, pain themes, feature pools,
benefit pools, persona pools, deliverable pools, closing lines, CTAs.

Per-template: extract a `topic` noun from the name, then pick from pools using
slug hash for deterministic variation. Output is HTML with <details> collapsibles.

Excerpt = ONLY the hook line (no duplication with description body).
"""
import re, hashlib, html


def _h(slug, n):
    """Deterministic index in [0, n) from slug."""
    return int(hashlib.md5(slug.encode()).hexdigest(), 16) % n


def _topic(name):
    """Extract the topic noun from the template name (drop trailing 'Template'/'Sheet'/etc)."""
    drop = {'template', 'spreadsheet', 'worksheet', 'sheet', 'planner', 'tracker',
            'log', 'logger', 'logbook', 'plan', 'excel'}
    words = [w for w in name.split() if w.lower() not in drop]
    if not words:
        words = name.split()
    return ' '.join(words).strip()


def _short_topic(name):
    """A shorter 1-3 word topic for hooks."""
    t = _topic(name)
    parts = t.split()
    if len(parts) <= 3:
        return t
    return ' '.join(parts[:3])


# ---------------------------------------------------------------------------
# Per-category context packs
# ---------------------------------------------------------------------------

CTX_PACKS = {
    'Accounting': {
        'hook_emojis': ['📒', '💼', '🧾'],
        'subject_emoji': '📒',
        'hook_alts': [
            "Manage Your Books Without The Headache!",
            "Keep Your Accounts Clean Without The Mess!",
            "Track Every Rupee Without Confusion!",
            "Run Your Accounting Like A Pro!",
            "Stay On Top Of Your Books — Effortlessly!",
        ],
        'context_alts': [
            "Your accounts should be clean — not chaotic.",
            "Bookkeeping should be simple — not stressful.",
            "Numbers should give clarity — not confusion.",
            "Closing the month should feel calm — not painful.",
        ],
        'tagline_alts': [
            "✨ No missing entries. No tax-time panic. Just a clean ledger.",
            "✨ No spreadsheet errors. No reconciliation drama. Just clear books.",
            "✨ No last-minute scramble. No chartered-accountant frowns. Just confidence.",
        ],
        'pain_alts': [
            "<p>Most small business owners struggle with manual entries, missed invoices, and tax-season stress.</p><p>This template gives you a ready-made structure so every transaction stays organized and reconciled.</p>",
            "<p>Without a clean ledger, costs leak, profits vanish and audits become nightmares.</p><p>This template fixes that with auto-totals, formula-driven balances and a clean monthly view.</p>",
            "<p>Excel-only accounting often becomes spaghetti — broken formulas, lost columns, no audit trail.</p><p>This template is a clean, formula-locked ledger that even non-accountants can run.</p>",
        ],
        'features_pool': [
            "Pre-built ledger columns with auto-totals",
            "Formula-driven debit, credit and running balance",
            "Monthly summary dashboard at one click",
            "Tax-ready layout for GST/VAT export",
            "Vendor and customer tracking section",
            "Date-wise entry log with sortable filters",
            "Category-wise expense breakdown",
            "Print-friendly statement view",
            "Works in Microsoft Excel and Google Sheets",
            "Easy customization for your business size",
            "Editable header for your company name and logo space",
        ],
        'benefits_pool': [
            "Close every month in minutes, not days",
            "Catch errors before your CA does",
            "Stay audit-ready year round",
            "Save hours on manual reconciliation",
            "Get a clear view of profit and cash position",
            "Reduce dependence on expensive accounting software",
        ],
        'personas_pool': [
            "Small business owners and shopkeepers",
            "Freelancers and consultants",
            "Startup founders managing books in-house",
            "Accounting students learning real-world ledgers",
            "Bookkeepers and junior accountants",
            "NGO and trust treasurers",
        ],
        'deliverables_pool': [
            "{topic} (.xlsx)",
            "Quick-start instruction guide",
            "Sample filled-in example for reference",
            "Instant download — works offline",
            "Lifetime access and free updates",
            "Email support for setup questions",
        ],
        'closing_alts': [
            "💼 Make your books clean, simple and stress-free.",
            "💼 Stay organized, stay audit-ready, stay calm.",
            "💼 Take control of your numbers from day one.",
        ],
        'cta_alts': [
            "👉 Download now and clean up your books today!",
            "👉 Get instant access for just ₹19 and start fresh!",
            "👉 Grab it now and never lose track of an entry again!",
        ],
    },
    'Budget': {
        'hook_emojis': ['💰', '📊', '🪙'],
        'subject_emoji': '💰',
        'hook_alts': [
            "Manage Your Money Without Stress!",
            "Take Control Of Your Spending — Effortlessly!",
            "Stop Wondering Where Your Money Goes!",
            "Plan Every Rupee — Stress-Free!",
            "Build A Budget That Actually Works!",
        ],
        'context_alts': [
            "Your money should work for you — not slip away silently.",
            "Budgeting should feel empowering — not punishing.",
            "Every rupee deserves a job — not a vanishing act.",
            "A clear plan beats wishful thinking, every single month.",
        ],
        'tagline_alts': [
            "✨ No more end-of-month surprises. Just a clear, calm plan.",
            "✨ No guesswork. No leaks. Just confident spending.",
            "✨ No more 'where did it all go?'. Just total clarity.",
        ],
        'pain_alts': [
            "<p>Most people earn well but still feel broke at month-end because expenses are scattered across UPI, cards and cash.</p><p>This template pulls everything into one clean view so you finally see the full picture.</p>",
            "<p>Without a budget, small daily spends quietly destroy your savings goals.</p><p>This template gives you category-wise tracking with auto-totals so nothing slips through.</p>",
            "<p>Spreadsheet budgeting usually breaks within a week — too many columns, no formulas, no motivation.</p><p>This template is built to actually be used — clean layout, pre-set categories, and a one-glance dashboard.</p>",
        ],
        'features_pool': [
            "Pre-built income and expense categories",
            "Auto-calculated savings rate and surplus",
            "Monthly, weekly and daily breakdown views",
            "Color-coded over-budget warnings",
            "Goal-tracking section for savings targets",
            "Editable categories for your personal lifestyle",
            "Print-friendly one-page summary",
            "Works in Microsoft Excel and Google Sheets",
            "Mobile-friendly layout for on-the-go updates",
            "Charts that update automatically as you type",
            "Notes column for context on big spends",
        ],
        'benefits_pool': [
            "See exactly where your money goes every month",
            "Hit your savings goals without willpower battles",
            "Cut wasteful spending in the very first month",
            "Stop end-of-month financial anxiety",
            "Plan big purchases with confidence",
            "Build a real emergency fund step by step",
        ],
        'personas_pool': [
            "Salaried professionals and first-time earners",
            "Couples managing a shared household",
            "Students and young adults building financial habits",
            "Freelancers with variable monthly income",
            "Anyone trying to escape the paycheck-to-paycheck cycle",
            "Parents planning family expenses and goals",
        ],
        'deliverables_pool': [
            "{topic} (.xlsx)",
            "Quick-start guide with category examples",
            "Sample filled-in month for inspiration",
            "Instant download — open and start in 60 seconds",
            "Lifetime access and free yearly updates",
            "Bonus: printable monthly review checklist",
        ],
        'closing_alts': [
            "💖 Take charge of your money and breathe easy every month.",
            "💖 A simple plan today builds the freedom you want tomorrow.",
            "💖 Make every rupee count, without the stress.",
        ],
        'cta_alts': [
            "👉 Download now and take control of your finances today!",
            "👉 Get instant access for just ₹19 and start your money plan!",
            "👉 Grab it now and never wonder where your money went again!",
        ],
    },
    'Calculator': {
        'hook_emojis': ['🧮', '🔢', '⚙️'],
        'subject_emoji': '🧮',
        'hook_alts': [
            "Crunch Numbers Without The Guesswork!",
            "Get Instant Answers — Not Spreadsheet Headaches!",
            "Make Smart Money Decisions In Seconds!",
            "Skip The Math — Get The Answer!",
        ],
        'context_alts': [
            "Big financial decisions deserve real numbers — not back-of-the-envelope guesses.",
            "Online calculators hide the formulas — this one shows you everything.",
            "A clear calculation today saves a costly mistake tomorrow.",
        ],
        'tagline_alts': [
            "✨ No formula errors. No second-guessing. Just clear, instant answers.",
            "✨ No hidden assumptions. No marketing spin. Just real numbers.",
        ],
        'pain_alts': [
            "<p>Online EMI and loan calculators give you a single number — but never the full schedule.</p><p>This template shows the entire amortization, interest paid and principal balance month by month so you make informed decisions.</p>",
            "<p>Most people sign loans without ever seeing how much interest they'll actually pay over the years.</p><p>This template lays it all out — input your numbers and see every payment break down clearly.</p>",
        ],
        'features_pool': [
            "Pre-built formulas — just enter inputs",
            "Full month-by-month amortization schedule",
            "Total interest paid summary",
            "Principal vs interest split chart",
            "Editable interest rate, tenure and amount",
            "Compare two loan scenarios side by side",
            "Works in Microsoft Excel and Google Sheets",
            "Print-friendly schedule for bank meetings",
            "No macros — fully formula-driven and safe",
        ],
        'benefits_pool': [
            "Make confident loan decisions in minutes",
            "See the true cost of borrowing before signing",
            "Negotiate better rates with hard numbers in hand",
            "Plan prepayments to save lakhs in interest",
            "Avoid overpaying or under-budgeting EMIs",
        ],
        'personas_pool': [
            "Home and car loan applicants",
            "Personal finance enthusiasts",
            "Bank relationship managers and DSAs",
            "Finance students and CA aspirants",
            "Anyone planning a big-ticket purchase",
        ],
        'deliverables_pool': [
            "{topic} (.xlsx)",
            "Quick-start instruction guide",
            "Pre-filled example for reference",
            "Instant download — no signup needed",
            "Lifetime access and free updates",
        ],
        'closing_alts': [
            "🧮 Make every financial decision with clarity and confidence.",
            "🧮 Stop guessing. Start calculating with real numbers.",
        ],
        'cta_alts': [
            "👉 Download now and run your numbers in seconds!",
            "👉 Get instant access for just ₹19 and decide smarter!",
        ],
    },
    'Calendars': {
        'hook_emojis': ['📅', '🗓️', '🌅'],
        'subject_emoji': '📅',
        'hook_alts': [
            "Plan Your Year Without Last-Minute Panic!",
            "Stay Ahead Of Every Date — Effortlessly!",
            "Never Miss A Deadline Again!",
            "Organize Your Calendar Like A Pro!",
        ],
        'context_alts': [
            "Your calendar should be your peace of mind — not your anxiety trigger.",
            "Big plans need a clear view — not scattered notes and reminders.",
            "A good calendar runs your year quietly in the background.",
        ],
        'tagline_alts': [
            "✨ No missed dates. No double bookings. Just a calm, clear year ahead.",
            "✨ No sticky notes. No reminder overload. Just one source of truth.",
        ],
        'pain_alts': [
            "<p>Most people juggle Google Calendar, paper diaries and sticky notes — and still miss important dates.</p><p>This template gives you one clean, printable calendar to plan your whole year in one view.</p>",
            "<p>Without a long-view calendar, deadlines sneak up and goals quietly die.</p><p>This template lets you map every important date, deadline and milestone for the year ahead.</p>",
        ],
        'features_pool': [
            "Pre-built 12-month layout — fully editable",
            "Color-coded event categories",
            "Holiday and recurring event slots",
            "Notes column for goals and reminders",
            "One-glance year-at-a-view summary",
            "Print-friendly A4 and letter-size layout",
            "Works in Microsoft Excel and Google Sheets",
            "Editable for any starting month or fiscal year",
        ],
        'benefits_pool': [
            "See your entire year on one clean page",
            "Plan vacations, exams and projects months in advance",
            "Never double-book yourself again",
            "Reduce calendar anxiety with one source of truth",
            "Save hours on weekly planning",
        ],
        'personas_pool': [
            "Working professionals and team leads",
            "Students and parents tracking school years",
            "Content creators planning publishing schedules",
            "Entrepreneurs mapping launches and campaigns",
            "Anyone juggling multiple commitments",
        ],
        'deliverables_pool': [
            "{topic} (.xlsx)",
            "Editable for any year — change the start date in one cell",
            "Quick-start instruction guide",
            "Instant download",
            "Lifetime access and free updates",
        ],
        'closing_alts': [
            "📅 Plan your year with confidence — not chaos.",
            "📅 A clear calendar is the simplest productivity hack ever.",
        ],
        'cta_alts': [
            "👉 Download now and own your year, week by week!",
            "👉 Get instant access for just ₹19 and start planning today!",
        ],
    },
    'Chart': {
        'hook_emojis': ['📊', '📈', '📉'],
        'subject_emoji': '📊',
        'hook_alts': [
            "Tell Your Data Story Without The Design Headache!",
            "Turn Boring Numbers Into Beautiful Insights!",
            "Make Charts That Actually Get Read!",
            "Present Data Like A Top Consultant!",
        ],
        'context_alts': [
            "Numbers convince — but only when they're presented clearly.",
            "Your chart is the story; the table is the proof.",
            "Bad charts hide insights. Good charts spotlight them.",
        ],
        'tagline_alts': [
            "✨ No design skills needed. No PowerPoint pain. Just clean, clear charts.",
            "✨ No clunky defaults. No cluttered legends. Just charts that explain themselves.",
        ],
        'pain_alts': [
            "<p>Excel default charts are ugly, cluttered and forgettable — and most people don't have the time to redesign them.</p><p>This template gives you a pre-styled chart you can plug your data into and ship in 60 seconds.</p>",
            "<p>Most analyses fail not because of bad data — but because of bad visuals.</p><p>This template fixes that with a clean, presentation-ready chart that updates as your data changes.</p>",
        ],
        'features_pool': [
            "Pre-styled chart with clean typography",
            "Auto-updates when you change input data",
            "Editable color palette to match your brand",
            "Built-in title, subtitle and source labels",
            "Multiple data-series support",
            "Print and slide-deck ready resolution",
            "Works in Microsoft Excel and Google Sheets",
            "No add-ons or macros — pure Excel",
            "Mobile-friendly layout for sharing",
        ],
        'benefits_pool': [
            "Create boardroom-ready visuals in minutes",
            "Win more buy-in with cleaner data stories",
            "Skip hours of formatting and styling",
            "Look professional without being a designer",
            "Update reports in seconds, not hours",
        ],
        'personas_pool': [
            "Analysts, consultants and MIS executives",
            "Managers building monthly review decks",
            "Founders pitching investors with clean numbers",
            "Students presenting projects",
            "Anyone tired of ugly default Excel charts",
        ],
        'deliverables_pool': [
            "{topic} (.xlsx)",
            "Quick-start instruction guide",
            "Sample data for instant preview",
            "Instant download",
            "Lifetime access and free updates",
        ],
        'closing_alts': [
            "📊 Make every chart count, every time.",
            "📊 Clean data, clean visuals, clean decisions.",
        ],
        'cta_alts': [
            "👉 Download now and make your data shine!",
            "👉 Get instant access for just ₹19 and present like a pro!",
        ],
    },
    'Financial-Management': {
        'hook_emojis': ['💼', '📈', '🏦'],
        'subject_emoji': '💼',
        'hook_alts': [
            "Run Your Finances Like A Boardroom Pro!",
            "Take Charge Of Your Numbers — Without The CFO Salary!",
            "See Your Full Financial Picture In One Sheet!",
            "Make Smarter Money Decisions, Faster!",
        ],
        'context_alts': [
            "Strong financial management isn't a luxury — it's the foundation of every win.",
            "You can't grow what you don't measure.",
            "Clear numbers turn anxiety into strategy.",
        ],
        'tagline_alts': [
            "✨ No expensive software. No consulting fees. Just clean financial clarity.",
            "✨ No more guesswork on profitability. Just real, formula-driven answers.",
        ],
        'pain_alts': [
            "<p>Most small businesses and solo earners don't track financial KPIs properly — so they grow blind.</p><p>This template gives you a structured, formula-driven view of cash, profit and growth in one clean sheet.</p>",
            "<p>Without proper financial tracking, you can't tell a profitable month from a lucky one.</p><p>This template fixes that with auto-calculated KPIs and trends you can act on.</p>",
        ],
        'features_pool': [
            "Pre-built financial KPI dashboard",
            "Auto-calculated ratios and trends",
            "Monthly, quarterly and yearly views",
            "Editable categories and accounts",
            "Color-coded performance signals",
            "Works in Microsoft Excel and Google Sheets",
            "Print-friendly executive summary page",
            "No macros — safe to share with your CA or banker",
            "Sample data included for instant preview",
        ],
        'benefits_pool': [
            "Spot financial issues weeks before they hurt you",
            "Make decisions with real numbers, not gut feel",
            "Save thousands on accounting software subscriptions",
            "Present clean numbers to investors and lenders",
            "Stay audit-ready and tax-ready year round",
        ],
        'personas_pool': [
            "Small business owners and founders",
            "Freelancers and independent professionals",
            "Finance managers and analysts",
            "Investors tracking personal portfolios",
            "Anyone serious about long-term wealth",
        ],
        'deliverables_pool': [
            "{topic} (.xlsx)",
            "Quick-start instruction guide",
            "Sample filled-in example",
            "Instant download — no signup",
            "Lifetime access and free updates",
        ],
        'closing_alts': [
            "💼 Take ownership of your numbers and grow with confidence.",
            "💼 Smart money management starts with a smart template.",
        ],
        'cta_alts': [
            "👉 Download now and see your finances clearly today!",
            "👉 Get instant access for just ₹19 and run your money like a pro!",
        ],
    },
    'Inventory': {
        'hook_emojis': ['📦', '🏷️', '🛒'],
        'subject_emoji': '📦',
        'hook_alts': [
            "Control Your Stock Without The Chaos!",
            "Never Run Out — Or Overstock — Again!",
            "Track Every Item Without The Headache!",
            "Manage Inventory Like A Big-Brand Pro!",
        ],
        'context_alts': [
            "Inventory chaos costs money silently — every single day.",
            "What you don't track, you slowly lose.",
            "Clean stock data is the difference between profit and panic.",
        ],
        'tagline_alts': [
            "✨ No stock-outs. No dead inventory. Just clean, real-time visibility.",
            "✨ No spreadsheet maze. No guessing. Just clear stock numbers.",
        ],
        'pain_alts': [
            "<p>Most small businesses lose money to stock-outs of bestsellers and dead inventory of slow-movers — all because tracking is messy.</p><p>This template gives you one clean sheet with item-wise stock, reorder alerts and movement history.</p>",
            "<p>Manual inventory in notebooks or scattered Excel files always breaks down past 50 SKUs.</p><p>This template scales cleanly with auto-calculated balances, low-stock warnings and a clear audit trail.</p>",
        ],
        'features_pool': [
            "Pre-built SKU and item master columns",
            "Auto-calculated current stock balance",
            "Low-stock and reorder alerts (color-coded)",
            "Inward and outward movement log",
            "Vendor and purchase tracking section",
            "Item-wise sales and consumption summary",
            "Editable for any product type or industry",
            "Works in Microsoft Excel and Google Sheets",
            "Print-friendly stock report layout",
            "No macros — safe and shareable",
        ],
        'benefits_pool': [
            "Stop losing sales to surprise stock-outs",
            "Free up cash stuck in dead inventory",
            "Audit your stock in minutes, not days",
            "Plan reorders with confidence",
            "Catch shrinkage and theft early",
        ],
        'personas_pool': [
            "Retail and wholesale shop owners",
            "Restaurant and kitchen managers",
            "Warehouse and stockroom staff",
            "E-commerce sellers (Amazon, Flipkart, Meesho)",
            "Anyone managing physical goods",
        ],
        'deliverables_pool': [
            "{topic} (.xlsx)",
            "Quick-start instruction guide",
            "Pre-filled SKU sample for inspiration",
            "Instant download",
            "Lifetime access and free updates",
        ],
        'closing_alts': [
            "📦 Take command of your stock — and your profits.",
            "📦 Clean inventory, clean cash flow, clean nights of sleep.",
        ],
        'cta_alts': [
            "👉 Download now and bring order to your stockroom today!",
            "👉 Get instant access for just ₹19 and stop losing sales!",
        ],
    },
    'Invoice': {
        'hook_emojis': ['🧾', '💸', '📨'],
        'subject_emoji': '🧾',
        'hook_alts': [
            "Send Professional Invoices Without The Hassle!",
            "Get Paid Faster — With Cleaner Invoices!",
            "Stop Wasting Time On Invoice Formatting!",
            "Look Professional From The First Bill!",
        ],
        'context_alts': [
            "Your invoice is your handshake — make it confident.",
            "A clean invoice gets paid faster than a messy one. Every single time.",
            "Late payments often start with unclear billing.",
        ],
        'tagline_alts': [
            "✨ No formatting struggle. No payment delays. Just clean, professional bills.",
            "✨ No missing fields. No tax confusion. Just invoices that look like you mean business.",
        ],
        'pain_alts': [
            "<p>Most freelancers and small businesses lose hours every month formatting invoices in Word or Excel — and still get late payments.</p><p>This template gives you a ready, professional invoice with auto-totals and tax fields so you can bill in 60 seconds.</p>",
            "<p>Sloppy invoices send a sloppy signal — and clients pay slow when they don't trust the paperwork.</p><p>This template fixes that with a clean, branded layout that builds confidence and speeds up payment.</p>",
        ],
        'features_pool': [
            "Pre-built invoice layout with auto-totals",
            "Editable header for your business name and logo space",
            "Tax (GST/VAT) calculation built in",
            "Multi-line items with quantity, rate and amount",
            "Notes section for payment terms and bank details",
            "Editable invoice number and due date",
            "Print and PDF-friendly layout",
            "Works in Microsoft Excel and Google Sheets",
            "Currency-flexible — switch ₹, $, € in one cell",
            "No macros — clean and safe",
        ],
        'benefits_pool': [
            "Send invoices in 60 seconds, not 30 minutes",
            "Get paid faster with clearer billing",
            "Look professional from the first invoice",
            "Avoid tax errors with built-in formulas",
            "Build trust with consistent, branded paperwork",
        ],
        'personas_pool': [
            "Freelancers and consultants",
            "Small business owners and shopkeepers",
            "Service providers and agencies",
            "Online sellers and creators",
            "Anyone billing clients regularly",
        ],
        'deliverables_pool': [
            "{topic} (.xlsx)",
            "Quick-start instruction guide",
            "Pre-filled sample invoice for reference",
            "Instant download",
            "Lifetime access and free updates",
        ],
        'closing_alts': [
            "🧾 Send invoices that get respected — and paid on time.",
            "🧾 Professional billing is the simplest growth hack there is.",
        ],
        'cta_alts': [
            "👉 Download now and send your next invoice in 60 seconds!",
            "👉 Get instant access for just ₹19 and look professional today!",
        ],
    },
    'Planner-Tracker': {
        'hook_emojis': ['🎯', '✅', '🚀'],
        'subject_emoji': '🎯',
        'hook_alts': [
            "Hit Your Goals Without The Overwhelm!",
            "Track Progress That Actually Sticks!",
            "Turn Big Goals Into Daily Wins!",
            "Stay On Top Of Everything — Effortlessly!",
        ],
        'context_alts': [
            "Goals without a tracker are just wishes.",
            "What gets measured, finally gets done.",
            "Small daily ticks build big yearly results.",
        ],
        'tagline_alts': [
            "✨ No vague resolutions. No half-finished plans. Just clear, daily progress.",
            "✨ No app subscriptions. No notification overload. Just a calm, focused tracker.",
        ],
        'pain_alts': [
            "<p>Most people set goals and abandon them within weeks because they have no clear way to track daily progress.</p><p>This template gives you a structured, motivating tracker with daily ticks and weekly reviews — built to actually be used.</p>",
            "<p>Notion, apps, journals — most planners fail because they're too complex.</p><p>This template is simple, clean and printable: open it, fill it, ship your week.</p>",
        ],
        'features_pool': [
            "Pre-built goal-setting structure",
            "Daily, weekly and monthly tracking views",
            "Color-coded progress bars",
            "Habit and streak tracker",
            "Reflection and lessons-learned section",
            "Editable categories for work, health, money and learning",
            "Print-friendly weekly review page",
            "Works in Microsoft Excel and Google Sheets",
            "Mobile-friendly for on-the-go updates",
        ],
        'benefits_pool': [
            "Finally finish what you start",
            "Build momentum with visible streaks",
            "Catch slipping habits early",
            "Plan your week in 10 calm minutes",
            "Reduce decision fatigue with clear priorities",
        ],
        'personas_pool': [
            "Students preparing for exams or competitions",
            "Working professionals juggling multiple goals",
            "Founders and solopreneurs",
            "Fitness, learning and habit enthusiasts",
            "Anyone tired of starting over every Monday",
        ],
        'deliverables_pool': [
            "{topic} (.xlsx)",
            "Quick-start instruction guide",
            "Sample filled-in week for inspiration",
            "Instant download",
            "Lifetime access and free updates",
        ],
        'closing_alts': [
            "🚀 Stop hoping. Start tracking. Start winning.",
            "🚀 Big goals, won one daily tick at a time.",
        ],
        'cta_alts': [
            "👉 Download now and turn your goals into wins today!",
            "👉 Get instant access for just ₹19 and start your streak!",
        ],
    },
    'Schedule': {
        'hook_emojis': ['📅', '⏰', '🗒️'],
        'subject_emoji': '📅',
        'hook_alts': [
            "Plan Every Hour Without The Stress!",
            "Run Your Day Like Clockwork!",
            "Stay Organized — Without Overthinking It!",
            "Take Back Control Of Your Time!",
        ],
        'context_alts': [
            "Your time is the only resource you can't make more of.",
            "A clear schedule turns chaos into calm.",
            "Big results come from small, consistent time blocks.",
        ],
        'tagline_alts': [
            "✨ No double bookings. No forgotten tasks. Just a calm, structured day.",
            "✨ No app overload. No alarm fatigue. Just one clean schedule.",
        ],
        'pain_alts': [
            "<p>Most people waste hours every week because their schedule lives across calendars, sticky notes and memory.</p><p>This template gives you one clean, time-blocked layout to plan your day, week or shift in minutes.</p>",
            "<p>Without a structured schedule, urgent tasks crowd out important ones — and burnout creeps in.</p><p>This template gives you a printable, repeatable layout you can actually stick with.</p>",
        ],
        'features_pool': [
            "Pre-built time-blocked layout",
            "Editable hourly slots for any day length",
            "Priority and category color coding",
            "Notes column for context per slot",
            "Daily, weekly and shift views",
            "Print-friendly desk and wall sizes",
            "Works in Microsoft Excel and Google Sheets",
            "Editable for any starting hour or shift pattern",
            "Mobile-friendly for quick tweaks",
        ],
        'benefits_pool': [
            "Plan a calm, structured day in 5 minutes",
            "Stop double-booking yourself",
            "Protect deep-work time from constant interruptions",
            "Hand off shifts and schedules cleanly",
            "Reduce daily decision fatigue",
        ],
        'personas_pool': [
            "Working professionals and managers",
            "Shift workers, doctors and field staff",
            "Students balancing classes and study",
            "Parents juggling kids, school and work",
            "Anyone who wants to own their day",
        ],
        'deliverables_pool': [
            "{topic} (.xlsx)",
            "Quick-start instruction guide",
            "Pre-filled sample schedule",
            "Instant download",
            "Lifetime access and free updates",
        ],
        'closing_alts': [
            "📅 Take back your time — one clean block at a time.",
            "📅 A planned day is a winning day.",
        ],
        'cta_alts': [
            "👉 Download now and own every hour of your day!",
            "👉 Get instant access for just ₹19 and plan smarter today!",
        ],
    },
    'Student': {
        'hook_emojis': ['🎓', '📚', '✏️'],
        'subject_emoji': '🎓',
        'hook_alts': [
            "Crush Your Studies Without The Burnout!",
            "Stay Top Of Class — With Less Stress!",
            "Plan Your Semester Like A Topper!",
            "Study Smarter, Not Longer!",
        ],
        'context_alts': [
            "Top students aren't smarter — they're better organized.",
            "Clear plans beat last-minute cramming, every exam.",
            "Small daily wins compound into top ranks.",
        ],
        'tagline_alts': [
            "✨ No last-night cramming. No missed deadlines. Just steady, confident progress.",
            "✨ No notebook chaos. No app overload. Just one clean study system.",
        ],
        'pain_alts': [
            "<p>Most students struggle with scattered notes, missed deadlines and last-minute panic — not because they're lazy, but because they have no system.</p><p>This template gives you a simple, repeatable structure to plan your semester and ace every exam.</p>",
            "<p>Without a clear study plan, exam pressure builds quietly until it explodes.</p><p>This template fixes that with weekly subject blocks, deadline tracking and a calm, printable layout.</p>",
        ],
        'features_pool': [
            "Pre-built subject and topic structure",
            "Daily, weekly and exam-week views",
            "Assignment and deadline tracker",
            "Color-coded priority and difficulty",
            "Goal and grade tracking section",
            "Notes column for resources and links",
            "Print-friendly weekly study plan",
            "Works in Microsoft Excel and Google Sheets",
            "Editable for school, college or competitive exams",
        ],
        'benefits_pool': [
            "Walk into every exam prepared — never panicked",
            "Hit deadlines without all-nighters",
            "Spot weak topics weeks before the test",
            "Balance studies with health, sleep and fun",
            "Build study habits that last beyond school",
        ],
        'personas_pool': [
            "School students (Class 9-12)",
            "College and university students",
            "Competitive exam aspirants (JEE, NEET, UPSC, CAT)",
            "Parents helping kids stay organized",
            "Self-learners and online course takers",
        ],
        'deliverables_pool': [
            "{topic} (.xlsx)",
            "Quick-start instruction guide",
            "Sample filled-in week for inspiration",
            "Instant download",
            "Lifetime access and free updates",
        ],
        'closing_alts': [
            "🎓 Study smart. Sleep well. Score high.",
            "🎓 Your topper version is one good plan away.",
        ],
        'cta_alts': [
            "👉 Download now and own your semester from day one!",
            "👉 Get instant access for just ₹19 and study like a topper!",
        ],
    },
    'Timeline': {
        'hook_emojis': ['🗓️', '📍', '🏁'],
        'subject_emoji': '🗓️',
        'hook_alts': [
            "Map Every Milestone Without The Chaos!",
            "See Your Whole Project At A Glance!",
            "Plan Big Events Like A Pro Coordinator!",
            "Turn Big Plans Into Clear, Visual Steps!",
        ],
        'context_alts': [
            "Big plans need a big-picture view — not endless to-do lists.",
            "A timeline shows you the path before you walk it.",
            "When milestones are visual, deadlines stop sneaking up.",
        ],
        'tagline_alts': [
            "✨ No missed milestones. No last-minute scramble. Just a clear, visual plan.",
            "✨ No clunky project tools. No subscriptions. Just one clean timeline.",
        ],
        'pain_alts': [
            "<p>Most projects, weddings and launches go off-track because milestones live in heads and chat threads — not on a clear, visual timeline.</p><p>This template gives you a clean, editable timeline you can plan, share and print in minutes.</p>",
            "<p>Without a visual timeline, dependencies break and dates slip silently.</p><p>This template fixes that with a clear horizontal flow you can update as the plan evolves.</p>",
        ],
        'features_pool': [
            "Pre-built horizontal timeline layout",
            "Editable milestones, dates and owners",
            "Color-coded phases and categories",
            "Auto-calculated duration between milestones",
            "Notes column for context per milestone",
            "Print and presentation-ready layout",
            "Works in Microsoft Excel and Google Sheets",
            "Editable for any timeframe — weeks, months or years",
            "Sample data for instant preview",
        ],
        'benefits_pool': [
            "See the whole plan in one clean glance",
            "Catch slipping milestones early",
            "Align teams, vendors and stakeholders fast",
            "Replace boring status updates with visuals",
            "Plan with confidence, ship on time",
        ],
        'personas_pool': [
            "Project managers and coordinators",
            "Founders planning launches and milestones",
            "Wedding and event planners",
            "Students presenting projects and theses",
            "Anyone running a multi-step plan",
        ],
        'deliverables_pool': [
            "{topic} (.xlsx)",
            "Quick-start instruction guide",
            "Pre-filled sample timeline",
            "Instant download",
            "Lifetime access and free updates",
        ],
        'closing_alts': [
            "🗓️ Make every milestone visible — and unmissable.",
            "🗓️ Big plans, made simple, one milestone at a time.",
        ],
        'cta_alts': [
            "👉 Download now and map your project today!",
            "👉 Get instant access for just ₹19 and plan visually!",
        ],
    },
    'Timesheet': {
        'hook_emojis': ['⏱️', '🕒', '📋'],
        'subject_emoji': '⏱️',
        'hook_alts': [
            "Track Every Hour Without The Headache!",
            "Get Paid For Every Minute You Work!",
            "Run Payroll Without The Drama!",
            "Bill Clients Accurately — Every Time!",
        ],
        'context_alts': [
            "Untracked hours are unpaid hours.",
            "A clean timesheet is the easiest invoice you'll ever send.",
            "Honest time tracking builds honest paychecks.",
        ],
        'tagline_alts': [
            "✨ No missed hours. No payroll fights. Just clean, fair time records.",
            "✨ No spreadsheet maze. No memory games. Just clear hours, every week.",
        ],
        'pain_alts': [
            "<p>Most freelancers and teams lose money to untracked hours, forgotten breaks and messy weekly summaries.</p><p>This template gives you a clean, formula-driven timesheet with auto-totals — built for accurate billing and payroll.</p>",
            "<p>Without proper time tracking, payroll disputes and client billing fights become routine.</p><p>This template fixes that with a transparent, printable record that everyone trusts.</p>",
        ],
        'features_pool': [
            "Pre-built daily, weekly and bi-weekly layouts",
            "Auto-calculated total, regular and overtime hours",
            "Editable hourly rate for instant billing",
            "Project, task and client tracking columns",
            "Break and lunch deduction logic",
            "Color-coded over-limit warnings",
            "Print and PDF-friendly layout",
            "Works in Microsoft Excel and Google Sheets",
            "Editable for any shift pattern or week start",
            "No macros — safe to share with HR or clients",
        ],
        'benefits_pool': [
            "Bill clients without fights or follow-ups",
            "Run payroll in minutes, not hours",
            "Spot overworked or underutilized team members early",
            "Stay compliant with overtime rules",
            "Build trust with transparent time records",
        ],
        'personas_pool': [
            "Freelancers and consultants billing by the hour",
            "Small business owners managing payroll",
            "Project managers tracking team utilization",
            "Hourly and shift workers",
            "HR and operations teams",
        ],
        'deliverables_pool': [
            "{topic} (.xlsx)",
            "Quick-start instruction guide",
            "Pre-filled sample week for reference",
            "Instant download",
            "Lifetime access and free updates",
        ],
        'closing_alts': [
            "⏱️ Track every minute. Get paid for every hour. Sleep well.",
            "⏱️ Clean timesheets, clean payroll, clean conscience.",
        ],
        'cta_alts': [
            "👉 Download now and bill smarter from this week!",
            "👉 Get instant access for just ₹19 and track every hour!",
        ],
    },
}


# Default fallback (should never trigger if all 13 categories covered)
_DEFAULT = CTX_PACKS['Budget']


def _get_pack(cat_key):
    # Map cat_key (Accounting, Budget, ...) to the CTX dict
    return CTX_PACKS.get(cat_key, _DEFAULT)


# ---------------------------------------------------------------------------
# HTML generators
# ---------------------------------------------------------------------------

def _checklist(items):
    lis = ''.join(f'<li>{html.escape(it)}</li>' for it in items)
    return f'<ul class="hk-checklist">{lis}</ul>'


def _hook_line(name, slug, pack):
    e = pack['hook_emojis'][_h(slug + 'em', len(pack['hook_emojis']))]
    line = pack['hook_alts'][_h(slug + 'hk', len(pack['hook_alts']))]
    return f"{e} {line}"


def _context_line(slug, pack):
    return pack['context_alts'][_h(slug + 'cx', len(pack['context_alts']))]


def _tagline(slug, pack):
    return pack['tagline_alts'][_h(slug + 'tg', len(pack['tagline_alts']))]


def _pain(slug, pack):
    return pack['pain_alts'][_h(slug + 'pn', len(pack['pain_alts']))]


def _pick_n(pool, slug, n, salt):
    """Deterministically pick N items from pool (without repeats)."""
    if n >= len(pool):
        return list(pool)
    start = _h(slug + salt, len(pool))
    out = []
    for i in range(n):
        out.append(pool[(start + i) % len(pool)])
    return out


def _features(slug, pack):
    return _pick_n(pack['features_pool'], slug, 6, 'ft')


def _benefits(slug, pack):
    return _pick_n(pack['benefits_pool'], slug, _h(slug + 'bnL', 2) + 4, 'bn')  # 4 or 5


def _personas(slug, pack):
    return _pick_n(pack['personas_pool'], slug, _h(slug + 'pL', 2) + 3, 'pe')  # 3 or 4


def _deliverables(name, slug, pack):
    items = _pick_n(pack['deliverables_pool'], slug, 5, 'dl')
    return [it.replace('{topic}', name) for it in items]


def _closing(slug, pack):
    return pack['closing_alts'][_h(slug + 'cl', len(pack['closing_alts']))]


def _cta(slug, pack):
    return pack['cta_alts'][_h(slug + 'ct', len(pack['cta_alts']))]


def excerpt_html(name, slug, fkw, cat_key):
    """Short excerpt: ONLY the hook line + tagline. Used by WC short description."""
    pack = _get_pack(cat_key)
    hook = _hook_line(name, slug, pack)
    tagline = _tagline(slug, pack)
    return f'<p class="hk-hook"><strong>{html.escape(hook)}</strong></p><p class="hk-tagline">{html.escape(tagline)}</p>'


def description_html(name, slug, fkw, cat_key):
    """Long product description in wedding-format with collapsible <details>.

    Renders WITHOUT repeating the hook (excerpt has it) — body opens with the
    contextual story + Why-need + collapsibles + closing.
    """
    pack = _get_pack(cat_key)
    short = _short_topic(name)
    context = _context_line(slug, pack)
    pain = _pain(slug, pack)
    features = _features(slug, pack)
    benefits = _benefits(slug, pack)
    personas = _personas(slug, pack)
    deliverables = _deliverables(name, slug, pack)
    closing = _closing(slug, pack)
    cta = _cta(slug, pack)
    name_e = html.escape(name)
    short_e = html.escape(short)
    context_e = html.escape(context)
    closing_e = html.escape(closing)
    cta_e = html.escape(cta)

    return f"""<div class="hk-product-desc">
  <p class="hk-context">{context_e}</p>
  <p>This easy-to-use <strong>{name_e}</strong> helps you organize every part of your {short_e} workflow — clean, formula-driven and ready to use in Microsoft Excel or Google Sheets for just <strong>₹19</strong>.</p>

  <details open>
    <summary>💡 Why you need this</summary>
    {pain}
  </details>

  <details>
    <summary>⚡ Features</summary>
    {_checklist(['✔ ' + f for f in features])}
  </details>

  <details>
    <summary>🎯 Benefits</summary>
    {_checklist(['✔ ' + b for b in benefits])}
  </details>

  <details>
    <summary>👤 Perfect for</summary>
    {_checklist(['✔ ' + p for p in personas])}
  </details>

  <details>
    <summary>📦 What you get</summary>
    {_checklist(['✔ ' + d for d in deliverables])}
  </details>

  <p class="hk-closing"><strong>{closing_e}</strong></p>
  <p class="hk-cta">{cta_e}</p>
</div>"""


def yoast_meta(name, fkw, cat_key):
    """SEO title (≤60 chars) + meta description (≤160 chars) + focus keyword."""
    short_name = name if len(name) <= 45 else name[:42] + '…'
    title = f"{short_name} | HackKnow Excel ₹19"
    if len(title) > 60:
        title = f"{short_name} | HackKnow"
    desc = (f"Download the {name} — a ready-made {fkw} for ₹19 only. "
            f"Pre-built formulas, clean neobrutal design, works in Excel & Google Sheets. "
            f"Instant download, lifetime access.")
    if len(desc) > 160:
        desc = desc[:157] + '...'
    return title, desc, fkw


# ---------------------------------------------------------------------------
# Blog post (long-form 500+ words guide) — kept for compatibility but
# regenerated in same wedding-tone voice.
# ---------------------------------------------------------------------------

def blog_html(name, slug, fkw, cat_key):
    pack = _get_pack(cat_key)
    short = _short_topic(name)
    hook = _hook_line(name, slug, pack)
    context = _context_line(slug, pack)
    pain = _pain(slug, pack)
    features = _features(slug, pack)
    benefits = _benefits(slug, pack)
    personas = _personas(slug, pack)
    closing = _closing(slug, pack)
    cta = _cta(slug, pack)
    name_e = html.escape(name)
    short_e = html.escape(short)
    fkw_e = html.escape(fkw)

    # ~500-700 word long-form guide
    return f"""<div class="hk-blog-post">
  <p><em>{html.escape(hook)}</em></p>

  <h2>What is the {name_e}?</h2>
  <p>{html.escape(context)}</p>
  <p>The <strong>{name_e}</strong> is a clean, formula-driven {fkw_e} built for everyday use. It works in Microsoft Excel and Google Sheets, opens in seconds, and gives you a structured layout you can actually stick with — for just <strong>₹19</strong>.</p>

  <h2>Why this {short_e} template works</h2>
  {pain}
  <p>The goal is simple: replace messy notebooks, half-finished apps and broken spreadsheets with one clean sheet that just works.</p>

  <h2>Top features</h2>
  {_checklist(['✔ ' + f for f in features])}

  <h2>Real benefits you will see</h2>
  {_checklist(['✔ ' + b for b in benefits])}

  <h2>Who it's perfect for</h2>
  {_checklist(['✔ ' + p for p in personas])}

  <h2>How to use the {name_e} in 3 steps</h2>
  <ol>
    <li><strong>Download</strong> the .xlsx file (instant, no signup).</li>
    <li><strong>Open</strong> in Microsoft Excel or Google Sheets and tweak the sample row to match your context.</li>
    <li><strong>Use it daily or weekly</strong> — every formula and layout is already wired up. Just type and ship.</li>
  </ol>

  <h2>Tips for getting the most out of it</h2>
  <ul>
    <li>Edit the header row to match your business or personal context.</li>
    <li>Use the colour-coded cells as visual cues, not strict rules — adapt them to what you care about.</li>
    <li>Print the summary view weekly to make progress feel real.</li>
    <li>Share the sheet with your team, partner or accountant — it's clean enough to be reviewed by anyone.</li>
  </ul>

  <h2>Final thoughts</h2>
  <p>{html.escape(closing)}</p>
  <p><strong>{html.escape(cta)}</strong></p>
</div>"""


def blog_yoast(name, fkw):
    short_name = name if len(name) <= 40 else name[:37] + '…'
    title = f"How To Use The {short_name} (Step-By-Step Guide)"
    if len(title) > 60:
        title = f"{short_name} — Quick Guide"
    desc = (f"A simple, step-by-step guide to using the {name}. "
            f"Get the {fkw} for just ₹19 — works in Excel & Google Sheets.")
    if len(desc) > 160:
        desc = desc[:157] + '...'
    return title, desc


# Quick smoke test
if __name__ == '__main__':
    samples = [
        ('Wedding Budget Planner Spreadsheet', 'wedding-budget-planner-spreadsheet', 'wedding budget planner excel', 'Budget'),
        ('Monthly Personal Budget Planner', 'monthly-personal-budget-planner', 'monthly personal budget excel', 'Budget'),
        ('Profit and Loss Statement', 'profit-and-loss-statement', 'profit and loss statement excel', 'Accounting'),
        ('Loan EMI Calculator Excel', 'loan-emi-calculator-excel', 'loan emi calculator excel', 'Calculator'),
        ('Sales Performance Chart Template', 'sales-performance-chart-template', 'sales performance chart excel', 'Chart'),
    ]
    for n, s, f, c in samples:
        print(f"\n{'='*78}\n{n} ({c})\n{'='*78}")
        print('--- EXCERPT ---')
        print(excerpt_html(n, s, f, c)[:300])
        print('--- DESCRIPTION (first 600 chars) ---')
        print(description_html(n, s, f, c)[:600])
        t, d, k = yoast_meta(n, f, c)
        print(f'--- SEO --- title({len(t)}): {t}\nmeta({len(d)}): {d}')
