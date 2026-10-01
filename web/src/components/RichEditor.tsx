/**
 * Full-featured rich text editor (TipTap). Outputs HTML, which the API sanitises again.
 *
 * Toolbar groups: undo/redo · text style · font size (A−/A+) · bold/italic/underline/strike/sub/sup/code ·
 * colour and highlight · alignment · lists, checklists and indent · quote, code block, divider ·
 * link, image, YouTube, table · clear formatting · full screen.
 * Inside a table a second toolbar appears: insert/delete rows and columns, header row, merge/split, delete table.
 */
import { Box, Button, ButtonBase, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, MenuItem, Paper, Popover, Select, Stack, TextField, Tooltip, Typography } from '@mui/material';
import FormatBold from '@mui/icons-material/FormatBold';
import FormatItalic from '@mui/icons-material/FormatItalic';
import FormatUnderlined from '@mui/icons-material/FormatUnderlined';
import StrikethroughS from '@mui/icons-material/StrikethroughS';
import Subscript from '@mui/icons-material/Subscript';
import Superscript from '@mui/icons-material/Superscript';
import DataObject from '@mui/icons-material/DataObject';
import FormatColorText from '@mui/icons-material/FormatColorText';
import BorderColor from '@mui/icons-material/BorderColor';
import FormatAlignLeft from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenter from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRight from '@mui/icons-material/FormatAlignRight';
import FormatAlignJustify from '@mui/icons-material/FormatAlignJustify';
import FormatListBulleted from '@mui/icons-material/FormatListBulleted';
import FormatListNumbered from '@mui/icons-material/FormatListNumbered';
import Checklist from '@mui/icons-material/Checklist';
import FormatIndentIncrease from '@mui/icons-material/FormatIndentIncrease';
import FormatIndentDecrease from '@mui/icons-material/FormatIndentDecrease';
import FormatQuote from '@mui/icons-material/FormatQuote';
import Code from '@mui/icons-material/Code';
import HorizontalRule from '@mui/icons-material/HorizontalRule';
import LinkIcon from '@mui/icons-material/Link';
import LinkOff from '@mui/icons-material/LinkOff';
import ImageOutlined from '@mui/icons-material/ImageOutlined';
import YouTube from '@mui/icons-material/YouTube';
import TableChartOutlined from '@mui/icons-material/TableChartOutlined';
import FormatClear from '@mui/icons-material/FormatClear';
import Fullscreen from '@mui/icons-material/Fullscreen';
import FullscreenExit from '@mui/icons-material/FullscreenExit';
import Undo from '@mui/icons-material/Undo';
import Redo from '@mui/icons-material/Redo';
import TextDecrease from '@mui/icons-material/TextDecrease';
import TextIncrease from '@mui/icons-material/TextIncrease';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { TableKit } from '@tiptap/extension-table';
import { TextStyleKit } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import SubscriptExt from '@tiptap/extension-subscript';
import SuperscriptExt from '@tiptap/extension-superscript';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import Youtube from '@tiptap/extension-youtube';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { uploadFile, errorMessage } from '@/api/client';
import { useToast } from './Toast';
import { richContentSx, youtubeId } from './richContent';

export { richContentSx };

const SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48];
const BASE_SIZE = 16;
const TEXT_COLORS = ['#17171C', '#5D6275', '#D92D20', '#E8590C', '#B7791F', '#2F9E44', '#0C8599', '#1C7ED6', '#5F3DC4', '#C2255C'];
const HIGHLIGHTS = ['#FFF3BF', '#FFE3E3', '#FFE8CC', '#D3F9D8', '#C5F6FA', '#D0EBFF', '#E5DBFF', '#FCC2D7'];
const BLOCKS = [
  { value: 'p', label: 'Normal text' },
  { value: 'h1', label: 'Title' },
  { value: 'h2', label: 'Heading' },
  { value: 'h3', label: 'Subheading' },
  { value: 'h4', label: 'Small heading' },
];

/** Rich text editor that outputs HTML (sanitised again by the API). */
export function RichEditor({ value, onChange, placeholder, minHeight = 180, uploadFolder = 'content', onEditor }: { value: string; onChange: (html: string) => void; placeholder?: string; minHeight?: number; uploadFolder?: string; onEditor?: (e: Editor | null) => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [full, setFull] = useState(false);
  const [dialog, setDialog] = useState<null | 'link' | 'youtube' | 'table'>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, heading: { levels: [1, 2, 3, 4] } }),
      Link.configure({ openOnClick: false, autolink: true, defaultProtocol: 'https' }),
      Image,
      TableKit.configure({ table: { resizable: true } }),
      TextStyleKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      SubscriptExt,
      SuperscriptExt,
      TaskList,
      TaskItem.configure({ nested: true }),
      Youtube.configure({ nocookie: true, width: 640, height: 360 }),
      CharacterCount,
      Placeholder.configure({ placeholder: placeholder ?? 'Start writing…' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { 'aria-label': placeholder ?? 'Rich text editor' } },
  });

  // Keep in sync when the parent loads a different record
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value || '', { emitUpdate: false });
  }, [value, editor]);

  // Let a parent insert content (e.g. ready-made lesson blocks)
  useEffect(() => {
    onEditor?.(editor ?? null);
    return () => onEditor?.(null);
  }, [editor, onEditor]);

  // Esc leaves full screen
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full]);

  if (!editor) return null;

  return (
    <Paper
      variant="outlined"
      sx={full ? { position: 'fixed', inset: 0, zIndex: 1400, borderRadius: 0, display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' } : { overflow: 'hidden' }}
    >
      <Toolbar editor={editor} full={full} setFull={setFull} onImage={() => fileRef.current?.click()} onDialog={setDialog} />
      <TableBar editor={editor} />
      <Divider />
      <Box
        onClick={() => !editor.isFocused && editor.commands.focus()}
        sx={{ px: { xs: 2, md: full ? 6 : 2.5 }, py: 1.5, flex: full ? 1 : undefined, overflow: full ? 'auto' : undefined, cursor: 'text', bgcolor: '#fff', ...editorContentSx(full ? 'calc(100vh - 160px)' : minHeight) }}
      >
        <Box sx={{ maxWidth: full ? 860 : 'none', mx: 'auto' }}>
          <EditorContent editor={editor} />
        </Box>
      </Box>
      <Footer editor={editor} />
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
      <LinkDialog open={dialog === 'link'} editor={editor} onClose={() => setDialog(null)} />
      <YoutubeDialog open={dialog === 'youtube'} editor={editor} onClose={() => setDialog(null)} />
      <TableDialog open={dialog === 'table'} editor={editor} onClose={() => setDialog(null)} />
    </Paper>
  );
}

/* ------------------------------------------------------------------ toolbar */

function Btn({ title, icon, onClick, active, disabled }: { title: string; icon: ReactNode; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return (
    <Tooltip title={title}>
      <span>
        <IconButton
          size="small"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
          disabled={disabled}
          aria-label={title}
          aria-pressed={active}
          sx={{ borderRadius: '8px', width: 32, height: 32, color: active ? 'primary.main' : 'text.secondary', bgcolor: active ? 'action.selected' : 'transparent', '& svg': { fontSize: 19 } }}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );
}

const Sep = () => <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 0.75 }} />;

function currentSize(editor: Editor): number {
  const s = editor.getAttributes('textStyle').fontSize as string | undefined;
  const n = s ? parseInt(s, 10) : NaN;
  return Number.isFinite(n) ? n : BASE_SIZE;
}

function Toolbar({ editor, full, setFull, onImage, onDialog }: { editor: Editor; full: boolean; setFull: (v: boolean) => void; onImage: () => void; onDialog: (d: 'link' | 'youtube' | 'table') => void }) {
  // Re-render the toolbar when the selection or marks change
  const st = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: e.isActive('heading', { level: 1 }) ? 'h1' : e.isActive('heading', { level: 2 }) ? 'h2' : e.isActive('heading', { level: 3 }) ? 'h3' : e.isActive('heading', { level: 4 }) ? 'h4' : 'p',
      size: currentSize(e),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      sub: e.isActive('subscript'),
      sup: e.isActive('superscript'),
      code: e.isActive('code'),
      color: (e.getAttributes('textStyle').color as string | undefined) ?? null,
      highlight: (e.getAttributes('highlight').color as string | undefined) ?? null,
      align: (['center', 'right', 'justify'] as const).find((a) => e.isActive({ textAlign: a })) ?? 'left',
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      task: e.isActive('taskList'),
      inList: e.isActive('listItem') || e.isActive('taskItem'),
      quote: e.isActive('blockquote'),
      codeBlock: e.isActive('codeBlock'),
      link: e.isActive('link'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  const setBlock = (v: string) => (v === 'p' ? c().setParagraph().run() : c().setHeading({ level: Number(v[1]) as 1 | 2 | 3 | 4 }).run());
  const step = (dir: 1 | -1) => {
    const cur = st.size;
    const next = dir > 0 ? (SIZES.find((s) => s > cur) ?? SIZES[SIZES.length - 1]) : ([...SIZES].reverse().find((s) => s < cur) ?? SIZES[0]);
    if (next === BASE_SIZE) c().unsetFontSize().run();
    else c().setFontSize(`${next}px`).run();
  };
  const listItem = st.task ? 'taskItem' : 'listItem';

  return (
    <Stack direction="row" sx={{ p: 0.5, flexWrap: 'wrap', alignItems: 'center', rowGap: 0.25, bgcolor: 'rgba(0,0,0,0.015)' }}>
      <Btn title="Undo (Ctrl+Z)" icon={<Undo />} onClick={() => c().undo().run()} disabled={!st.canUndo} />
      <Btn title="Redo (Ctrl+Shift+Z)" icon={<Redo />} onClick={() => c().redo().run()} disabled={!st.canRedo} />
      <Sep />
      <Select
        size="small"
        value={st.block}
        onChange={(e) => setBlock(e.target.value)}
        aria-label="Text style"
        sx={{ height: 32, minWidth: 140, fontSize: 14, borderRadius: '8px', '& fieldset': { border: 'none' }, bgcolor: 'rgba(0,0,0,0.04)' }}
        MenuProps={{ disablePortal: false, sx: { zIndex: 1500 } }}
      >
        {BLOCKS.map((b) => (
          <MenuItem key={b.value} value={b.value} sx={{ fontSize: b.value === 'h1' ? 22 : b.value === 'h2' ? 19 : b.value === 'h3' ? 17 : 15, fontWeight: b.value === 'p' ? 400 : 700 }}>
            {b.label}
          </MenuItem>
        ))}
      </Select>
      <Sep />
      <Btn title="Smaller text" icon={<TextDecrease />} onClick={() => step(-1)} disabled={st.size <= SIZES[0]} />
      <Select
        size="small"
        value={SIZES.includes(st.size) ? st.size : BASE_SIZE}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (n === BASE_SIZE) c().unsetFontSize().run();
          else c().setFontSize(`${n}px`).run();
        }}
        aria-label="Font size"
        sx={{ height: 32, width: 72, fontSize: 14, borderRadius: '8px', '& fieldset': { border: 'none' }, bgcolor: 'rgba(0,0,0,0.04)' }}
        MenuProps={{ sx: { zIndex: 1500 } }}
      >
        {SIZES.map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </Select>
      <Btn title="Bigger text" icon={<TextIncrease />} onClick={() => step(1)} disabled={st.size >= SIZES[SIZES.length - 1]} />
      <Sep />
      <Btn title="Bold (Ctrl+B)" icon={<FormatBold />} onClick={() => c().toggleBold().run()} active={st.bold} />
      <Btn title="Italic (Ctrl+I)" icon={<FormatItalic />} onClick={() => c().toggleItalic().run()} active={st.italic} />
      <Btn title="Underline (Ctrl+U)" icon={<FormatUnderlined />} onClick={() => c().toggleUnderline().run()} active={st.underline} />
      <Btn title="Strikethrough" icon={<StrikethroughS />} onClick={() => c().toggleStrike().run()} active={st.strike} />
      <Btn title="Subscript (H₂O)" icon={<Subscript />} onClick={() => c().toggleSubscript().run()} active={st.sub} />
      <Btn title="Superscript (x²)" icon={<Superscript />} onClick={() => c().toggleSuperscript().run()} active={st.sup} />
      <Btn title="Inline code" icon={<DataObject />} onClick={() => c().toggleCode().run()} active={st.code} />
      <Sep />
      <Swatches title="Text colour" icon={<FormatColorText />} current={st.color} colors={TEXT_COLORS} onPick={(col) => (col ? c().setColor(col).run() : c().unsetColor().run())} />
      <Swatches title="Highlight" icon={<BorderColor />} current={st.highlight} colors={HIGHLIGHTS} onPick={(col) => (col ? c().setHighlight({ color: col }).run() : c().unsetHighlight().run())} />
      <Sep />
      <Btn title="Align left" icon={<FormatAlignLeft />} onClick={() => c().setTextAlign('left').run()} active={st.align === 'left'} />
      <Btn title="Align centre" icon={<FormatAlignCenter />} onClick={() => c().setTextAlign('center').run()} active={st.align === 'center'} />
      <Btn title="Align right" icon={<FormatAlignRight />} onClick={() => c().setTextAlign('right').run()} active={st.align === 'right'} />
      <Btn title="Justify" icon={<FormatAlignJustify />} onClick={() => c().setTextAlign('justify').run()} active={st.align === 'justify'} />
      <Sep />
      <Btn title="Bullet list" icon={<FormatListBulleted />} onClick={() => c().toggleBulletList().run()} active={st.bullet} />
      <Btn title="Numbered list" icon={<FormatListNumbered />} onClick={() => c().toggleOrderedList().run()} active={st.ordered} />
      <Btn title="Checklist" icon={<Checklist />} onClick={() => c().toggleTaskList().run()} active={st.task} />
      <Btn title="Indent (Tab)" icon={<FormatIndentIncrease />} onClick={() => c().sinkListItem(listItem).run()} disabled={!st.inList} />
      <Btn title="Outdent (Shift+Tab)" icon={<FormatIndentDecrease />} onClick={() => c().liftListItem(listItem).run()} disabled={!st.inList} />
      <Sep />
      <Btn title="Block quote" icon={<FormatQuote />} onClick={() => c().toggleBlockquote().run()} active={st.quote} />
      <Btn title="Code block" icon={<Code />} onClick={() => c().toggleCodeBlock().run()} active={st.codeBlock} />
      <Btn title="Divider line" icon={<HorizontalRule />} onClick={() => c().setHorizontalRule().run()} />
      <Sep />
      <Btn title={st.link ? 'Edit link' : 'Insert link (Ctrl+K)'} icon={<LinkIcon />} onClick={() => onDialog('link')} active={st.link} />
      {st.link && <Btn title="Remove link" icon={<LinkOff />} onClick={() => c().extendMarkRange('link').unsetLink().run()} />}
      <Btn title="Insert image" icon={<ImageOutlined />} onClick={onImage} />
      <Btn title="Embed YouTube video" icon={<YouTube />} onClick={() => onDialog('youtube')} />
      <Btn title="Insert table" icon={<TableChartOutlined />} onClick={() => onDialog('table')} />
      <Sep />
      <Btn title="Clear formatting" icon={<FormatClear />} onClick={() => c().unsetAllMarks().clearNodes().run()} />
      <Box sx={{ flex: 1 }} />
      <Btn title={full ? 'Exit full screen (Esc)' : 'Full screen'} icon={full ? <FullscreenExit /> : <Fullscreen />} onClick={() => setFull(!full)} />
    </Stack>
  );
}

function Swatches({ title, icon, current, colors, onPick }: { title: string; icon: ReactNode; current: string | null; colors: string[]; onPick: (c: string | null) => void }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Tooltip title={title}>
        <IconButton size="small" aria-label={title} onMouseDown={(e) => e.preventDefault()} onClick={(e) => setAnchor(e.currentTarget)} sx={{ borderRadius: '8px', width: 32, height: 32, color: 'text.secondary', flexDirection: 'column', gap: '1px', '& svg': { fontSize: 17 } }}>
          {icon}
          <Box sx={{ width: 16, height: 3, borderRadius: 1, bgcolor: current ?? 'transparent', border: current ? 'none' : '1px solid #ccc' }} />
        </IconButton>
      </Tooltip>
      <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} sx={{ zIndex: 1500 }} disableRestoreFocus>
        <Box sx={{ p: 1.25, width: 204 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.75 }}>
            {colors.map((col) => (
              <ButtonBase
                key={col}
                aria-label={col}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(col);
                  setAnchor(null);
                }}
                sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: col, outline: current === col ? '2px solid #17171C' : '1px solid rgba(0,0,0,0.1)', outlineOffset: current === col ? 2 : 0 }}
              />
            ))}
          </Box>
          <Button
            size="small"
            fullWidth
            sx={{ mt: 1 }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onPick(null);
              setAnchor(null);
            }}
          >
            No colour
          </Button>
        </Box>
      </Popover>
    </>
  );
}

/** Appears while the cursor is inside a table. */
function TableBar({ editor }: { editor: Editor }) {
  const st = useEditorState({ editor, selector: ({ editor: e }) => ({ inTable: e.isActive('table'), canMerge: e.can().mergeCells(), canSplit: e.can().splitCell() }) });
  if (!st.inTable) return null;
  const c = () => editor.chain().focus();
  const b = (label: string, fn: () => void, opts: { danger?: boolean; disabled?: boolean } = {}) => (
    <Button key={label} size="small" onMouseDown={(e) => e.preventDefault()} onClick={fn} disabled={opts.disabled} color={opts.danger ? 'error' : 'inherit'} sx={{ minWidth: 0, px: 1.1, py: 0.25, fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap', color: opts.danger ? undefined : 'text.secondary' }}>
      {label}
    </Button>
  );
  return (
    <Stack direction="row" sx={{ px: 1, py: 0.5, gap: 0.25, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px dashed', borderColor: 'divider', bgcolor: '#F6F4FF' }}>
      <Typography variant="caption" sx={{ fontWeight: 700, color: '#5F3DC4', mr: 0.5 }}>
        Table
      </Typography>
      {b('+ Row above', () => c().addRowBefore().run())}
      {b('+ Row below', () => c().addRowAfter().run())}
      {b('− Row', () => c().deleteRow().run(), { danger: true })}
      <Sep />
      {b('+ Column left', () => c().addColumnBefore().run())}
      {b('+ Column right', () => c().addColumnAfter().run())}
      {b('− Column', () => c().deleteColumn().run(), { danger: true })}
      <Sep />
      {b('Header row', () => c().toggleHeaderRow().run())}
      {b('Header column', () => c().toggleHeaderColumn().run())}
      {b('Merge cells', () => c().mergeCells().run(), { disabled: !st.canMerge })}
      {b('Split cell', () => c().splitCell().run(), { disabled: !st.canSplit })}
      <Box sx={{ flex: 1 }} />
      {b('Delete table', () => c().deleteTable().run(), { danger: true })}
    </Stack>
  );
}

function Footer({ editor }: { editor: Editor }) {
  const st = useEditorState({ editor, selector: ({ editor: e }) => ({ words: e.storage.characterCount.words() as number, chars: e.storage.characterCount.characters() as number }) });
  const mins = Math.max(1, Math.round(st.words / 180));
  return (
    <Stack direction="row" spacing={2} sx={{ px: 1.5, py: 0.5, borderTop: '1px solid', borderColor: 'divider', color: 'text.disabled', fontSize: 12, justifyContent: 'flex-end' }}>
      <span>{st.words} words</span>
      <span>{st.chars} characters</span>
      <span>about {mins} min read</span>
    </Stack>
  );
}

/* ------------------------------------------------------------------ dialogs */

function LinkDialog({ open, editor, onClose }: { open: boolean; editor: Editor; onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [newTab, setNewTab] = useState(true);
  useEffect(() => {
    if (!open) return;
    const attrs = editor.getAttributes('link');
    setUrl((attrs.href as string) ?? '');
    const { from, to } = editor.state.selection;
    setText(editor.state.doc.textBetween(from, to, ' '));
    setNewTab(attrs.target ? attrs.target === '_blank' : true);
  }, [open, editor]);
  const save = () => {
    const href = url.trim() ? (/^(https?:|mailto:)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`) : '';
    const chain = editor.chain().focus().extendMarkRange('link');
    if (!href) chain.unsetLink().run();
    else if (editor.state.selection.empty && text.trim()) chain.insertContent({ type: 'text', text: text.trim(), marks: [{ type: 'link', attrs: { href, target: newTab ? '_blank' : null } }] }).run();
    else chain.setLink({ href, target: newTab ? '_blank' : null }).run();
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" sx={{ zIndex: 1500 }}>
      <DialogTitle>Link</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField label="Web address" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" autoFocus onKeyDown={(e) => e.key === 'Enter' && save()} />
        {editor.state.selection.empty && !editor.isActive('link') && <TextField label="Text to show" value={text} onChange={(e) => setText(e.target.value)} />}
        <Stack direction="row" sx={{ alignItems: 'center' }}>
          <input id="nt" type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} />
          <label htmlFor="nt" style={{ marginLeft: 8, fontSize: 14 }}>
            Open in a new tab
          </label>
        </Stack>
      </DialogContent>
      <DialogActions>
        {editor.isActive('link') && (
          <Button
            color="error"
            onClick={() => {
              editor.chain().focus().extendMarkRange('link').unsetLink().run();
              onClose();
            }}
          >
            Remove link
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function YoutubeDialog({ open, editor, onClose }: { open: boolean; editor: Editor; onClose: () => void }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (open) setUrl('');
  }, [open]);
  const id = youtubeId(url);
  const insert = () => {
    if (!id) return;
    editor.chain().focus().setYoutubeVideo({ src: `https://www.youtube.com/watch?v=${id}` }).run();
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" sx={{ zIndex: 1500 }}>
      <DialogTitle>Embed a YouTube video</DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        <TextField fullWidth label="YouTube link" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" autoFocus error={!!url && !id} helperText={url && !id ? 'That does not look like a YouTube link' : ' '} onKeyDown={(e) => e.key === 'Enter' && insert()} />
        {id && <Box component="img" src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt="Video preview" sx={{ width: '100%', borderRadius: 2, mt: 1, aspectRatio: '16 / 9', objectFit: 'cover' }} />}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={insert} disabled={!id}>
          Insert video
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Pick a table size on a grid, like Word or Google Docs. */
function TableDialog({ open, editor, onClose }: { open: boolean; editor: Editor; onClose: () => void }) {
  const [hover, setHover] = useState<[number, number]>([3, 3]);
  const [header, setHeader] = useState(true);
  const N = 8;
  const insert = (rows: number, cols: number) => {
    editor.chain().focus().insertTable({ rows, cols, withHeaderRow: header }).run();
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} sx={{ zIndex: 1500 }}>
      <DialogTitle>Insert table</DialogTitle>
      <DialogContent>
        <Box onMouseLeave={() => setHover([3, 3])} sx={{ display: 'grid', gridTemplateColumns: `repeat(${N}, 26px)`, gap: '4px' }}>
          {Array.from({ length: N * N }, (_, i) => {
            const r = Math.floor(i / N) + 1;
            const col = (i % N) + 1;
            const on = r <= hover[0] && col <= hover[1];
            return <ButtonBase key={i} aria-label={`${r} by ${col}`} onMouseEnter={() => setHover([r, col])} onFocus={() => setHover([r, col])} onClick={() => insert(r, col)} sx={{ width: 26, height: 26, borderRadius: '5px', border: '1.5px solid', borderColor: on ? '#5F3DC4' : '#DDD', bgcolor: on ? '#E5DBFF' : '#fff' }} />;
          })}
        </Box>
        <Typography sx={{ mt: 1.5, fontWeight: 600, textAlign: 'center' }}>
          {hover[0]} rows × {hover[1]} columns
        </Typography>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'center', mt: 1 }}>
          <input id="hr" type="checkbox" checked={header} onChange={(e) => setHeader(e.target.checked)} />
          <label htmlFor="hr" style={{ marginLeft: 8, fontSize: 14 }}>
            First row is a header
          </label>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => insert(hover[0], hover[1])}>
          Insert {hover[0]} × {hover[1]}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ editor styles */

const editorContentSx = (minHeight: number | string) => ({
  '& .ProseMirror': { minHeight, outline: 'none', ...richContentSx },
  '& .ProseMirror p.is-editor-empty:first-of-type::before': { content: 'attr(data-placeholder)', color: 'text.disabled', float: 'left', height: 0, pointerEvents: 'none' },
  '& .ProseMirror .selectedCell:after': { content: '""', position: 'absolute', inset: 0, bgcolor: 'rgba(95,61,196,0.12)', pointerEvents: 'none' },
  '& .ProseMirror .column-resize-handle': { position: 'absolute', right: -2, top: 0, bottom: 0, width: 4, bgcolor: '#7950F2', pointerEvents: 'none' },
  '& .ProseMirror.resize-cursor': { cursor: 'col-resize' },
  '& .ProseMirror .tableWrapper': { overflowX: 'auto' },
  '& .ProseMirror img.ProseMirror-selectednode, & .ProseMirror div[data-youtube-video].ProseMirror-selectednode': { outline: '3px solid #7950F2' },
});
