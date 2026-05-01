/**
 * Static course-content enrichment.
 *
 * The /wp-json/hackknow/v1/courses endpoint currently returns chapter TITLES
 * only. This file provides full lesson lists, body paragraphs, and reference
 * resource links per chapter. CourseDetailPage merges this overlay onto the
 * API response so every course shows real, learnable content.
 *
 * Owner can later replace `resourceUrl` entries with HackKnow-hosted PDFs
 * once Hostinger SFTP is back online. For now the references point at the
 * canonical official documentation for each technology, which is what a
 * professional learner would consult anyway.
 *
 * Indexed by course SLUG. Only the slugs present in production are listed —
 * adding a new course simply means adding a new entry below.
 */

export interface ChapterEnrichment {
  /** Specific lesson bullets shown under the chapter title (5–6 items). */
  lessons: string[];
  /** A learner-facing paragraph (~200–400 chars) that frames the chapter. */
  body: string;
  /** Optional reading time hint shown on the right. */
  duration?: string;
  /** Public reference link (official docs / authoritative PDF). */
  resourceUrl?: string;
  /** Display label for the resource link. */
  resourceLabel?: string;
}

export interface CourseEnrichment {
  chapters: ChapterEnrichment[];
}

const HOURS = (h: number) => `${h}h`;

/* ──────────────────────────────────────────────────────────────────────── */
/*   COURSE: Sample: Python + FastAPI Fundamentals  (slug guess + variants) */
/* ──────────────────────────────────────────────────────────────────────── */

const fastapi: CourseEnrichment = {
  chapters: [
    {
      duration: HOURS(1),
      lessons: [
        "Install Python 3.11+ and create a clean virtualenv with `python -m venv`",
        "Install FastAPI + Uvicorn: `pip install fastapi uvicorn[standard]`",
        "Write the canonical `hello world` route and run with `uvicorn main:app --reload`",
        "Open the auto-generated Swagger UI at `/docs` and the ReDoc UI at `/redoc`",
        "Project layout: `app/main.py`, `app/routers/`, `app/models/`, `app/db.py`",
      ],
      body: "FastAPI is a modern, async-first Python web framework that gives you OpenAPI docs, request validation and dependency injection out of the box. In this opening chapter you'll set up an isolated environment, install the framework, write your first route, and tour the auto-generated interactive docs that ship with every FastAPI app.",
      resourceUrl: "https://fastapi.tiangolo.com/tutorial/first-steps/",
      resourceLabel: "FastAPI: First Steps (official tutorial)",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Path & query parameters with type hints (Python becomes your validator)",
        "Pydantic models for request/response bodies with automatic validation",
        "Dependency injection via `Depends()` — auth, DB sessions, settings",
        "Async vs sync routes — when to use `async def` vs plain `def`",
        "Status codes, response models, and error handling with `HTTPException`",
      ],
      body: "FastAPI's superpower is using ordinary Python type hints as the source of truth for validation, serialization AND documentation. This chapter teaches you how Pydantic models drive request bodies, how `Depends()` cleanly injects shared resources, and the difference between coroutine routes and threadpool routes.",
      resourceUrl: "https://fastapi.tiangolo.com/tutorial/body/",
      resourceLabel: "FastAPI: Request Body & Pydantic",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Design a 5-table schema with SQLAlchemy 2.0 declarative syntax",
        "Wire up Alembic migrations for safe schema evolution",
        "CRUD endpoints: create, read (list + detail), update, delete",
        "Auth: hash passwords with `passlib`, issue JWTs with `python-jose`",
        "Write pytest tests with `httpx.AsyncClient` against the live app",
      ],
      body: "Time to ship a real REST API. You'll model a small SaaS schema, run Alembic migrations, expose full CRUD, add JWT-based auth, and lock everything in with a real test suite. By the end you have a backend you'd actually be willing to put in front of users.",
      resourceUrl: "https://fastapi.tiangolo.com/tutorial/sql-databases/",
      resourceLabel: "FastAPI: SQL Databases",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Containerise with a multi-stage `Dockerfile` (build → slim runtime)",
        "Deploy free on Render.com or Fly.io with a `render.yaml` blueprint",
        "Add `gunicorn` + `uvicorn.workers.UvicornWorker` for production",
        "Ship structured logs and Sentry error tracking",
        "Set up GitHub Actions CI to test + deploy on every push to `main`",
      ],
      body: "A REST API that lives on your laptop helps no one. This final chapter walks you through containerising the project, deploying to a free production-grade host, adding observability, and wiring up a CI/CD pipeline that ships safely on every merge.",
      resourceUrl: "https://fastapi.tiangolo.com/deployment/docker/",
      resourceLabel: "FastAPI: Deployment with Docker",
    },
  ],
};

/* ──────────────────────────────────────────────────────────────────────── */
/*   COURSE: Headless WordPress + React                                     */
/* ──────────────────────────────────────────────────────────────────────── */

const headlessWp: CourseEnrichment = {
  chapters: [
    {
      duration: HOURS(1),
      lessons: [
        "Spin up a local WordPress with LocalWP / Lando in 5 minutes",
        "Enable the WP REST API and explore `/wp-json/wp/v2/posts`",
        "Set permalinks, CORS headers, and an `Application Password` for auth",
        "Bootstrap a Vite + React + TypeScript frontend",
        "Folder convention: `app/`, `lib/api.ts`, `pages/`, `components/`",
      ],
      body: "A 'headless' setup means WordPress keeps doing what it's great at (content editing, media library, plugins) while your React frontend handles all rendering. In this chapter you'll prepare both halves of the stack and confirm they can talk to each other over JSON.",
      resourceUrl: "https://developer.wordpress.org/rest-api/",
      resourceLabel: "WordPress REST API Handbook",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Fetch posts with `useQuery` + the official REST endpoints",
        "Render rich content safely with `dangerouslySetInnerHTML` + sanitiser",
        "Custom post types & ACF field exposure via `register_rest_field()`",
        "Pagination, search, taxonomy filtering — all server-side",
        "SEO: per-page `<title>` and `<meta>` from WP's Yoast/Rank Math fields",
      ],
      body: "Now we replace the React placeholder with real WordPress data. You'll learn how to query posts and pages, expose custom fields, paginate efficiently, and pipe SEO metadata from the CMS into your React `<head>`.",
      resourceUrl: "https://developer.wordpress.org/rest-api/reference/posts/",
      resourceLabel: "REST API: Posts reference",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Server-side rendering with Next.js for instant LCP + SEO",
        "ISR (Incremental Static Regeneration) for news-style sites",
        "Image optimisation via `<Image />` against WP media URLs",
        "Build a contact form posting back to a WP custom endpoint",
        "Authenticated reads with `Application Password` headers",
      ],
      body: "A real headless site needs SEO, fast first paint, and image performance. We'll graduate from Vite to Next.js, switch to ISR for that perfect blend of static speed + dynamic freshness, and wire up forms that actually persist into WordPress.",
      resourceUrl: "https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration",
      resourceLabel: "Next.js: ISR docs",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Deploy WP to a managed host (Hostinger / Cloudways / Kinsta)",
        "Deploy Next.js to Vercel — connect to your WP host with environment vars",
        "Set up a webhook so WP publishes trigger Vercel rebuilds (ISR fallback)",
        "Add Cloudflare in front for CDN + image resizing",
        "Backup strategy: daily WP DB dump + Vercel git rollbacks",
      ],
      body: "Production reliability for a headless setup means keeping two systems in sync. You'll learn the deployment topology, secret management, the publish-webhook pattern that keeps content fresh, and a backup story that lets you recover from anything.",
      resourceUrl: "https://vercel.com/docs/concepts/deployments/git/vercel-for-github",
      resourceLabel: "Vercel: Git deployments",
    },
  ],
};

/* ──────────────────────────────────────────────────────────────────────── */
/*   COURSE: Java Spring Boot Microservices                                 */
/* ──────────────────────────────────────────────────────────────────────── */

const springBoot: CourseEnrichment = {
  chapters: [
    {
      duration: HOURS(1),
      lessons: [
        "Install JDK 21 + Maven and verify with `mvn -v`",
        "Bootstrap with `start.spring.io` (Web, Data JPA, Validation, Lombok)",
        "Anatomy of a Spring Boot project: `src/main/java`, `application.yml`",
        "Annotations 101: `@RestController`, `@Service`, `@Repository`",
        "Run with `./mvnw spring-boot:run` and hit `/actuator/health`",
      ],
      body: "Spring Boot turned the legendarily verbose Java enterprise stack into something you can spin up in under a minute. We start with a clean install of modern Java, scaffold a project the official way, and learn the small handful of annotations that drive the entire framework.",
      resourceUrl: "https://docs.spring.io/spring-boot/docs/current/reference/html/getting-started.html",
      resourceLabel: "Spring Boot: Getting Started",
    },
    {
      duration: HOURS(1),
      lessons: [
        "REST controllers with `@GetMapping` / `@PostMapping` / etc.",
        "Persistence with Spring Data JPA + Hibernate (no raw SQL needed)",
        "Bean validation with `@Valid` + Jakarta Validation annotations",
        "Global exception handling with `@ControllerAdvice`",
        "DTOs vs entities — and why mixing them ruins your weekend",
      ],
      body: "Core concepts most teams get wrong. You'll learn why the boundary between a JPA entity and a request DTO matters, how validation cascades through the call stack, and how a single `@ControllerAdvice` class can replace dozens of try/catch blocks.",
      resourceUrl: "https://spring.io/guides/gs/rest-service/",
      resourceLabel: "Spring Guide: Building a RESTful Web Service",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Split a monolith into 3 services: `auth`, `catalog`, `orders`",
        "Service discovery with Spring Cloud Eureka",
        "Synchronous calls with OpenFeign clients + circuit breakers",
        "Async eventing with RabbitMQ / Kafka via Spring Cloud Stream",
        "Config server: externalise every `application.yml` to git",
      ],
      body: "The microservices payoff. You'll decompose a single Spring Boot app into three cooperating services, register them with Eureka, call between them with Feign + resilience patterns, and wire up an event backbone for the calls that don't need to be synchronous.",
      resourceUrl: "https://spring.io/projects/spring-cloud",
      resourceLabel: "Spring Cloud project page",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Build a single fat JAR per service with `spring-boot-maven-plugin`",
        "Containerise with Spring's native `bootBuildImage` (Buildpacks)",
        "Deploy to Kubernetes with a Helm chart or Render.com",
        "Observability: Micrometer + Prometheus + Grafana dashboards",
        "Rolling deploys, readiness probes, and graceful shutdown",
      ],
      body: "A microservices stack only earns its complexity if it ships. We finish by packaging each service into a container image, deploying to Kubernetes (or a managed alternative), and wiring up the metrics + dashboards you need to actually run the thing in production.",
      resourceUrl: "https://docs.spring.io/spring-boot/docs/current/reference/html/deployment.html",
      resourceLabel: "Spring Boot: Production-ready deployment",
    },
  ],
};

/* ──────────────────────────────────────────────────────────────────────── */
/*   COURSE: PHP Laravel SaaS Starter                                       */
/* ──────────────────────────────────────────────────────────────────────── */

const laravel: CourseEnrichment = {
  chapters: [
    {
      duration: HOURS(1),
      lessons: [
        "Install PHP 8.3 + Composer + Laravel installer",
        "Scaffold with `laravel new app --jet` (Jetstream + Inertia + Vue/React)",
        "Folder tour: `app/`, `routes/`, `database/migrations/`, `resources/`",
        "Run `php artisan serve` + `npm run dev` — Vite is built in",
        "First migration + first Eloquent model in 60 seconds",
      ],
      body: "Laravel ships everything a SaaS needs out of the box: auth scaffolding, billing, multi-tenancy, queues, mail. In this opener you'll install the modern toolchain, scaffold a fully-themed app with Jetstream, and tour the conventions that make Laravel productive.",
      resourceUrl: "https://laravel.com/docs/installation",
      resourceLabel: "Laravel: Installation",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Routing, controllers, and route-model binding",
        "Eloquent ORM: relationships, eager loading, query scopes",
        "Form requests for clean validation",
        "Blade templates vs Inertia.js + Vue/React for SPAs",
        "Queues with Redis: send a welcome email without blocking",
      ],
      body: "Core Laravel patterns that turn 100 lines of code into 20. You'll master Eloquent's elegant relationships, push validation out of controllers into form-request classes, and learn when to use server-rendered Blade vs SPA-style Inertia for each page.",
      resourceUrl: "https://laravel.com/docs/eloquent",
      resourceLabel: "Laravel: Eloquent ORM",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Multi-tenant architecture with `stancl/tenancy` (DB per tenant)",
        "Subscription billing with Laravel Cashier + Stripe",
        "Per-plan feature gates with policies",
        "Tenant-scoped subdomain routing: `acme.app.com`, `globex.app.com`",
        "Backup + tenant migration commands",
      ],
      body: "The real SaaS chapter. You'll layer multi-tenancy onto the base app so every customer gets isolated data, hook up Stripe via Cashier so they can actually pay you, and gate features per plan with Laravel's built-in policies.",
      resourceUrl: "https://laravel.com/docs/billing",
      resourceLabel: "Laravel Cashier (Stripe billing)",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Deploy to Laravel Forge / Vapor / Hostinger VPS",
        "Configure horizon for queue monitoring",
        "Set up daily DB backups with `spatie/laravel-backup`",
        "Cloudflare DNS + free TLS",
        "GitHub Actions: PHPUnit + Pint + auto-deploy on green",
      ],
      body: "Time to ship. Whether you go fully managed (Forge / Vapor) or roll your own VPS, this chapter walks through the operational realities — queue workers, scheduled jobs, backups, TLS — that keep a SaaS healthy in production.",
      resourceUrl: "https://laravel.com/docs/deployment",
      resourceLabel: "Laravel: Deployment",
    },
  ],
};

/* ──────────────────────────────────────────────────────────────────────── */
/*   COURSE: Node.js + Express + TypeScript                                 */
/* ──────────────────────────────────────────────────────────────────────── */

const nodeExpress: CourseEnrichment = {
  chapters: [
    {
      duration: HOURS(1),
      lessons: [
        "Install Node 20 LTS + pnpm",
        "Scaffold with `pnpm init` + `tsc --init` (target ES2022, strict on)",
        "Add Express + types: `pnpm add express` / `pnpm add -D @types/express`",
        "Hot reload with `tsx watch src/index.ts`",
        "Project layout: `src/routes`, `src/middleware`, `src/services`",
      ],
      body: "TypeScript on the server now feels native, not bolted on. We'll set up a clean Node 20 + Express + TS toolchain with proper hot reload and strict mode — the foundation that lets the rest of the course move fast.",
      resourceUrl: "https://expressjs.com/en/starter/installing.html",
      resourceLabel: "Express: Getting Started",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Typed Express handlers: `RequestHandler<Params, Resp, Body, Query>`",
        "Validation with Zod schemas (parse, don't just check)",
        "Centralised error middleware with custom `AppError` class",
        "Async route helpers — never write `try/catch` in a handler again",
        "Structured logging with pino (JSON logs out of the box)",
      ],
      body: "The patterns that separate a hobby Express app from a production one: Zod schemas as the single source of truth for request shapes, a typed error middleware that catches everything, and structured logs you can actually grep.",
      resourceUrl: "https://zod.dev/",
      resourceLabel: "Zod: Type-safe validation",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Postgres with Drizzle ORM — type-safe, no codegen",
        "JWT auth with `jose`, refresh-token rotation",
        "Background jobs with BullMQ + Redis",
        "File uploads to S3 / R2 with `@aws-sdk/client-s3`",
        "Rate limiting with `express-rate-limit`",
      ],
      body: "A full-stack feature build. You'll layer Drizzle's type-safe queries onto the app, add a refresh-token auth flow that doesn't hand out 30-day JWTs, push slow work into BullMQ, and set up file uploads + rate limits the right way.",
      resourceUrl: "https://orm.drizzle.team/docs/overview",
      resourceLabel: "Drizzle ORM docs",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Multi-stage Dockerfile (`node:20-alpine` runtime layer)",
        "Deploy to Render / Fly / Railway in 5 minutes",
        "Health check + readiness endpoints",
        "Integration tests with vitest + supertest",
        "GitHub Actions CI: typecheck + test + build + deploy",
      ],
      body: "Ship the API for real. We containerise with a slim multi-stage build, deploy to a free production tier, add the health checks every load balancer needs, and wire up a CI pipeline that gates merges on typecheck + tests.",
      resourceUrl: "https://nodejs.org/en/docs/guides/nodejs-docker-webapp",
      resourceLabel: "Node.js: Dockerizing a Node.js app",
    },
  ],
};

/* ──────────────────────────────────────────────────────────────────────── */
/*   COURSE: Vercel + Next.js 15 — Edge, ISR, Streaming                     */
/* ──────────────────────────────────────────────────────────────────────── */

const nextJs: CourseEnrichment = {
  chapters: [
    {
      duration: HOURS(1),
      lessons: [
        "Install Next.js 15 with the App Router (`pnpm create next-app`)",
        "Folder layout: `app/`, `components/`, `lib/`, route groups `(group)/`",
        "Server Components vs Client Components — the mental model",
        "Layouts, templates, and shared `loading.tsx` / `error.tsx`",
        "Run dev with Turbopack (`next dev --turbo`)",
      ],
      body: "Next.js 15 is the React framework Vercel actually wants you to use. We start with a fresh App Router project, learn the new file conventions, and internalise the single most important question: 'is this a Server Component or a Client Component?'",
      resourceUrl: "https://nextjs.org/docs/app/getting-started",
      resourceLabel: "Next.js: App Router docs",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Data fetching with async Server Components (no `useEffect`)",
        "Streaming UI with `<Suspense>` boundaries — partial hydration",
        "Server Actions for mutations (no API routes needed)",
        "`generateStaticParams` + ISR for instant pages with fresh data",
        "Edge Runtime vs Node Runtime — when to choose which",
      ],
      body: "Core Next.js superpowers. You'll fetch data inside Server Components, stream the UI so the user sees something in 200ms, mutate data with Server Actions, and learn when to deploy to the Edge for global low-latency.",
      resourceUrl: "https://nextjs.org/docs/app/building-your-application/data-fetching",
      resourceLabel: "Next.js: Data Fetching",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Build a real blog with MDX + frontmatter + reading time",
        "Image optimisation with `<Image />` + `next/image` blur placeholders",
        "Auth with NextAuth.js (Google / GitHub / Email magic link)",
        "Postgres with Neon + Drizzle ORM (type-safe queries)",
        "i18n with `next-intl` for production multi-language sites",
      ],
      body: "A real product chapter. You'll build a blog that scores 100/100 on Lighthouse, add OAuth login that just works, persist data in a serverless Postgres, and prepare the site to ship in multiple languages.",
      resourceUrl: "https://next-auth.js.org/getting-started/introduction",
      resourceLabel: "NextAuth.js docs",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Deploy to Vercel — `git push` is your CI/CD",
        "Custom domains, env vars, preview deploys per PR",
        "Analytics + Speed Insights baked into the dashboard",
        "Edge Middleware for redirects, geo-routing, A/B tests",
        "Cost guardrails: bandwidth, function invocations, ISR cache",
      ],
      body: "Vercel is the deployment platform Next.js was designed for. You'll set up custom domains, learn how preview deploys make code review actually fun, and put guardrails on the bill so a viral launch doesn't surprise you.",
      resourceUrl: "https://vercel.com/docs/concepts/get-started",
      resourceLabel: "Vercel: Get started",
    },
  ],
};

/* ──────────────────────────────────────────────────────────────────────── */
/*   COURSE: Netlify Jamstack                                               */
/* ──────────────────────────────────────────────────────────────────────── */

const netlify: CourseEnrichment = {
  chapters: [
    {
      duration: HOURS(1),
      lessons: [
        "Install Netlify CLI (`npm i -g netlify-cli`) and run `netlify init`",
        "Connect a GitHub repo — every push becomes a deploy",
        "Anatomy of `netlify.toml`: build cmd, publish dir, redirects",
        "Local dev with `netlify dev` (functions + redirects + env vars)",
        "Branch deploys & deploy previews per pull request",
      ],
      body: "Jamstack is just three letters that promise: pre-built static pages, dynamic features added via JavaScript and APIs, and a global CDN. Netlify pioneered the workflow. We start with the CLI, the config file, and the magic of deploy previews on every PR.",
      resourceUrl: "https://docs.netlify.com/cli/get-started/",
      resourceLabel: "Netlify CLI: Get Started",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Netlify Functions: serverless Node handlers in `netlify/functions/`",
        "Background functions for jobs > 10s",
        "Edge Functions running on Deno at the CDN edge",
        "Forms: hidden `data-netlify` attribute → built-in form backend",
        "Identity (auth) without writing a single line of backend code",
      ],
      body: "The dynamic half of Jamstack. You'll write your first serverless function, push slow work into a background function, deploy edge functions for sub-50ms global latency, and use Netlify's built-in form & identity products to skip building a backend at all.",
      resourceUrl: "https://docs.netlify.com/functions/overview/",
      resourceLabel: "Netlify Functions docs",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Build a real marketing site with Astro + Netlify",
        "Add a contact form that emails the owner via Functions",
        "On-demand builders: revalidate static pages from a webhook",
        "A/B testing with Edge Functions + cookie-based routing",
        "Image CDN: automatic resizing + WebP via `?nf_resize=`",
      ],
      body: "The hands-on chapter. We pick Astro (the perfect Jamstack frontend), build a real marketing site, wire up form submissions, and use Netlify's image CDN + on-demand builders to make the site fast AND fresh.",
      resourceUrl: "https://docs.astro.build/en/guides/integrations-guide/netlify/",
      resourceLabel: "Astro on Netlify",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Connect a custom domain + auto-provision Let's Encrypt TLS",
        "Plugin ecosystem: cache, lighthouse, sitemap, security headers",
        "Split-testing in production with Netlify Split Testing",
        "Cost watch: build minutes, bandwidth, function invocations",
        "Migration paths: when to outgrow Netlify and where to go next",
      ],
      body: "Operate the site like a pro. Custom domains, build plugins, A/B tests at the CDN, cost guardrails, and an honest discussion of when a project has grown beyond what Netlify is the best fit for.",
      resourceUrl: "https://docs.netlify.com/domains-https/custom-domains/",
      resourceLabel: "Netlify: Custom Domains",
    },
  ],
};

/* ──────────────────────────────────────────────────────────────────────── */
/*   COURSE: AI Infra — Self-hosted LLM + RAG                               */
/* ──────────────────────────────────────────────────────────────────────── */

const aiInfra: CourseEnrichment = {
  chapters: [
    {
      duration: HOURS(1),
      lessons: [
        "Pick an open-weights model: Llama 3, Mistral, Qwen 2",
        "Hardware reality check: VRAM math for 7B / 13B / 70B models",
        "Install Ollama in 60 seconds — the easiest local-LLM runner",
        "Pull and run your first model: `ollama run llama3:8b`",
        "Try llama.cpp for CPU-only / quantised inference",
      ],
      body: "Self-hosting an LLM in 2026 is finally a sane choice for a single developer. This chapter teaches you which model fits which GPU, the difference between full-precision and quantised weights, and gets you talking to a local model within 10 minutes.",
      resourceUrl: "https://github.com/ollama/ollama",
      resourceLabel: "Ollama (open-source LLM runner)",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Embeddings 101 — turn text into vectors with `nomic-embed-text`",
        "Vector databases: Qdrant vs pgvector vs Chroma",
        "Chunking strategies: fixed-size, semantic, structural",
        "Top-k retrieval + re-ranking with a cross-encoder",
        "Token budget math: context window vs retrieved chunks",
      ],
      body: "RAG (Retrieval-Augmented Generation) is how you make a small local model behave like a domain expert. You'll embed a corpus, store it in a vector DB, and retrieve the right chunks at query time so the LLM has the facts it needs.",
      resourceUrl: "https://qdrant.tech/documentation/quick-start/",
      resourceLabel: "Qdrant: Quick start",
    },
    {
      duration: HOURS(1),
      lessons: [
        "End-to-end: ingest your company docs into Qdrant",
        "Build a FastAPI `/ask` endpoint orchestrating retrieve → prompt → answer",
        "Streaming SSE responses to a React chat UI",
        "Source citations: surface exact chunks the model used",
        "Eval loop: golden Q/A pairs scored with `ragas`",
      ],
      body: "Build a production-grade internal Q&A bot for your own data. Real retrieval, real prompting, real streaming, real citations, and a real eval harness so you can prove the system actually got better when you change something.",
      resourceUrl: "https://docs.ragas.io/en/stable/",
      resourceLabel: "RAGAS: RAG evaluation",
    },
    {
      duration: HOURS(1),
      lessons: [
        "Containerise the whole stack with `docker compose`",
        "GPU passthrough on a single-server deploy (NVIDIA Container Toolkit)",
        "Front the API with Caddy for instant HTTPS",
        "Cost tracker: per-token + per-GPU-hour accounting",
        "Backup the vector DB + scheduled re-embedding for fresh data",
      ],
      body: "The deploy chapter for self-hosted AI. We package every service into one compose file, expose it safely via Caddy, account for the real cost of running a GPU 24/7, and put backups + re-embedding on a schedule.",
      resourceUrl: "https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html",
      resourceLabel: "NVIDIA Container Toolkit",
    },
  ],
};

/* ──────────────────────────────────────────────────────────────────────── */
/*   ENRICHMENT INDEX — keyed by course slug                                */
/* ──────────────────────────────────────────────────────────────────────── */

const COURSE_ENRICHMENT: Record<string, CourseEnrichment> = {
  // Sample/seed courses (ids 1012, 1013) — exact slugs from production
  'sample-python-fastapi-fundamentals': fastapi,
  'sample-wordpress-headless-with-react': headlessWp,
  // Production courses (ids 1613–1620) — exact slugs from production
  'python-fastapi-rest-api-from-scratch': fastapi,
  'java-spring-boot-microservices': springBoot,
  'wordpress-headless-with-react': headlessWp,
  'php-laravel-saas-starter': laravel,
  'nodejs-express-typescript-zero-to-prod': nodeExpress,
  'vercel-nextjs-edge-functions': nextJs,
  'netlify-jamstack-deploy-mastery': netlify,
  'ai-infra-llm-rag-stack': aiInfra,
};

/**
 * Look up enriched chapter content for a course slug. Returns null if the
 * slug isn't in our static map (the page will then render whatever the API
 * gave us, which is at minimum the chapter titles).
 */
export function getCourseEnrichment(slug: string | undefined): CourseEnrichment | null {
  if (!slug) return null;
  const direct = COURSE_ENRICHMENT[slug];
  if (direct) return direct;
  // Fallback: case-insensitive prefix match (cheap defence against slug drift)
  const key = Object.keys(COURSE_ENRICHMENT).find(
    (k) => slug.toLowerCase().startsWith(k.toLowerCase().slice(0, Math.min(20, k.length))),
  );
  return key ? COURSE_ENRICHMENT[key] : null;
}
