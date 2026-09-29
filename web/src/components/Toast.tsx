import { Alert, Snackbar } from '@mui/material';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Kind = 'success' | 'error' | 'info' | 'warning';
interface ToastApi {
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
}
const Ctx = createContext<ToastApi>({ success: () => {}, error: () => {}, info: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; kind: Kind; key: number } | null>(null);
  const show = useCallback((text: string, kind: Kind) => setMsg({ text, kind, key: Date.now() }), []);
  const api = useMemo(() => ({ success: (m: string) => show(m, 'success'), error: (m: string) => show(m, 'error'), info: (m: string) => show(m, 'info') }), [show]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <Snackbar key={msg?.key} open={!!msg} autoHideDuration={4000} onClose={() => setMsg(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {msg ? (
          <Alert severity={msg.kind} variant="filled" onClose={() => setMsg(null)} sx={{ minWidth: 280 }}>
            {msg.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
