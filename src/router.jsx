/**
 * Routing.
 * ----------------------------------------------------------------------------
 * WHY THIS EXISTS, AND WHY IT IS WRITTEN BY HAND
 *
 * The app previously had no URLs at all: every one of its 22 screens lived in a
 * React state variable at `/`. Refreshing dropped you back on the dashboard, the
 * browser Back button did nothing, and you could not send anyone a link to a
 * specific screen. SPEC.md itself names two addresses -- `/search` (§34) and
 * `/apps` (§38) -- and neither existed.
 *
 * This is a hash router, deliberately. A history-API router needs the host to
 * rewrite unknown paths back to index.html, and this is a static bundle that can
 * land anywhere; hash routing works on any static host with no config, so
 * `/#/reports/balance-sheet` survives a refresh and can be shared as-is.
 *
 * The table itself lives in `routes.js`, kept separate so this file exports only
 * a hook and a component -- React fast refresh is disabled by a module that
 * mixes the two, and that would mean a full reload on every edit here.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { labelFor, slugFor, viewIdForSlug } from './routes';

/** Turn a hash fragment into { viewId, query, path }. An unknown address
 *  resolves to the dashboard rather than rendering nothing. */
function parseHash(rawHash) {
  const raw = (rawHash || '').replace(/^#/, '');
  const [pathPart, queryPart = ''] = raw.split('?');

  // Normalise: '#/reports/' and '#reports' both mean '/reports'.
  let path = pathPart || '/';
  if (!path.startsWith('/')) path = '/' + path;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

  return {
    viewId: viewIdForSlug(path),
    query: Object.fromEntries(new URLSearchParams(queryPart)),
    path,
  };
}

/**
 * The current route.
 *
 * No external router on purpose: the app has 22 screens and no nested layouts,
 * so a dependency would add weight for behaviour this file already provides --
 * including the two things the old build lacked, a working Back button and a
 * shareable address.
 */
export function useRoute() {
  const [route, setRoute] = useState(() =>
    parseHash(typeof window === 'undefined' ? '' : window.location.hash)
  );

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    // A direct visit with no hash still needs a canonical one, so that Back
    // works from the very first screen rather than leaving the site.
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#/');
    }
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((viewId, query) => {
    const slug = slugFor(viewId);
    const search = query
      ? '?' + new URLSearchParams(
          Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
        ).toString()
      : '';
    const next = '#' + slug + search;
    if (window.location.hash !== next) window.location.hash = next;
  }, []);

  // Changing screen should move the reading position with it. Without this a
  // long screen leaves you scrolled halfway down the next one.
  useEffect(() => {
    document.querySelector('main')?.scrollTo({ top: 0 });
  }, [route.viewId]);

  return useMemo(
    () => ({ ...route, navigate, routeLabel: labelFor(route.viewId) }),
    [route, navigate]
  );
}

/**
 * An anchor that routes inside the app.
 *
 * A real `<a href>`, not a div with an onClick: it is focusable, right-clickable,
 * announceable by a screen reader and middle-clickable -- none of which a div
 * with a click handler is.
 */
export function Link({ to, query, children, className, onClick, ...rest }) {
  const href = '#' + slugFor(to) + (query ? '?' + new URLSearchParams(query).toString() : '');
  return (
    <a
      href={href}
      className={className}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        // Modified clicks keep their browser meaning (new tab, download).
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        window.location.hash = href.slice(1);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
