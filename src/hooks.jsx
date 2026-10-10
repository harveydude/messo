/**
 * Shared hooks.
 *
 * Split from `ui.jsx` because a module exporting both hooks and components
 * disables React fast refresh -- every edit would trigger a full reload instead
 * of a hot swap.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Call `handler` when Escape is pressed, while `active`.
 *
 * The app previously had exactly one Escape handler, on the search box, so six
 * overlays could only be dismissed by hunting for an X or clicking away -- and
 * SPEC §37, §39, §41 and §43 all require Escape for them.
 */
export function useEscape(handler, active = true) {
  const saved = useRef(handler);

  // Reading through a ref rather than re-subscribing each render means a
  // handler that closes over fresh state never goes stale.
  useEffect(() => {
    saved.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') saved.current(e);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active]);
}

/**
 * A transient message, mounted once at the app root.
 *
 * The toast this replaces fired a `setTimeout` it never cleared, so it could
 * land after you had navigated to another screen. Here the timer is cleared on
 * unmount and whenever a new message replaces the current one, so a message
 * cannot outlive the thing that produced it.
 */
export function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clear, [clear]);

  const show = useCallback((message, action) => {
    clear();
    setToast({ message, action });
    timerRef.current = setTimeout(() => setToast(null), 4000);
  }, [clear]);

  const node = toast ? (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] flex items-center gap-3 px-4 py-3 rounded-lg bg-[#2E2F31] text-white text-sm shadow-lg"
    >
      <span>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => { toast.action.onClick?.(); setToast(null); }}
          className="text-[#7FC3FF] font-semibold hover:underline"
        >
          {toast.action.label}
        </button>
      )}
    </div>
  ) : null;

  return { show, node };
}
