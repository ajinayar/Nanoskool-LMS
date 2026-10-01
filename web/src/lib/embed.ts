/** Turns a YouTube or Vimeo page link into its embeddable player link; other links are returned unchanged. */
export const toEmbed = (url?: string) => {
  if (!url) return '';
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm && !url.includes('player.vimeo.com')) return `https://player.vimeo.com/video/${vm[1]}`;
  return url;
};
