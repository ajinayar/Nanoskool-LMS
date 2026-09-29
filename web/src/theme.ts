import { createTheme } from '@mui/material/styles';

// Nanoskool brand: deep indigo with a warm orange accent
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#3F3DBF', dark: '#2C2A93', light: '#6B69E0', contrastText: '#fff' },
    secondary: { main: '#F28B30', contrastText: '#fff' },
    background: { default: '#F5F6FB', paper: '#FFFFFF' },
    success: { main: '#2E9D61' },
    warning: { main: '#E0A100' },
    error: { main: '#D64545' },
    text: { primary: '#1D1F33', secondary: '#5C6079' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter Variable", "Inter", "Segoe UI", Roboto, system-ui, sans-serif',
    h4: { fontWeight: 700, fontSize: '1.6rem' },
    h5: { fontWeight: 700, fontSize: '1.3rem' },
    h6: { fontWeight: 650, fontSize: '1.05rem' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiCard: { defaultProps: { variant: 'outlined' }, styleOverrides: { root: { borderColor: '#E4E6F0' } } },
    MuiPaper: { styleOverrides: { outlined: { borderColor: '#E4E6F0' } } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 650, color: '#5C6079', backgroundColor: '#FAFBFE' } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 550 } } },
  },
});
