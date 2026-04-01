"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@auth0/nextjs-auth0/client";
import {
  LayoutDashboard,
  Settings,
  Upload,
  RefreshCw,
  LogOut,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/import", label: "Import BCF", icon: Upload },
  { href: "/sync", label: "Sync", icon: RefreshCw },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-background px-4 py-6">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2">
        <Link2 className="h-6 w-6 text-primary" />
        <span className="font-semibold text-lg">BCF Connector</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User */}
      {user && (
        <div className="mt-auto border-t pt-4">
          <div className="mb-2 px-3">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <a
            href="/auth/logout"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </a>
        </div>
      )}
    </aside>
  );
}
