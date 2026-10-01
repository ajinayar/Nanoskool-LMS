import { createContext, type Context } from 'react';

/**
 * A React context that stays the same object even if the dev server loads its module twice
 * (this can happen after many live reloads and made the app show a blank page: "useAuth outside AuthProvider").
 */
export function sharedContext<T>(name: string, initial: T): Context<T> {
  const store = globalThis as unknown as { __nsContexts?: Record<string, Context<unknown>> };
  store.__nsContexts ??= {};
  store.__nsContexts[name] ??= createContext<unknown>(initial);
  return store.__nsContexts[name] as Context<T>;
}
