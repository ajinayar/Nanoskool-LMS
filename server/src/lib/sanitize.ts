import sanitizeHtml from 'sanitize-html';

// Rich text from editors is sanitised on the server before it is stored,
// so the web and mobile clients can render it safely.
export function cleanHtml(html: string | undefined | null): string {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'h4', 'iframe', 'figure', 'figcaption', 'span', 'u', 's', 'mark', 'sub', 'sup', 'hr', 'colgroup', 'col', 'label', 'input']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'width', 'height'],
      iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder'],
      td: ['colspan', 'rowspan', 'colwidth'],
      th: ['colspan', 'rowspan', 'colwidth'],
      col: ['span'],
      a: ['href', 'name', 'target', 'rel'],
      mark: ['data-color'],
      input: ['type', 'checked', 'disabled'],
      '*': ['class', 'style', 'data-type', 'data-checked', 'data-youtube-video'],
    },
    allowedStyles: {
      '*': {
        'text-align': [/^(left|right|center|justify)$/],
        color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/],
        'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/],
        'font-size': [/^\d{1,2}(\.\d+)?(px|em|rem)$/],
        'min-width': [/^\d{1,4}px$/],
        width: [/^\d{1,4}(px|%)$/],
      },
    },
    allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'player.vimeo.com', 'www.youtube-nocookie.com'],
    allowedSchemes: ['http', 'https', 'mailto'],
    // Only checkboxes survive (checklists), and they are always read-only
    exclusiveFilter: (frame) => frame.tag === 'input' && frame.attribs.type !== 'checkbox',
    transformTags: { input: (tagName, attribs) => ({ tagName, attribs: { ...attribs, disabled: 'disabled' } }) },
  });
}
