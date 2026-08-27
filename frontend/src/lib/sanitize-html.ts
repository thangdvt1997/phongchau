import sanitizeHtml from 'sanitize-html';

// Blog content is authored by MARKETING_SEO-role staff (a lower-trust, content-focused
// role) and stored/served verbatim by the backend with no HTML sanitization of its own —
// rendering it via dangerouslySetInnerHTML without sanitizing first is a stored-XSS
// vector against every anonymous visitor of a blog post. `sanitize-html` runs in pure JS
// (no DOM dependency), so it works inside a Next.js server component.
export function sanitizeBlogContent(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 's', 'blockquote', 'ul', 'ol', 'li',
      'h2', 'h3', 'h4', 'a', 'img', 'figure', 'figcaption', 'table', 'thead',
      'tbody', 'tr', 'th', 'td', 'code', 'pre',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      // Any author-supplied target="_blank" gets a safe rel added alongside it.
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
    },
  });
}
