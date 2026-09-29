import { createTheme } from '@mui/material/styles';

/**
 * "Clarity" look: warm cream canvas, floating white panels, pill controls,
 * near-black primary actions and pastel accents.
 */
export const CLARITY = {
  ink: '#17171C',
  ink2: '#5B5A63',
  ink3: '#8C8A92',
  canvas: 'linear-gradient(135deg, #F7F3EA 0%, #F4ECDC 55%, #EFE2CC 100%)',
  panel: '#FFFDF8',
  panelSoft: '#FBF8F1',
  line: '#ECE6DA',
  hover: '#F1ECE2',
  lilac: '#C9B8F4',
  peach: '#F8AE92',
  sky: '#AAC4F2',
  mint: '#B9E3C9',
  butter: '#F6DB8E',
  green: '#35A46A',
};

/** Pastel tag colours: background, text. Pick by name so a category keeps its colour. */
export const TAGS: [string, string][] = [
  ['#E6DCFB', '#4C2F9C'],
  ['#FCE0B8', '#86500A'],
  ['#D6E4FB', '#1F4A92'],
  ['#FBD5C6', '#9A3A16'],
  ['#D3EEDD', '#1D6B3E'],
  ['#F8D3E6', '#8E2459'],
];
/** Fixed meanings: ok = green, warn = amber, bad = red-orange, info = blue */
const FIXED: Record<string, [string, string]> = { ok: TAGS[4], warn: TAGS[1], bad: TAGS[3], info: TAGS[2], class: TAGS[0], school: TAGS[1], partner: TAGS[5], global: TAGS[2] };
export const tagColor = (name = '') => FIXED[name] ?? TAGS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TAGS.length];

/** True when the Clarity theme is active (its primary colour is the near-black ink). */
export const isClarity = (t: { palette: { primary: { main: string } } }) => t.palette.primary.main === CLARITY.ink;

export const clarityTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: CLARITY.ink, dark: '#000000', light: '#3A3A44', contrastText: '#FFFFFF' },
    secondary: { main: '#E8743F', contrastText: '#FFFFFF' },
    background: { default: '#F5EEE2', paper: CLARITY.panel },
    text: { primary: CLARITY.ink, secondary: CLARITY.ink2 },
    divider: CLARITY.line,
    success: { main: CLARITY.green },
    warning: { main: '#D99A1E' },
    error: { main: '#D6453D' },
    info: { main: '#4C6FD6' },
  },
  shape: { borderRadius: 14 },
  typography: {
    // Inter: a neutral, modern sans with clear figures; kept to three weights for a calm look
    fontFamily: '"Inter Variable", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h4: { fontWeight: 600, fontSize: '1.75rem', letterSpacing: '-0.025em' },
    h5: { fontWeight: 600, fontSize: '1.35rem', letterSpacing: '-0.02em' },
    h6: { fontWeight: 600, fontSize: '1.05rem', letterSpacing: '-0.01em' },
    body1: { letterSpacing: '-0.005em' },
    body2: { fontSize: '0.875rem', letterSpacing: '-0.005em' },
    button: { textTransform: 'none', fontWeight: 500, letterSpacing: '-0.005em' },
  },
  components: {
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { borderRadius: 22, borderColor: CLARITY.line, backgroundColor: CLARITY.panel, boxShadow: '0 1px 2px rgba(60,40,10,0.04)' } },
    },
    // Equal padding on every side (MUI adds extra at the bottom by default)
    MuiCardContent: { styleOverrides: { root: { padding: 20, '&:last-child': { paddingBottom: 20 } } } },
    MuiPaper: { styleOverrides: { outlined: { borderColor: CLARITY.line }, rounded: { borderRadius: 18 } } },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999, paddingLeft: 18, paddingRight: 18 },
        outlined: { borderColor: CLARITY.line, backgroundColor: CLARITY.panel, color: CLARITY.ink, '&:hover': { borderColor: '#D9D1C2', backgroundColor: CLARITY.hover } },
        text: { color: CLARITY.ink, paddingLeft: 10, paddingRight: 10 },
        sizeSmall: { paddingLeft: 12, paddingRight: 12 },
      },
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiOutlinedInput: {
      styleOverrides: {
        // Form fields: softly rounded. Search fields (with a leading icon): full pill.
        root: {
          borderRadius: 12,
          fontSize: 15,
          backgroundColor: 'rgba(255,253,248,0.75)',
          '& fieldset': { borderColor: CLARITY.line },
          '&:hover fieldset': { borderColor: '#D9D1C2' },
          '&.MuiInputBase-adornedStart': { borderRadius: 999 },
        },
      },
    },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 999 } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: CLARITY.line, paddingTop: 12, paddingBottom: 12, '&:first-of-type': { paddingLeft: 0 }, '&:last-of-type': { paddingRight: 0 } },
        head: { fontWeight: 500, color: CLARITY.ink3, backgroundColor: 'transparent', fontSize: 12.5 },
      },
    },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 44 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 24 } } },
    MuiMenu: { styleOverrides: { paper: { borderRadius: 14 } } },
    MuiLinearProgress: { styleOverrides: { root: { backgroundColor: '#EFE7D8' } } },
  },
});
