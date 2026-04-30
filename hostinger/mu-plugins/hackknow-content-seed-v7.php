<?php
/**
 * Plugin Name: HackKnow Content Seed v7 (8 sample courses, one per sub-cat)
 * Description: Seeds 8 sample hk_course posts (one per Python/Java/WordPress/PHP/
 *              Node.js/Vercel/Netlify/AI Infrastructure sub-cat) so the
 *              frontend has data. Idempotent via option `hk_seed_v7_done`.
 *              Re-run by admin via ?hk_reseed_v7=1.
 * Version:     7.0
 * Author:      HackKnow
 */
if (!defined('ABSPATH')) exit;

add_action('wp_loaded', 'hk_seed_v7_run', 50);
function hk_seed_v7_run() {
    $force = isset($_GET['hk_reseed_v7']) && current_user_can('manage_options');
    if (!$force && get_option('hk_seed_v7_done')) return;
    if (!post_type_exists('hk_course')) return;

    $courses = [
        [
            'slug' => 'python-fastapi-rest-api-from-scratch',
            'cat'  => 'python',
            'title' => 'Python FastAPI: REST API From Scratch',
            'excerpt' => 'Build production REST APIs with FastAPI, Pydantic, async SQLAlchemy and JWT auth. Hindi/Hinglish friendly walkthroughs.',
            'level' => 'beginner', 'weeks' => 5, 'hours' => 20, 'price' => 0,
            'video' => 'https://www.youtube.com/watch?v=tLKKmouUams',
            'chapters' => ["Setup + venv + first endpoint","Pydantic models + validation","Async SQLAlchemy + Postgres","JWT auth + middleware","Background tasks + Celery","Deploy to Render/Railway"],
            'outcomes' => ["Build any REST API confidently","Auth flows production-ready","Deploy live in 30 minutes"],
            'reqs' => ["Basic Python","Terminal comfort"],
            'tools' => 'Python 3.12, FastAPI, SQLAlchemy, Pydantic, Postgres, VS Code',
        ],
        [
            'slug' => 'java-spring-boot-microservices',
            'cat'  => 'java',
            'title' => 'Java Spring Boot: Microservices Mastery',
            'excerpt' => 'Spring Boot 3, REST + GraphQL, Kafka, Docker, Kubernetes. Real microservice architecture with circuit breakers.',
            'level' => 'intermediate', 'weeks' => 8, 'hours' => 36, 'price' => 1499,
            'video' => '',
            'chapters' => ["Spring Boot basics + REST","JPA + Hibernate + flyway","Kafka events","Resilience4j + circuit breakers","Dockerize + K8s deploy","Observability: Prom + Grafana"],
            'outcomes' => ["Design microservice systems","Handle distributed failures","Production deploy"],
            'reqs' => ["Java 17 basics","SQL basics"],
            'tools' => 'Java 17, Spring Boot 3, Maven, Docker, Kubernetes, Kafka',
        ],
        [
            'slug' => 'wordpress-headless-with-react',
            'cat'  => 'wordpress',
            'title' => 'WordPress Headless: WP REST + React',
            'excerpt' => 'Use WordPress as headless CMS, render with React + Vite. Auth, cache, ISR-style rebuilds. Yoast SEO preserved.',
            'level' => 'intermediate', 'weeks' => 4, 'hours' => 16, 'price' => 0,
            'video' => '',
            'chapters' => ["WP REST API tour","React + Vite frontend","Auth via JWT","Yoast SEO from REST","Build + deploy to Vercel"],
            'outcomes' => ["Ship blazing-fast headless WP","SEO-friendly SPA","Editor-friendly back-end"],
            'reqs' => ["Basic WordPress","Basic React"],
            'tools' => 'WordPress, React, Vite, Vercel, Yoast SEO',
        ],
        [
            'slug' => 'php-laravel-saas-starter',
            'cat'  => 'php',
            'title' => 'PHP Laravel: SaaS Starter (Auth, Billing, Tenants)',
            'excerpt' => 'Laravel 11 SaaS template — multi-tenant, Cashier billing, Inertia + Vue, queues, mail. Production-ready scaffold.',
            'level' => 'intermediate', 'weeks' => 6, 'hours' => 24, 'price' => 1499,
            'video' => '',
            'chapters' => ["Laravel install + auth","Multi-tenancy strategies","Cashier + Stripe billing","Inertia + Vue UI","Queues + Horizon","Deploy with Forge"],
            'outcomes' => ["Ship a SaaS in 2 weeks","Billing + tenant isolation done","Scale-ready architecture"],
            'reqs' => ["PHP 8.2","Composer comfort"],
            'tools' => 'Laravel 11, Inertia, Vue 3, Stripe, Forge, Redis',
        ],
        [
            'slug' => 'nodejs-express-typescript-zero-to-prod',
            'cat'  => 'nodejs',
            'title' => 'Node.js + Express + TypeScript: Zero to Prod',
            'excerpt' => 'Type-safe Express APIs with Zod, Prisma, JWT, Pino logging. Test with Vitest. Docker + GH Actions CI/CD.',
            'level' => 'beginner', 'weeks' => 5, 'hours' => 22, 'price' => 0,
            'video' => '',
            'chapters' => ["TypeScript + Express setup","Zod request validation","Prisma + Postgres","Auth + Pino logging","Vitest + Supertest","Docker + GH Actions"],
            'outcomes' => ["Type-safe Node APIs","Solid CI/CD pipeline","Production logging"],
            'reqs' => ["Basic JS","npm comfort"],
            'tools' => 'Node 20, TypeScript, Express, Prisma, Zod, Vitest',
        ],
        [
            'slug' => 'vercel-nextjs-edge-functions',
            'cat'  => 'vercel',
            'title' => 'Vercel + Next.js 15: Edge Functions, ISR, Streaming',
            'excerpt' => 'Master Vercel — App Router, Server Components, Edge Functions, ISR, streaming SSR. Deploy a global app.',
            'level' => 'intermediate', 'weeks' => 4, 'hours' => 16, 'price' => 999,
            'video' => '',
            'chapters' => ["App Router fundamentals","Server vs Client Components","Edge Functions deep dive","ISR + on-demand revalidate","Streaming + Suspense","Vercel deploy + analytics"],
            'outcomes' => ["Ship global edge apps","Lightning-fast LCP","Master Vercel platform"],
            'reqs' => ["React basics","JS proficiency"],
            'tools' => 'Next.js 15, Vercel, React 19, TypeScript',
        ],
        [
            'slug' => 'netlify-jamstack-deploy-mastery',
            'cat'  => 'netlify',
            'title' => 'Netlify Jamstack: Deploy + Functions + Forms',
            'excerpt' => 'Astro + Netlify Functions + Forms + Identity. Build a complete Jamstack site with serverless backend.',
            'level' => 'beginner', 'weeks' => 3, 'hours' => 12, 'price' => 0,
            'video' => '',
            'chapters' => ["Astro setup","Netlify Functions","Netlify Forms","Identity + Auth","Edge handlers","Production deploy"],
            'outcomes' => ["Ship Jamstack sites fast","Serverless backend","Free-tier mastery"],
            'reqs' => ["HTML/CSS","Basic JS"],
            'tools' => 'Astro, Netlify, Tailwind, Netlify CLI',
        ],
        [
            'slug' => 'ai-infra-llm-rag-stack',
            'cat'  => 'ai-infrastructure',
            'title' => 'AI Infra: Self-Hosted LLM + RAG Stack',
            'excerpt' => 'Deploy your own LLM with vLLM, build RAG pipelines with Qdrant + LangChain. Production AI infra without OpenAI bills.',
            'level' => 'advanced', 'weeks' => 7, 'hours' => 30, 'price' => 1999,
            'video' => '',
            'chapters' => ["GPU infra + vLLM","Llama-3 + Mistral hosting","Qdrant vector DB","LangChain RAG pipelines","Eval + RAGAS","Cost + scaling"],
            'outcomes' => ["Self-host any LLM","Build production RAG","10x cheaper than OpenAI"],
            'reqs' => ["Python intermediate","Linux comfort","GPU access"],
            'tools' => 'vLLM, Llama-3, Qdrant, LangChain, RAGAS, Docker',
        ],
    ];

    $created = 0; $updated = 0;
    foreach ($courses as $c) {
        $existing = get_page_by_path($c['slug'], OBJECT, 'hk_course');
        $post_data = [
            'post_type'    => 'hk_course',
            'post_status'  => 'publish',
            'post_title'   => $c['title'],
            'post_name'    => $c['slug'],
            'post_excerpt' => $c['excerpt'],
            'post_content' => '<p>' . esc_html($c['excerpt']) . '</p><p>This is a sample course generated by HackKnow Content Seed v7. Replace from wp-admin → Courses.</p>',
        ];
        if ($existing) {
            $post_data['ID'] = $existing->ID;
            wp_update_post($post_data);
            $post_id = $existing->ID; $updated++;
        } else {
            $post_id = wp_insert_post($post_data);
            $created++;
        }
        if (!$post_id || is_wp_error($post_id)) continue;

        update_post_meta($post_id, '_hk_course_level',          $c['level']);
        update_post_meta($post_id, '_hk_course_duration_weeks', (int) $c['weeks']);
        update_post_meta($post_id, '_hk_course_hours_total',    (int) $c['hours']);
        update_post_meta($post_id, '_hk_course_price_inr',      (int) $c['price']);
        update_post_meta($post_id, '_hk_course_video_intro',    $c['video']);
        update_post_meta($post_id, '_hk_course_chapters',       implode("\n", $c['chapters']));
        update_post_meta($post_id, '_hk_course_outcomes',       implode("\n", $c['outcomes']));
        update_post_meta($post_id, '_hk_course_requirements',   implode("\n", $c['reqs']));
        update_post_meta($post_id, '_hk_course_tools',          $c['tools']);

        $term = get_term_by('slug', $c['cat'], 'hk_course_cat');
        if ($term && !is_wp_error($term)) {
            wp_set_object_terms($post_id, [(int) $term->term_id], 'hk_course_cat', false);
        }
    }

    update_option('hk_seed_v7_done', time());
    update_option('hk_seed_v7_summary', ['created' => $created, 'updated' => $updated, 'total' => count($courses)]);
}
