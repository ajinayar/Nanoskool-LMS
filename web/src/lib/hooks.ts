import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { useToast } from '@/components/Toast';

/** GET helper: useGet<Course[]>('/courses', { status: 'published' }) */
export function useGet<T>(url: string | null, params?: Record<string, unknown>, opts?: { enabled?: boolean }) {
  return useQuery<T>({
    queryKey: [url, params ?? {}] as QueryKey,
    queryFn: async () => (await api.get<T>(url!, { params })).data,
    enabled: !!url && (opts?.enabled ?? true),
  });
}

/**
 * Mutation helper that shows a toast and refreshes the given query prefixes.
 * const save = useSend('post', '/courses', { success: 'Course created', invalidate: ['/courses'] })
 */
export function useSend<TBody = unknown, TRes = unknown>(
  method: 'post' | 'put' | 'patch' | 'delete',
  url: string | ((body: TBody) => string),
  opts: { success?: string; invalidate?: string[]; onSuccess?: (res: TRes, body: TBody) => void } = {},
) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation<TRes, unknown, TBody>({
    mutationFn: async (body: TBody) => {
      const u = typeof url === 'function' ? url(body) : url;
      const r = method === 'delete' ? await api.delete<TRes>(u) : await api[method]<TRes>(u, body);
      return r.data;
    },
    onSuccess: (res, body) => {
      if (opts.success) toast.success(opts.success);
      for (const prefix of opts.invalidate ?? []) {
        qc.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === 'string' && (q.queryKey[0] as string).startsWith(prefix) });
      }
      opts.onSuccess?.(res, body);
    },
    onError: (err) => toast.error(errorMessage(err)),
  });
}
