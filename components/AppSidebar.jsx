"use client";
// The left menu: logo, search, two groups of links, and the account at the bottom.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BedDouble,
  CalendarDays,
  ChevronsUpDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/guests", label: "Guests", icon: Users },
  { href: "/rooms", label: "Rooms", icon: BedDouble },
  { href: "/payments", label: "Payments", icon: Wallet },
];
export const SYSTEM_NAV = [{ href: "/settings", label: "Settings", icon: Settings }];

export function pageTitle(pathname) {
  return [...NAV, ...SYSTEM_NAV].find((item) => item.href === pathname)?.label || "BIMBARA";
}

export default function AppSidebar({ email, onSearch }) {
  const pathname = usePathname();
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3 p-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden" onClick={() => setOpenMobile(false)}>
            <img src="/logo-mark.png" alt="" className="size-7 shrink-0 rounded-md" />
            {!collapsed && <span className="truncate text-sm font-semibold">BIMBARA</span>}
          </Link>
          {!collapsed && <SidebarTrigger className="text-muted-foreground" />}
        </div>
        <button
          onClick={onSearch}
          className="flex h-9 w-full items-center gap-2 rounded-md border bg-background px-2.5 text-sm text-muted-foreground hover:bg-accent group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          aria-label="Search"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left group-data-[collapsible=icon]:hidden">Search…</span>
          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] group-data-[collapsible=icon]:hidden">
            Ctrl K
          </kbd>
        </button>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Platform" items={NAV} pathname={pathname} onNavigate={() => setOpenMobile(false)} />
        <NavGroup label="System" items={SYSTEM_NAV} pathname={pathname} onNavigate={() => setOpenMobile(false)} />
      </SidebarContent>

      <SidebarFooter className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-left text-sm hover:bg-accent group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
              <Settings className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <span className="block truncate font-medium">Owner</span>
                <span className="block truncate text-xs text-muted-foreground">{email}</span>
              </span>
              <ChevronsUpDown className="size-4 text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => supabase.auth.signOut()}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function NavGroup({ label, items, pathname, onNavigate }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map(({ href, label, icon: Icon }) => (
            <SidebarMenuItem key={href}>
              <SidebarMenuButton asChild isActive={pathname === href} tooltip={label}>
                <Link href={href} onClick={onNavigate}>
                  <Icon />
                  <span>{label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
