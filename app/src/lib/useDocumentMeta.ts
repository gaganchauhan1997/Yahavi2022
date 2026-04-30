import { useEffect } from 'react';

interface DocMeta {
  title?: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

const SITE = 'https://www.hackknow.com';

function setMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (!el) {
    if (selector.startsWith('link')) el = document.createElement('link');
    else el = document.createElement('meta');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
}

export function useDocumentMeta(meta: DocMeta) {
  useEffect(() => {
    if (meta.title) document.title = meta.title;
    if (meta.description) {
      setMeta('meta[name="description"]', { name: 'description', content: meta.description });
    }
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    const canon = meta.canonical || `${SITE}${path}`;
    setMeta('link[rel="canonical"]', { rel: 'canonical', href: canon });
    setMeta('meta[property="og:url"]', { property: 'og:url', content: canon });
    if (meta.ogTitle || meta.title) {
      setMeta('meta[property="og:title"]', { property: 'og:title', content: meta.ogTitle || meta.title! });
      setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: meta.ogTitle || meta.title! });
    }
    if (meta.ogDescription || meta.description) {
      setMeta('meta[property="og:description"]', { property: 'og:description', content: meta.ogDescription || meta.description! });
      setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: meta.ogDescription || meta.description! });
    }
    if (meta.ogImage) {
      setMeta('meta[property="og:image"]', { property: 'og:image', content: meta.ogImage });
      setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: meta.ogImage });
    }
  }, [meta.title, meta.description, meta.canonical, meta.ogTitle, meta.ogDescription, meta.ogImage]);
}
