"use client";
// The gatekeeper. Every page except /login needs a signed-in user.
// It checks who is signed in, then loads the data and shows the menu.

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { DataProvider } from "@/lib/data";
import Shell from "./Shell";

export default function AppFrame({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  // undefined = still checking, null = nobody signed in, object = signed in
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null && !isLogin) router.replace("/login");
  }, [session, isLogin, router]);

  if (isLogin) return children;

  if (!session) {
    return <p className="grid min-h-dvh place-items-center text-sm text-muted-foreground">Opening BIMBARA…</p>;
  }

  return (
    <DataProvider>
      <Shell email={session.user.email}>{children}</Shell>
    </DataProvider>
  );
}
