import { Box, Divider, IconButton, Paper, Stack, Tooltip } from '@mui/material';
import FormatBold from '@mui/icons-material/FormatBold';
import FormatItalic from '@mui/icons-material/FormatItalic';
import FormatListBulleted from '@mui/icons-material/FormatListBulleted';
import FormatListNumbered from '@mui/icons-material/FormatListNumbered';
import FormatQuote from '@mui/icons-material/FormatQuote';
import LinkIcon from '@mui/icons-material/Link';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import Code from '@mui/icons-material/Code';
import Title from '@mui/icons-material/Title';
import Undo from '@mui/icons-material/Undo';
import Redo from '@mui/icons-material/Redo';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef } from 'react';
import { uploadFile, errorMessage } from '@/api/client';
import { useToast } from './Toast';

/** Rich text editor that outputs HTML (sanitised again by the API). */
export function RichEditor({ value, onChange, placeholder, minHeight = 180, uploadFolder = 'content' }: { value: string; onChange: (html: string) => void; placeholder?: string; minHeight?: number; uploadFolder?: string }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: false }), Link.configure({ openOnClick: false }), Image],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { 'aria-label': placeholder ?? 'Rich text editor' } },
  });

  // Keep in sync when the parent loads a different record
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value || '', { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;
  const btn = (title: string, icon: React.ReactNode, action: () => void, active = false) => (
    <Tooltip title={title} key={title}>
      <IconButton size="small" onClick={action} color={active ? 'primary' : 'default'}>
        {icon}
      </IconButton>
    </Tooltip>
  );
  return (
    <Paper variant="outlined">
      <Stack direction="row" sx={{ p: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
        {btn('Heading', <Title fontSize="small" />, () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }))}
        {btn('Bold', <FormatBold fontSize="small" />, () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
        {btn('Italic', <FormatItalic fontSize="small" />, () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
        {btn('Bullet list', <FormatListBulleted fontSize="small" />, () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'))}
        {btn('Numbered list', <FormatListNumbered fontSize="small" />, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'))}
        {btn('Quote', <FormatQuote fontSize="small" />, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'))}
        {btn('Code block', <Code fontSize="small" />, () => editor.chain().focus().toggleCodeBlock().run(), editor.isActive('codeBlock'))}
        {btn('Link', <LinkIcon fontSize="small" />, () => {
          const url = window.prompt('Link URL');
          if (url) editor.chain().focus().setLink({ href: url }).run();
          else editor.chain().focus().unsetLink().run();
        }, editor.isActive('link'))}
        {btn('Image', <ImageOutlined fontSize="small" />, () => fileRef.current?.click())}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        {btn('Undo', <Undo fontSize="small" />, () => editor.chain().focus().undo().run())}
        {btn('Redo', <Redo fontSize="small" />, () => editor.chain().focus().redo().run())}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const r = await uploadFile(f, uploadFolder);
              editor.chain().focus().setImage({ src: r.url, alt: f.name }).run();
            } catch (err) {
              toast.error(errorMessage(err, 'Image upload failed'));
            } finally {
              e.target.value = '';
            }
          }}
        />
      </Stack>
      <Divider />
      <Box sx={{ px: 2, py: 1, '& .ProseMirror': { minHeight, outline: 'none', lineHeight: 1.7 }, '& .ProseMirror img': { maxWidth: '100%' }, '& .ProseMirror p.is-editor-empty:first-of-type::before': { content: 'attr(data-placeholder)', color: 'text.disabled', float: 'left', height: 0, pointerEvents: 'none' } }}>
        <EditorContent editor={editor} />
      </Box>
    </Paper>
  );
}
