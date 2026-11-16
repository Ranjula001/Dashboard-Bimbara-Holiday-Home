"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ErrorText, Spinner } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in? Go straight to the dashboard.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/");
    });
  }, [router]);

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError("That email and password did not match. Check them and try again.");
    router.replace("/");
  }

  return (
    <main className="grid min-h-dvh place-items-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <img src="/logo.png" alt="BIMBARA Holiday Home" className="w-56 rounded-xl" />
          <p className="text-xs text-muted-foreground">Magazine Road, Tissa Wewa, Anuradhapura</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use the email and password the owner created for you.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={signIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <ErrorText>{error}</ErrorText>
              <Button type="submit" className="w-full" disabled={busy}>{busy && <Spinner />} Sign in</Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">There is no public sign-up. Accounts are created in Supabase.</p>
      </div>
    </main>
  );
}
