<?php
/**
 * Plugin Name: HackKnow Content Seed
 * Description: Auto-creates the "MIS, Dashboards & Templates" product category, the
 *   "Courses" parent + 8 tech sub-categories (Python / Java / WordPress / PHP /
 *   Node.js / Vercel / Netlify / AI Infrastructure), and the two member-only
 *   discount coupons (MIS90 and STUDENT6FREE). Idempotent — runs once and
 *   records a flag in wp_options. Re-running is safe; existing terms/coupons
 *   are reused.
 *
 * @package HackKnow
 */

if (!defined('ABSPATH')) exit;

/**
 * Main seeder. Hooked on `woocommerce_init` so WooCommerce APIs are guaranteed
 * to be loaded. Idempotent via the `hk_content_seed_v1_done` option.
 */
add_action('wp_loaded', 'hk_content_seed_v2', 20);
function hk_content_seed_v2() {
    // Force-rerun via ?hk_reseed=1 (admin only).
    $force = isset($_GET['hk_reseed']) && current_user_can('manage_options');
    if (!$force && get_option('hk_content_seed_v2_done')) return;
    if (!taxonomy_exists('product_cat')) return;
    if (!class_exists('WC_Coupon'))      return;

    /* ── 1. "MIS, Dashboards & Templates" top-level WC category ── */
    $mis_id = hk_ensure_term(
        'MIS, Dashboards & Templates',
        'mis-dashboards-templates',
        'product_cat',
        0,
        'Excel · Power BI · Tableau dashboards and data-analyst templates. Verified MIS / Data Analyst users get 90% off (apply via /verify).'
    );

    /* ── 2. "Courses" parent + 8 sub-categories ── */
    $courses_parent = hk_ensure_term(
        'Courses',
        'courses',
        'product_cat',
        0,
        'HackKnow learning tracks. Verified students get 6 months free access (apply via /verify).'
    );

    $sub_cats = [
        ['Python',             'python',             'Beginner to advanced Python — scripting, web, data, and ML.'],
        ['Java',               'java',               'Core Java, Spring Boot, microservices, and enterprise patterns.'],
        ['WordPress',          'wordpress',          'WordPress themes, plugins, WooCommerce, and headless WP.'],
        ['PHP',                'php',                'Modern PHP 8, Laravel, REST APIs, and clean architecture.'],
        ['Node.js',            'nodejs',             'Node.js, Express, real-time apps, and TypeScript on the server.'],
        ['Vercel',             'vercel',             'Vercel deployments, edge functions, Next.js, and serverless.'],
        ['Netlify',            'netlify',            'Netlify deployments, serverless functions, and JAMstack.'],
        ['AI Infrastructure',  'ai-infrastructure',  'LLM serving, vector databases, RAG pipelines, and model ops.'],
    ];
    $sub_ids = [];
    foreach ($sub_cats as [$name, $slug, $desc]) {
        $sub_ids[$slug] = hk_ensure_term($name, $slug, 'product_cat', $courses_parent, $desc);
    }

    /* ── 3. Coupons ── */
    hk_ensure_coupon('MIS90', [
        'discount_type'      => 'percent',
        'amount'             => '90',
        'product_categories' => [$mis_id],
        'individual_use'     => true,
        'description'        => 'Verified MIS / Data Analyst discount — 90% off MIS, Dashboards & Templates. Auto-applied at checkout for users with approved verification.',
    ]);

    hk_ensure_coupon('STUDENT6FREE', [
        'discount_type'      => 'percent',
        'amount'             => '100',
        'product_categories' => array_values(array_filter([$courses_parent] + $sub_ids)),
        'individual_use'     => true,
        'description'        => 'Verified Student 6-month free access — 100% off all Courses. Auto-applied at checkout for verified students within their 6-month window.',
    ]);

    update_option('hk_content_seed_v2_done', time());
    update_option('hk_content_seed_v2_summary', [
        'mis_cat_id'     => $mis_id,
        'courses_cat_id' => $courses_parent,
        'sub_cat_ids'    => $sub_ids,
        'seeded_at'      => current_time('mysql'),
    ]);
}

/**
 * Insert a taxonomy term if it doesn't exist; if it does, normalise its
 * parent + description in place. Returns the term_id (0 on failure).
 */
function hk_ensure_term($name, $slug, $taxonomy, $parent_id, $description = '') {
    $existing = get_term_by('slug', $slug, $taxonomy);
    if ($existing && !is_wp_error($existing)) {
        wp_update_term($existing->term_id, $taxonomy, [
            'name'        => $name,
            'parent'      => (int) $parent_id,
            'description' => $description,
        ]);
        return (int) $existing->term_id;
    }
    $r = wp_insert_term($name, $taxonomy, [
        'slug'        => $slug,
        'parent'      => (int) $parent_id,
        'description' => $description,
    ]);
    if (is_wp_error($r)) return 0;
    return (int) $r['term_id'];
}

/**
 * Create a WooCommerce coupon if its code isn't already taken. Reuses the
 * existing coupon (returning its ID) when a match is found.
 */
function hk_ensure_coupon($code, $args) {
    $existing_id = function_exists('wc_get_coupon_id_by_code')
        ? wc_get_coupon_id_by_code($code)
        : 0;
    if ($existing_id) return $existing_id;

    $coupon = new WC_Coupon();
    $coupon->set_code($code);
    $coupon->set_discount_type($args['discount_type'] ?? 'percent');
    $coupon->set_amount((string) ($args['amount'] ?? '0'));
    if (!empty($args['product_categories'])) {
        $coupon->set_product_categories(array_map('intval', $args['product_categories']));
    }
    $coupon->set_individual_use(!empty($args['individual_use']));
    $coupon->set_usage_limit(0);
    $coupon->set_description((string) ($args['description'] ?? ''));
    // Members-only flag — used later by the verify/apply layer.
    $coupon->update_meta_data('_hk_members_only', 'yes');
    $coupon->save();
    return $coupon->get_id();
}

/* ════════════════════════════════════════════════════════════════════
 * V3 SEED — 12 roadmap.sh-style roadmaps + 12 tech news/releases
 * Auto-runs once. Re-run with ?hk_reseed_v3=1 (admin only).
 * ════════════════════════════════════════════════════════════════════ */
add_action('wp_loaded', 'hk_content_seed_v3', 30);
function hk_content_seed_v3() {
    $force = isset($_GET['hk_reseed_v3']) && current_user_can('manage_options');
    if (!$force && get_option('hk_content_seed_v3_done')) return;
    if (!post_type_exists('hk_roadmap'))  return;
    if (!post_type_exists('hk_release'))  return;

    $roadmaps = hk_seed_v3_roadmaps_data();
    $news     = hk_seed_v3_news_data();

    $r_count = 0;
    foreach ($roadmaps as $r) {
        if (hk_seed_v3_upsert_post('hk_roadmap', $r['slug'], $r['title'], $r['excerpt'], $r['meta'])) $r_count++;
    }
    $n_count = 0;
    foreach ($news as $n) {
        if (hk_seed_v3_upsert_post('hk_release', $n['slug'], $n['title'], $n['excerpt'], $n['meta'])) $n_count++;
    }

    update_option('hk_content_seed_v3_done', time());
    update_option('hk_content_seed_v3_summary', [
        'roadmaps_seeded' => $r_count,
        'news_seeded'     => $n_count,
        'seeded_at'       => current_time('mysql'),
    ]);
}

/**
 * Idempotent post upsert by slug.
 */
function hk_seed_v3_upsert_post($post_type, $slug, $title, $content, $meta) {
    $existing = get_posts([
        'post_type'      => $post_type,
        'name'           => $slug,
        'post_status'    => ['publish', 'draft', 'pending'],
        'posts_per_page' => 1,
        'fields'         => 'ids',
    ]);
    if (!empty($existing)) {
        $post_id = (int) $existing[0];
    } else {
        $post_id = wp_insert_post([
            'post_type'    => $post_type,
            'post_status'  => 'publish',
            'post_title'   => $title,
            'post_name'    => $slug,
            'post_content' => $content,
        ], true);
        if (is_wp_error($post_id) || !$post_id) return false;
    }
    foreach ($meta as $k => $v) update_post_meta($post_id, $k, $v);
    return true;
}

/**
 * 12 roadmap.sh-style roadmaps. Outline uses 2-space indent, "#" headers,
 * "- Topic | description" leaves. Total outline ≤ ~30 lines per roadmap.
 */
function hk_seed_v3_roadmaps_data() {
    return [
        [
            'slug'   => 'frontend-developer-2026',
            'title'  => 'Frontend Developer Roadmap 2026',
            'excerpt'=> 'Modern frontend stack: HTML/CSS/JS foundations to React, Next.js, TypeScript, testing, and deployment.',
            'meta'   => [
                '_hk_roadmap_career'          => 'Frontend Developer',
                '_hk_roadmap_hours_estimated' => 320,
                '_hk_roadmap_difficulty'      => 'beginner',
                '_hk_roadmap_requirements'    => "Computer with internet\nBasic English reading",
                '_hk_roadmap_outcomes'        => "Build production React apps\nDeploy to Vercel/Netlify\nWrite component tests\nWork with REST APIs",
                '_hk_roadmap_outline' =>
"# Foundations
  - HTML5 | Semantic markup, forms, accessibility
  - CSS3 | Flexbox, Grid, animations, responsive design
  - JavaScript ES2020+ | Variables, functions, async/await, modules
  - DOM & Events | Manipulation, event delegation
# Tooling
  - Git & GitHub | Version control basics, branches, PRs
  - npm/pnpm | Package management
  - VS Code | Editor, extensions, debugging
# React Ecosystem
  - React 19 | Components, hooks, state, context
  - TypeScript | Types, generics, JSX typing
  - Tailwind CSS | Utility-first styling
  - React Router | Client-side routing
  - TanStack Query | Server state, caching
# Production
  - Vite | Build tool, HMR, env vars
  - Vitest + Testing Library | Unit + integration tests
  - Vercel/Netlify | Deploy + preview URLs
  - Lighthouse | Performance, SEO, accessibility audits",
            ],
        ],
        [
            'slug'   => 'backend-developer-2026',
            'title'  => 'Backend Developer Roadmap 2026',
            'excerpt'=> 'Node.js + databases + APIs + auth + deployment. From zero to production-ready backend engineer.',
            'meta'   => [
                '_hk_roadmap_career'          => 'Backend Developer',
                '_hk_roadmap_hours_estimated' => 360,
                '_hk_roadmap_difficulty'      => 'intermediate',
                '_hk_roadmap_requirements'    => "Comfort with JavaScript\nLinux command line basics",
                '_hk_roadmap_outcomes'        => "Build REST + GraphQL APIs\nDesign relational + NoSQL schemas\nImplement auth + rate limiting\nDeploy to GCE/AWS",
                '_hk_roadmap_outline' =>
"# Language & Runtime
  - Node.js 22 LTS | Event loop, modules, streams
  - TypeScript | Strict mode, generics, decorators
# APIs
  - Express / Fastify | Routing, middleware, errors
  - REST | Resources, status codes, versioning
  - GraphQL | Schema, resolvers, dataloader
  - OpenAPI | Spec-first API design
# Databases
  - PostgreSQL | Schemas, indexes, transactions
  - Drizzle ORM | Type-safe queries, migrations
  - Redis | Caching, sessions, queues
  - MongoDB | Document modeling
# Auth & Security
  - JWT + Sessions | When to use which
  - OAuth2 / OIDC | Google, GitHub login
  - bcrypt + argon2 | Password hashing
  - Rate limiting + CORS | API protection
# Production
  - Docker | Containerizing services
  - Nginx | Reverse proxy, TLS termination
  - PM2 / systemd | Process management
  - Monitoring | Logs, metrics, alerts",
            ],
        ],
        [
            'slug'   => 'full-stack-developer-2026',
            'title'  => 'Full-Stack Developer Roadmap 2026',
            'excerpt'=> 'End-to-end web development with Next.js, TypeScript, Postgres, and modern deployment.',
            'meta'   => [
                '_hk_roadmap_career'          => 'Full-Stack Developer',
                '_hk_roadmap_hours_estimated' => 480,
                '_hk_roadmap_difficulty'      => 'intermediate',
                '_hk_roadmap_requirements'    => "Frontend basics OR backend basics\nGit familiarity",
                '_hk_roadmap_outcomes'        => "Ship full SaaS products solo\nDesign DB + API + UI together\nHandle auth, payments, emails\nDeploy and monitor in production",
                '_hk_roadmap_outline' =>
"# Frontend
  - React 19 + TypeScript | Components, hooks, types
  - Next.js 15 App Router | RSC, server actions, routing
  - Tailwind + shadcn/ui | Design system
# Backend
  - Server Actions / API Routes | Mutations, validation
  - Drizzle + Postgres | Schema, migrations, joins
  - Zod | Runtime validation
# Auth & Payments
  - NextAuth / Clerk | Sessions, OAuth
  - Stripe / Razorpay | Subscriptions, webhooks
# DevOps
  - Vercel / Railway | Deploy + preview branches
  - GitHub Actions | CI/CD pipelines
  - Sentry / PostHog | Errors + analytics
# Soft Skills
  - Product thinking | What to build, why
  - User research | Interviews, feedback loops",
            ],
        ],
        [
            'slug'   => 'devops-engineer-2026',
            'title'  => 'DevOps Engineer Roadmap 2026',
            'excerpt'=> 'Linux, containers, IaC, CI/CD, cloud, and observability — the modern DevOps stack.',
            'meta'   => [
                '_hk_roadmap_career'          => 'DevOps Engineer',
                '_hk_roadmap_hours_estimated' => 420,
                '_hk_roadmap_difficulty'      => 'intermediate',
                '_hk_roadmap_requirements'    => "Linux command line\nBasic networking (DNS, HTTP, TCP)",
                '_hk_roadmap_outcomes'        => "Provision cloud infra with Terraform\nRun Kubernetes clusters in production\nBuild CI/CD pipelines\nMonitor + alert on SLOs",
                '_hk_roadmap_outline' =>
"# Linux & Networking
  - Bash scripting | Loops, functions, traps
  - systemd | Services, timers, journald
  - Networking | DNS, HTTP, TLS, firewalls
# Containers
  - Docker | Images, layers, multi-stage
  - Docker Compose | Local multi-service stacks
  - Kubernetes | Pods, deployments, services, ingress
  - Helm | Package manager for k8s
# IaC
  - Terraform | Providers, state, modules
  - Ansible | Playbooks, roles, vault
# CI/CD
  - GitHub Actions | Workflows, secrets, matrix
  - GitLab CI | Pipelines, runners, environments
  - ArgoCD | GitOps for k8s
# Cloud
  - AWS Core | EC2, S3, IAM, VPC, RDS
  - GCP | GCE, GKE, Cloud Run
# Observability
  - Prometheus + Grafana | Metrics + dashboards
  - Loki / ELK | Log aggregation
  - Jaeger / Tempo | Distributed tracing",
            ],
        ],
        [
            'slug'   => 'data-analyst-roadmap-2026',
            'title'  => 'Data Analyst Roadmap 2026',
            'excerpt'=> 'Excel → SQL → Python → BI tools → real dashboards. Path to MIS / Data Analyst job.',
            'meta'   => [
                '_hk_roadmap_career'          => 'Data Analyst / MIS',
                '_hk_roadmap_hours_estimated' => 240,
                '_hk_roadmap_difficulty'      => 'beginner',
                '_hk_roadmap_requirements'    => "Basic computer literacy\nComfort with numbers",
                '_hk_roadmap_outcomes'        => "Build Excel + Power BI dashboards\nWrite SQL for any business question\nAutomate reports with Python\nPresent insights to stakeholders",
                '_hk_roadmap_outline' =>
"# Excel Mastery
  - Formulas | VLOOKUP, INDEX/MATCH, XLOOKUP
  - Pivot Tables | Slicers, calculated fields
  - Power Query | ETL inside Excel
  - Charts + Dashboards | Storytelling with data
# SQL
  - SELECT basics | WHERE, ORDER, LIMIT
  - JOINs | INNER, LEFT, multi-table
  - Aggregations | GROUP BY, HAVING, window functions
  - CTEs + Subqueries | Complex business queries
# Python for Analysts
  - pandas | DataFrames, merge, pivot
  - matplotlib + seaborn | Visualizations
  - openpyxl | Read/write Excel files
  - Jupyter | Notebook workflows
# BI Tools
  - Power BI | DAX, measures, RLS
  - Tableau | Calculated fields, parameters
  - Google Looker Studio | Free dashboards
# Statistics
  - Descriptive stats | Mean, median, std dev
  - Hypothesis testing | A/B testing basics
  - Regression | Linear, logistic intuition",
            ],
        ],
        [
            'slug'   => 'data-scientist-2026',
            'title'  => 'Data Scientist Roadmap 2026',
            'excerpt'=> 'Statistics, ML, deep learning, and MLOps — full data science career path.',
            'meta'   => [
                '_hk_roadmap_career'          => 'Data Scientist',
                '_hk_roadmap_hours_estimated' => 540,
                '_hk_roadmap_difficulty'      => 'advanced',
                '_hk_roadmap_requirements'    => "Python comfort\nHigh school math (calculus + linear algebra helpful)",
                '_hk_roadmap_outcomes'        => "Train + deploy ML models\nDesign experiments + measure impact\nBuild RAG + LLM applications\nCommunicate findings to non-technical leaders",
                '_hk_roadmap_outline' =>
"# Math Foundations
  - Linear algebra | Vectors, matrices, eigenvalues
  - Calculus | Derivatives, gradient descent
  - Probability | Distributions, Bayes
  - Statistics | Hypothesis testing, confidence intervals
# Python Stack
  - NumPy + pandas | Numerical + tabular data
  - scikit-learn | Classical ML algorithms
  - matplotlib + plotly | Data viz
# Machine Learning
  - Supervised | Regression, classification, trees
  - Unsupervised | Clustering, dimensionality reduction
  - Model evaluation | Cross-validation, metrics
  - Feature engineering | Encoding, scaling, selection
# Deep Learning
  - PyTorch | Tensors, autograd, training loops
  - CNNs | Image classification, transfer learning
  - Transformers | Attention, BERT, GPT
# LLMs & RAG
  - Prompt engineering | Few-shot, chain-of-thought
  - LangChain / LlamaIndex | RAG pipelines
  - Vector DBs | Pinecone, Weaviate, pgvector
# MLOps
  - MLflow | Experiment tracking
  - Docker + FastAPI | Model serving
  - Monitoring | Drift detection, retraining triggers",
            ],
        ],
        [
            'slug'   => 'ai-ml-engineer-2026',
            'title'  => 'AI / ML Engineer Roadmap 2026',
            'excerpt'=> 'Production ML — train, optimize, deploy, and scale models. LLM + RAG focus.',
            'meta'   => [
                '_hk_roadmap_career'          => 'AI / ML Engineer',
                '_hk_roadmap_hours_estimated' => 480,
                '_hk_roadmap_difficulty'      => 'advanced',
                '_hk_roadmap_requirements'    => "Python + ML basics\nComfort with cloud infra",
                '_hk_roadmap_outcomes'        => "Deploy LLM apps to production\nFine-tune open models on custom data\nBuild RAG over private datasets\nOptimize inference cost + latency",
                '_hk_roadmap_outline' =>
"# ML Foundations
  - PyTorch / JAX | Training + inference
  - Hugging Face | Models, datasets, trainers
  - Transformers | Architecture deep dive
# LLM Apps
  - OpenAI / Anthropic / Gemini APIs | Chat, tools, vision
  - Function calling | Structured outputs, tools
  - LangGraph / LlamaIndex | Agent workflows
  - Evals | LangSmith, Braintrust, custom
# RAG Pipelines
  - Embeddings | OpenAI, Cohere, BGE
  - Chunking strategies | Recursive, semantic
  - Vector DBs | pgvector, Pinecone, Qdrant
  - Hybrid search | BM25 + vectors + reranking
# Fine-tuning
  - LoRA / QLoRA | Parameter-efficient tuning
  - Datasets | Curation, formatting, splits
  - Eval harnesses | LM-Eval, custom benchmarks
# Production
  - vLLM / TGI | High-throughput inference
  - Modal / Replicate / Banana | Serverless GPU
  - Caching | KV-cache, prompt caching
  - Cost optimization | Quantization, batching",
            ],
        ],
        [
            'slug'   => 'cloud-engineer-aws-2026',
            'title'  => 'AWS Cloud Engineer Roadmap 2026',
            'excerpt'=> 'AWS-focused cloud career — services, certifications, and real-world architectures.',
            'meta'   => [
                '_hk_roadmap_career'          => 'Cloud Engineer (AWS)',
                '_hk_roadmap_hours_estimated' => 380,
                '_hk_roadmap_difficulty'      => 'intermediate',
                '_hk_roadmap_requirements'    => "Linux + networking basics\nA credit card for AWS free tier",
                '_hk_roadmap_outcomes'        => "Design + run AWS architectures\nPass AWS Solutions Architect Associate\nAutomate with Terraform + CDK\nOptimize cost + security",
                '_hk_roadmap_outline' =>
"# AWS Core
  - IAM | Users, roles, policies, MFA
  - VPC | Subnets, route tables, NAT, peering
  - EC2 | Instances, AMIs, security groups
  - S3 | Buckets, lifecycle, encryption
  - RDS | Postgres/MySQL, backups, read replicas
# Compute
  - Lambda | Functions, triggers, layers
  - ECS / Fargate | Container orchestration
  - EKS | Managed Kubernetes
# Networking
  - Route 53 | DNS, health checks
  - CloudFront | CDN, TLS, signed URLs
  - ALB / NLB | Load balancing patterns
# Data
  - DynamoDB | NoSQL design patterns
  - Aurora | Serverless databases
  - S3 + Athena | Data lake querying
# DevOps
  - CloudFormation / CDK | IaC native
  - Terraform | Multi-cloud IaC
  - CodePipeline + CodeBuild | CI/CD
# Certs
  - AWS Cloud Practitioner | Entry
  - Solutions Architect Associate | Career-defining",
            ],
        ],
        [
            'slug'   => 'react-native-mobile-2026',
            'title'  => 'React Native Mobile Roadmap 2026',
            'excerpt'=> 'Build production iOS + Android apps with React Native + Expo.',
            'meta'   => [
                '_hk_roadmap_career'          => 'Mobile Developer (React Native)',
                '_hk_roadmap_hours_estimated' => 280,
                '_hk_roadmap_difficulty'      => 'intermediate',
                '_hk_roadmap_requirements'    => "React + JS comfort\nMac (for iOS) or Windows/Linux (Android only)",
                '_hk_roadmap_outcomes'        => "Ship apps to App Store + Play Store\nUse native device features\nHandle push notifications\nMonetize via in-app purchases",
                '_hk_roadmap_outline' =>
"# React Native Core
  - JSX + Components | View, Text, FlatList
  - Styling | Flexbox, StyleSheet, themes
  - Navigation | React Navigation v7
# Expo
  - Expo Router | File-based routing
  - Expo Modules | Camera, location, files
  - EAS Build | Cloud builds for iOS/Android
  - EAS Update | OTA updates
# Native Features
  - Camera + ImagePicker | Photo capture
  - Geolocation + Maps | react-native-maps
  - Push notifications | Expo Notifications
  - Secure storage | expo-secure-store
# State & Data
  - Zustand / Jotai | Lightweight state
  - TanStack Query | Server state
  - AsyncStorage | Persistence
# Production
  - App Store Connect | iOS submission
  - Google Play Console | Android submission
  - RevenueCat | Subscriptions + IAP
  - Sentry | Crash reporting",
            ],
        ],
        [
            'slug'   => 'wordpress-developer-2026',
            'title'  => 'WordPress Developer Roadmap 2026',
            'excerpt'=> 'Themes, plugins, WooCommerce, headless WP — full WordPress career path.',
            'meta'   => [
                '_hk_roadmap_career'          => 'WordPress Developer',
                '_hk_roadmap_hours_estimated' => 260,
                '_hk_roadmap_difficulty'      => 'beginner',
                '_hk_roadmap_requirements'    => "Basic HTML/CSS/JS\nFTP + cPanel familiarity helpful",
                '_hk_roadmap_outcomes'        => "Build custom themes + plugins\nLaunch WooCommerce stores\nServe headless WP via REST/GraphQL\nFreelance + earn from day 1",
                '_hk_roadmap_outline' =>
"# WP Foundations
  - Install + admin | Local, Hostinger, WP-CLI
  - Themes vs plugins | When to use what
  - Hooks | Actions + filters
# Theme Dev
  - Template hierarchy | Single, archive, page
  - Custom fields | ACF, native meta
  - Block themes | theme.json, FSE
  - Underscores starter | Build from scratch
# Plugin Dev
  - Plugin structure | Hooks, classes, autoload
  - Settings API | Admin pages, options
  - Custom post types | Registration, REST exposure
  - mu-plugins | Always-on workspace plugins
# WooCommerce
  - Products + variations | Setup, attributes
  - Checkout customization | Hooks, fees, fields
  - Payment gateways | Razorpay, Stripe, COD
  - Subscriptions + memberships | Recurring revenue
# Headless WP
  - REST API | Auth, custom endpoints
  - WPGraphQL | Schema, resolvers
  - Next.js / Astro frontends | Static + ISR
# Performance
  - Caching | Redis, page cache, OPcache
  - Image optimization | WebP, lazy load
  - Hosting | Shared, VPS, managed",
            ],
        ],
        [
            'slug'   => 'cybersecurity-analyst-2026',
            'title'  => 'Cybersecurity Analyst Roadmap 2026',
            'excerpt'=> 'Networking → Linux → security tools → blue team / red team specialization.',
            'meta'   => [
                '_hk_roadmap_career'          => 'Cybersecurity Analyst',
                '_hk_roadmap_hours_estimated' => 400,
                '_hk_roadmap_difficulty'      => 'intermediate',
                '_hk_roadmap_requirements'    => "Curiosity + ethical mindset\nBasic networking",
                '_hk_roadmap_outcomes'        => "Analyze threats + incidents\nUse SIEM tools (Splunk, ELK)\nPerform pen tests legally\nClear CompTIA Security+",
                '_hk_roadmap_outline' =>
"# Networking
  - TCP/IP | OSI layers, packets, ports
  - DNS + HTTP/HTTPS | How web works
  - Wireshark | Packet capture + analysis
# Linux
  - Bash | Scripting + system admin
  - File permissions | chmod, chown, ACLs
  - Logs | journald, syslog, auditd
# Tools
  - Nmap | Network scanning
  - Burp Suite | Web app testing
  - Metasploit | Exploitation framework
  - Wireshark + tcpdump | Network forensics
# Blue Team
  - SIEM | Splunk, ELK, Wazuh
  - EDR | CrowdStrike, SentinelOne basics
  - Incident response | NIST framework
  - Threat hunting | Indicators of compromise
# Red Team
  - OWASP Top 10 | XSS, SQLi, CSRF, etc
  - Active Directory attacks | Kerberoasting, Golden Ticket
  - Privilege escalation | Linux + Windows
# Certs
  - CompTIA Security+ | Industry baseline
  - CEH / OSCP | Offensive specialization
  - CISSP | Senior management track",
            ],
        ],
        [
            'slug'   => 'python-developer-2026',
            'title'  => 'Python Developer Roadmap 2026',
            'excerpt'=> 'Python from zero to job-ready: web (FastAPI/Django), automation, data, and AI.',
            'meta'   => [
                '_hk_roadmap_career'          => 'Python Developer',
                '_hk_roadmap_hours_estimated' => 300,
                '_hk_roadmap_difficulty'      => 'beginner',
                '_hk_roadmap_requirements'    => "Computer + curiosity\nNo prior coding needed",
                '_hk_roadmap_outcomes'        => "Build web APIs with FastAPI\nAutomate boring office work\nWork with data via pandas\nDeploy Python apps to production",
                '_hk_roadmap_outline' =>
"# Python Basics
  - Syntax | Variables, types, operators
  - Control flow | if/else, loops, comprehensions
  - Functions | Args, *args, **kwargs, lambdas
  - Data structures | List, dict, set, tuple
  - OOP | Classes, inheritance, dataclasses
# Tooling
  - venv + pip | Virtual environments
  - uv / poetry | Modern dep management
  - pytest | Unit testing
  - ruff + mypy | Lint + type-check
# Web Development
  - FastAPI | Async APIs, Pydantic, OpenAPI
  - Django | Batteries-included framework
  - SQLAlchemy | ORM + migrations
# Automation
  - requests + httpx | API calls
  - BeautifulSoup + Playwright | Web scraping
  - openpyxl | Excel automation
  - schedule + APScheduler | Cron jobs in Python
# Data + AI
  - pandas | DataFrames + analysis
  - OpenAI SDK | LLM integration
  - LangChain | AI workflows
# Deployment
  - Docker | Containerize Python apps
  - Gunicorn + Uvicorn | WSGI/ASGI servers
  - Railway / Render | Deploy in minutes",
            ],
        ],
    ];
}

/**
 * 12 tech news / releases for the Netflix-style timeline.
 * Dates spread Feb–Aug 2026 to give the timeline a real range.
 */
function hk_seed_v3_news_data() {
    return [
        [
            'slug'   => 'claude-4-5-sonnet-release',
            'title'  => 'Claude 4.5 Sonnet — Long-context coding agent',
            'excerpt'=> 'Anthropic released Claude 4.5 Sonnet with 1M token context, agentic tool use, and best-in-class code generation.',
            'meta'   => [
                '_hk_release_date'       => '2026-04-15 18:30:00',
                '_hk_release_type'       => 'ai-update',
                '_hk_release_source_url' => 'https://www.anthropic.com/news',
                '_hk_release_summary'    => '1M context window, tool-using agent, top SWE-bench scores.',
                '_hk_release_tags'       => 'Anthropic, Claude, AI, LLM, coding',
            ],
        ],
        [
            'slug'   => 'gpt-5-turbo-launch',
            'title'  => 'GPT-5 Turbo released — multi-modal reasoning',
            'excerpt'=> 'OpenAI shipped GPT-5 Turbo with native voice + vision, agent mode, and 90% lower price than GPT-4o.',
            'meta'   => [
                '_hk_release_date'       => '2026-03-21 09:00:00',
                '_hk_release_type'       => 'ai-update',
                '_hk_release_source_url' => 'https://openai.com/blog',
                '_hk_release_summary'    => 'Cheaper, faster, multi-modal — native agent + voice mode.',
                '_hk_release_tags'       => 'OpenAI, GPT-5, AI, multi-modal',
            ],
        ],
        [
            'slug'   => 'nextjs-16-release',
            'title'  => 'Next.js 16 — Stable React Compiler + Turbopack',
            'excerpt'=> 'Vercel released Next.js 16 with the React Compiler stable, Turbopack as default bundler, and PPR (Partial Prerendering) GA.',
            'meta'   => [
                '_hk_release_date'       => '2026-04-08 17:00:00',
                '_hk_release_type'       => 'tool-release',
                '_hk_release_source_url' => 'https://nextjs.org/blog',
                '_hk_release_summary'    => 'Turbopack default + Compiler stable + PPR GA.',
                '_hk_release_tags'       => 'Next.js, Vercel, React, frontend',
            ],
        ],
        [
            'slug'   => 'react-20-release',
            'title'  => 'React 20 — Compiler GA + new use() hooks',
            'excerpt'=> 'React 20 ships the React Compiler GA, eliminating most useMemo/useCallback boilerplate, plus expanded use() hook support.',
            'meta'   => [
                '_hk_release_date'       => '2026-03-12 16:00:00',
                '_hk_release_type'       => 'tool-release',
                '_hk_release_source_url' => 'https://react.dev/blog',
                '_hk_release_summary'    => 'Compiler GA — say goodbye to useMemo everywhere.',
                '_hk_release_tags'       => 'React, frontend, JavaScript',
            ],
        ],
        [
            'slug'   => 'nodejs-24-lts',
            'title'  => 'Node.js 24 LTS released',
            'excerpt'=> 'Node.js 24 hits LTS with native TypeScript execution, built-in test runner upgrades, and improved permission model.',
            'meta'   => [
                '_hk_release_date'       => '2026-04-22 14:00:00',
                '_hk_release_type'       => 'tool-release',
                '_hk_release_source_url' => 'https://nodejs.org/en/blog',
                '_hk_release_summary'    => 'Native TS execution, better perms, faster V8.',
                '_hk_release_tags'       => 'Node.js, JavaScript, backend',
            ],
        ],
        [
            'slug'   => 'vercel-ai-sdk-5',
            'title'  => 'Vercel AI SDK v5 — Streaming + agents',
            'excerpt'=> 'Vercel AI SDK v5 unifies streaming across providers, adds agent loops, multi-step tool calls, and structured output APIs.',
            'meta'   => [
                '_hk_release_date'       => '2026-03-04 13:30:00',
                '_hk_release_type'       => 'tool-release',
                '_hk_release_source_url' => 'https://sdk.vercel.ai',
                '_hk_release_summary'    => 'Unified streaming + agents + structured outputs.',
                '_hk_release_tags'       => 'Vercel, AI SDK, LLM, TypeScript',
            ],
        ],
        [
            'slug'   => 'smart-india-hackathon-2026',
            'title'  => 'Smart India Hackathon 2026 — Registration Opens',
            'excerpt'=> 'AICTE opened SIH 2026 college registrations. Theme: AI for Bharat, Cybersecurity, Climate Tech. Final round in December.',
            'meta'   => [
                '_hk_release_date'       => '2026-08-15 23:59:00',
                '_hk_release_type'       => 'form-deadline',
                '_hk_release_source_url' => 'https://sih.gov.in',
                '_hk_release_summary'    => 'College reg deadline 15 Aug 2026. Themes: AI, Cyber, Climate.',
                '_hk_release_tags'       => 'SIH, hackathon, AICTE, India, students',
            ],
        ],
        [
            'slug'   => 'aws-reinvent-2026',
            'title'  => 'AWS re:Invent 2026 — Las Vegas',
            'excerpt'=> 'AWS biggest annual conference. Expected: new EC2 generations, expanded Bedrock model garden, Q Developer GA.',
            'meta'   => [
                '_hk_release_date'       => '2026-12-02 09:00:00',
                '_hk_release_type'       => 'conference',
                '_hk_release_source_url' => 'https://reinvent.awsevents.com',
                '_hk_release_summary'    => '2–6 Dec 2026, Las Vegas. Free virtual stream.',
                '_hk_release_tags'       => 'AWS, conference, cloud, re:Invent',
            ],
        ],
        [
            'slug'   => 'google-io-2026',
            'title'  => 'Google I/O 2026 — Gemini 3 + Android 17',
            'excerpt'=> 'Google announced Gemini 3 Ultra, Android 17 with on-device AI agents, and an updated Material 4 design system.',
            'meta'   => [
                '_hk_release_date'       => '2026-05-13 19:00:00',
                '_hk_release_type'       => 'conference',
                '_hk_release_source_url' => 'https://io.google',
                '_hk_release_summary'    => 'Gemini 3, Android 17, Material 4 — biggest I/O in years.',
                '_hk_release_tags'       => 'Google, I/O, Gemini, Android',
            ],
        ],
        [
            'slug'   => 'wordpress-7-release',
            'title'  => 'WordPress 7.0 — Block-first admin',
            'excerpt'=> 'WordPress 7.0 ships a fully block-based admin UI, native AI block, and 40% faster REST API.',
            'meta'   => [
                '_hk_release_date'       => '2026-06-18 12:00:00',
                '_hk_release_type'       => 'tool-release',
                '_hk_release_source_url' => 'https://wordpress.org/news',
                '_hk_release_summary'    => 'Block-first admin + native AI block + faster REST.',
                '_hk_release_tags'       => 'WordPress, CMS, web',
            ],
        ],
        [
            'slug'   => 'tailwind-v5-release',
            'title'  => 'Tailwind CSS v5 — Container queries native',
            'excerpt'=> 'Tailwind v5 ships native container queries, CSS-in-JS interop, and a 70% smaller default bundle.',
            'meta'   => [
                '_hk_release_date'       => '2026-02-25 11:00:00',
                '_hk_release_type'       => 'tool-release',
                '_hk_release_source_url' => 'https://tailwindcss.com/blog',
                '_hk_release_summary'    => 'Container queries + smaller bundle + better DX.',
                '_hk_release_tags'       => 'Tailwind, CSS, frontend',
            ],
        ],
        [
            'slug'   => 'india-ai-summit-2026',
            'title'  => 'India AI Summit 2026 — New Delhi',
            'excerpt'=> 'MeitY hosts India AI Summit 2026 in New Delhi. Speakers from Anthropic, Google, OpenAI, Sarvam, and IIT labs.',
            'meta'   => [
                '_hk_release_date'       => '2026-07-09 09:30:00',
                '_hk_release_type'       => 'conference',
                '_hk_release_source_url' => 'https://indiaai.gov.in',
                '_hk_release_summary'    => '9–11 Jul 2026, Delhi. Free for verified students.',
                '_hk_release_tags'       => 'India AI, MeitY, conference, AI policy',
            ],
        ],
    ];
}
