import sanitizeHtml from 'sanitize-html';

// Rich text from editors is sanitised on the server before it is stored,
// so the web and mobile clients can render it safely.
export function cleanHtml(html: string | undefined | null): string {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'iframe', 'figure', 'figcaption', 'span', 'u', 's']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'width', 'height'],
      iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder'],
      '*': ['class', 'style'],
    },
    allowedStyles: {
      '*': { 'text-align': [/^(left|right|center|justify)$/], color: [/^#[0-9a-f]{3,6}$/i, /^rgb\(/] },
    },
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'player.vimeo.com', 'www.youtube-nocookie.com'],
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}
