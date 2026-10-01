import { sharedContext } from '@/lib/sharedContext';
/** The current page's menu icon, so page headers can show it (set by the portal layout). */
import { useContext, type ReactNode } from 'react';

export const PageIconContext = sharedContext<{ icon?: ReactNode; label?: string }>('pageIcon', {});
export const usePageIcon = () => useContext(PageIconContext);
