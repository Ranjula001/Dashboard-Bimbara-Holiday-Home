"use client";
// Small building blocks reused on every screen: cards, buttons, inputs, dialogs.

import { useEffect } from "react";
import { X } from "lucide-react";
import { STATUS_LABEL } from "@/lib/data";

export function Card({ className = "", children, ...rest }) {
  return (
    <section className={`glass rounded-[20px] p-4 sm:p-5 ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function CardTitle({ children, hint }) {
  return (
    <header className="mb-3">
      <h2 className="font-display text-lg font-semibold">{children}</h2>
      {hint && <p className="text-sm text-ink-3">{hint}</p>}
    </header>
  );
}

const BUTTON_STYLES = {
  primary: "bg-saffron text-saffron-ink hover:brightness-110 font-semibold",
  quiet: "bg-white/8 text-ink hover:bg-white/14 border border-white/12",
  danger: "bg-critical/15 text-critical hover:bg-critical/25 border border-critical/30",
};

export function Button({ variant = "quiet", className = "", children, ...rest }) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_STYLES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// A label with its input underneath
export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

const INPUT_STYLE =
  "w-full min-h-11 rounded-xl border border-white/14 bg-black/20 px-3 text-base text-ink placeholder:text-ink-3 focus:border-saffron/70 focus:outline-none";

export function Input(props) {
  return <input {...props} className={`${INPUT_STYLE} ${props.className || ""}`} />;
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={`${INPUT_STYLE} ${props.className || ""}`}>
      {children}
    </select>
  );
}

const STATUS_STYLE = {
  confirmed: "bg-teal/15 text-teal border-teal/30",
  checked_in: "bg-good/15 text-good border-good/30",
  checked_out: "bg-white/8 text-ink-2 border-white/15",
  cancelled: "bg-critical/12 text-critical border-critical/30",
};

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl border border-critical/30 bg-critical/12 px-3 py-2 text-sm text-critical">
      {children}
    </p>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-ink-3">{children}</div>}
    </div>
  );
}

// A dialog. On phones it slides up from the bottom like a sheet.
export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:p-6"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-strong sheet-in flex max-h-[92dvh] w-full flex-col rounded-t-[28px] sm:max-w-xl sm:rounded-[28px]"
      >
        <header className="flex items-center justify-between gap-4 px-5 pt-5 pb-3">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-10 place-items-center rounded-full bg-white/8 hover:bg-white/15"
          >
            <X size={18} />
          </button>
        </header>
        <div className="overflow-y-auto px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}
