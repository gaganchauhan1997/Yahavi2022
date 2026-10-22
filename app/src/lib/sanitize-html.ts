import DOMPurify from 'dompurify';

/** CMS/AI markup is content, never executable application code. */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['form', 'input', 'button', 'iframe', 'object', 'embed', 'style'],
    FORBID_ATTR: ['style', 'srcdoc'],
  });
}
