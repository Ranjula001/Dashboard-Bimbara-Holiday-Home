"use client";
// The frame after login: sidebar, top bar, search, and the dialogs any page can open.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useData } from "@/lib/data";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import AppSidebar, { pageTitle } from "./AppSidebar";
import CommandMenu from "./CommandMenu";
import BookingForm from "./BookingForm";
import BookingDetail from "./BookingDetail";
import { ErrorText, Spinner } from "./shared";

// Any page can call newBooking({ roomId, inKey }), editBooking(id) or openBooking(id)
const DialogContext = createContext(null);
export function useDialogs() {
  return useContext(DialogContext);
}

export default function Shell({ email, children }) {
  const pathname = usePathname();
  const { data, error } = useData();
  const [draft, setDraft] = useState(null); // { prefill } or { bookingId } for editing
  const [openId, setOpenId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const newBooking = useCallback((prefill = {}) => setDraft({ prefill }), []);
  const editBooking = useCallback((bookingId) => setDraft({ bookingId }), []);
  const openBooking = useCallback((id) => setOpenId(id), []);

  // Ctrl+K (or Cmd+K on a Mac) opens the search
  useEffect(() => {
    const onKey = (event) => {
      if (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <DialogContext.Provider value={{ newBooking, editBooking, openBooking }}>
      <SidebarProvider>
        <AppSidebar email={email} onSearch={() => setSearchOpen(true)} />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur md:px-6">
            <SidebarTrigger className="-ml-1 text-muted-foreground" />
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
            <h1 className="text-sm font-medium">{pageTitle(pathname)}</h1>
            <div className="ml-auto">
              <Button size="sm" onClick={() => newBooking()} disabled={!data}>
                <Plus /> New booking
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">
            {error && (
              <div className="mb-4">
                <ErrorText>Could not load data from the database: {error}</ErrorText>
              </div>
            )}
            {data ? (
              children
            ) : (
              !error && (
                <p className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
                  <Spinner /> Loading your bookings…
                </p>
              )
            )}
          </main>
        </SidebarInset>
      </SidebarProvider>

      <CommandMenu open={searchOpen} onOpenChange={setSearchOpen} openBooking={openBooking} newBooking={newBooking} />
      {draft && (
        <BookingForm
          prefill={draft.prefill}
          bookingId={draft.bookingId}
          onClose={() => setDraft(null)}
          onSaved={(id) => {
            setDraft(null);
            if (draft.bookingId) setOpenId(id);
          }}
        />
      )}
      {openId && <BookingDetail bookingId={openId} onClose={() => setOpenId(null)} />}
    </DialogContext.Provider>
  );
}
