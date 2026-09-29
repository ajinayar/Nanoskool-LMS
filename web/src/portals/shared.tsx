import { AnnouncementsPage, EventsPage, ProfilePage } from '@/pages/shared/CommonPages';
import { CourseViewPage, CoursesPage, NanoBotPage, UnitPage } from '@/pages/shared/CoursePages';
import type { PortalRoute } from './types';

/** Pages every portal has. Portals may override any path by listing it first. */
export function sharedRoutes(opts: { courses?: boolean; nanobot?: boolean } = {}): PortalRoute[] {
  const r: PortalRoute[] = [
    { path: 'profile', element: <ProfilePage /> },
    { path: 'announcements', element: <AnnouncementsPage /> },
    { path: 'events', element: <EventsPage /> },
  ];
  if (opts.courses !== false) {
    r.push({ path: 'courses', element: <CoursesPage /> }, { path: 'courses/:id', element: <CourseViewPage /> }, { path: 'units/:id', element: <UnitPage /> });
  }
  if (opts.nanobot) r.push({ path: 'nanobot', element: <NanoBotPage /> });
  return r;
}
