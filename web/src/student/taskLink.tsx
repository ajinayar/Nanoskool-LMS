import { forwardRef } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { S } from './widgets';

/** A link to one assignment, for ButtonBase's `component`. */
export const RouterLinkish = forwardRef<HTMLAnchorElement, Omit<LinkProps, 'to'> & { to: string }>(function RouterLinkish({ to, ...rest }, ref) {
  return <Link ref={ref} to={`${S}/assignments/${to}`} {...rest} />;
});
