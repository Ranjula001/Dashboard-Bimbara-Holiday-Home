"use client";
// Settings: add-on services and their prices, and your account.

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useData } from "@/lib/data";
import { deleteService, friendlyError } from "@/lib/actions";
import { money } from "@/lib/dates";
import { ConfirmDelete, ErrorText, PageTitle, Spinner } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SettingsPage() {
  const { data, reload } = useData();
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(action, afterwards) {
    setBusy(true);
    setError("");
    const { error } = await action();
    if (error) setError(friendlyError(error, "This service is used by bookings, so it cannot be deleted."));
    await reload();
    setBusy(false);
    if (!error && afterwards) afterwards();
  }

  // Save a price when the box loses focus
  const savePrice = (service, value) => {
    if (Number(value) === Number(service.price)) return;
    run(() => supabase.from("service").update({ price: Number(value) || 0 }).eq("service_id", service.service_id));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageTitle description="Add-on services and your account">Settings</PageTitle>

      <Card>
        <CardHeader>
          <CardTitle>Add-on services</CardTitle>
          <CardDescription>Offered when making a booking. The price is frozen into each booking, so changing it here does not change old bookings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead className="w-40">Price (Rs.)</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.services.map((service) => (
                <TableRow key={service.service_id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>
                    <Input type="number" inputMode="numeric" min="0" defaultValue={Number(service.price)} className="h-8" onBlur={(e) => savePrice(service, e.target.value)} aria-label={`Price of ${service.name}`} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" aria-label="Delete service" onClick={() => setToDelete(service)}><Trash2 className="text-muted-foreground" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              run(() => supabase.from("service").insert({ name: newName.trim(), price: Number(newPrice) || 0 }), () => { setNewName(""); setNewPrice(""); });
            }}
          >
            <Input required placeholder="New service, e.g. Breakfast" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input type="number" inputMode="numeric" min="0" placeholder="Price" className="sm:w-32" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
            <Button type="submit" variant="secondary" disabled={busy}>{busy ? <Spinner /> : <Plus />} Add</Button>
          </form>
          <ErrorText>{error}</ErrorText>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Accounts are created in Supabase under Authentication → Users. Give each person their own.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>Sign out</Button>
        </CardContent>
      </Card>

      <ConfirmDelete
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={toDelete ? `Delete "${toDelete.name}"?` : ""}
        description={toDelete ? `It will no longer be offered on new bookings${Number(toDelete.price) > 0 ? ` (currently ${money(toDelete.price)})` : ""}. Services already used by a booking cannot be deleted.` : ""}
        busy={busy}
        onConfirm={() => run(() => deleteService(toDelete.service_id), () => setToDelete(null))}
      />
    </div>
  );
}
