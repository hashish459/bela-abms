"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu as MenuIcon,
  X,
  Search,
  Bell,
  ChevronRight,
  LogOut,
  CalendarDays,
  LayoutDashboard,
  ReceiptText,
  ShoppingCart,
  Package,
  Users,
  BookText,
  Landmark,
  Wallet,
  Ticket,
  Folder,
  BarChart3,
  Store,
  Settings,
  BookOpen,
  Activity,
  Building2,
  Factory,
  Dot,
} from "lucide-react";
import type { ReactNode } from "react";
import type { MenuNode } from "@/lib/menu";

type User = {
  name: string;
  email: string;
  isAdmin: boolean;
  roleNames: string[];
};

// Menu icon names come from the seeded MenuItem.icon column (Docs/DISCOVERY-LOG).
// Explicit map keeps the icon components static (no dynamic component creation).
function navIcon(name: string | null, size = 16): ReactNode {
  switch (name) {
    case "layout-dashboard":
      return <LayoutDashboard size={size} />;
    case "receipt-text":
      return <ReceiptText size={size} />;
    case "shopping-cart":
      return <ShoppingCart size={size} />;
    case "package":
      return <Package size={size} />;
    case "users":
      return <Users size={size} />;
    case "book":
      return <BookText size={size} />;
    case "landmark":
      return <Landmark size={size} />;
    case "wallet":
      return <Wallet size={size} />;
    case "ticket":
      return <Ticket size={size} />;
    case "folder":
      return <Folder size={size} />;
    case "bar-chart-3":
      return <BarChart3 size={size} />;
    case "store":
      return <Store size={size} />;
    case "settings":
      return <Settings size={size} />;
    case "book-open":
      return <BookOpen size={size} />;
    case "activity":
      return <Activity size={size} />;
    case "building-2":
      return <Building2 size={size} />;
    case "factory":
      return <Factory size={size} />;
    default:
      return <Dot size={size} />;
  }
}

export function AppShell({
  menu,
  user,
  company,
  fiscalYear,
  children,
}: {
  menu: MenuNode[];
  user: User;
  company: string;
  fiscalYear: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-border bg-surface transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-foreground">
            ब
          </div>
          <span className="text-sm font-bold tracking-wide">
            BELA <span className="font-normal text-muted">ABMS</span>
          </span>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="h-[calc(100dvh-3.5rem)] overflow-y-auto p-2">
          {menu.map((node) => (
            <NavItem key={node.id} node={node} pathname={pathname} depth={0} />
          ))}
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
          <button
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon size={20} />
          </button>
          <div className="relative hidden max-w-xs flex-1 sm:block">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              placeholder="Search"
              className="w-full rounded-lg bg-background py-1.5 pl-9 pr-3 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1 text-xs font-medium ring-1 ring-border">
              <CalendarDays size={13} className="text-muted" />
              {fiscalYear}
            </span>
            <button className="relative text-muted hover:text-foreground" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <UserMenu user={user} company={company} />
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function NavItem({
  node,
  pathname,
  depth,
}: {
  node: MenuNode;
  pathname: string;
  depth: number;
}) {
  const hasChildren = node.children.length > 0;
  const active = node.route === pathname;
  const inside =
    node.route && pathname.startsWith(node.route) && node.route !== "/dashboard";
  const [expanded, setExpanded] = useState<boolean>(Boolean(inside));
  const showIcon = depth === 0;

  if (hasChildren) {
    return (
      <div className="mb-0.5">
        <button
          onClick={() => setExpanded((e) => !e)}
          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${
            inside ? "text-foreground" : "text-muted"
          } hover:bg-accent-tint`}
        >
          {showIcon && navIcon(node.icon)}
          <span className="flex-1 text-left font-medium">{node.title}</span>
          <ChevronRight
            size={14}
            className={`transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </button>
        {expanded && (
          <div className="ml-3 border-l border-border pl-2">
            {node.children.map((c) => (
              <NavItem key={c.id} node={c} pathname={pathname} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={node.route ?? "#"}
      className={`mb-0.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${
        active
          ? "bg-accent-tint font-semibold text-accent"
          : "text-muted hover:bg-accent-tint hover:text-foreground"
      }`}
    >
      {showIcon && navIcon(node.icon)}
      <span>{node.title}</span>
    </Link>
  );
}

function UserMenu({ user, company }: { user: User; company: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const initials = user.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground"
      >
        {initials || "U"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-border bg-surface p-1 shadow-lg">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
              <p className="mt-1 truncate text-xs text-muted">{company}</p>
              <p className="mt-1 text-xs">
                {user.isAdmin ? (
                  <span className="rounded bg-accent-tint px-1.5 py-0.5 text-accent">
                    Admin
                  </span>
                ) : (
                  user.roleNames.map((r) => (
                    <span
                      key={r}
                      className="mr-1 rounded bg-background px-1.5 py-0.5 ring-1 ring-border"
                    >
                      {r}
                    </span>
                  ))
                )}
              </p>
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
