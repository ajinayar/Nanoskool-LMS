import type { ReactNode } from 'react';
import type { Role } from '@/api/types';

export interface NavItem {
  label: string;
  /** Relative to the portal base, '' = home */
  path: string;
  icon: ReactNode;
  /** Optional group heading shown above the item */
  group?: string;
}

export interface PortalRoute {
  /** Relative to the portal base, e.g. 'classes/:id' ('' = index) */
  path: string;
  element: ReactNode;
}

export interface Portal {
  role: Role;
  base: string;
  title: string;
  nav: NavItem[];
  routes: PortalRoute[];
  /** Visual style of the portal shell. 'clarity' = floating sidebar, warm canvas, pastel cards. */
  look?: 'classic' | 'clarity' | 'student';
  /** Optional "+" shortcuts next to nav group headings: group name → path relative to the base */
  groupActions?: Record<string, string>;
}

export const PORTAL_BASE: Record<Role, string> = {
  super_admin: '/admin',
  partner: '/partner',
  school_admin: '/school',
  teacher: '/teacher',
  student: '/student',
  parent: '/parent',
};
