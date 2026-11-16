"use client";
// Small pieces used on several screens, built on the shadcn/ui components in components/ui.

import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// A number with a trend pill, like the cards at the top of the dashboard.
// `change` is a percentage (+8 means up 8%). `delta` is the plain difference ("+24").
export function StatCard({ label, value, change, delta, compare = "vs last month", hint }) {
  const up = change > 0;
  const flat = change === 0 || change == null;
  return (
    <Card className="gap-3 py-5">
      <CardContent className="space-y-3 px-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          {!flat && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium nums",
                up ? "bg-good/12 text-good" : "bg-critical/12 text-critical"
              )}
            >
              {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(change)}%
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-3xl font-semibold tracking-tight nums">{value}</span>
          {delta != null && (
            <span className="text-xs text-muted-foreground nums">
              <span className={cn(up && "text-good", change < 0 && "text-critical")}>{delta}</span> {compare}
            </span>
          )}
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

const STATUS_STYLE = {
  confirmed: "border-transparent bg-chart-1/10 text-foreground",
  checked_in: "border-transparent bg-good/12 text-good",
  checked_out: "border-transparent bg-muted text-muted-foreground",
  cancelled: "border-transparent bg-critical/12 text-critical",
};

export function StatusBadge({ status, className }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", STATUS_STYLE[status], className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function PageTitle({ children, description, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{children}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function ErrorText({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-md border border-critical/30 bg-critical/10 px-3 py-2 text-sm text-critical">
      {children}
    </p>
  );
}

export function Spinner({ className }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} />;
}

// "Are you sure?" for anything that cannot be undone
export function ConfirmDelete({ open, onOpenChange, title, description, confirmLabel = "Delete", onConfirm, busy }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant="destructive" disabled={busy} onClick={(event) => { event.preventDefault(); onConfirm(); }}>
              {busy && <Spinner />} {confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const PAY_LABEL = { cash: "Cash", bank: "Bank transfer", card: "Card" };
