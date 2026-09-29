# Nanoskool web app

React 19 + TypeScript + MUI + TanStack Query. One app with six role portals:
`/admin` (super admin), `/partner`, `/school`, `/teacher`, `/student`, `/parent`.

```bash
npm install
npm run dev        # http://localhost:5173 (proxies /api to localhost:4000)
npm run build      # type-check + production build into dist/
```

Set `VITE_API_URL` when the API is on another origin (see `.env.example`).

## Code map

- `src/portals/<role>.tsx`: each portal's sidebar and routes. Shared pages (profile, announcements, events, courses, lesson viewer, NanoBot) come from `portals/shared.tsx`.
- `src/pages/<role>/`: portal pages. `src/pages/shared/`: pages every portal uses.
- `src/components/ui.tsx`: the shared UI kit (PageHeader, DataTable, StatCard, dialogs, upload button...). `RichEditor`, `QuizEditor` and `ReportCard` are shared too.
- `src/lib/hooks.ts`: `useGet` / `useSend` data hooks (toasts + cache refresh built in).
- `src/api/client.ts`: axios client. Access tokens live in memory only; the refresh token is an httpOnly cookie.

Conventions: MUI v9 `slotProps` (not the removed `*Props`), `import type` for types, `component={RouterLink}` for internal links, and every page handles loading, empty and error states.
