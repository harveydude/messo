/**
 * Shared UI components.
 * ----------------------------------------------------------------------------
 * The project had none. Every screen re-implemented its own modal shell, its own
 * close button and its own copy of the same fifteen class strings -- so a fix
 * applied in one screen left the other three wrong. Measured before this file:
 * 0 shared components, and one class string repeated 29 times.
 *
 * Supporting pieces live next door: money formatting in `money.js`, hooks in
 * `hooks.jsx`. Keeping the three separate is what lets React fast refresh work.
 */

import React, { useCallback, useEffect, useId, useRef } from 'react';
import { formatMoney, formatMoneyShort } from './money';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]),' +
  ' textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* ------------------------------------------------------------------- Dialog -- */

/**
 * An accessible modal shell.
 *
 * `role="dialog"` + `aria-modal` so a screen reader announces that a dialog
 * opened; focus moves in on open, is trapped while open, and is handed back to
 * the element that opened it on close; Escape and an outside click both
 * dismiss. All four were missing before -- there was not one `role="dialog"` in
 * the app and exactly one Escape handler -- and together they are the
 * difference between a dialog a keyboard user can leave and one they are stuck
 * inside.
 *
 * `dismissible={false}` is there for dialogs that must not close by accident.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className = '',
  panelClassName = '',
  labelledBy,
  dismissible = true,
  initialFocusRef,
}) {
  const panelRef = useRef(null);
  const openerRef = useRef(null);
  const autoId = useId();
  const titleId = `${autoId}-title`;
  const descId = `${autoId}-desc`;

  const focusFirst = useCallback(() => {
    const target =
      initialFocusRef?.current ||
      panelRef.current?.querySelector('[data-autofocus]') ||
      panelRef.current?.querySelector(FOCUSABLE) ||
      panelRef.current;
    // Defer so the panel exists before focusing inside it.
    requestAnimationFrame(() => target?.focus?.());
  }, [initialFocusRef]);

  useEffect(() => {
    if (!open) return undefined;

    // Remember the trigger so focus can be handed back. Without this a keyboard
    // user is dumped at the top of the document every time and has to Tab back.
    openerRef.current = document.activeElement;
    focusFirst();

    return () => {
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus?.();
    };
  }, [open, focusFirst]);

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && dismissible) {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;

      // The trap. Without it, Tab walks out of the dialog and into the page
      // behind, which no longer matches what a sighted user sees.
      const nodes = Array.from(panelRef.current?.querySelectorAll(FOCUSABLE) || []).filter(
        (n) => n.offsetParent !== null || n === document.activeElement
      );
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [dismissible, onClose]
  );

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 ${className}`}
      onMouseDown={(e) => {
        // Only a press that STARTS on the backdrop dismisses; a drag that ends
        // there from inside the dialog should not close it.
        if (dismissible && e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || (title ? titleId : undefined)}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`bg-white rounded-2xl shadow-2xl border border-gray-200 w-full ${panelClassName}`}
      >
        {title && <h2 id={titleId} className="sr-only">{title}</h2>}
        {description && <p id={descId} className="sr-only">{description}</p>}
        {children}
        {footer}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- Money -- */

/**
 * A money figure, or an honest dash.
 *
 * The dash is not decoration. Printing `₹0.00` when the ledger has not been
 * given any data asserts that nothing is owed -- a claim about a customer's
 * books this app has no right to make.
 */
export function Money({ amount, short = false, paise = true, className = '' }) {
  const text = short ? formatMoneyShort(amount) : formatMoney(amount, { paise });
  return <span className={`tabular-nums ${className}`}>{text ?? '—'}</span>;
}

/* ------------------------------------------------------------------ Confirm -- */

/** A yes/no dialog built on the shared shell. */
export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel = 'Confirm' }) {
  return (
    <Dialog open={open} onClose={onClose} title={title} panelClassName="max-w-md p-6 space-y-4">
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
      {body && <p className="text-sm text-gray-600">{body}</p>}
      <div className="flex items-center justify-end space-x-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 text-xs font-semibold text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          data-autofocus
          onClick={() => { onConfirm?.(); onClose?.(); }}
          className="px-5 py-1.5 text-xs font-bold text-white bg-[#108000] rounded-full hover:bg-green-800"
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

/* -------------------------------------------------------------- Empty state -- */

/**
 * The one place "there is nothing here" is said.
 *
 * Previously a missing screen rendered nothing at all, which reads as a crash --
 * three dashboard links did exactly that. An empty state names what is absent
 * and offers the single action that would fill it.
 */
export function EmptyState({ title, note, action, onAction, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-20">
      {Icon && (
        <Icon size={40} strokeWidth={1.4} className="text-gray-400 mb-3" aria-hidden="true" />
      )}
      <h2 className="text-lg font-semibold text-[#393A3D]">{title}</h2>
      {note && <p className="text-sm text-[#6B6C72] mt-1 max-w-md">{note}</p>}
      {action && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 px-4 py-2 bg-[#2CA01C] hover:bg-[#108000] text-white text-sm font-semibold rounded"
        >
          {action}
        </button>
      )}
    </div>
  );
}
