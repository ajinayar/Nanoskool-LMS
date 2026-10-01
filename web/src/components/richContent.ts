/** Styles and helpers for rich content, shared by the editor and every page that shows saved content. */

/** Shared styles for rich content: used inside the editor and when showing saved content. */
export const richContentSx = {
  lineHeight: 1.7,
  '& h1': { fontSize: '1.9em', fontWeight: 750, lineHeight: 1.2, m: '0.8em 0 0.4em' },
  '& h2': { fontSize: '1.5em', fontWeight: 700, lineHeight: 1.25, m: '0.8em 0 0.4em' },
  '& h3': { fontSize: '1.25em', fontWeight: 700, m: '0.8em 0 0.3em' },
  '& h4': { fontSize: '1.08em', fontWeight: 700, m: '0.8em 0 0.3em' },
  '& p': { m: '0.5em 0' },
  '& img': { maxWidth: '100%', height: 'auto', borderRadius: '8px' },
  '& blockquote': { m: '1em 0', p: '0.6em 1em', borderLeft: '4px solid #C9B8F4', bgcolor: '#F7F4FF', borderRadius: '0 8px 8px 0', color: '#3D3A4B' },
  '& pre': { bgcolor: '#17171C', color: '#F1F1F4', p: '12px 14px', borderRadius: '8px', overflowX: 'auto', fontSize: 13.5 },
  '& code': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.9em' },
  '& :not(pre) > code': { bgcolor: 'rgba(0,0,0,0.06)', px: 0.5, borderRadius: '4px' },
  '& hr': { border: 'none', borderTop: '2px solid #E6E8F0', my: 2.5 },
  '& mark': { borderRadius: '3px', px: '2px' },
  '& a': { color: '#1C7ED6', textDecoration: 'underline' },
  '& table': { borderCollapse: 'collapse', width: '100%', my: 1.5, tableLayout: 'fixed', overflow: 'hidden' },
  '& th, & td': { border: '1px solid #D9DCE6', p: '8px 10px', verticalAlign: 'top', minWidth: 60, position: 'relative', '& p': { m: 0 } },
  '& th': { bgcolor: '#F4F2FB', fontWeight: 700, textAlign: 'left' },
  '& ul[data-type="taskList"]': { listStyle: 'none', pl: 0.5, '& li': { display: 'flex', gap: 1, alignItems: 'flex-start', '& > label': { mt: '0.25em' }, '& > div': { flex: 1 } } },
  '& div[data-youtube-video]': { my: 1.5 },
  '& div[data-youtube-video] iframe, & iframe': { width: '100%', maxWidth: '100%', aspectRatio: '16 / 9', height: 'auto', border: 0, borderRadius: '10px' },
} as const;


export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  return m ? m[1] : null;
}


export function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/i);
  return m ? m[1] : null;
}
